#pragma once
/// @file config.hpp
/// ESP32-tuned Sero configuration.
/// Conservative limits to keep RAM usage bounded (~10-15 KB).

#include <cstddef>
#include <cstdint>

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
};

struct Esp32ServiceConfig {
    static constexpr uint16_t ESP32_UNICAST_PORT     = 30491;
    static constexpr uint16_t ZC_LIGHTS_ID           = 0x0001;
    static constexpr uint16_t ZC_LIGHTS_LEFT_ID      = 0x0002;
    static constexpr uint16_t ZC_LIGHTS_RIGHT_ID     = 0x0003;
    static constexpr uint16_t ZC_LIGHTS_HAZARD_ID    = 0x0004;
};

struct Esp32HwConfig {
    // Define any hardware-specific configuration parameters here, such as GPIO pins.
    static constexpr int LED_PIN_LEFT = GPIO_NUM_14;
    static constexpr int LED_PIN_RIGHT = GPIO_NUM_15;
};
