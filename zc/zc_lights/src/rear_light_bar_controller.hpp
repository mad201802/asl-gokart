#pragma once
/// @file rear_light_bar_controller.hpp
/// Rear ARGB LED light bar controller for a 144×4 matrix (576 LEDs).
///
/// Manages five lighting functions on a single WS2812x strip arranged as a
/// row-major matrix with optional zigzag/serpentine wiring:
///
///   Zone layout (per row of 144 columns):
///   ┌─────────────┬───────┬──────────┬───────┬─────────────┐
///   │ TURN LEFT   │ REV L │  BRAKE   │ REV R │ TURN RIGHT  │
///   │ cols  0–35  │ 36–53 │  54–89   │ 90–107│ cols 108–143│
///   └─────────────┴───────┴──────────┴───────┴─────────────┘
///
/// State machine (turn signals — identical to BlinkerController)
/// ─────────────────────────────────────────────────────────────
///   OFF    → LEFT   (toggle_left)
///   OFF    → RIGHT  (toggle_right)
///   OFF    → HAZARD (toggle_hazard)
///   LEFT   → OFF    (toggle_left again)
///   LEFT   → RIGHT  (toggle_right)
///   LEFT   → HAZARD (toggle_hazard)  ← hazard overrides
///   RIGHT  → OFF    (toggle_right again)
///   RIGHT  → LEFT   (toggle_left)
///   RIGHT  → HAZARD (toggle_hazard)  ← hazard overrides
///   HAZARD → OFF    (toggle_hazard again)
///   HAZARD → HAZARD (toggle_left / toggle_right are IGNORED)

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <freertos/task.h>
#include <functional>
#include <algorithm>
#include <NeoPixelBus.h>
#include <config.hpp>

class RearLightBarController {
public:
    using Cfg = RearLightBarConfig;

    using StripType      = NeoPixelBus<NeoGrbFeature, NeoEsp32Rmt0Ws2812xMethod>;
    using TurnStateFn    = std::function<void(uint8_t left, uint8_t right)>;
    using BrakeStateFn   = std::function<void(uint8_t on)>;
    using ReverseStateFn = std::function<void(uint8_t on)>;

    /// Thread-safe mutable state — all fields guarded by `mutex_`.
    struct State {
        bool         tail_on    = false;         ///< Dim red baseline in the center zone
        bool         brake_on   = false;         ///< Bright red in the brake zone
        bool         reverse_on = false;         ///< White in the reverse zones
        BlinkerState turn       = BlinkerState::OFF;  ///< Turn signal / hazard state
        uint8_t      brightness = 255;           ///< Global brightness multiplier (0–255)
    };

    RearLightBarController()
        : mutex_(xSemaphoreCreateMutex())
        , task_handle_(nullptr)
        , strip_(nullptr)
    {}

    // ── Callbacks ───────────────────────────────────────────────────────────

    void set_turn_callback(TurnStateFn fn)       { turn_cb_    = std::move(fn); }
    void set_brake_callback(BrakeStateFn fn)     { brake_cb_   = std::move(fn); }
    void set_reverse_callback(ReverseStateFn fn) { reverse_cb_ = std::move(fn); }

    // ── Lifecycle ───────────────────────────────────────────────────────────

    /// Initialise the NeoPixelBus strip and start the FreeRTOS render task.
    /// Call once from setup().
    void begin() {
        strip_ = new StripType(Cfg::NUM_LEDS, Esp32HwConfig::LED_PIN_ARGB_REAR);
        strip_->Begin();
        clear_and_show();

        xTaskCreate(rear_light_task, "rear_bar", 8192, this,
                    /*priority=*/2, &task_handle_);
    }

    // ── Public mutators (safe to call from any task) ────────────────────────

    /// Enable / disable the tail-light baseline.
    void set_tail(bool on) {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        state_.tail_on = on;
        xSemaphoreGive(mutex_);
        notify_task();
    }

    /// Enable / disable the brake light.
    void set_brake(bool on) {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        const bool changed = (state_.brake_on != on);
        state_.brake_on = on;
        xSemaphoreGive(mutex_);
        if (changed) maybe_emit_brake(on ? 1 : 0);
        notify_task();
    }

    /// Enable / disable the reverse light.
    void set_reverse(bool on) {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        const bool changed = (state_.reverse_on != on);
        state_.reverse_on = on;
        xSemaphoreGive(mutex_);
        if (changed) maybe_emit_reverse(on ? 1 : 0);
        notify_task();
    }

