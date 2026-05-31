#pragma once
/// @file ota_handler.hpp
/// HTTP OTA firmware update helper for ESP32 zone controllers.
///
/// Receives a download URL from the headunit via a Sero method call and
/// performs the update using the esp_https_ota component (plain HTTP mode).
/// The update runs in a dedicated FreeRTOS task so that the Sero runtime
/// can send its E_OK acknowledgement before the device reboots.
///
/// Usage (inside impl_on_request):
///   char url[512];
///   memcpy(url, payload, payload_length);
///   url[payload_length] = '\0';
///   start_ota(url);
///   return sero::ReturnCode::E_OK;

#include <cstring>
#include <cstdlib>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_http_client.h"
#include "esp_https_ota.h"
#include "esp_idf_version.h"
#include "esp_ota_ops.h"

static const char* OTA_TAG = "ota";

// ── Internal task param ───────────────────────────────────────────────────────

struct OtaParams {
    char url[512];
};

// ── FreeRTOS OTA task ─────────────────────────────────────────────────────────

static void ota_task(void* pvParams) {
    OtaParams* params = static_cast<OtaParams*>(pvParams);

    ESP_LOGI(OTA_TAG, "Starting OTA from: %s", params->url);

    esp_http_client_config_t http_config = {};
    http_config.url                      = params->url;
    http_config.keep_alive_enable        = true;

#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
    esp_https_ota_config_t ota_config = {};
    ota_config.http_config            = &http_config;
    esp_err_t err = esp_https_ota(&ota_config);
#else
    esp_err_t err = esp_https_ota(&http_config);
#endif

    free(params);

    if (err == ESP_OK) {
        ESP_LOGI(OTA_TAG, "OTA succeeded — rebooting");
        esp_restart();
    } else {
        ESP_LOGE(OTA_TAG, "OTA failed: %s", esp_err_to_name(err));
    }

    vTaskDelete(nullptr);
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Spawn the OTA task with the given firmware URL.
/// @param url  Null-terminated HTTP URL (e.g. "http://192.168.1.10:8080/firmware/...")
/// @return true if the task was created successfully.
static bool start_ota(const char* url) {
    if (!url || url[0] == '\0') {
        ESP_LOGE(OTA_TAG, "start_ota: empty URL");
        return false;
    }

    OtaParams* params = static_cast<OtaParams*>(malloc(sizeof(OtaParams)));
    if (!params) {
        ESP_LOGE(OTA_TAG, "start_ota: malloc failed");
        return false;
    }

    strncpy(params->url, url, sizeof(params->url) - 1);
    params->url[sizeof(params->url) - 1] = '\0';

    BaseType_t created = xTaskCreate(
        ota_task,
        "ota_task",
        8192,
        params,
        5,
        nullptr
    );

    if (created != pdPASS) {
        ESP_LOGE(OTA_TAG, "start_ota: xTaskCreate failed");
        free(params);
        return false;
    }

    return true;
}
