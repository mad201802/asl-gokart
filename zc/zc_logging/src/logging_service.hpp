#pragma once
/// @file logging_service.hpp
/// Sero service + event handler implementation for the logging zone controller.

#include <Arduino.h>
#include <FS.h>
#include <SD_MMC.h>
#include <Preferences.h>
#include <time.h>
#include <sero.hpp>
#include "config.hpp"
#include "ota_handler.hpp"

class LoggingService : public sero::IService<LoggingService>,
                       public sero::IEventHandler<LoggingService> {
public:
    // Telemetry record structure for buffering
    struct LogRecord {
        uint32_t uptime_ms;
        uint32_t rtc_time;
        bool     battery_online;
        float    battery_voltage;
        float    battery_current;
        float    battery_temps[3];
        uint8_t  battery_temp_count;

        bool     motor_online;
        uint16_t motor_l_rpm;
        uint8_t  motor_l_throttle;
        uint8_t  motor_l_brake;
        uint8_t  motor_l_temp;
        uint8_t  motor_l_ctrl_temp;
        uint16_t motor_r_rpm;
        uint8_t  motor_r_throttle;
        uint8_t  motor_r_brake;
        uint8_t  motor_r_temp;
        uint8_t  motor_r_ctrl_temp;
        uint8_t  reverse_state;
        uint8_t  relay1_state;
        uint8_t  relay2_state;
    };

    LoggingService() = default;

    // --- IService Interface ---
    bool impl_is_ready() const { return true; }

    sero::ReturnCode impl_on_request(
        uint16_t       method_id,
        const uint8_t* payload,      std::size_t payload_length,
        uint8_t*       /*response*/, std::size_t& response_length)
    {
        response_length = 0;
        if (method_id == Esp32ServiceConfig::ZC_LOGGING_OTA_METHOD_ID) {
            if (payload_length == 0 || payload_length >= 512) {
                Serial.println("[ota] Invalid URL length");
                return sero::ReturnCode::E_NOT_OK;
            }
            char url[512];
            memcpy(url, payload, payload_length);
            url[payload_length] = '\0';
            Serial.printf("[ota] Received URL: %s\n", url);
            if (!start_ota(url)) {
                return sero::ReturnCode::E_NOT_OK;
            }
            return sero::ReturnCode::E_OK;
        }
        return sero::ReturnCode::E_UNKNOWN_METHOD;
    }

    // --- IEventHandler Interface ---
    void impl_on_event(uint16_t service_id, uint16_t event_id,
                       const uint8_t* payload, std::size_t payload_length)
    {
        uint32_t now = millis();
        if (service_id == Esp32ServiceConfig::ZC_BATTERY_ID) {
            last_battery_event_ms_ = now;
            if (event_id == Esp32ServiceConfig::ZC_BATTERY_EVENT_VOLTAGE_ID) {
                if (payload_length == sizeof(float)) {
                    std::memcpy(&battery_voltage_, payload, sizeof(float));
                }
            } else if (event_id == Esp32ServiceConfig::ZC_BATTERY_EVENT_CURRENT_ID) {
                if (payload_length == sizeof(float)) {
                    std::memcpy(&battery_current_, payload, sizeof(float));
                }
            } else if (event_id == Esp32ServiceConfig::ZC_BATTERY_EVENT_TEMP_ID) {
                size_t num_temps = payload_length / sizeof(float);
                if (num_temps > 3) num_temps = 3;
                battery_temp_count_ = num_temps;
                for (size_t i = 0; i < num_temps; ++i) {
                    std::memcpy(&battery_temps_[i], payload + i * sizeof(float), sizeof(float));
                }
            }
        } else if (service_id == Esp32ServiceConfig::ZC_MOTOR_ID) {
            if (event_id == Esp32ServiceConfig::ZC_MOTOR_EVENT_RPM_ID) {
                if (payload_length >= 19) {
                    last_motor_event_ms_ = now;
                    // Unpack left motor (bytes 0-7)
                    motor_l_rpm_       = (payload[0] << 8) | payload[1];
                    motor_l_throttle_  = payload[2];
                    motor_l_brake_     = payload[3];
                    motor_l_temp_      = payload[6];
                    motor_l_ctrl_temp_ = payload[7];

                    // Unpack right motor (bytes 8-15)
                    motor_r_rpm_       = (payload[8] << 8) | payload[9];
                    motor_r_throttle_  = payload[10];
                    motor_r_brake_     = payload[11];
                    motor_r_temp_      = payload[14];
                    motor_r_ctrl_temp_ = payload[15];

                    // Unpack extra (bytes 16-18)
                    relay1_state_  = payload[16];
                    relay2_state_  = payload[17];
                    reverse_state_ = payload[18];
                }
            }
        }
    }

    // --- Public API ---
    bool begin() {
        // SD card mount in 1-bit mode for Olimex board compatibility
        if (!SD_MMC.begin("/sdcard", true)) {
            Serial.println("[log] SD_MMC Mount Failed!");
            sd_mounted_ = false;
            return false;
        }
        Serial.println("[log] SD_MMC Card Mounted.");
        sd_mounted_ = true;

        // Try syncing NTP time
        Serial.println("[log] Syncing NTP time...");
        configTime(0, 0, "pool.ntp.org", "time.nist.gov");
        struct tm timeinfo;
        bool time_synced = getLocalTime(&timeinfo, 5000);

        if (time_synced) {
            snprintf(log_filename_, sizeof(log_filename_), "/log_%04d%02d%02d_%02d%02d%02d.csv",
                     timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                     timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
        } else {
            Preferences prefs;
            prefs.begin("zc_logging", false);
            uint32_t boot_cnt = prefs.getUInt("boot_cnt", 0) + 1;
            prefs.putUInt("boot_cnt", boot_cnt);
            prefs.end();

            snprintf(log_filename_, sizeof(log_filename_), "/log_boot_%u_unsynced.csv", boot_cnt);
        }
        Serial.printf("[log] Target file: %s\n", log_filename_);

        // Write CSV Header
        File file = SD_MMC.open(log_filename_, FILE_WRITE);
        if (file) {
            file.println("Uptime_ms,RTC_Time,Battery_Online,Battery_Voltage_V,Battery_Current_A,"
                         "Battery_Temp0_C,Battery_Temp1_C,Battery_Temp2_C,Motor_Online,"
                         "Motor_L_RPM,Motor_L_Throttle,Motor_L_Brake,Motor_L_Temp_C,Motor_L_Ctrl_Temp_C,"
                         "Motor_R_RPM,Motor_R_Throttle,Motor_R_Brake,Motor_R_Temp_C,Motor_R_Ctrl_Temp_C,"
                         "Reverse,Relay1,Relay2");
            file.close();
            Serial.println("[log] Header written successfully.");
        } else {
            Serial.println("[log] Failed to create initial log file!");
            sd_mounted_ = false;
            return false;
        }

        // Initialize logging queue
        log_queue_ = xQueueCreate(100, sizeof(LogRecord));
        if (log_queue_ == nullptr) {
            Serial.println("[log] Queue creation failed!");
            return false;
        }

        // Create writer task (runs on CPU core 1 by default)
        BaseType_t res = xTaskCreate(
            [](void* param) {
                static_cast<LoggingService*>(param)->sd_write_task();
            },
            "sd_write_task",
            8192,
            this,
            2,
            &task_handle_
        );

        if (res != pdPASS) {
            Serial.println("[log] Task creation failed!");
            return false;
        }

        return true;
    }

    // Call periodically from loop()
    template <typename Runtime>
    void update(Runtime& rt, uint32_t now) {
        if (!sd_mounted_ || log_queue_ == nullptr) return;

        static uint32_t last_log_time = 0;
        if (now - last_log_time >= 100) { // 10Hz fixed logging rate
            last_log_time = now;

            LogRecord record;
            record.uptime_ms = now;

            struct tm timeinfo;
            if (getLocalTime(&timeinfo, 0)) {
                record.rtc_time = static_cast<uint32_t>(time(nullptr));
            } else {
                record.rtc_time = 0;
            }

            // Check if battery service is online and sending events
            bool bat_found = (rt.service_discovery().get_consumer_state(Esp32ServiceConfig::ZC_BATTERY_ID) == sero::ServiceDiscovery<Esp32Config>::ConsumerState::FOUND);
            bool bat_active = (now - last_battery_event_ms_ < 2000);
            record.battery_online = bat_found && bat_active;

            if (record.battery_online) {
                record.battery_voltage = battery_voltage_;
                record.battery_current = battery_current_;
                record.battery_temp_count = battery_temp_count_;
                for (int i = 0; i < 3; ++i) {
                    record.battery_temps[i] = battery_temps_[i];
                }
            } else {
                record.battery_voltage = 0.0f;
                record.battery_current = 0.0f;
                record.battery_temp_count = 0;
                for (int i = 0; i < 3; ++i) {
                    record.battery_temps[i] = -127.0f;
                }
            }

            // Check if motor service is online and sending events
            bool mot_found = (rt.service_discovery().get_consumer_state(Esp32ServiceConfig::ZC_MOTOR_ID) == sero::ServiceDiscovery<Esp32Config>::ConsumerState::FOUND);
            bool mot_active = (now - last_motor_event_ms_ < 2000);
            record.motor_online = mot_found && mot_active;

            if (record.motor_online) {
                record.motor_l_rpm = motor_l_rpm_;
                record.motor_l_throttle = motor_l_throttle_;
                record.motor_l_brake = motor_l_brake_;
                record.motor_l_temp = motor_l_temp_;
                record.motor_l_ctrl_temp = motor_l_ctrl_temp_;

                record.motor_r_rpm = motor_r_rpm_;
                record.motor_r_throttle = motor_r_throttle_;
                record.motor_r_brake = motor_r_brake_;
                record.motor_r_temp = motor_r_temp_;
                record.motor_r_ctrl_temp = motor_r_ctrl_temp_;

                record.reverse_state = reverse_state_;
                record.relay1_state = relay1_state_;
                record.relay2_state = relay2_state_;
            } else {
                record.motor_l_rpm = 0;
                record.motor_l_throttle = 0;
                record.motor_l_brake = 0;
                record.motor_l_temp = 0;
                record.motor_l_ctrl_temp = 0;

                record.motor_r_rpm = 0;
                record.motor_r_throttle = 0;
                record.motor_r_brake = 0;
                record.motor_r_temp = 0;
                record.motor_r_ctrl_temp = 0;

                record.reverse_state = 0;
                record.relay1_state = 0;
                record.relay2_state = 0;
            }

            if (xQueueSend(log_queue_, &record, 0) != pdTRUE) {
                Serial.println("[log] Log queue full! Data dropped.");
            }
        }
    }

private:
    // ponytail: sd_write_task keeps file open and syncs every 2s to optimize write operations while staying safe from power cut data loss
    void sd_write_task() {
        LogRecord record;
        File log_file;
        uint32_t last_close_time = 0;

        while (true) {
            if (xQueueReceive(log_queue_, &record, pdMS_TO_TICKS(1000)) == pdTRUE) {
                if (!log_file) {
                    log_file = SD_MMC.open(log_filename_, FILE_APPEND);
                    if (!log_file) {
                        Serial.println("[log] Failed to open log file for write!");
                        vTaskDelay(pdMS_TO_TICKS(100));
                        continue;
                    }
                }

                // Format battery fields. Offline = "null"
                char bat_v_str[16]  = "null";
                char bat_i_str[16]  = "null";
                char bat_t0_str[16] = "null";
                char bat_t1_str[16] = "null";
                char bat_t2_str[16] = "null";

                if (record.battery_online) {
                    dtostrf(record.battery_voltage, 1, 2, bat_v_str);
                    dtostrf(record.battery_current, 1, 2, bat_i_str);
                    if (record.battery_temp_count > 0 && record.battery_temps[0] != -127.0f) {
                        dtostrf(record.battery_temps[0], 1, 2, bat_t0_str);
                    }
                    if (record.battery_temp_count > 1 && record.battery_temps[1] != -127.0f) {
                        dtostrf(record.battery_temps[1], 1, 2, bat_t1_str);
                    }
                    if (record.battery_temp_count > 2 && record.battery_temps[2] != -127.0f) {
                        dtostrf(record.battery_temps[2], 1, 2, bat_t2_str);
                    }
                }

                // Format motor fields. Offline = "null"
                char mot_l_rpm_str[16] = "null";
                char mot_l_thr_str[16] = "null";
                char mot_l_brk_str[16] = "null";
                char mot_l_t_str[16]   = "null";
                char mot_l_ct_str[16]  = "null";

                char mot_r_rpm_str[16] = "null";
                char mot_r_thr_str[16] = "null";
                char mot_r_brk_str[16] = "null";
                char mot_r_t_str[16]   = "null";
                char mot_r_ct_str[16]  = "null";

                char rev_str[16] = "null";
                char r1_str[16]  = "null";
                char r2_str[16]  = "null";

                if (record.motor_online) {
                    snprintf(mot_l_rpm_str, sizeof(mot_l_rpm_str), "%u", record.motor_l_rpm);
                    snprintf(mot_l_thr_str, sizeof(mot_l_thr_str), "%u", record.motor_l_throttle);
                    snprintf(mot_l_brk_str, sizeof(mot_l_brk_str), "%u", record.motor_l_brake);
                    snprintf(mot_l_t_str, sizeof(mot_l_t_str), "%u", record.motor_l_temp);
                    snprintf(mot_l_ct_str, sizeof(mot_l_ct_str), "%u", record.motor_l_ctrl_temp);

                    snprintf(mot_r_rpm_str, sizeof(mot_r_rpm_str), "%u", record.motor_r_rpm);
                    snprintf(mot_r_thr_str, sizeof(mot_r_thr_str), "%u", record.motor_r_throttle);
                    snprintf(mot_r_brk_str, sizeof(mot_r_brk_str), "%u", record.motor_r_brake);
                    snprintf(mot_r_t_str, sizeof(mot_r_t_str), "%u", record.motor_r_temp);
                    snprintf(mot_r_ct_str, sizeof(mot_r_ct_str), "%u", record.motor_r_ctrl_temp);

                    snprintf(rev_str, sizeof(rev_str), "%u", record.reverse_state);
                    snprintf(r1_str, sizeof(r1_str), "%u", record.relay1_state);
                    snprintf(r2_str, sizeof(r2_str), "%u", record.relay2_state);
                }

                char csv_line[256];
                int len = snprintf(csv_line, sizeof(csv_line),
                    "%lu,%lu,%d,%s,%s,%s,%s,%s,%d,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                    record.uptime_ms,
                    record.rtc_time,
                    record.battery_online ? 1 : 0,
                    bat_v_str, bat_i_str, bat_t0_str, bat_t1_str, bat_t2_str,
                    record.motor_online ? 1 : 0,
                    mot_l_rpm_str, mot_l_thr_str, mot_l_brk_str, mot_l_t_str, mot_l_ct_str,
                    mot_r_rpm_str, mot_r_thr_str, mot_r_brk_str, mot_r_t_str, mot_r_ct_str,
                    rev_str, r1_str, r2_str
                );

                if (len > 0) {
                    log_file.write(reinterpret_cast<uint8_t*>(csv_line), len);
                }

                uint32_t now = millis();
                if (now - last_close_time >= 2000) {
                    log_file.close();
                    last_close_time = now;
                }
            } else {
                if (log_file) {
                    log_file.close();
                    last_close_time = millis();
                }
            }
        }
    }

    // --- State ---
    bool     sd_mounted_ = false;
    char     log_filename_[64] = "";
    QueueHandle_t log_queue_ = nullptr;
    TaskHandle_t  task_handle_ = nullptr;

    // --- Cached Values ---
    uint32_t last_battery_event_ms_ = 0;
    float    battery_voltage_ = 0.0f;
    float    battery_current_ = 0.0f;
    float    battery_temps_[3] = {-127.0f, -127.0f, -127.0f};
    uint8_t  battery_temp_count_ = 0;

    uint32_t last_motor_event_ms_ = 0;
    uint16_t motor_l_rpm_ = 0;
    uint8_t  motor_l_throttle_ = 0;
    uint8_t  motor_l_brake_ = 0;
    uint8_t  motor_l_temp_ = 0;
    uint8_t  motor_l_ctrl_temp_ = 0;

    uint16_t motor_r_rpm_ = 0;
    uint8_t  motor_r_throttle_ = 0;
    uint8_t  motor_r_brake_ = 0;
    uint8_t  motor_r_temp_ = 0;
    uint8_t  motor_r_ctrl_temp_ = 0;

    uint8_t  reverse_state_ = 0;
    uint8_t  relay1_state_ = 0;
    uint8_t  relay2_state_ = 0;
};
