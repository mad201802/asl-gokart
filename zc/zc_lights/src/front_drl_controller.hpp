#pragma once
/// @file front_drl_controller.hpp
/// Front Daytime Running Light (DRL) controller for a single ARGB LED strip.
///
/// Two instances are created — one for the left strip, one for the right —
/// each running its own FreeRTOS animation task.  The class is templated on
/// the NeoPixelBus method type so the caller can assign distinct RMT channels
/// (e.g. NeoEsp32Rmt1Ws2812xMethod, NeoEsp32Rmt2Ws2812xMethod).
///
/// Mode priority (highest → lowest)
/// ─────────────────────────────────
///   TURN  >  DRL  >  WELCOME  >  OFF
///
/// Turn-signal state is independent of DRL: toggling the turn on does NOT
/// forget the DRL state, and when the turn goes off, DRL is restored if it
/// was previously active.  Welcome is a one-shot glow-up that returns to
/// DRL (if drl_on_) or OFF after completion.

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <freertos/task.h>
#include <functional>
#include <algorithm>
#include <NeoPixelBus.h>
#include <config.hpp>

/// Active mode for a single front DRL strip.
enum class FrontDrlMode : uint8_t {
    OFF     = 0,
    DRL     = 1,   // steady white
    TURN    = 2,   // animated orange sweep (full width)
    WELCOME = 3,   // one-shot glow-up animation
};

/// @tparam MethodType  NeoPixelBus output method, e.g. NeoEsp32Rmt1Ws2812xMethod.
template<typename MethodType>
class FrontDrlController {
public:
    /// Callback fired when the turn-signal state changes: 1 = on, 0 = off.
    using TurnStateFn = std::function<void(uint8_t on)>;

    /// @param pin           GPIO data-line for this strip.
    /// @param num_leds      LED count (default from config).
    /// @param sweep_forward true = sweep left-to-right (right strip),
    ///                      false = sweep right-to-left (left strip).
    /// @param task_name     Human-readable FreeRTOS task name.
    FrontDrlController(uint8_t pin,
                       uint16_t num_leds,
                       bool sweep_forward,
                       const char* task_name)
        : pin_(pin)
        , num_leds_(num_leds)
        , sweep_forward_(sweep_forward)
        , task_name_(task_name)
        , drl_on_(false)
        , turn_on_(false)
        , welcome_active_(false)
        , welcome_color_(FrontDrlConfig::COLOR_WELCOME)
        , brightness_(255)
        , mutex_(xSemaphoreCreateMutex())
        , task_handle_(nullptr)
        , strip_(nullptr)
        , last_turn_state_(0)
    {}

    // ── Lifecycle ───────────────────────────────────────────────────────────

