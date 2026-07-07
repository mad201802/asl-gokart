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
// TODO: Replace 0x00FF with the real service ID assigned to this ZC.
// Method IDs must have bit 15 = 0 (range 0x0001–0x7FFF).
// Event  IDs must have bit 15 = 1 (range 0x8001–0xFFFF).

struct Esp32ServiceConfig {
    static constexpr uint16_t ESP32_UNICAST_PORT = 30491;

    // Assigned service ID for zc_logging
    static constexpr uint16_t ZC_LOGGING_ID = 0x0005;

    // Reserved OTA trigger method
    static constexpr uint16_t ZC_LOGGING_OTA_METHOD_ID = 0x00FF;

    // Target ZCs to log
    static constexpr uint16_t ZC_BATTERY_ID = 0x0003;
    static constexpr uint16_t ZC_BATTERY_EVENT_VOLTAGE_ID = 0x8001;
    static constexpr uint16_t ZC_BATTERY_EVENT_CURRENT_ID = 0x8002;
    static constexpr uint16_t ZC_BATTERY_EVENT_TEMP_ID = 0x8003;

    static constexpr uint16_t ZC_MOTOR_ID = 0x0004;
    static constexpr uint16_t ZC_MOTOR_EVENT_RPM_ID = 0x8001;
};
