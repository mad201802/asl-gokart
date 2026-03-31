#pragma once
/// @file config.hpp
/// ESP32-tuned Sero configuration.
/// Conservative limits to keep RAM usage bounded (~10-15 KB).

#include <cstddef>
#include <cstdint>
#include <sero/core/log.hpp>
#include <NeoPixelBus.h>

struct Esp32Config {
    static constexpr std::size_t MaxPayloadSize         = 512;
    static constexpr std::size_t MaxServices            = 4;
    static constexpr std::size_t MaxMethods             = 8;
    static constexpr std::size_t MaxEvents              = 4;
    static constexpr std::size_t MaxSubscribers          = 4;
    static constexpr std::size_t MaxPendingRequests      = 8;
    static constexpr std::size_t MaxKnownServices        = 8;
    static constexpr uint32_t    RequestTimeoutMs        = 2000;
    static constexpr uint16_t    OfferTtlSeconds         = 10;
    static constexpr uint16_t    SubscriptionTtlSeconds  = 15;
    static constexpr uint8_t     SdFindRetryCount        = 5;
    static constexpr uint32_t    SdFindInitialDelayMs    = 200;
    static constexpr uint8_t     SdFindBackoffMultiplier = 2;
    static constexpr uint32_t    SdFindJitterMs          = 50;
    static constexpr uint8_t     SeqCounterAcceptWindow  = 15;
    static constexpr std::size_t TransportAddressSize    = 8;
    static constexpr std::size_t MaxReceiveQueueSize     = 8;
    static constexpr std::size_t MaxTrackedPeers         = 4;
    static constexpr std::size_t HmacKeySize             = 32;
    static constexpr std::size_t MaxDtcs                 = 8;
    static constexpr sero::LogLevel MinLogLevel           = sero::LogLevel::Off;
};

struct Esp32ServiceConfig {
    static constexpr uint16_t ESP32_UNICAST_PORT     = 30491;
    // Methods
    static constexpr uint16_t ZC_LIGHTS_ID           = 0x0001;
    static constexpr uint16_t ZC_LIGHTS_LEFT_ID      = 0x0002;
    static constexpr uint16_t ZC_LIGHTS_RIGHT_ID     = 0x0003;
    static constexpr uint16_t ZC_LIGHTS_HAZARD_ID    = 0x0004;
    static constexpr uint16_t ZC_LIGHTS_HEADLIGHTS_ID = 0x0005;
    static constexpr uint16_t ZC_LIGHTS_HIGH_BEAMS_ID = 0x0006;
    // Events (bit 15 must be set, and IDs must be >= 0x8000)
    static constexpr uint16_t ZC_LIGHTS_EVENT_STATE_ID = 0x8001; // Event: blinker state changed [left, hazard, right] — bit 15 must be set for NOTIFICATION messages
    static constexpr uint16_t ZC_LIGHTS_EVENT_HEADLIGHT_STATE_ID = 0x8002;
    static constexpr uint16_t ZC_LIGHTS_EVENT_HIGH_BEAM_STATE_ID = 0x8003;  
};

struct Esp32HwConfig {
    // Define any hardware-specific configuration parameters here, such as GPIO pins.
    static constexpr int LED_PIN_HEADLIGHT_LEFT = GPIO_NUM_32;
    static constexpr int LED_PIN_HEADLIGHT_RIGHT = GPIO_NUM_33;
    static constexpr int LED_PIN_HIGH_BEAM_LEFT = GPIO_NUM_3;
    static constexpr int LED_PIN_HIGH_BEAM_RIGHT = GPIO_NUM_4; 
    static constexpr int LED_PIN_ARGB_STRIP = GPIO_NUM_2;

};

struct Esp32LightsConfig {
    // Color for the ARGB strip
    static constexpr uint32_t ARGB_STRIP_COLOR = 0xFF0000; // Red color in ARGB format
    // Brightness for the ARGB strip (0-255)
    static constexpr uint8_t ARGB_STRIP_BRIGHTNESS = 128; // 50% brightness
    // Start LED index left blinker (0-based)
    static constexpr uint8_t ARGB_STRIP_LEFT_START = 0;
    static constexpr uint8_t ARGB_STRIP_LEFT_LENGTH= 10;
    // Start LED index right blinker (0-based)
    static constexpr uint8_t ARGB_STRIP_RIGHT_START = 10;
    static constexpr uint8_t ARGB_STRIP_RIGHT_LENGTH= 10;

    // Total number of LEDs on the ARGB strip
    static constexpr uint16_t ARGB_STRIP_NUM_LEDS = 20;

    // ── Blinker sweep animation settings ──
    // Sweep duration: time for the running animation to fill all LEDs (ms)
    static constexpr uint32_t BLINK_SWEEP_DURATION_LEFT_MS  = 400;
    static constexpr uint32_t BLINK_SWEEP_DURATION_RIGHT_MS = 400;
    // Off duration: pause with all LEDs off between blink cycles (ms)
    static constexpr uint32_t BLINK_OFF_DURATION_LEFT_MS    = 300;
    static constexpr uint32_t BLINK_OFF_DURATION_RIGHT_MS   = 300;
    // Sweep direction: true = from start index toward end, false = from end toward start.
    // Defaults: left sweeps outward (end→start), right sweeps outward (start→end).
    static constexpr bool BLINK_SWEEP_FORWARD_LEFT  = false;
    static constexpr bool BLINK_SWEEP_FORWARD_RIGHT = true;

    // NeoPixelBus RgbColor constants — use inline static const (C++17) because
    // RgbColor constructors are not constexpr in NeoPixelBus.
    inline static const RgbColor COLOR_OFF          = RgbColor(  0,   0,   0);
    inline static const RgbColor COLOR_RED          = RgbColor(255,   0,   0);
    inline static const RgbColor COLOR_WHITE        = RgbColor(255, 255, 255);
    inline static const RgbColor COLOR_WARM_WHITE   = RgbColor(255, 255, 200);
    inline static const RgbColor COLOR_ORANGE       = RgbColor(255, 40,   0);
};