    /// Initialise the NeoPixelBus strip and spawn the FreeRTOS animation task.
    /// Call once from setup().
    void begin() {
        strip_ = new NeoPixelBus<NeoGrbFeature, MethodType>(num_leds_, pin_);
        strip_->Begin();
        clear_all();

        xTaskCreate(drl_task, task_name_, /*stack=*/4096,
                    this, /*priority=*/2, &task_handle_);
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /// Enable or disable the DRL (steady white).
    /// If a turn signal is active the visual change is deferred until it ends.
    void set_drl(bool on) {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        drl_on_ = on;
        Serial.printf("[%s] DRL %s\n", task_name_, on ? "ON" : "OFF");
        xSemaphoreGive(mutex_);
        notify_task();
    }

    /// Toggle the turn signal on/off.
    void toggle_turn_signal() {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        turn_on_ = !turn_on_;
        Serial.printf("[%s] TURN %s\n", task_name_, turn_on_ ? "ON" : "OFF");
        xSemaphoreGive(mutex_);
        emit_turn_state(turn_on_ ? 1 : 0);
        notify_task();
    }

    /// Start the welcome glow-up animation with the given color.
    void trigger_welcome(RgbColor color) {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        welcome_color_  = color;
        welcome_active_ = true;
        Serial.printf("[%s] WELCOME triggered\n", task_name_);
        xSemaphoreGive(mutex_);
        notify_task();
    }

    /// Change the welcome color without starting the animation.
    void set_welcome_color(RgbColor color) {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        welcome_color_ = color;
        xSemaphoreGive(mutex_);
    }

    /// Set global brightness (0–255).
    void set_brightness(uint8_t val) {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        brightness_ = val;
        xSemaphoreGive(mutex_);
        notify_task();
    }

    bool is_drl_on() const {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        bool v = drl_on_;
        xSemaphoreGive(mutex_);
        return v;
    }

    bool is_turn_on() const {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        bool v = turn_on_;
        xSemaphoreGive(mutex_);
        return v;
    }

    /// Register a callback that fires whenever the turn-signal state changes.
    void set_turn_callback(TurnStateFn fn) { turn_callback_ = std::move(fn); }

private:
    // ── Constants ───────────────────────────────────────────────────────────
    static constexpr uint32_t FRAME_INTERVAL_MS  = 20;  // ~50 fps
    static constexpr uint32_t WELCOME_HOLD_MS    = 500; // hold at peak after glow-up

    // ── Configuration (set once in constructor) ─────────────────────────────
    uint8_t      pin_;
    uint16_t     num_leds_;
    bool         sweep_forward_;
    const char*  task_name_;

    // ── Mutable state (guarded by mutex_) ───────────────────────────────────
    bool         drl_on_;
    bool         turn_on_;
    bool         welcome_active_;
    RgbColor     welcome_color_;
    uint8_t      brightness_;

    // ── FreeRTOS primitives ─────────────────────────────────────────────────
    mutable SemaphoreHandle_t mutex_;
    TaskHandle_t              task_handle_;

    // ── NeoPixelBus ─────────────────────────────────────────────────────────
    NeoPixelBus<NeoGrbFeature, MethodType>* strip_;

    // ── Callback ────────────────────────────────────────────────────────────
    TurnStateFn  turn_callback_;
    uint8_t      last_turn_state_;

    // ── Mode resolution ─────────────────────────────────────────────────────
    /// Determine the current visual mode according to priority rules.
    /// Must be called with the mutex held (or via snapshot values).
    FrontDrlMode resolve_mode() const {
        if (turn_on_)        return FrontDrlMode::TURN;
        if (drl_on_)         return FrontDrlMode::DRL;
        if (welcome_active_) return FrontDrlMode::WELCOME;
        return FrontDrlMode::OFF;
    }

    /// Thread-safe mode query.
    FrontDrlMode get_mode() const {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        FrontDrlMode m = resolve_mode();
        xSemaphoreGive(mutex_);
        return m;
    }

    // ── LED helpers ─────────────────────────────────────────────────────────

    /// Dim a color by the global brightness and an optional per-mode scale.
    RgbColor apply_brightness(RgbColor color, uint8_t scale) const {
        // Two-stage dim: per-mode scale, then global brightness.
        color = RgbColor::LinearBlend(RgbColor(0, 0, 0), color,
                                      static_cast<float>(scale) / 255.0f);
        color = RgbColor::LinearBlend(RgbColor(0, 0, 0), color,
                                      static_cast<float>(brightness_) / 255.0f);
        return color;
    }

    void clear_all() {
        for (uint16_t i = 0; i < num_leds_; ++i)
            strip_->SetPixelColor(i, FrontDrlConfig::COLOR_OFF);
        strip_->Show();
    }

    void fill_solid(RgbColor color) {
        for (uint16_t i = 0; i < num_leds_; ++i)
            strip_->SetPixelColor(i, color);
        strip_->Show();
    }

    /// Light `count` LEDs in the sweep color, respecting sweep direction.
    void set_sweep(uint16_t count, RgbColor color) {
        for (uint16_t i = 0; i < num_leds_; ++i) {
            uint16_t idx = sweep_forward_ ? i : (num_leds_ - 1 - i);
            strip_->SetPixelColor(idx, (i < count) ? color
                                                    : FrontDrlConfig::COLOR_OFF);
        }
    }

    void emit_turn_state(uint8_t on) {
        if (turn_callback_ && on != last_turn_state_) {
            last_turn_state_ = on;
            turn_callback_(on);
        }
    }

    void notify_task() const {
        if (task_handle_)
            xTaskNotify(task_handle_, 0, eNoAction);
    }

    // ── FreeRTOS animation task ─────────────────────────────────────────────
    /// Main render loop — runs at ~50 fps while an animation is active,
    /// otherwise blocks on xTaskNotifyWait until a state change occurs.
    static void drl_task(void* arg) {
        auto* self = static_cast<FrontDrlController*>(arg);

        while (true) {
            const FrontDrlMode mode = self->get_mode();

            switch (mode) {
                // ── OFF ─────────────────────────────────────────────────────
                case FrontDrlMode::OFF:
                    self->clear_all();
                    // Block until notified of a state change.
                    xTaskNotifyWait(0, ULONG_MAX, nullptr, portMAX_DELAY);
                    break;

                // ── DRL (steady white) ──────────────────────────────────────
                case FrontDrlMode::DRL:
                    self->render_drl();
                    // Block until notified of a state change.
                    xTaskNotifyWait(0, ULONG_MAX, nullptr, portMAX_DELAY);
                    break;

                // ── TURN (sweeping orange) ──────────────────────────────────
                case FrontDrlMode::TURN:
                    self->run_turn_cycle();
                    break;

                // ── WELCOME (one-shot glow-up) ──────────────────────────────
                case FrontDrlMode::WELCOME:
                    self->run_welcome();
                    break;
            }
        }
    }

    // ── Render subroutines ──────────────────────────────────────────────────

    /// Fill the strip with the DRL white at configured brightness.
    void render_drl() {
        const RgbColor color = apply_brightness(FrontDrlConfig::COLOR_DRL,
                                                FrontDrlConfig::BRIGHTNESS_DRL);
        fill_solid(color);
    }

    /// Execute one full turn-signal blink cycle: sweep ON → hold → OFF → pause.
    /// Returns immediately if the state changes mid-cycle.
    void run_turn_cycle() {
        const RgbColor color = apply_brightness(FrontDrlConfig::COLOR_TURN,
                                                FrontDrlConfig::BRIGHTNESS_TURN);
        const uint32_t sweep_ms = FrontDrlConfig::BLINK_SWEEP_DURATION_MS;
        const uint32_t off_ms   = FrontDrlConfig::BLINK_OFF_DURATION_MS;

        // ── Sweep ON phase ──────────────────────────────────────────────
        const uint32_t sweep_start = millis();
        bool aborted = false;

        while (true) {
            const uint32_t elapsed = millis() - sweep_start;
            if (elapsed >= sweep_ms) break;

            float progress = std::min(1.0f, static_cast<float>(elapsed) / sweep_ms);
            uint16_t count = static_cast<uint16_t>(progress * num_leds_);
            set_sweep(count, color);
            strip_->Show();

            if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                                pdMS_TO_TICKS(FRAME_INTERVAL_MS)) == pdTRUE) {
                aborted = true;
                break;
            }
        }

