#pragma once
/// @file lights_service.hpp

#include <sero.hpp>
#include <config.hpp>
#include <blinker_controller.hpp>

class LightsService : public sero::IService<LightsService> {
public:
    explicit LightsService(BlinkerController& blinker) : blinker_(blinker) {}

    bool impl_is_ready() const { return true; }

    sero::ReturnCode impl_on_request(
        uint16_t       method_id,
        const uint8_t* /*payload*/, std::size_t /*payload_length*/,
        uint8_t*       /*response*/, std::size_t& response_length)
    {
        response_length = 0; // all methods are fire-and-forget (no response payload)
        switch (method_id) {
            case Esp32ServiceConfig::ZC_LIGHTS_LEFT_ID:
                blinker_.toggle_left();
                return sero::ReturnCode::E_OK;
            case Esp32ServiceConfig::ZC_LIGHTS_RIGHT_ID:
                blinker_.toggle_right();
                return sero::ReturnCode::E_OK;
            case Esp32ServiceConfig::ZC_LIGHTS_HAZARD_ID:
                blinker_.toggle_hazard();
                return sero::ReturnCode::E_OK;
            default:
                return sero::ReturnCode::E_UNKNOWN_METHOD;
        }
    }

private:
    BlinkerController& blinker_;
};