    /// Toggle left indicator.  Ignored while hazards are active.
    void toggle_left() {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        if (state_.turn == BlinkerState::HAZARD) {
            xSemaphoreGive(mutex_);
            Serial.println("[rear] left ignored — hazard active");
            return;
        }
        state_.turn = (state_.turn == BlinkerState::LEFT)
                          ? BlinkerState::OFF
                          : BlinkerState::LEFT;
        const BlinkerState s = state_.turn;
        xSemaphoreGive(mutex_);
        Serial.printf("[rear] turn → %s\n", turn_state_name(s));
        emit_turn_for(s);
        notify_task();
    }

    /// Toggle right indicator.  Ignored while hazards are active.
    void toggle_right() {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        if (state_.turn == BlinkerState::HAZARD) {
            xSemaphoreGive(mutex_);
            Serial.println("[rear] right ignored — hazard active");
            return;
        }
        state_.turn = (state_.turn == BlinkerState::RIGHT)
                          ? BlinkerState::OFF
                          : BlinkerState::RIGHT;
        const BlinkerState s = state_.turn;
        xSemaphoreGive(mutex_);
        Serial.printf("[rear] turn → %s\n", turn_state_name(s));
        emit_turn_for(s);
        notify_task();
    }

    /// Toggle hazard lights.  Overrides any active turn signal.
    void toggle_hazard() {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        state_.turn = (state_.turn == BlinkerState::HAZARD)
                          ? BlinkerState::OFF
                          : BlinkerState::HAZARD;
        const BlinkerState s = state_.turn;
        xSemaphoreGive(mutex_);
        Serial.printf("[rear] turn → %s\n", turn_state_name(s));
        emit_turn_for(s);
        notify_task();
    }

    /// Set global brightness (0–255).
    void set_brightness(uint8_t val) {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        state_.brightness = val;
        xSemaphoreGive(mutex_);
        notify_task();
    }

    // ── Public accessors ────────────────────────────────────────────────────

    BlinkerState get_turn_state() const {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        BlinkerState s = state_.turn;
        xSemaphoreGive(mutex_);
        return s;
    }

    bool is_brake_on() const {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        bool v = state_.brake_on;
        xSemaphoreGive(mutex_);
        return v;
    }

    bool is_reverse_on() const {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        bool v = state_.reverse_on;
        xSemaphoreGive(mutex_);
        return v;
    }

private:
    // ── Constants ───────────────────────────────────────────────────────────

    static constexpr uint32_t FRAME_INTERVAL_MS = 20;  ///< ~50 fps render rate

    /// When true, odd rows have reversed pixel order (serpentine wiring).
    static constexpr bool ZIGZAG = true;

    // ── Member data ─────────────────────────────────────────────────────────

    State             state_;
    SemaphoreHandle_t mutex_;
    TaskHandle_t      task_handle_;
    StripType*        strip_;

    TurnStateFn       turn_cb_;
    BrakeStateFn      brake_cb_;
    ReverseStateFn    reverse_cb_;

    // Cached previous callback values for deduplication.
    uint8_t last_turn_left_  = 0;
    uint8_t last_turn_right_ = 0;
    uint8_t last_brake_      = 0;
    uint8_t last_reverse_    = 0;

    // ── Matrix helpers ──────────────────────────────────────────────────────

    /// Convert (col, row) in the logical matrix to a physical strip index.
    /// Supports both progressive and zigzag (serpentine) layouts.
    static uint16_t pixel_index(uint16_t col, uint16_t row) {
        if (ZIGZAG && (row & 1)) {
            // Odd rows are wired right-to-left.
            return row * Cfg::WIDTH + (Cfg::WIDTH - 1 - col);
        }
        return row * Cfg::WIDTH + col;
    }

    // ── LED helpers ─────────────────────────────────────────────────────────

    /// Set every pixel to off and push to strip.
    void clear_and_show() {
        for (uint16_t i = 0; i < Cfg::NUM_LEDS; ++i)
            strip_->SetPixelColor(i, Cfg::COLOR_OFF);
        strip_->Show();
    }

    /// Apply a colour to a pixel, scaled by `zone_brightness` and the global
    /// brightness multiplier.
    void set_pixel_scaled(uint16_t idx, const RgbColor& color,
                          uint8_t zone_brightness, uint8_t global_brightness) {
        const float scale = (static_cast<float>(zone_brightness) / 255.0f)
                          * (static_cast<float>(global_brightness) / 255.0f);
        strip_->SetPixelColor(idx,
            RgbColor::LinearBlend(Cfg::COLOR_OFF, color, scale));
    }

