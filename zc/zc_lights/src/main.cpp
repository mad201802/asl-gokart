#include <Arduino.h>
#include "esp_log.h"
#include <ETH.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>


const char* FIRMWARE_VERSION = "0.0.1";

#define NUMBER_OF_LED 2
// Button pins
#define LED_PIN_1 GPIO_NUM_14
#define LED_PIN_2 GPIO_NUM_15

// Turn signal blink interval in ms
#define TURN_SIGNAL_BLINK_INTERVAL 500
// Debounce time for incoming button data in ms
#define DEBOUNCE_TIME 500

// Olimex IP-Adresse unten im Code anpassen!
// WICHITG: IP-Adresse und Port des WebSocket-Servers (headunit) hier anpassen:
WebSocketsClient webSocket;             // WebSocket client instance

const char* serverUrl = "192.168.1.100";    // WebSocket server / "headunit" IPv4 address
const int serverPort = 6969;                // WebSocket server / "headunit" port
int MESSAGE_INTERVAL_LEDS = 50;           // Send button data every X ms

long lastTimeLEDsSent = 0;

// Global runtime variables
bool isTurnSignalLeftActive = false;
bool isTurnSignalRightActive = false;
bool isHazardLightsActive = false;
long lastBlinkLeft = 0;
long lastBlinkRight = 0;
long lastBlinkHazard = 0;
long lastStateUpdateLeft = 0;
long lastStateUpdateRight = 0;

void sendRegister();
void initializeLEDs();
void handleWebsocketInput(String input);
void blinkLoop();
void sendTurnSignaLightsStatusToBackend();
boolean* getLEDStates();
void onWebSocketEvent(WStype_t type, uint8_t *payload, size_t length);
void WiFiEvent(WiFiEvent_t event);

void WiFiEvent(WiFiEvent_t event) {
  switch (event) {
    case SYSTEM_EVENT_ETH_START:
      Serial.println("ETH Started");
      // Set the hostname for the ESP32
      ETH.setHostname("esp32-poe");
      break;
    case SYSTEM_EVENT_ETH_CONNECTED:
      Serial.println("ETH Connected");
      break;
    case SYSTEM_EVENT_ETH_GOT_IP:
      Serial.print("ETH IP Address: ");
      Serial.println(ETH.localIP());
      break;
    case SYSTEM_EVENT_ETH_DISCONNECTED:
      Serial.println("ETH Disconnected");
      break;
    case SYSTEM_EVENT_ETH_STOP:
      Serial.println("ETH Stopped");
      break;
    default:
      break;
  }
}

void onWebSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Serial.printf("Disconnected!\n");
            break;
        case WStype_CONNECTED:
            Serial.printf("Connected to URL: %s\n", payload);
            sendRegister();
            break;
        case WStype_TEXT:
            Serial.printf("Received text: %s\n", payload);
            handleWebsocketInput((char*)payload);
            break;
        case WStype_BIN:
            Serial.printf("Received binary data.\n");
            break;
        case WStype_PING:
            Serial.printf("Received ping.\n");
            break;
        case WStype_PONG:
            Serial.printf("Received pong.\n");
            break;
        case WStype_ERROR:
            Serial.printf("Error: %s\n", payload);
            break;
    }
}

void setup() {
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
    webSocket.onEvent(onWebSocketEvent);
    ETH.begin();
    /* -------------------- HIER DIE IP-Adressen vom ESP und Gateway konfigurieren -------------------- */
    ETH.config(IPAddress(192, 168, 1, 6), IPAddress(192, 168, 1, 1), IPAddress(255, 255, 255, 0));
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

    // Connect to WebSocket server
    webSocket.begin(serverUrl, serverPort, "/");
    delay(50);
    webSocket.loop();
    Serial.println("Setup complete");

    // Initialize Buttons
    initializeLEDs();
}

void loop() {
    // Maintain WebSocket connection
    webSocket.loop();
    delay(1);
    // Blink loop
    blinkLoop();
    // Send button data to WebSocket server
    sendTurnSignaLightsStatusToBackend();
}

void sendRegister() {
  webSocket.sendTXT("{ \"zone\": \"lights\" }");
  Serial.println("Register package sent");
}

