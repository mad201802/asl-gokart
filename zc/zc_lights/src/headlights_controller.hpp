#pragma once

#include <Arduino.h>
#include <config.hpp>

class HeadlightsController {
public:
    
    // Callbacks for headlight and high beam state changes
    using HeadlightStateFn = std::function<void(uint8_t headlightLeft, uint8_t headlightRight)>;
    using HighBeamStateFn = std::function<void(uint8_t highBeamLeft, uint8_t highBeamRight)>;

    void begin() {
        pinMode(Esp32HwConfig::LED_PIN_HEADLIGHT_LEFT,  OUTPUT);
        pinMode(Esp32HwConfig::LED_PIN_HEADLIGHT_RIGHT, OUTPUT);
        pinMode(Esp32HwConfig::LED_PIN_HIGH_BEAM_LEFT,  OUTPUT);
        pinMode(Esp32HwConfig::LED_PIN_HIGH_BEAM_RIGHT, OUTPUT);
        all_off();
    }

    void toggle_headlights() {
        bool left_on = digitalRead(Esp32HwConfig::LED_PIN_HEADLIGHT_LEFT) == HIGH;
        bool right_on = digitalRead(Esp32HwConfig::LED_PIN_HEADLIGHT_RIGHT) == HIGH;
        set_headlights(!left_on, !right_on);
    }

    void toggle_high_beams() {
        bool left_on = digitalRead(Esp32HwConfig::LED_PIN_HIGH_BEAM_LEFT) == HIGH;
        bool right_on = digitalRead(Esp32HwConfig::LED_PIN_HIGH_BEAM_RIGHT) == HIGH;
        set_high_beams(!left_on, !right_on);
    }

    void set_headlight_callback(HeadlightStateFn fn) { headlight_cb_ = std::move(fn); }
    void set_high_beam_callback(HighBeamStateFn fn) { high_beam_cb_ = std::move(fn); }


private:
    // LED States:
    uint8_t last_headlight_left_    = 0;
    uint8_t last_headlight_right_   = 0;
    uint8_t last_high_beam_left_    = 0;
    uint8_t last_high_beam_right_   = 0;
    HeadlightStateFn headlight_cb_;
    HighBeamStateFn high_beam_cb_;


    void all_off() {
        digitalWrite(Esp32HwConfig::LED_PIN_HEADLIGHT_LEFT,  LOW);
        digitalWrite(Esp32HwConfig::LED_PIN_HEADLIGHT_RIGHT, LOW);
        digitalWrite(Esp32HwConfig::LED_PIN_HIGH_BEAM_LEFT,  LOW);
        digitalWrite(Esp32HwConfig::LED_PIN_HIGH_BEAM_RIGHT, LOW);
        last_headlight_left_ = 0;
        last_headlight_right_ = 0;
        last_high_beam_left_ = 0;
        last_high_beam_right_ = 0;
        maybe_emit(0, 0, 0, 0);

    }

    void maybe_emit(uint8_t headlightLeft, uint8_t headlightRight, uint8_t highBeamLeft, uint8_t highBeamRight) {
        if (headlight_cb_ && (headlightLeft != last_headlight_left_ || headlightRight != last_headlight_right_)) {
            last_headlight_left_  = headlightLeft;
            last_headlight_right_ = headlightRight;
            headlight_cb_(headlightLeft, headlightRight);
        }
        if (high_beam_cb_ && (highBeamLeft != last_high_beam_left_ || highBeamRight != last_high_beam_right_)) {
            last_high_beam_left_ = highBeamLeft;
            last_high_beam_right_ = highBeamRight;
            high_beam_cb_(highBeamLeft, highBeamRight);
        }
    }

    void set_headlights(bool left_on, bool right_on) {
        digitalWrite(Esp32HwConfig::LED_PIN_HEADLIGHT_LEFT,  left_on ? HIGH : LOW);
        digitalWrite(Esp32HwConfig::LED_PIN_HEADLIGHT_RIGHT, right_on ? HIGH : LOW);
        maybe_emit(left_on ? 1 : 0, right_on ? 1 : 0, last_high_beam_left_, last_high_beam_right_);
    }

    void set_high_beams(bool left_on, bool right_on) {
        digitalWrite(Esp32HwConfig::LED_PIN_HIGH_BEAM_LEFT,  left_on ? HIGH : LOW);
        digitalWrite(Esp32HwConfig::LED_PIN_HIGH_BEAM_RIGHT, right_on ? HIGH : LOW);
        maybe_emit(last_headlight_left_, last_headlight_right_, left_on ? 1 : 0, right_on ? 1 : 0);
    }
};