#pragma once
/// @file motor_service.hpp
/// Sero service for the motor zone controller.

#include <Arduino.h>
#include <sero.hpp>
#include "config.hpp"
#include "ota_handler.hpp"

class MotorService : public sero::IService<MotorService> {
private:
    bool relay1_state_ = false;
    bool relay2_state_ = false;

public:
    MotorService() = default;

    void begin() {
        pinMode(Esp32HwConfig::RELAY_1_PIN, OUTPUT);
        pinMode(Esp32HwConfig::RELAY_2_PIN, OUTPUT);
        digitalWrite(Esp32HwConfig::RELAY_1_PIN, HIGH);
        digitalWrite(Esp32HwConfig::RELAY_2_PIN, HIGH);
        relay1_state_ = false;
        relay2_state_ = false;
    }

    bool impl_is_ready() const { return true; }

    sero::ReturnCode impl_on_request(
        uint16_t       method_id,
        const uint8_t* payload,      std::size_t payload_length,
        uint8_t*       /*response*/, std::size_t& response_length)
    {
        response_length = 0;
        switch (method_id) {
            case Esp32ServiceConfig::ZC_MOTOR_OTA_METHOD_ID: {
                if (payload_length == 0 || payload_length >= 512) {
                    Serial.println("[ota] Invalid URL length");
                    return sero::ReturnCode::E_NOT_OK;
                }
                char url[512];
                memcpy(url, payload, payload_length);
                url[payload_length] = '\0';
                Serial.printf("[ota] Received URL: %s\n", url);
                // Acknowledge immediately — OTA task runs in background,
                // device will reboot automatically on success.
                if (!start_ota(url)) {
                    return sero::ReturnCode::E_NOT_OK;
                }
                return sero::ReturnCode::E_OK;
            }

            case Esp32ServiceConfig::ZC_MOTOR_TOGGLE_RELAY_METHOD_ID: {
                if (payload_length != 1) {
                    Serial.println("[relay] Invalid payload length");
                    return sero::ReturnCode::E_NOT_OK;
                }
                uint8_t relay_idx = payload[0];
                if (relay_idx == 0) {
                    relay1_state_ = !relay1_state_;
                    digitalWrite(Esp32HwConfig::RELAY_1_PIN, relay1_state_ ? LOW : HIGH);
                    Serial.printf("[relay] Relay 1 toggled to %s\n", relay1_state_ ? "ON" : "OFF");
                    return sero::ReturnCode::E_OK;
                } else if (relay_idx == 1) {
                    relay2_state_ = !relay2_state_;
                    digitalWrite(Esp32HwConfig::RELAY_2_PIN, relay2_state_ ? LOW : HIGH);
                    Serial.printf("[relay] Relay 2 toggled to %s\n", relay2_state_ ? "ON" : "OFF");
                    return sero::ReturnCode::E_OK;
                } else {
                    Serial.printf("[relay] Invalid relay index: %d\n", relay_idx);
                    return sero::ReturnCode::E_NOT_OK;
                }
            }

            default:
                return sero::ReturnCode::E_UNKNOWN_METHOD;
        }
    }
};
