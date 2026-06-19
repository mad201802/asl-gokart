#pragma once
/// @file config.hpp
/// ESP32-tuned Sero configuration for the template zone controller.
/// Adjust the constants below when creating a real ZC from this template.

#include <cstddef>
#include <cstdint>
#include <sero/core/log.hpp>

// ── Sero compile-time limits ─────────────────────────────────────────────────
// Conservative limits keep RAM usage bounded (~10–15 KB).

struct Esp32Config {
    static constexpr std::size_t MaxPayloadSize          = 512;
    static constexpr std::size_t MaxServices             = 4;
    static constexpr std::size_t MaxMethods              = 8;
    static constexpr std::size_t MaxEvents               = 4;
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
    static constexpr sero::LogLevel MinLogLevel          = sero::LogLevel::Off;
};

// ── Service / method / event IDs ─────────────────────────────────────────────
// Method IDs must have bit 15 = 0 (range 0x0001–0x7FFF).
// Event  IDs must have bit 15 = 1 (range 0x8001–0xFFFF).

struct Esp32ServiceConfig {
    static constexpr uint16_t ESP32_UNICAST_PORT = 30491;

    // Registry: zc_lights=0x0001, zc_buttons=0x0002, zc_battery=0x0003.
    static constexpr uint16_t ZC_MOTOR_ID = 0x0004;

    // Reserved OTA trigger method (present on every ZC, bit 15 = 0).
    // Payload: UTF-8 URL string of the firmware binary served by the headunit.
    static constexpr uint16_t ZC_MOTOR_OTA_METHOD_ID = 0x00FF;

    // Event: both motor values | [left_rpm u16 BE][left_reverse u8]
    //                            [right_rpm u16 BE][right_reverse u8]
    static constexpr uint16_t    ZC_MOTOR_EVENT_RPM_ID            = 0x8001;
    static constexpr std::size_t ZC_MOTOR_EVENT_RPM_PAYLOAD_SIZE  = 6;
};

// ── Hardware pin assignments ─────────────────────────────────────────────────
// Left controller matches the board's TX1/RX1 macros (pins_arduino.h).
// Right controller intentionally avoids the board's default RX2=GPIO35
// (input-only, reserved for throttle ADC on the separate zc_throttle board).
struct Esp32HwConfig {
    static constexpr uint32_t KELLY_BAUD_RATE       = 19200;
    static constexpr uint32_t KELLY_READ_TIMEOUT_MS = 100;
    static constexpr int8_t   KELLY_LEFT_TX_PIN     = 4;
    static constexpr int8_t   KELLY_LEFT_RX_PIN     = 36;
    static constexpr int8_t   KELLY_RIGHT_TX_PIN    = 32;
    static constexpr int8_t   KELLY_RIGHT_RX_PIN    = 33;
};
