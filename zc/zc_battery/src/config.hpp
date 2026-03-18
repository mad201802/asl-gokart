#pragma once
/// @file config.hpp
/// ESP32-tuned Sero configuration.
/// Conservative limits to keep RAM usage bounded (~10-15 KB).

#include <cstddef>
#include <cstdint>
#include <sero/core/log.hpp>

struct Esp32Config {
    static constexpr std::size_t MaxPayloadSize         = 512;
    static constexpr std::size_t MaxServices            = 1;
    static constexpr std::size_t MaxMethods             = 2;
    static constexpr std::size_t MaxEvents              = 8;
    static constexpr std::size_t MaxSubscribers          = 2;
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
    static constexpr uint16_t ESP32_UNICAST_PORT            = 30491;
    static constexpr uint16_t ZC_BATTERY_ID                 = 0x0003;
    // bit 15 must be set for NOTIFICATION messages
    static constexpr uint16_t ZC_BATTERY_EVENT_VOLTAGE_ID   = 0x8001; // Event: pack voltage changed | float
    static constexpr uint16_t ZC_BATTERY_EVENT_CURRENT_ID   = 0x8002; // Event: current changed | float
    static constexpr uint16_t ZC_BATTERY_EVENT_TEMP_ID      = 0x8003; // Event: temperature changed | [float, float, ...]
};

struct Esp32HwConfig {
    // OneWire bus for DS18B20 temperature sensors
    static constexpr int ONEWIRE_BUS_PIN = GPIO_NUM_5;
    // Daly BMS UART (Serial1) – Olimex ESP32-POE-ISO: U1RXD / U1TXD
    static constexpr int BMS_UART_RX_PIN = GPIO_NUM_36;
    static constexpr int BMS_UART_TX_PIN = GPIO_NUM_4;
};
