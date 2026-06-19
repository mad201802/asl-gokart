#include <Arduino.h>
#include <ETH.h>
#include <array>
#include <sero.hpp>
#include "udp_transport_esp32.hpp"
#include "motor_service.hpp"
#include "kelly_decoder.hpp"

const char* FIRMWARE_VERSION = "0.1.0";

// ── Type Aliases ─────────────────────────────────────────────────────────────

using Runtime = sero::Runtime<esp32_app::UdpTransportEsp32, Esp32Config>;
using Addr    = sero::Address<Esp32Config>;

static_assert(Esp32ServiceConfig::ZC_MOTOR_EVENT_RPM_PAYLOAD_SIZE <= Esp32Config::MaxPayloadSize,
              "motor RPM event payload exceeds MaxPayloadSize");

// ── Global Objects ────────────────────────────────────────────────────────────

static esp32_app::UdpTransportEsp32 transport;
static Runtime*                     runtime_ptr = nullptr;
static MotorService                 motor_svc;
static KellyController              motor_left(Serial1);
static KellyController              motor_right(Serial2);

// ── Forward Declarations ──────────────────────────────────────────────────────

void WiFiEvent(WiFiEvent_t event);
void connect_ethernet();

// ── Ethernet Event Handler ────────────────────────────────────────────────────

void WiFiEvent(WiFiEvent_t event) {
    switch (event) {
        case ARDUINO_EVENT_ETH_START:
            Serial.println("[eth] Started");
            ETH.setHostname("zc-motor");
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
    Serial.begin(115200);
    delay(1000);
    Serial.println("####################################");
    Serial.println("ZC_MOTOR Fw. v." + String(FIRMWARE_VERSION));
    Serial.println("");
    Serial.println("Authors: AEROSPACE-LAB Team Gokart");
    Serial.println("####################################");

    WiFi.onEvent(WiFiEvent);
    ETH.begin();

    // TODO: Assign a static IP from the project's address registry and update
    //       the gateway/netmask if needed.
    ETH.config(
        IPAddress(192, 168, 1, 0),   // TODO: replace with real address
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

    // ── Kelly motor controllers ─────────────────────────────────────────────
    motor_left.begin(Esp32HwConfig::KELLY_BAUD_RATE,
                      Esp32HwConfig::KELLY_LEFT_RX_PIN,
                      Esp32HwConfig::KELLY_LEFT_TX_PIN,
                      Esp32HwConfig::KELLY_READ_TIMEOUT_MS);
    motor_right.begin(Esp32HwConfig::KELLY_BAUD_RATE,
                       Esp32HwConfig::KELLY_RIGHT_RX_PIN,
                       Esp32HwConfig::KELLY_RIGHT_TX_PIN,
                       Esp32HwConfig::KELLY_READ_TIMEOUT_MS);

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

    // Register the event this service will emit to subscribers.
    if (!rt.register_event(
            Esp32ServiceConfig::ZC_MOTOR_ID,
            Esp32ServiceConfig::ZC_MOTOR_EVENT_RPM_ID)) {
        Serial.println("[ERROR] register_event failed!");
    }

    // Register the service implementation (handles incoming method calls).
    if (!rt.register_service(
            Esp32ServiceConfig::ZC_MOTOR_ID,
            motor_svc,
            /*major=*/1, /*minor=*/0,
            /*auth_required=*/false)) {
        Serial.println("[ERROR] register_service failed!");
    }

    // Announce service to the network.
    if (!rt.offer_service(Esp32ServiceConfig::ZC_MOTOR_ID, /*ttl_s=*/30, now)) {
        Serial.println("[ERROR] offer_service failed!");
    }

    Serial.printf("[motor] Service 0x%04X offered\n",
                  Esp32ServiceConfig::ZC_MOTOR_ID);
}

// ── loop ──────────────────────────────────────────────────────────────────────

// Number of poll iterations between published RPM events (matches rust_impl).
static constexpr uint8_t PUBLISH_EVERY_N_POLLS = 10;

void loop() {
    Runtime& rt = *runtime_ptr;
    uint32_t now = millis();

    // Drive the Sero protocol — must be called every iteration.
    rt.process(now);

    // Poll both Kelly controllers every iteration (faults tracked via
    // fault_count(), not the per-call bool — see KellyController::poll()).
    motor_left.poll();
    motor_right.poll();

    static uint8_t poll_count = 0;
    ++poll_count;
    if (poll_count >= PUBLISH_EVERY_N_POLLS) {
        poll_count = 0;

        const uint16_t left_rpm   = motor_left.rpm();
        const uint16_t right_rpm  = motor_right.rpm();
        const uint8_t  left_rev   = static_cast<uint8_t>(motor_left.reverse() ? 1 : 0);
        const uint8_t  right_rev  = static_cast<uint8_t>(motor_right.reverse() ? 1 : 0);

        std::array<uint8_t, Esp32ServiceConfig::ZC_MOTOR_EVENT_RPM_PAYLOAD_SIZE> payload{};
        payload[0] = static_cast<uint8_t>(left_rpm >> 8);
        payload[1] = static_cast<uint8_t>(left_rpm);
        payload[2] = left_rev;
        payload[3] = static_cast<uint8_t>(right_rpm >> 8);
        payload[4] = static_cast<uint8_t>(right_rpm);
        payload[5] = right_rev;

        if (!rt.notify_event(
                Esp32ServiceConfig::ZC_MOTOR_ID,
                Esp32ServiceConfig::ZC_MOTOR_EVENT_RPM_ID,
                payload.data(), payload.size())) {
            Serial.println("[motor] notify_event failed (no subscribers?)");
        }

        Serial.printf("[motor] left rpm=%u reverse=%u faults=%lu | right rpm=%u reverse=%u faults=%lu\n",
                      left_rpm, left_rev, static_cast<unsigned long>(motor_left.fault_count()),
                      right_rpm, right_rev, static_cast<unsigned long>(motor_right.fault_count()));
    }
}