    // ── Callback helpers ────────────────────────────────────────────────────

    /// Emit turn callback only when the logical state actually changes.
    void maybe_emit_turn(uint8_t left, uint8_t right) {
        if (turn_cb_ && (left != last_turn_left_ || right != last_turn_right_)) {
            last_turn_left_  = left;
            last_turn_right_ = right;
            turn_cb_(left, right);
        }
    }

    void maybe_emit_brake(uint8_t on) {
        if (brake_cb_ && on != last_brake_) {
            last_brake_ = on;
            brake_cb_(on);
        }
    }

    void maybe_emit_reverse(uint8_t on) {
        if (reverse_cb_ && on != last_reverse_) {
            last_reverse_ = on;
            reverse_cb_(on);
        }
    }

    /// Convenience: derive (left_on, right_on) from a BlinkerState and emit.
    void emit_turn_for(BlinkerState s) {
        const uint8_t l = (s == BlinkerState::LEFT  || s == BlinkerState::HAZARD) ? 1 : 0;
        const uint8_t r = (s == BlinkerState::RIGHT || s == BlinkerState::HAZARD) ? 1 : 0;
        maybe_emit_turn(l, r);
    }

    void notify_task() const {
        if (task_handle_)
            xTaskNotify(task_handle_, 0, eNoAction);
    }

    static const char* turn_state_name(BlinkerState s) {
        switch (s) {
            case BlinkerState::OFF:    return "OFF";
            case BlinkerState::LEFT:   return "LEFT";
            case BlinkerState::RIGHT:  return "RIGHT";
            case BlinkerState::HAZARD: return "HAZARD";
            default:                   return "?";
        }
    }

    // ── Render helpers ──────────────────────────────────────────────────────

    /// Classify a column and return (color, zone_brightness) for non-turn
    /// pixels.  Turn signal pixels are handled separately in the render loop.
    void classify_static_pixel(uint16_t col, const State& snap,
                               RgbColor& out_color, uint8_t& out_bright) const {
        // Reverse zones
        if ((col >= Cfg::REVERSE_LEFT_START  && col < Cfg::REVERSE_LEFT_END) ||
            (col >= Cfg::REVERSE_RIGHT_START && col < Cfg::REVERSE_RIGHT_END)) {
            if (snap.reverse_on) {
                out_color  = Cfg::COLOR_REVERSE;
                out_bright = Cfg::BRIGHTNESS_REVERSE;
                return;
            }
        }

        // Brake zone
        if (col >= Cfg::BRAKE_START && col < Cfg::BRAKE_END) {
            if (snap.brake_on) {
                out_color  = Cfg::COLOR_BRAKE;
                out_bright = Cfg::BRIGHTNESS_BRAKE;
                return;
            }
        }

        // Center tail zone (cols 36–107)
        if (col >= Cfg::CENTER_START && col < Cfg::CENTER_END) {
            if (snap.tail_on) {
                out_color  = Cfg::COLOR_TAIL;
                out_bright = Cfg::BRIGHTNESS_TAIL;
                return;
            }
        }

        // Outside any active zone → off
        out_color  = Cfg::COLOR_OFF;
        out_bright = 0;
    }

    /// Render a single full frame to the strip buffer (does NOT call Show()).
    ///
    /// @param snap           Snapshot of the current state.
    /// @param sweep_active   True if we are in a turn-signal sweep phase.
    /// @param sweep_progress Number of columns the sweep has reached (0 = none lit).
    void render_frame(const State& snap, bool sweep_active,
                      uint16_t sweep_progress) {
        const bool do_left  = (snap.turn == BlinkerState::LEFT  || snap.turn == BlinkerState::HAZARD);
        const bool do_right = (snap.turn == BlinkerState::RIGHT || snap.turn == BlinkerState::HAZARD);

        for (uint16_t col = 0; col < Cfg::WIDTH; ++col) {
            // ── Check if this column is in a turn-signal zone ───────────
            bool in_turn_zone  = false;
            bool turn_lit      = false;

            if (do_left && col >= Cfg::TURN_LEFT_START && col < Cfg::TURN_LEFT_END) {
                in_turn_zone = true;
                if (sweep_active) {
                    // Left sweeps outward: origin col 35 → col 0.
                    // The sweep "distance" for this column from origin:
                    const uint16_t dist = (Cfg::TURN_LEFT_END - 1) - col;  // 35-col
                    turn_lit = (dist < sweep_progress);
                }
            }

            if (do_right && col >= Cfg::TURN_RIGHT_START && col < Cfg::TURN_RIGHT_END) {
                in_turn_zone = true;
                if (sweep_active) {
                    // Right sweeps outward: origin col 108 → col 143.
                    const uint16_t dist = col - Cfg::TURN_RIGHT_START;  // col-108
                    turn_lit = (dist < sweep_progress);
                }
            }

            // ── Determine colour / brightness for this column ───────────
            RgbColor  color;
            uint8_t   zone_bright;

            if (in_turn_zone && turn_lit) {
                color       = Cfg::COLOR_TURN;
                zone_bright = Cfg::BRIGHTNESS_TURN;
            } else if (in_turn_zone && sweep_active) {
                // In the turn zone during sweep, but not yet reached → off
                color       = Cfg::COLOR_OFF;
                zone_bright = 0;
            } else if (in_turn_zone && !sweep_active) {
                // Turn zone but turn is OFF or between blinks → show underlying
                classify_static_pixel(col, snap, color, zone_bright);
            } else {
                classify_static_pixel(col, snap, color, zone_bright);
            }

            // ── Write to all rows ───────────────────────────────────────
            for (uint16_t row = 0; row < Cfg::HEIGHT; ++row) {
                const uint16_t idx = pixel_index(col, row);
                set_pixel_scaled(idx, color, zone_bright, snap.brightness);
            }
        }
    }