void handleWebsocketInput(String input) {
    Serial.println("Received: " + input);
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, input);
    String zone = doc["zone"];
    if (zone == "lights") {
        String command = doc["command"];
        long currentTime = millis();
        if(command == "setToggleTurnSignalLeft") {
            if (currentTime - lastStateUpdateLeft > DEBOUNCE_TIME) {
                isTurnSignalLeftActive = !isTurnSignalLeftActive;
                lastStateUpdateLeft = currentTime;
                if (!isTurnSignalLeftActive) {
                    digitalWrite(LED_PIN_1, LOW); // Turn off the right turn signal LED if the signal is turned off
                }
            }
        }
        if(command == "setToggleTurnSignalRight") {
            if (currentTime - lastStateUpdateRight > DEBOUNCE_TIME) {
                isTurnSignalRightActive = !isTurnSignalRightActive;
                lastStateUpdateRight = currentTime;
                if (!isTurnSignalRightActive) {
                    digitalWrite(LED_PIN_2, LOW); // Turn off the right turn signal LED if the signal is turned off
                }
            }
        }
        if(command == "setToggleHazardLights") {
            isHazardLightsActive = !isHazardLightsActive;
        }
    }
}

void initializeLEDs() {
    pinMode(LED_PIN_1, OUTPUT);
    pinMode(LED_PIN_2, OUTPUT);
    digitalWrite(LED_PIN_1, HIGH);
    digitalWrite(LED_PIN_2, HIGH);
    delay(100);
    digitalWrite(LED_PIN_1, LOW);
    digitalWrite(LED_PIN_2, LOW);
    delay(100);
    digitalWrite(LED_PIN_1, HIGH);
    digitalWrite(LED_PIN_2, HIGH);
    delay(100);
    digitalWrite(LED_PIN_1, LOW);
    digitalWrite(LED_PIN_2, LOW);
}

void blinkLoop() {
    if(isTurnSignalLeftActive) {
        if(millis() - lastBlinkLeft > TURN_SIGNAL_BLINK_INTERVAL) {
            lastBlinkLeft = millis();
            digitalWrite(LED_PIN_1, !digitalRead(LED_PIN_1));
        }
    }
    if(isTurnSignalRightActive) {
        if(millis() - lastBlinkRight > TURN_SIGNAL_BLINK_INTERVAL) {
            lastBlinkRight = millis();
            digitalWrite(LED_PIN_2, !digitalRead(LED_PIN_2));
        }
    }
}

void sendTurnSignaLightsStatusToBackend() {
    if (millis() - lastTimeLEDsSent < MESSAGE_INTERVAL_LEDS) {
        return;
    }


    /* ############### WARNING - THIS CAUSES THE HEADUNIT TO SEND A FAULTY PONG FRAME AND THUS RESULTS IN A DISCONNECT OF THE OLIMEX WS CLIENT */
    // webSocket.sendPing();
    /* ############### WARNING - THIS CAUSES THE HEADUNIT TO SEND A FAULTY PONG FRAME AND THUS RESULTS IN A DISCONNECT OF THE OLIMEX WS CLIENT */


    // Get temperature data from sensors
    Serial.println("LEDs array before sending: ");
    boolean* leds = getLEDStates();
    // Send temperature data to WebSocket server
    /*
    Format of the JSON message:
    {
        "zone": "battery",
        "command": "getTemp",
        "value": [20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0]
    }
    */
    char output[256];
    StaticJsonDocument<256> doc;
    doc["zone"] = "lights";
    doc["command"] = "getTurnSignalLights";
    JsonArray value = doc["value"].to<JsonArray>();
    for (int i = 0; i < NUMBER_OF_LED; i++) {
        value.add(leds[i]);
    }

    // Optional: Reduce memory footprint
    // doc.shrinkToFit();

    // Serialize JSON to buffer
    size_t n = serializeJson(doc, output, sizeof(output));
    if (n == sizeof(output)) {
        Serial.println(F("Error: JSON message truncated"));
    } else {
        if(webSocket.sendTXT(output)) {
            Serial.println(F("LEDs data sent"));
            Serial.println(output);
            lastTimeLEDsSent = millis();
        } else {
            Serial.println(F("Failed to send LEDs data"));
            lastTimeLEDsSent = millis();
        }
    }
}

boolean* getLEDStates() {
    static boolean ledStates[NUMBER_OF_LED];
    ledStates[0] = digitalRead(LED_PIN_1);
    ledStates[1] = digitalRead(LED_PIN_2);
    return ledStates;
}