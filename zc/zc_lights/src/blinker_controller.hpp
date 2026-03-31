#pragma once
/// @file blinker_controller.hpp
/// Running (sequential) turn-signal animation using a NeoPixelBus ARGB strip.
/// Mimics modern-car sweeping indicators (Audi-style).
///
/// State machine
/// ─────────────
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
///   HAZARD → HAZARD (toggle_left / toggle_right are IGNORED while hazard is on)

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <freertos/task.h>
#include <functional>
#include <algorithm>
#include <NeoPixelBus.h>
#include <config.hpp>

enum class BlinkerState : uint8_t {
    OFF    = 0,
    LEFT   = 1,
    RIGHT  = 2,
    HAZARD = 3,
};

class BlinkerController {
public:
    using StripType  = NeoPixelBus<NeoGrbFeature, NeoEsp32I2s1X8Ws2812xMethod>;
    /// Callback fired whenever the logical blinker state changes: (left_on, right_on).
    using LedStateFn = std::function<void(uint8_t left, uint8_t right)>;

    BlinkerController()
        : state_(BlinkerState::OFF)
        , mutex_(xSemaphoreCreateMutex())
        , task_handle_(nullptr)
        , strip_(nullptr)
    {}

    void set_led_callback(LedStateFn fn) { led_cb_ = std::move(fn); }

    /// Call once from setup().  Initialises the NeoPixelBus strip and starts
    /// the animation task.
    void begin() {
        strip_ = new StripType(Esp32LightsConfig::ARGB_STRIP_NUM_LEDS,
                                Esp32HwConfig::LED_PIN_ARGB_STRIP);
        strip_->Begin();
        clear_all();

        xTaskCreate(blink_task, "blinker", 4096, this, /*priority=*/2, &task_handle_);
    }

    // ── toggle methods (safe to call from any task / ISR context) ──────────

    /// Toggle left indicator.  Ignored while hazards are active.
    void toggle_left() {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        if (state_ == BlinkerState::HAZARD) {
            xSemaphoreGive(mutex_);
            Serial.println("[blinker] left ignored — hazard active");
            return;
        }
        state_ = (state_ == BlinkerState::LEFT) ? BlinkerState::OFF : BlinkerState::LEFT;
        Serial.printf("[blinker] → %s\n", state_name(state_));
        xSemaphoreGive(mutex_);
        notify_task();
    }

    /// Toggle right indicator.  Ignored while hazards are active.
    void toggle_right() {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        if (state_ == BlinkerState::HAZARD) {
            xSemaphoreGive(mutex_);
            Serial.println("[blinker] right ignored — hazard active");
            return;
        }
        state_ = (state_ == BlinkerState::RIGHT) ? BlinkerState::OFF : BlinkerState::RIGHT;
        Serial.printf("[blinker] → %s\n", state_name(state_));
        xSemaphoreGive(mutex_);
        notify_task();
    }

    /// Toggle hazard lights.  Overrides any active turn signal.
    void toggle_hazard() {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        state_ = (state_ == BlinkerState::HAZARD) ? BlinkerState::OFF : BlinkerState::HAZARD;
        Serial.printf("[blinker] → %s\n", state_name(state_));
        xSemaphoreGive(mutex_);
        notify_task();
    }

    BlinkerState get_state() const {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        BlinkerState s = state_;
        xSemaphoreGive(mutex_);
        return s;
    }

private:
    static constexpr uint32_t FRAME_INTERVAL_MS = 20; // ~50 fps animation

    BlinkerState      state_;
    SemaphoreHandle_t mutex_;
    TaskHandle_t      task_handle_;
    StripType*        strip_;
    LedStateFn        led_cb_;
    uint8_t           last_left_  = 0;
    uint8_t           last_right_ = 0;

    // ── LED helpers ─────────────────────────────────────────────────────────

    void clear_all() {
        for (uint16_t i = 0; i < Esp32LightsConfig::ARGB_STRIP_NUM_LEDS; ++i)
            strip_->SetPixelColor(i, Esp32LightsConfig::COLOR_OFF);
        strip_->Show();
    }

    void clear_segment(uint8_t start, uint8_t length) {
        for (uint8_t i = 0; i < length; ++i)
            strip_->SetPixelColor(start + i, Esp32LightsConfig::COLOR_OFF);
    }

    /// Light `count` LEDs in a segment with the blinker color.
    /// @param forward  true → fill from start toward end; false → fill from end toward start.
    void set_sweep(uint8_t start, uint8_t length, uint8_t count, bool forward) {
        for (uint8_t i = 0; i < length; ++i) {
            uint8_t idx = forward ? (start + i) : (start + length - 1 - i);
            strip_->SetPixelColor(idx, (i < count) ? Esp32LightsConfig::COLOR_ORANGE
                                                    : Esp32LightsConfig::COLOR_OFF);
        }
    }

    void maybe_emit(uint8_t left, uint8_t right) {
        if (led_cb_ && (left != last_left_ || right != last_right_)) {
            last_left_  = left;
            last_right_ = right;
            led_cb_(left, right);
        }
    }

    void notify_task() const {
        if (task_handle_)
            xTaskNotify(task_handle_, 0, eNoAction);
    }

