#include <Arduino.h>
#include "esp_log.h"
#include <ETH.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Bounce2.h>


const char* FIRMWARE_VERSION = "0.0.1";

#define NUMBER_OF_BUTTONS 3
// Button pins
#define BUTTON_PIN_1 GPIO_NUM_14
#define BUTTON_PIN_2 GPIO_NUM_15
#define BUTTON_PIN_3 GPIO_NUM_32

unsigned long startTime;
unsigned long duration;

// Olimex IP-Adresse unten im Code anpassen!
// WICHITG: IP-Adresse und Port des WebSocket-Servers (headunit) hier anpassen:
WebSocketsClient webSocket;             // WebSocket client instance

// Bounce2 Button instances
Bounce2::Button button1 = Bounce2::Button();
Bounce2::Button button2 = Bounce2::Button();
Bounce2::Button button3 = Bounce2::Button();


const char* serverUrl = "192.168.1.100";    // WebSocket server / "headunit" IPv4 address
const int serverPort = 6969;                // WebSocket server / "headunit" port
int MESSAGE_INTERVAL_BUTTONS = 50;           // Send button data every X ms

long lastTimeButtonsSent = 0;

void sendRegister();
void sendButtonsMsg();
void initializeButtons();
void updateButtonStates();
boolean* getButtonStates();
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
    Serial.println("ZC_BUTTONS Fw. v." + String(FIRMWARE_VERSION));
    Serial.println("");
    Serial.println("Authors: AEROSPACE-LAB Team Gokart");
    Serial.println("####################################");
    // Initialize Ethernet
    WiFi.onEvent(WiFiEvent);
    webSocket.onEvent(onWebSocketEvent);
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

    // Connect to WebSocket server
    webSocket.begin(serverUrl, serverPort, "/");
    delay(50);
    webSocket.loop();
    Serial.println("Setup complete");

    // Initialize Buttons
    initializeButtons();
}

void loop() {
    // Maintain WebSocket connection
    webSocket.loop();
    delay(1);
    // Update button states
    updateButtonStates();
    // Send messages to WebSocket server
    sendButtonsMsg();
}


void sendRegister() {
  webSocket.sendTXT("{ \"zone\": \"buttons\" }");
  Serial.println("Register package sent");
}

void sendButtonsMsg() {
    if (millis() - lastTimeButtonsSent < MESSAGE_INTERVAL_BUTTONS) {
        return;
    }


    /* ############### WARNING - THIS CAUSES THE HEADUNIT TO SEND A FAULTY PONG FRAME AND THUS RESULTS IN A DISCONNECT OF THE OLIMEX WS CLIENT */
    // webSocket.sendPing();
    /* ############### WARNING - THIS CAUSES THE HEADUNIT TO SEND A FAULTY PONG FRAME AND THUS RESULTS IN A DISCONNECT OF THE OLIMEX WS CLIENT */


    // Get temperature data from sensors
    Serial.println("Buttons array before sending: ");
    boolean* buttons = getButtonStates();
    for (int i = 0; i < NUMBER_OF_BUTTONS; i++) {
        Serial.print(buttons[i]);
        Serial.print(" ");
    }
    Serial.println();

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
    doc["zone"] = "buttons";
    doc["command"] = "getTurnSignalButtons";
    JsonArray value = doc["value"].to<JsonArray>();
    for (int i = 0; i < NUMBER_OF_BUTTONS; i++) {
        value.add(buttons[i]);
    }

    // Optional: Reduce memory footprint
    // doc.shrinkToFit();

    // Serialize JSON to buffer
    size_t n = serializeJson(doc, output, sizeof(output));
    if (n == sizeof(output)) {
        Serial.println(F("Error: JSON message truncated"));
    } else {
        if(webSocket.sendTXT(output)) {
            Serial.println(F("Buttons data sent"));
            Serial.println(output);
            lastTimeButtonsSent = millis();
        } else {
            Serial.println(F("Failed to send buttons data"));
            lastTimeButtonsSent = millis();
        }
    }
}

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

boolean* getButtonStates() {
    static boolean buttons[NUMBER_OF_BUTTONS] = {false, false, false}; 
    buttons[0] = button1.isPressed();
    buttons[1] = button2.isPressed();
    buttons[2] = button3.isPressed();
    return buttons;
}