#pragma once
/// @file template_service.hpp
/// Sero service stub for the template zone controller.
/// Replace the log statements with real application logic when cloning this ZC.

#include <Arduino.h>
#include <sero.hpp>
#include "config.hpp"
#include "ota_handler.hpp"

class TemplateService : public sero::IService<TemplateService> {
public:
    TemplateService() = default;

    bool impl_is_ready() const { return true; }

    sero::ReturnCode impl_on_request(
        uint16_t       method_id,
        const uint8_t* payload,      std::size_t payload_length,
        uint8_t*       /*response*/, std::size_t& response_length)
    {
        response_length = 0;
        switch (method_id) {
            case Esp32ServiceConfig::ZC_TEMPLATE_METHOD_EXAMPLE_ID:
                Serial.println("[template] method_example called");
                // TODO: Implement method logic here.
                return sero::ReturnCode::E_OK;

            case Esp32ServiceConfig::ZC_TEMPLATE_OTA_METHOD_ID: {
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
