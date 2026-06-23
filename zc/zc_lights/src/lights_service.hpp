#pragma once
/// @file lights_service.hpp
/// Sero service that dispatches incoming method calls to the light controllers.
/// Coordinates turn signals across all three ARGB strips (rear + front L/R).

#include <sero.hpp>
#include <config.hpp>
#include <rear_light_bar_controller.hpp>
#include <front_drl_controller.hpp>
#include <high_beam_controller.hpp>
#include "ota_handler.hpp"

/// @tparam FrontLeftMethod   NeoPixelBus method type for the front-left DRL strip
/// @tparam FrontRightMethod  NeoPixelBus method type for the front-right DRL strip
template<typename FrontLeftMethod, typename FrontRightMethod>
class LightsService
    : public sero::IService<LightsService<FrontLeftMethod, FrontRightMethod>>
{
public:
    explicit LightsService(
            RearLightBarController&                    rear,
            FrontDrlController<FrontLeftMethod>&        front_left,
            FrontDrlController<FrontRightMethod>&       front_right,
            HighBeamController&                         high_beams)
        : rear_(rear)
        , front_left_(front_left)
        , front_right_(front_right)
        , high_beams_(high_beams)
    {}

    bool impl_is_ready() const { return true; }

    sero::ReturnCode impl_on_request(
        uint16_t       method_id,
        const uint8_t* payload, std::size_t payload_length,
        uint8_t*       /*response*/, std::size_t& response_length)
    {
        response_length = 0;

        switch (method_id) {

            // ── Turn signals (coordinated across rear + both front strips) ──

            case Esp32ServiceConfig::ZC_LIGHTS_LEFT_ID:
                rear_.toggle_left();
                return sero::ReturnCode::E_OK;

            case Esp32ServiceConfig::ZC_LIGHTS_RIGHT_ID:
                rear_.toggle_right();
                return sero::ReturnCode::E_OK;

            case Esp32ServiceConfig::ZC_LIGHTS_HAZARD_ID:
                rear_.toggle_hazard();
                return sero::ReturnCode::E_OK;

            // ── High beam relay ─────────────────────────────────────────────

            case Esp32ServiceConfig::ZC_LIGHTS_HIGH_BEAMS_ID:
                if (payload_length > 0) {
                    bool on = payload[0] != 0;
                    high_beams_.set(on, on);
                } else {
                    high_beams_.toggle();
                }
                return sero::ReturnCode::E_OK;

            // ── Rear light bar ──────────────────────────────────────────────

            case Esp32ServiceConfig::ZC_LIGHTS_BRAKE_ID:
                rear_.set_brake(!rear_.is_brake_on());
                return sero::ReturnCode::E_OK;

            case Esp32ServiceConfig::ZC_LIGHTS_REVERSE_ID:
                rear_.set_reverse(!rear_.is_reverse_on());
                return sero::ReturnCode::E_OK;

            case Esp32ServiceConfig::ZC_LIGHTS_TAIL_ID:
                rear_.set_tail(!rear_.is_tail_on());
                return sero::ReturnCode::E_OK;

            // ── Front DRLs ──────────────────────────────────────────────────

            case Esp32ServiceConfig::ZC_LIGHTS_DRL_ID: {
                bool new_state = !front_left_.is_drl_on();
                front_left_.set_drl(new_state);
                front_right_.set_drl(new_state);
                return sero::ReturnCode::E_OK;
            }

            // ── Welcome animation ───────────────────────────────────────────

            case Esp32ServiceConfig::ZC_LIGHTS_WELCOME_ID:
                front_left_.trigger_welcome(welcome_color_);
                front_right_.trigger_welcome(welcome_color_);
                return sero::ReturnCode::E_OK;

            // ── Set brightness ──────────────────────────────────────────────
            // payload[0] = target: 0=rear, 1=front_left, 2=front_right, 0xFF=all
            // payload[1] = brightness value (0–255)

            case Esp32ServiceConfig::ZC_LIGHTS_SET_BRIGHTNESS_ID:
                return handle_set_brightness(payload, payload_length);

            // ── Set welcome color ───────────────────────────────────────────
            // payload = [R, G, B]

            case Esp32ServiceConfig::ZC_LIGHTS_SET_WELCOME_COLOR_ID:
                return handle_set_welcome_color(payload, payload_length);

            // ── OTA Trigger ──────────────────────────────────────────────────

            case Esp32ServiceConfig::ZC_LIGHTS_OTA_METHOD_ID: {
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

private:
    RearLightBarController&                    rear_;
    FrontDrlController<FrontLeftMethod>&        front_left_;
    FrontDrlController<FrontRightMethod>&       front_right_;
    HighBeamController&                         high_beams_;

    RgbColor welcome_color_ = FrontDrlConfig::COLOR_WELCOME;

    // ── Brightness handler ──────────────────────────────────────────────

    sero::ReturnCode handle_set_brightness(const uint8_t* payload, std::size_t len) {
        if (!payload || len < 2) return sero::ReturnCode::E_NOT_OK;

        uint8_t target     = payload[0];
        uint8_t brightness = payload[1];

        switch (target) {
            case 0:    rear_.set_brightness(brightness);        break;
            case 1:    front_left_.set_brightness(brightness);  break;
            case 2:    front_right_.set_brightness(brightness); break;
            case 0xFF: // all
                rear_.set_brightness(brightness);
                front_left_.set_brightness(brightness);
                front_right_.set_brightness(brightness);
                break;
            default:
                return sero::ReturnCode::E_NOT_OK;
        }
        Serial.printf("[lights] brightness target=%u val=%u\n", target, brightness);
        return sero::ReturnCode::E_OK;
    }

    // ── Welcome color handler ───────────────────────────────────────────

    sero::ReturnCode handle_set_welcome_color(const uint8_t* payload, std::size_t len) {
        if (!payload || len < 3) return sero::ReturnCode::E_NOT_OK;

        welcome_color_ = RgbColor(payload[0], payload[1], payload[2]);
        front_left_.set_welcome_color(welcome_color_);
        front_right_.set_welcome_color(welcome_color_);
        Serial.printf("[lights] welcome color R=%u G=%u B=%u\n",
                      payload[0], payload[1], payload[2]);
        return sero::ReturnCode::E_OK;
    }
};