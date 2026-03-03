#pragma once
/// @file lights_service.hpp

#include <sero.hpp>
#include <config.hpp>

class LightsService : public sero::IService<LightsService> {
public:
    bool impl_is_ready() const { return true; }

    sero::ReturnCode impl_on_request(
        uint16_t       method_id,
        const uint8_t* /*payload*/, std::size_t /*payload_length*/,
        uint8_t*       response, std::size_t& response_length)
    {
        switch (method_id) {
            case Esp32ServiceConfig::ZC_LIGHTS_LEFT_ID:
                Serial.println("Left blinker method called");
                return sero::ReturnCode::E_OK; // No response payload for this method.
            case Esp32ServiceConfig::ZC_LIGHTS_RIGHT_ID:
                Serial.println("Right blinker method called");
                return sero::ReturnCode::E_OK; // No response payload for this method.
            case Esp32ServiceConfig::ZC_LIGHTS_HAZARD_ID:
                Serial.println("Hazards method called!");
                return sero::ReturnCode::E_OK; // No response payload for this method.
            default:
                response_length = 0;
                return sero::ReturnCode::E_UNKNOWN_METHOD;
        }
    }
};