#include <Arduino.h>
#include <ETH.h>
#include <sero.hpp>
#include "udp_transport_esp32.hpp"
#include "logging_service.hpp"

const char* FIRMWARE_VERSION = "0.2.0";

// ── Type Aliases ─────────────────────────────────────────────────────────────

using Runtime = sero::Runtime<esp32_app::UdpTransportEsp32, Esp32Config>;
using Addr    = sero::Address<Esp32Config>;

// ── Global Objects ────────────────────────────────────────────────────────────

static esp32_app::UdpTransportEsp32 transport;
static Runtime*                     runtime_ptr = nullptr;
static LoggingService               logging_svc;

// ── Forward Declarations ──────────────────────────────────────────────────────

void WiFiEvent(WiFiEvent_t event);
void connect_ethernet();

// ── Ethernet Event Handler ────────────────────────────────────────────────────

void WiFiEvent(WiFiEvent_t event) {
    switch (event) {
        case ARDUINO_EVENT_ETH_START:
            Serial.println("[eth] Started");
            ETH.setHostname("zc-logging");
            break;
        case ARDUINO_EVENT_ETH_CONNECTED:
            Serial.println("[eth] Connected");
            break;
        case ARDUINO_EVENT_ETH_GOT_IP:
            Serial.print("[eth] IP: ");
            Serial.println(ETH.localIP());
            break;
        case ARDUINO_EVENT_ETH_DISCONNECTED:
            Serial.println("[eth] Disconnected");
            break;
        case ARDUINO_EVENT_ETH_STOP:
            Serial.println("[eth] Stopped");
            break;
        default:
            break;
    }
}

// ── Network Initialisation ────────────────────────────────────────────────────

void connect_ethernet() {
    // Hold Ethernet PHY in reset during initial startup delay
    pinMode(12, OUTPUT);
    digitalWrite(12, LOW);

    Serial.begin(115200);
    delay(1000);
    Serial.println("####################################");
    Serial.println("ZC_LOGGING Fw. v." + String(FIRMWARE_VERSION));
    Serial.println("");
    Serial.println("Authors: AEROSPACE-LAB Team Gokart");
    Serial.println("####################################");

    // Power up Ethernet PHY
    digitalWrite(12, HIGH);
    delay(200);

    WiFi.onEvent(WiFiEvent);
    ETH.begin();

    ETH.config(
        IPAddress(192, 168, 1, 8),
        IPAddress(192, 168, 1, 1),
        IPAddress(255, 255, 255, 0)
    );

    Serial.print("[eth] Waiting for link");
    while (!ETH.linkUp()) {
        delay(500);
        Serial.print(".");
    }
    Serial.println();
    Serial.print("[eth] IP: ");      Serial.println(ETH.localIP());
    Serial.print("[eth] Gateway: "); Serial.println(ETH.gatewayIP());
    Serial.print("[eth] Subnet: ");  Serial.println(ETH.subnetMask());
}

// ── setup ─────────────────────────────────────────────────────────────────────

void setup() {
    connect_ethernet();

    // ── Logging Service Init ─────────────────────────────────────────────────
    if (!logging_svc.begin()) {
        Serial.println("[ERROR] Logging service init failed!");
        // Keep running Sero runtime even if logging hardware (SD card) failed, so OTA still works
    }

    // ── Transport ────────────────────────────────────────────────────────────
    if (!transport.init(Esp32ServiceConfig::ESP32_UNICAST_PORT)) {
        Serial.println("[ERROR] Transport init failed!");
        while (true) delay(1000);
    }

    // ── Runtime ──────────────────────────────────────────────────────────────
    static Runtime rt(transport, Esp32ServiceConfig::ESP32_UNICAST_PORT);
    runtime_ptr = &rt;
    rt.set_local_address(transport.local_addr());

    uint32_t now = millis();

    // Register the service implementation (handles incoming method calls / OTA).
    if (!rt.register_service(
            Esp32ServiceConfig::ZC_LOGGING_ID,
            logging_svc,
            /*major=*/1, /*minor=*/0,
            /*auth_required=*/false)) {
        Serial.println("[ERROR] register_service failed!");
    }

    // Announce service to the network.
    if (!rt.offer_service(Esp32ServiceConfig::ZC_LOGGING_ID, /*ttl_s=*/30, now)) {
        Serial.println("[ERROR] offer_service failed!");
    }

    Serial.printf("[logging] Service 0x%04X offered\n",
                  Esp32ServiceConfig::ZC_LOGGING_ID);

    // ── Service Discovery / Subscriptions ────────────────────────────────────
    (void)rt.find_service(Esp32ServiceConfig::ZC_BATTERY_ID, 1, now);
    (void)rt.find_service(Esp32ServiceConfig::ZC_MOTOR_ID, 1, now);

    if (!rt.subscribe_event(
            Esp32ServiceConfig::ZC_BATTERY_ID,
            Esp32ServiceConfig::ZC_BATTERY_EVENT_VOLTAGE_ID,
            logging_svc,
            Esp32Config::SubscriptionTtlSeconds,
            now)) {
        Serial.println("[ERROR] Failed to subscribe to Battery Voltage!");
    }
    if (!rt.subscribe_event(
            Esp32ServiceConfig::ZC_BATTERY_ID,
            Esp32ServiceConfig::ZC_BATTERY_EVENT_CURRENT_ID,
            logging_svc,
            Esp32Config::SubscriptionTtlSeconds,
            now)) {
        Serial.println("[ERROR] Failed to subscribe to Battery Current!");
    }
    if (!rt.subscribe_event(
            Esp32ServiceConfig::ZC_BATTERY_ID,
            Esp32ServiceConfig::ZC_BATTERY_EVENT_TEMP_ID,
            logging_svc,
            Esp32Config::SubscriptionTtlSeconds,
            now)) {
        Serial.println("[ERROR] Failed to subscribe to Battery Temp!");
    }
    if (!rt.subscribe_event(
            Esp32ServiceConfig::ZC_MOTOR_ID,
            Esp32ServiceConfig::ZC_MOTOR_EVENT_RPM_ID,
            logging_svc,
            Esp32Config::SubscriptionTtlSeconds,
            now)) {
        Serial.println("[ERROR] Failed to subscribe to Motor RPM!");
    }
}

// ── loop ──────────────────────────────────────────────────────────────────────

void loop() {
    Runtime& rt = *runtime_ptr;
    uint32_t now = millis();

    // Drive the Sero protocol — must be called every iteration.
    rt.process(now);

    // Drive the logging service.
    logging_svc.update(rt, now);
}
