#pragma once
/// @file lights_service.hpp

#include <sero.hpp>
#include <config.hpp>
#include <blinker_controller.hpp>
#include <headlights_controller.hpp>

class LightsService : public sero::IService<LightsService> {
public:
    explicit LightsService(BlinkerController& blinker, HeadlightsController& headlights) : blinker_(blinker), headlights_(headlights) {}

    bool impl_is_ready() const { return true; }

    sero::ReturnCode impl_on_request(
        uint16_t       method_id,
        const uint8_t* /*payload*/, std::size_t /*payload_length*/,
        uint8_t*       /*response*/, std::size_t& response_length)
    {
        response_length = 0;
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
            case Esp32ServiceConfig::ZC_LIGHTS_HEADLIGHTS_ID:
                headlights_.toggle_headlights();
                return sero::ReturnCode::E_OK;
            case Esp32ServiceConfig::ZC_LIGHTS_HIGH_BEAMS_ID:
                headlights_.toggle_high_beams();
                return sero::ReturnCode::E_OK;
            // Also create headlight_controller.hpp
            default:
                return sero::ReturnCode::E_UNKNOWN_METHOD;
        }
    }

private:
    BlinkerController& blinker_;
    HeadlightsController& headlights_;
};