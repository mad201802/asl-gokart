#pragma once
/// @file high_beam_controller.hpp
/// Binary (relay) controller for high beam floodlights.
/// Drives two GPIO pins (left/right) to toggle relay-switched LED floodlights.
/// Replaces the old headlights_controller.hpp — relay headlights have been
/// replaced by ARGB DRL strips; only the high beam relays remain.

#include <Arduino.h>
#include <functional>
#include <config.hpp>

class HighBeamController {
public:
    /// Callback fired when high beam state changes: (left_on, right_on).
    using HighBeamStateFn = std::function<void(uint8_t left, uint8_t right)>;

    /// Call once from setup().  Configures GPIO pins as outputs and turns off.
    void begin() {
        pinMode(Esp32HwConfig::LED_PIN_HIGH_BEAM_LEFT,  OUTPUT);
        pinMode(Esp32HwConfig::LED_PIN_HIGH_BEAM_RIGHT, OUTPUT);
        all_off();
    }

    /// Toggle both high beams together.
    void toggle() {
        bool left_on  = is_on();
        // Toggle both in sync
        set(!left_on, !left_on);
    }

    /// Explicitly set high beam state.
    void set(bool left_on, bool right_on) {
        digitalWrite(Esp32HwConfig::LED_PIN_HIGH_BEAM_LEFT,  left_on  ? LOW : HIGH);
        digitalWrite(Esp32HwConfig::LED_PIN_HIGH_BEAM_RIGHT, right_on ? LOW : HIGH);
        maybe_emit(left_on ? 1 : 0, right_on ? 1 : 0);
    }

    bool is_on() const {
        return digitalRead(Esp32HwConfig::LED_PIN_HIGH_BEAM_LEFT) == LOW;
    }

    void set_callback(HighBeamStateFn fn) { cb_ = std::move(fn); }

private:
    uint8_t last_left_  = 0;
    uint8_t last_right_ = 0;
    HighBeamStateFn cb_;

    void all_off() {
        digitalWrite(Esp32HwConfig::LED_PIN_HIGH_BEAM_LEFT,  HIGH);
        digitalWrite(Esp32HwConfig::LED_PIN_HIGH_BEAM_RIGHT, HIGH);
        last_left_  = 0;
        last_right_ = 0;
    }

    void maybe_emit(uint8_t left, uint8_t right) {
        if (cb_ && (left != last_left_ || right != last_right_)) {
            last_left_  = left;
            last_right_ = right;
            cb_(left, right);
        }
    }
};