    static const char* state_name(BlinkerState s) {
        switch (s) {
            case BlinkerState::OFF:    return "OFF";
            case BlinkerState::LEFT:   return "LEFT";
            case BlinkerState::RIGHT:  return "RIGHT";
            case BlinkerState::HAZARD: return "HAZARD";
            default:                   return "?";
        }
    }

    // ── FreeRTOS animation task ─────────────────────────────────────────────
    /// Each iteration: sequential sweep ON → all off → pause → repeat.
    /// xTaskNotify wakes it early on any state change so the cycle resets
    /// immediately.
    static void blink_task(void* arg) {
        auto* self = static_cast<BlinkerController*>(arg);

        while (true) {
            const BlinkerState current = self->get_state();

            if (current == BlinkerState::OFF) {
                self->clear_all();
                self->maybe_emit(0, 0);
                xTaskNotifyWait(0, ULONG_MAX, nullptr, portMAX_DELAY);
                continue;
            }

            const bool do_left  = (current == BlinkerState::LEFT  || current == BlinkerState::HAZARD);
            const bool do_right = (current == BlinkerState::RIGHT || current == BlinkerState::HAZARD);

            const uint32_t sweep_left_ms  = do_left  ? Esp32LightsConfig::BLINK_SWEEP_DURATION_LEFT_MS  : 0;
            const uint32_t sweep_right_ms = do_right ? Esp32LightsConfig::BLINK_SWEEP_DURATION_RIGHT_MS : 0;
            const uint32_t sweep_ms       = std::max(sweep_left_ms, sweep_right_ms);

            // Notify subscribers that the blinker is active.
            self->maybe_emit(do_left ? 1 : 0, do_right ? 1 : 0);

            // ── Sweep ON phase ────────────────────────────────────────────
            const uint32_t sweep_start = millis();
            bool aborted = false;

            while (true) {
                const uint32_t elapsed = millis() - sweep_start;
                if (elapsed >= sweep_ms) break;

                if (do_left) {
                    float progress = std::min(1.0f, static_cast<float>(elapsed) / sweep_left_ms);
                    uint8_t count  = static_cast<uint8_t>(progress * Esp32LightsConfig::ARGB_STRIP_LEFT_LENGTH);
                    self->set_sweep(Esp32LightsConfig::ARGB_STRIP_LEFT_START,
                                    Esp32LightsConfig::ARGB_STRIP_LEFT_LENGTH,
                                    count,
                                    Esp32LightsConfig::BLINK_SWEEP_FORWARD_LEFT);
                }
                if (do_right) {
                    float progress = std::min(1.0f, static_cast<float>(elapsed) / sweep_right_ms);
                    uint8_t count  = static_cast<uint8_t>(progress * Esp32LightsConfig::ARGB_STRIP_RIGHT_LENGTH);
                    self->set_sweep(Esp32LightsConfig::ARGB_STRIP_RIGHT_START,
                                    Esp32LightsConfig::ARGB_STRIP_RIGHT_LENGTH,
                                    count,
                                    Esp32LightsConfig::BLINK_SWEEP_FORWARD_RIGHT);
                }
                self->strip_->Show();

                if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                                    pdMS_TO_TICKS(FRAME_INTERVAL_MS)) == pdTRUE) {
                    aborted = true;
                    break;
                }
            }

            if (aborted || self->get_state() != current) {
                self->clear_all();
                self->maybe_emit(0, 0);
                continue;
            }

            // Ensure all LEDs are fully lit at the end of the sweep.
            if (do_left)
                self->set_sweep(Esp32LightsConfig::ARGB_STRIP_LEFT_START,
                                Esp32LightsConfig::ARGB_STRIP_LEFT_LENGTH,
                                Esp32LightsConfig::ARGB_STRIP_LEFT_LENGTH,
                                Esp32LightsConfig::BLINK_SWEEP_FORWARD_LEFT);
            if (do_right)
                self->set_sweep(Esp32LightsConfig::ARGB_STRIP_RIGHT_START,
                                Esp32LightsConfig::ARGB_STRIP_RIGHT_LENGTH,
                                Esp32LightsConfig::ARGB_STRIP_RIGHT_LENGTH,
                                Esp32LightsConfig::BLINK_SWEEP_FORWARD_RIGHT);
            self->strip_->Show();

            // ── OFF phase ─────────────────────────────────────────────────
            const uint32_t off_left_ms  = do_left  ? Esp32LightsConfig::BLINK_OFF_DURATION_LEFT_MS  : 0;
            const uint32_t off_right_ms = do_right ? Esp32LightsConfig::BLINK_OFF_DURATION_RIGHT_MS : 0;
            const uint32_t off_ms       = std::max(off_left_ms, off_right_ms);

            if (do_left)  self->clear_segment(Esp32LightsConfig::ARGB_STRIP_LEFT_START,
                                              Esp32LightsConfig::ARGB_STRIP_LEFT_LENGTH);
            if (do_right) self->clear_segment(Esp32LightsConfig::ARGB_STRIP_RIGHT_START,
                                              Esp32LightsConfig::ARGB_STRIP_RIGHT_LENGTH);
            self->strip_->Show();
            self->maybe_emit(0, 0);

            if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                                pdMS_TO_TICKS(off_ms)) == pdTRUE) {
                continue; // state changed — restart immediately
            }
        }
    }
};
