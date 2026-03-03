#include <Arduino.h>
#include "esp_log.h"
#include <ETH.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <Bounce2.h>


const char* FIRMWARE_VERSION = "0.1.0";
const char* ZC_BUTTON_IDENTIFIER = "tony";

#define NUMBER_OF_BUTTONS 3
// Button pins
#define BUTTON_PIN_1 GPIO_NUM_14
#define BUTTON_PIN_2 GPIO_NUM_15
#define BUTTON_PIN_3 GPIO_NUM_32

unsigned long startTime;
unsigned long duration;

// Olimex IP-Adresse unten im Code anpassen!

// Bounce2 Button instances
Bounce2::Button button1 = Bounce2::Button();
Bounce2::Button button2 = Bounce2::Button();
Bounce2::Button button3 = Bounce2::Button();


int MESSAGE_INTERVAL_BUTTONS = 50;           // Send button data every X ms

long lastTimeButtonsSent = 0;

void sendButtonsMsg();
void initializeButtons();
void updateButtonStates();
boolean* getButtonStates();
void WiFiEvent(WiFiEvent_t event);

void WiFiEvent(WiFiEvent_t event) {
  switch (event) {
    case ARDUINO_EVENT_ETH_START:
      Serial.println("ETH Started");
      // Set the hostname for the ESP32
      ETH.setHostname("esp32-poe");
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

void setup() {
    esp_log_level_set("*", ESP_LOG_VERBOSE);
    Serial.begin(115200);
    delay(1000);
    Serial.println("####################################");
    Serial.println("ZC_BUTTONS Fw. v." + String(FIRMWARE_VERSION));
    Serial.println("Identifier: " + String(ZC_BUTTON_IDENTIFIER));
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

    // Initialize Buttons
    initializeButtons();
}

void loop() {
    delay(1);
    // Update button states
    updateButtonStates();
    // Send messages to WebSocket server
    sendButtonsMsg();
}

void sendButtonsMsg() {
    if (millis() - lastTimeButtonsSent < MESSAGE_INTERVAL_BUTTONS) {
        return;
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