#include <Arduino.h>
#include "esp_log.h"
#include <ETH.h>
#include <Bounce2.h>
#include <sero.hpp>
#include <udp_transport_esp32.hpp>

const char* FIRMWARE_VERSION = "0.1.0";

// Button pins
#define BUTTON_PIN_1 GPIO_NUM_14
#define BUTTON_PIN_2 GPIO_NUM_15
#define BUTTON_PIN_3 GPIO_NUM_32

// --- Type Aliases -----------------------------------------------

using Runtime = sero::Runtime<esp32_app::UdpTransportEsp32, Esp32Config>;
using Addr    = sero::Address<Esp32Config>;

// --- Global Objects ---------------------------------------------

// Transport
static esp32_app::UdpTransportEsp32 transport;
static Runtime* runtime_ptr = nullptr;

// Bounce2 Button instances
Bounce2::Button button1 = Bounce2::Button();
Bounce2::Button button2 = Bounce2::Button();
Bounce2::Button button3 = Bounce2::Button();

struct AppState {
    bool lights_found = false;
};

static AppState app;

// ─── Request Callbacks ─────────────────────────────────────────

static void on_lights_response(sero::ReturnCode rc,
                               const uint8_t* /*payload*/, std::size_t /*len*/,
                               void* /*ctx*/) {
    if (rc == sero::ReturnCode::E_OK) {
        Serial.println("[lights] Request acknowledged");
    } else {
        Serial.printf("[lights] Request failed: rc=%u\n", static_cast<unsigned>(rc));
    }
}

// ─── SD Callbacks ───────────────────────────────────────────────

static void on_service_found(uint16_t sid, const Addr& addr, void* /*ctx*/) {
    std::printf("[sd] Service 0x%04X found at %u.%u.%u.%u:%u\n",
                sid, addr[0], addr[1], addr[2], addr[3],
                unsigned((addr[4] << 8) | addr[5]));
    if (sid == Esp32ServiceConfig::ZC_LIGHTS_ID) app.lights_found = true;
}

static void on_service_lost(uint16_t sid, void* /*ctx*/) {
    std::printf("[sd] Service 0x%04X lost\n", sid);
    if (sid == Esp32ServiceConfig::ZC_LIGHTS_ID) {
        app.lights_found = false;
    }
}

static void on_subscription_ack(uint16_t sid, uint16_t eid,
                                 sero::ReturnCode rc, uint16_t ttl,
                                 void* /*ctx*/) {
    std::printf("[sd] Subscription ACK: 0x%04X/0x%04X rc=%u ttl=%u\n",
                sid, eid, static_cast<unsigned>(rc), ttl);
}

// --- Function Declarations ----------------------------------------------
void connect_ethernet();
void initializeButtons();
void updateButtonStates();

// ------------------------------------------------------------------------

void WiFiEvent(WiFiEvent_t event) {
  switch (event) {
    case ARDUINO_EVENT_ETH_START:
      Serial.println("ETH Started");
      // Set the hostname for the ESP32
      ETH.setHostname("zc-buttons");
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
    Serial.println("ZC_BUTTONS Fw. v." + String(FIRMWARE_VERSION));
    Serial.println("");
    Serial.println("Authors: AEROSPACE-LAB Team Gokart");
    Serial.println("####################################");
    // Initialize Ethernet
    WiFi.onEvent(WiFiEvent);
    ETH.begin();
    /* -------------------- HIER DIE IP-Adressen vom ESP und Gateway konfigurieren -------------------- */
    ETH.config(IPAddress(192, 168, 1, 5), IPAddress(192, 168, 1, 1), IPAddress(255, 255, 255, 0));
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
    // Initialize Buttons
    initializeButtons();

    // ── Transport ───────────────────────────────────────────────
    if (!transport.init(Esp32ServiceConfig::ESP32_UNICAST_PORT)) {
        Serial.println("[ERROR] Transport init failed!");
        while (true) delay(1000);
    }

    // ── Runtime ─────────────────────────────────────────────────
    static Runtime rt(transport, Esp32ServiceConfig::ESP32_UNICAST_PORT);
    runtime_ptr = &rt;
    rt.set_local_address(transport.local_addr());
    
    // ── Consumer: SD callbacks ──────────────────────────────────
    auto& sd = rt.sd_callbacks();
    sd.on_service_found    = on_service_found;
    sd.service_found_ctx   = nullptr;
    sd.on_service_lost     = on_service_lost;
    sd.service_lost_ctx    = nullptr;
    sd.on_subscription_ack = on_subscription_ack;
    sd.subscription_ack_ctx = nullptr;
    
    uint32_t now = millis();
    rt.find_service(Esp32ServiceConfig::ZC_LIGHTS_ID, 1, now);
}

void loop() {
    Runtime& rt = *runtime_ptr;
    uint32_t now = millis();

    // ── Process protocol (poll transport, dispatch, housekeeping) ──
    rt.process(now);

    updateButtonStates();

    // Call method for button presses on ZC_LIGHTS_ID service
    if (app.lights_found) {
        if (button1.pressed()) {
            uint8_t payload[1] = {0x01};
            rt.request(Esp32ServiceConfig::ZC_LIGHTS_ID, Esp32ServiceConfig::ZC_LIGHTS_LEFT_ID,
                       payload, sizeof(payload), on_lights_response, nullptr, 2000, now);
            Serial.println("Button 1 pressed - method call sent");
        }
        if (button2.pressed()) {
            uint8_t payload[1] = {0x02};
            rt.request(Esp32ServiceConfig::ZC_LIGHTS_ID, Esp32ServiceConfig::ZC_LIGHTS_RIGHT_ID,
                       payload, sizeof(payload), on_lights_response, nullptr, 2000, now);
            Serial.println("Button 2 pressed - method call sent");
        }
        if (button3.pressed()) {
            uint8_t payload[1] = {0x03};
            rt.request(Esp32ServiceConfig::ZC_LIGHTS_ID, Esp32ServiceConfig::ZC_LIGHTS_HAZARD_ID,
                       payload, sizeof(payload), on_lights_response, nullptr, 2000, now);
            Serial.println("Button 3 pressed - method call sent");
        }
        // Add more buttons and method calls here for headlight control
        //
    }
}

// --- Button functions --------------------------------------------------

void initializeButtons() {
    button1.attach(BUTTON_PIN_1, INPUT_PULLDOWN);
    button1.setPressedState(HIGH);
    button1.interval(50);
    button2.attach(BUTTON_PIN_2, INPUT_PULLDOWN);
    button2.setPressedState(HIGH);
    button2.interval(50);
    button3.attach(BUTTON_PIN_3, INPUT_PULLDOWN);
    button3.setPressedState(HIGH);
    button3.interval(50);
}

void updateButtonStates() {
    button1.update();
    button2.update();
    button3.update();
}

// -----------------------------------------------------------------------