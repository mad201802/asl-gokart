#pragma once
/// @file tester_config.hpp
/// ARGB LED Hardware Testbench Configuration
/// Target: AZ-Delivery ESP32-WROOM-32 Dev Kit (NodeMCU-32S)

#include <Arduino.h>
#include <NeoPixelBus.h>

// ── Hardware Pin Assignments ────────────────────────────────────────────────
// // ponytail: Exact same GPIOs as zc_lights so test harness plugs straight in.
// AZ-Delivery Header Labels:
//   GPIO 4  -> D4  (Rear Light Bar Data)
//   GPIO 16 -> RX2 (Front Left DRL Data)
//   GPIO 13 -> D13 (Front Right DRL Data)
struct TesterHwConfig {
    static constexpr int LED_PIN_ARGB_REAR        = GPIO_NUM_4;
    static constexpr int LED_PIN_ARGB_FRONT_LEFT  = GPIO_NUM_16;
    static constexpr int LED_PIN_ARGB_FRONT_RIGHT = GPIO_NUM_13;
};

// ── Front DRL Configuration ─────────────────────────────────────────────────
struct FrontDrlConfig {
    static constexpr uint16_t NUM_LEDS = 15;
    static constexpr uint32_t BLINK_SWEEP_MS = 400;
};

// ── Rear Light Bar Configuration ────────────────────────────────────────────
//  Zone layout (per row of 144 columns):
//  ┌─────────────┬───────┬──────────┬───────┬─────────────┐
//  │ TURN LEFT   │ REV L │  BRAKE   │ REV R │ TURN RIGHT  │
//  │ cols  0–35  │ 36–53 │  54–89   │ 90–107│ cols 108–143│
//  └─────────────┴───────┴──────────┴───────┴─────────────┘
//
struct RearLightBarConfig {
    static constexpr uint16_t WIDTH    = 144;
    static constexpr uint16_t HEIGHT   = 3;
    static constexpr uint16_t NUM_LEDS = WIDTH * HEIGHT; // 432

    // Zone boundaries (columns)
    static constexpr uint16_t TURN_SIGNAL_WIDTH = 36;
    static constexpr uint16_t TURN_LEFT_START   = 0;
    static constexpr uint16_t TURN_LEFT_END     = 36;
    static constexpr uint16_t TURN_RIGHT_START  = 108;
    static constexpr uint16_t TURN_RIGHT_END    = 144;

    static constexpr uint16_t CENTER_START      = 36;
    static constexpr uint16_t CENTER_END        = 108;

    static constexpr uint16_t REVERSE_WIDTH     = 18;
    static constexpr uint16_t REVERSE_L_START   = 36;
    static constexpr uint16_t REVERSE_L_END     = 54;
    static constexpr uint16_t REVERSE_R_START   = 90;
    static constexpr uint16_t REVERSE_R_END     = 108;

    static constexpr uint16_t BRAKE_START       = 54;
    static constexpr uint16_t BRAKE_END         = 90;
};

// ── Color Definitions ───────────────────────────────────────────────────────
// Note: NeoGrbFeature translates RgbColor to GRB wire format.
// Hardware test mode verifies whether physical LEDs match these expected colors.
struct TesterColors {
    inline static const RgbColor OFF     = RgbColor(0, 0, 0);
    inline static const RgbColor RED     = RgbColor(255, 0, 0);
    inline static const RgbColor GREEN   = RgbColor(0, 255, 0);
    inline static const RgbColor BLUE    = RgbColor(0, 0, 255);
    inline static const RgbColor WHITE   = RgbColor(255, 255, 255);
    inline static const RgbColor AMBER   = RgbColor(255, 80, 0);   // Turn indicator
    inline static const RgbColor WELCOME = RgbColor(0, 100, 255);  // Welcome blue
};

// ── Testbench Defaults ──────────────────────────────────────────────────────
struct TesterDefaults {
    // Default safe brightness (40/255 = ~15%) to avoid burning USB ports or brownouts
    static constexpr uint8_t  SAFE_BRIGHTNESS = 40;
    static constexpr uint32_t SERIAL_BAUD     = 115200;
};