        if (aborted || get_mode() != FrontDrlMode::TURN) {
            clear_all();
            return;
        }

        // Ensure fully lit at sweep end.
        set_sweep(num_leds_, color);
        strip_->Show();

        // ── OFF phase ───────────────────────────────────────────────────
        clear_all();

        if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                            pdMS_TO_TICKS(off_ms)) == pdTRUE) {
            return;  // state changed — restart from top
        }
    }

    /// Execute the one-shot welcome glow-up animation.
    void run_welcome() {
        xSemaphoreTake(mutex_, portMAX_DELAY);
        const RgbColor target_color = welcome_color_;
        xSemaphoreGive(mutex_);

        const uint32_t glow_ms = FrontDrlConfig::WELCOME_GLOW_DURATION_MS;
        const uint32_t start   = millis();

        // ── Glow-up phase: 0 → full brightness ─────────────────────────
        while (true) {
            const uint32_t elapsed = millis() - start;
            if (elapsed >= glow_ms) break;

            float progress = static_cast<float>(elapsed) / glow_ms;
            RgbColor blended = RgbColor::LinearBlend(RgbColor(0, 0, 0),
                                                     target_color, progress);

            xSemaphoreTake(mutex_, portMAX_DELAY);
            uint8_t br = brightness_;
            xSemaphoreGive(mutex_);

            blended = RgbColor::LinearBlend(RgbColor(0, 0, 0), blended,
                                            static_cast<float>(br) / 255.0f);
            fill_solid(blended);

            // Check for preemption (turn signal takes priority).
            if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                                pdMS_TO_TICKS(FRAME_INTERVAL_MS)) == pdTRUE) {
                if (get_mode() != FrontDrlMode::WELCOME) {
                    clear_all();
                    return;
                }
            }
        }

        // ── Hold at peak ────────────────────────────────────────────────
        {
            xSemaphoreTake(mutex_, portMAX_DELAY);
            uint8_t br = brightness_;
            xSemaphoreGive(mutex_);

            RgbColor peak = RgbColor::LinearBlend(RgbColor(0, 0, 0),
                                                  target_color,
                                                  static_cast<float>(br) / 255.0f);
            fill_solid(peak);
        }

        if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                            pdMS_TO_TICKS(WELCOME_HOLD_MS)) == pdTRUE) {
            if (get_mode() != FrontDrlMode::WELCOME) {
                clear_all();
                return;
            }
        }

        // ── Welcome complete — transition to next mode ──────────────────
        xSemaphoreTake(mutex_, portMAX_DELAY);
        welcome_active_ = false;
        Serial.printf("[%s] WELCOME complete\n", task_name_);
        xSemaphoreGive(mutex_);

        // The next loop iteration will resolve to DRL or OFF.
    }
};
