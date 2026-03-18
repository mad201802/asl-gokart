#pragma once
/// @file temp_sensor.hpp
/// Non-blocking DS18B20 temperature sensor reader.
/// Replaces the old SensorManager with a clean, fast implementation.
///
/// Usage:
///   TempSensor ts;
///   ts.begin();                       // discover sensors
///   ts.requestConversion();           // start async ADC
///   // ... do other work for ~200ms ...
///   if (ts.isConversionReady()) {
///       auto temps = ts.readTemperatures();
///   }

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <vector>
#include "config.hpp"

class TempSensor {
public:
    // 10-bit resolution: 0.25 °C precision, 187.5 ms conversion time
    static constexpr uint8_t  RESOLUTION     = 10;
    static constexpr uint32_t CONVERSION_MS  = 200;   // margin above 187.5 ms
    static constexpr float    INVALID_TEMP   = -127.0f;
    static constexpr uint8_t  MAX_SENSORS    = 10;

    TempSensor()
        : wire_(Esp32HwConfig::ONEWIRE_BUS_PIN)
        , dallas_(&wire_) {}

    /// Discover sensors and configure resolution. Call once from setup().
    bool begin() {
        dallas_.begin();
        dallas_.setWaitForConversion(false);

        sensor_count_ = dallas_.getDeviceCount();
        if (sensor_count_ > MAX_SENSORS) sensor_count_ = MAX_SENSORS;

        for (uint8_t i = 0; i < sensor_count_; i++) {
            if (dallas_.getAddress(addresses_[i], i)) {
                dallas_.setResolution(addresses_[i], RESOLUTION);
            }
        }

        Serial.printf("[temp] Found %u DS18B20 sensor(s) on pin %d\n",
                      sensor_count_, Esp32HwConfig::ONEWIRE_BUS_PIN);
        return sensor_count_ > 0;
    }

    /// Issue a non-blocking temperature conversion request.
    void requestConversion() {
        dallas_.requestTemperatures();
        conversion_start_   = millis();
        conversion_pending_ = true;
    }

    /// True when enough time has passed for the conversion to finish.
    bool isConversionReady() const {
        return conversion_pending_ && (millis() - conversion_start_ >= CONVERSION_MS);
    }

    /// Read results after conversion completes. Returns one float per sensor.
    /// Invalid / disconnected sensors yield INVALID_TEMP.
    std::vector<float> readTemperatures() {
        std::vector<float> temps;
        if (!conversion_pending_) return temps;
        conversion_pending_ = false;

        temps.reserve(sensor_count_);
        for (uint8_t i = 0; i < sensor_count_; i++) {
            float t = dallas_.getTempC(addresses_[i]);
            // 85 °C is the power-on reset value — treat as invalid
            if (t == DEVICE_DISCONNECTED_C || t == 85.0f) {
                t = INVALID_TEMP;
            }
            temps.push_back(t);
        }
        return temps;
    }

    uint8_t sensorCount() const { return sensor_count_; }

private:
    OneWire           wire_;
    DallasTemperature dallas_;
    DeviceAddress     addresses_[MAX_SENSORS];
    uint8_t           sensor_count_      = 0;
    uint32_t          conversion_start_  = 0;
    bool              conversion_pending_ = false;
};
