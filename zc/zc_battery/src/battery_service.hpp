#pragma once
/// @file battery_service.hpp
/// Sero service for the battery zone controller.
/// This service is event-only: it publishes voltage, current, and
/// temperature readings.  No inbound method requests are expected.

#include <sero.hpp>
#include "config.hpp"

class BatteryService : public sero::IService<BatteryService> {
public:
    bool impl_is_ready() const { return true; }

    sero::ReturnCode impl_on_request(
        uint16_t       /*method_id*/,
        const uint8_t* /*payload*/, std::size_t /*payload_length*/,
        uint8_t*       /*response*/, std::size_t& response_length)
    {
        response_length = 0;
        return sero::ReturnCode::E_UNKNOWN_METHOD;
    }
};
