#pragma once
/// @file template_service.hpp
/// Sero service stub for the template zone controller.
/// Replace the log statements with real application logic when cloning this ZC.

#include <Arduino.h>
#include <sero.hpp>
#include "config.hpp"

class TemplateService : public sero::IService<TemplateService> {
public:
    TemplateService() = default;

    bool impl_is_ready() const { return true; }

    sero::ReturnCode impl_on_request(
        uint16_t       method_id,
        const uint8_t* /*payload*/,  std::size_t /*payload_length*/,
        uint8_t*       /*response*/, std::size_t& response_length)
    {
        response_length = 0;
        switch (method_id) {
            case Esp32ServiceConfig::ZC_TEMPLATE_METHOD_EXAMPLE_ID:
                Serial.println("[template] method_example called");
                // TODO: Implement method logic here.
                return sero::ReturnCode::E_OK;
            default:
                return sero::ReturnCode::E_UNKNOWN_METHOD;
        }
    }
};
