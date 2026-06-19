#pragma once
/// @file motor_service.hpp
/// Sero service for the motor zone controller.

#include <Arduino.h>
#include <sero.hpp>
#include "config.hpp"
#include "ota_handler.hpp"

class MotorService : public sero::IService<MotorService> {
public:
    MotorService() = default;

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

            default:
                return sero::ReturnCode::E_UNKNOWN_METHOD;
        }
    }
};
