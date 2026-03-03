#include <Arduino.h>
#include "esp_log.h"
#include <ETH.h>
#include <sero.hpp>
#include <udp_transport_esp32.hpp>
#include <lights_service.hpp>

const char* FIRMWARE_VERSION = "0.1.0";

// LED pins
#define LED_PIN_1 GPIO_NUM_14
#define LED_PIN_2 GPIO_NUM_15

// --- Type Aliases -----------------------------------------------

using Runtime = sero::Runtime<esp32_app::UdpTransportEsp32, Esp32Config>;
using Addr    = sero::Address<Esp32Config>;

// --- Global Objects ---------------------------------------------

// Transport
static esp32_app::UdpTransportEsp32 transport;
static Runtime* runtime_ptr = nullptr;

enum BLINKER_STATE {
    LEFT,
    RIGHT,
    HAZARD,
    OFF,
};

struct AppState {
    bool lights_found = false;
    BLINKER_STATE blinker_state = BLINKER_STATE::OFF;
};

static AppState app;

// --- Function Declarations ----------------------------------------------
void WiFiEvent(WiFiEvent_t event);
void connect_ethernet();
void initializeLEDs();

// ------------------------------------------------------------------------

void WiFiEvent(WiFiEvent_t event) {
  switch (event) {
    case ARDUINO_EVENT_ETH_START:
      Serial.println("ETH Started");
      // Set the hostname for the ESP32
      ETH.setHostname("zc-lights");
      break;
    case ARDUINO_EVENT_ETH_CONNECTED:
      Serial.println("ETH Connected");
      break;
    case ARDUINO_EVENT_ETH_GOT_IP:
      Serial.print("ETH IP Address: ");
      Serial.println(ETH.localIP());
      break;
    case ARDUINO_EVENT_ETH_DISCONNECTED:
      Serial.println("ETH Disconnected");
      break;
    case ARDUINO_EVENT_ETH_STOP:
      Serial.println("ETH Stopped");
      break;
    default:
      break;
  }
}

void connect_ethernet() {
  esp_log_level_set("*", ESP_LOG_VERBOSE);
    Serial.begin(115200);
    delay(1000);
    Serial.println("####################################");
    Serial.println("ZC_LIGHTS Fw. v." + String(FIRMWARE_VERSION));
    Serial.println("");
    Serial.println("Authors: AEROSPACE-LAB Team Gokart");
    Serial.println("####################################");
    // Initialize Ethernet
    WiFi.onEvent(WiFiEvent);
    ETH.begin();
    /* -------------------- HIER DIE IP-Adressen vom ESP und Gateway konfigurieren -------------------- */
    ETH.config(IPAddress(192, 168, 1, 4), IPAddress(192, 168, 1, 1), IPAddress(255, 255, 255, 0));
    /* -------------------------------------------------------------------------------------------------*/
    // Wait for Ethernet to connect
    Serial.print("Connecting to Ethernet");
    while (!ETH.linkUp()) {
        delay(500);
        Serial.print(".");
    }
    // Print Ethernet information
    Serial.println("Connected to Ethernet");
    Serial.print("IP address: ");
    Serial.println(ETH.localIP());
    Serial.print("Gateway: ");
    Serial.println(ETH.gatewayIP());
    Serial.print("Subnet: ");
    Serial.println(ETH.subnetMask());

    delay(50);
    Serial.println("Setup complete");
}

void setup() {
    connect_ethernet();
    initializeLEDs();

    // ── Transport ───────────────────────────────────────────────
    if (!transport.init(Esp32ServiceConfig::ESP32_UNICAST_PORT)) {
        Serial.println("[ERROR] Transport init failed!");
        while (true) delay(1000);
    }

    // ── Runtime ─────────────────────────────────────────────────
    static Runtime rt(transport, Esp32ServiceConfig::ESP32_UNICAST_PORT);
    runtime_ptr = &rt;
    rt.set_local_address(transport.local_addr());
    
    uint32_t now = millis();

    static LightsService lights_svc;

    rt.register_service(Esp32ServiceConfig::ZC_LIGHTS_ID, lights_svc,
                        1, 0,
                        /*auth_required=*/false);
    rt.offer_service(Esp32ServiceConfig::ZC_LIGHTS_ID, /*ttl=*/30, now);
    std::printf("[server] LightsService 0x%04X offered\n", Esp32ServiceConfig::ZC_LIGHTS_ID);
}

void loop() {
    Runtime& rt = *runtime_ptr;
    uint32_t now = millis();

    // ── Process protocol (poll transport, dispatch, housekeeping) ──
    rt.process(now);
}

void initializeLEDs() {
    // pinMode(LED_PIN_LEFT, OUTPUT);
    // pinMode(LED_PIN_RIGHT, OUTPUT);
    // pinMode(LED_PIN_HAZARD, OUTPUT);
}