    /// Take a consistent snapshot of the shared state under the mutex.
    State snapshot_state() {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        State snap = state_;
        xSemaphoreGive(mutex_);
        return snap;
    }

    // ── FreeRTOS animation task ─────────────────────────────────────────────
    /// Main render loop running at ~50 fps.
    ///
    /// When no turn signal is active, renders one static frame and sleeps
    /// indefinitely via xTaskNotifyWait until the state changes.
    ///
    /// When a turn signal is active, runs a sweep-on → hold → off → pause
    /// cycle.  Any state change (via task notification) aborts the current
    /// cycle and restarts immediately.
    static void rear_light_task(void* arg) {
        auto* self = static_cast<RearLightBarController*>(arg);

        while (true) {
            State snap = self->snapshot_state();

            // ── Static mode (no turn signals) ───────────────────────────
            if (snap.turn == BlinkerState::OFF) {
                self->render_frame(snap, /*sweep_active=*/false, 0);
                self->strip_->Show();

                // Sleep until state changes.
                xTaskNotifyWait(0, ULONG_MAX, nullptr, portMAX_DELAY);
                continue;
            }

            // ── Animated mode (turn / hazard active) ────────────────────
            const uint32_t sweep_ms = Cfg::BLINK_SWEEP_DURATION_MS;
            const uint32_t off_ms   = Cfg::BLINK_OFF_DURATION_MS;

            // ── Sweep ON phase ──────────────────────────────────────────
            const uint32_t sweep_start = millis();
            bool aborted = false;

            while (true) {
                const uint32_t elapsed = millis() - sweep_start;
                if (elapsed >= sweep_ms) break;

                const float progress = std::min(
                    1.0f, static_cast<float>(elapsed) / static_cast<float>(sweep_ms));
                const uint16_t cols_lit = static_cast<uint16_t>(
                    progress * Cfg::TURN_SIGNAL_WIDTH);

                // Re-snapshot non-turn state so brake/reverse react instantly.
                snap = self->snapshot_state();

                self->render_frame(snap, /*sweep_active=*/true, cols_lit);
                self->strip_->Show();

                if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                                    pdMS_TO_TICKS(FRAME_INTERVAL_MS)) == pdTRUE) {
                    aborted = true;
                    break;
                }
            }

            if (aborted) continue;  // state changed — restart immediately

            // Ensure fully-lit final frame.
            snap = self->snapshot_state();
            if (snap.turn == BlinkerState::OFF) continue;

            self->render_frame(snap, /*sweep_active=*/true,
                               Cfg::TURN_SIGNAL_WIDTH);
            self->strip_->Show();

            // Brief hold at full illumination (one frame).
            if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                                pdMS_TO_TICKS(FRAME_INTERVAL_MS)) == pdTRUE) {
                continue;
            }

            // ── OFF phase ───────────────────────────────────────────────
            snap = self->snapshot_state();
            if (snap.turn == BlinkerState::OFF) continue;

            // Render with sweep_active=false so turn zones show underlying
            // state (or off if nothing else is active).
            self->render_frame(snap, /*sweep_active=*/false, 0);
            self->strip_->Show();

            if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                                pdMS_TO_TICKS(off_ms)) == pdTRUE) {
                continue;  // state changed — restart
            }
        }
    }
};
