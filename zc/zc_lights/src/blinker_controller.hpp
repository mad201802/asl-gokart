#pragma once
/// @file blinker_controller.hpp
/// Real-car turn-signal / hazard logic running in a dedicated FreeRTOS task.
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
#include <config.hpp>

enum class BlinkerState : uint8_t {
    OFF    = 0,
    LEFT   = 1,
    RIGHT  = 2,
    HAZARD = 3,
};

class BlinkerController {
public:
    // 500 ms on / 500 ms off  — standard automotive blink rate
    static constexpr uint32_t BLINK_ON_MS  = 500;
    static constexpr uint32_t BLINK_OFF_MS = 500;

    BlinkerController()
        : state_(BlinkerState::OFF)
        , mutex_(xSemaphoreCreateMutex())
        , task_handle_(nullptr)
    {}

    /// Call once from setup() after Arduino GPIO is ready.
    void begin() {
        pinMode(Esp32HwConfig::LED_PIN_LEFT,  OUTPUT);
        pinMode(Esp32HwConfig::LED_PIN_RIGHT, OUTPUT);
        all_off();

        xTaskCreate(blink_task, "blinker", 2048, this, /*priority=*/2, &task_handle_);
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
    BlinkerState      state_;
    SemaphoreHandle_t mutex_;       // mutable so it can be taken in const getter
    TaskHandle_t      task_handle_;

    void all_off() const {
        digitalWrite(Esp32HwConfig::LED_PIN_LEFT,  LOW);
        digitalWrite(Esp32HwConfig::LED_PIN_RIGHT, LOW);
    }

    void apply_leds(BlinkerState s, bool lit) const {
        switch (s) {
            case BlinkerState::LEFT:
                digitalWrite(Esp32HwConfig::LED_PIN_LEFT,  lit ? HIGH : LOW);
                digitalWrite(Esp32HwConfig::LED_PIN_RIGHT, LOW);
                break;
            case BlinkerState::RIGHT:
                digitalWrite(Esp32HwConfig::LED_PIN_LEFT,  LOW);
                digitalWrite(Esp32HwConfig::LED_PIN_RIGHT, lit ? HIGH : LOW);
                break;
            case BlinkerState::HAZARD:
                digitalWrite(Esp32HwConfig::LED_PIN_LEFT,  lit ? HIGH : LOW);
                digitalWrite(Esp32HwConfig::LED_PIN_RIGHT, lit ? HIGH : LOW);
                break;
            case BlinkerState::OFF:
            default:
                all_off();
                break;
        }
    }

    /// Wake the blink task so it reacts immediately to a state change.
    void notify_task() const {
        if (task_handle_) {
            xTaskNotify(task_handle_, 0, eNoAction);
        }
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

    // ── FreeRTOS blink task ─────────────────────────────────────────────────
    /// Each iteration handles one complete ON→OFF blink cycle.
    /// xTaskNotify wakes it early on any state change so the cycle resets
    /// immediately and LEDs respond without the full blink delay.
    static void blink_task(void* arg) {
        BlinkerController* self = static_cast<BlinkerController*>(arg);

        while (true) {
            const BlinkerState current = self->get_state();

            if (current == BlinkerState::OFF) {
                // LEDs off; park until something changes.
                self->all_off();
                xTaskNotifyWait(0, 0, nullptr, portMAX_DELAY);
                continue;
            }

            // ── ON phase ──────────────────────────────────────────────────
            self->apply_leds(current, /*lit=*/true);
            if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                                pdMS_TO_TICKS(BLINK_ON_MS)) == pdTRUE) {
                // State changed mid-cycle; turn everything off and restart.
                self->all_off();
                continue;
            }

            // Verify state hasn't drifted (belt-and-suspenders).
            if (self->get_state() != current) {
                self->all_off();
                continue;
            }

            // ── OFF phase ─────────────────────────────────────────────────
            self->apply_leds(current, /*lit=*/false);
            if (xTaskNotifyWait(0, ULONG_MAX, nullptr,
                                pdMS_TO_TICKS(BLINK_OFF_MS)) == pdTRUE) {
                // State changed; restart immediately.
                continue;
            }
        }
    }
};
