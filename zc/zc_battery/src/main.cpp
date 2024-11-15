#include <Arduino.h>
#include "esp_log.h"
#include <ETH.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "SensorManager.h"
#include "daly-bms-uart.h"


const char* FIRMWARE_VERSION = "0.2.1";

// Pinout BMS Connector:
// Yellow -> BMS RX
// Green  -> BMS TX

// Wire Yellow to U1TXD (GPIO4) on the Olimex ESP32-POE-ISO
// Wire Green to U1RXD (GPIO36) on the Olimex ESP32-POE-ISO

#define BMS_SERIAL Serial1 // Set the serial port for communication with the Daly BMS
// Construct the BMS driver and passing in the Serial interface (which pins to use)
Daly_BMS_UART bms(BMS_SERIAL);

unsigned long startTime;
unsigned long duration;

float biggestVoltage = 0;
float biggestCurrent = 0;
float biggestSOC = 0;
long biggestDelay = 0;

// Olimex IP-Adresse unten im Code anpassen!
// WICHITG: IP-Adresse und Port des WebSocket-Servers (headunit) hier anpassen:
WebSocketsClient webSocket;             // WebSocket client instance


const char* serverUrl = "192.168.1.100";    // WebSocket server / "headunit" IPv4 address
const int serverPort = 6969;                // WebSocket server / "headunit" port
bool SEND_TEMP = true;                      // Send temperature data YES/NO (true/false)    
bool SEND_BMS = true;                       // Send BMS data YES/NO (true/false)
int MESSAGE_INTERVAL_TEMP = 1000;           // Send temperature data every X ms
int MESSAGE_INTERVAL_BMS = 5;              // Send BMS data every X ms

long lastTimeTempSent = 0;
long lastTimeBmsSent = 0;

void sendRegister();
void sendSensorMsg();
void sendBmsMsg();
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
    Serial.println("ZC_BATTERY Fw. v." + String(FIRMWARE_VERSION));
    Serial.println("");
    Serial.println("Authors: AEROSPACE-LAB Team Gokart");
    Serial.println("####################################");
    // Initialize Ethernet
    WiFi.onEvent(WiFiEvent);
    webSocket.onEvent(onWebSocketEvent);
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

    // Connect to WebSocket server
    webSocket.begin(serverUrl, serverPort, "/");
    delay(50);
    webSocket.loop();
    Serial.println("Setup complete");

    if(SEND_TEMP) {
        initializeSensors();     // Initialize temperature sensors
    } else {
        Serial.println("WARNING: Temperature data sending disabled in config options!");
    }
    if(SEND_BMS) {
        bms.Init();              // This call sets up the bms driver
    } else {
        Serial.println("WARNING: BMS data sending disabled in config options!");
    }
}

void loop() {
    // Maintain WebSocket connection
    webSocket.loop();
    delay(1);
    // Send messages to WebSocket server
    if(SEND_TEMP) {
        sendSensorMsg();
    }
    if(SEND_BMS) {
        sendBmsMsg();
    }
}


void sendRegister() {
  webSocket.sendTXT("{ \"zone\": \"battery\" }");
  Serial.println("Register package sent");
}

void sendSensorMsg() {
    if (millis() - lastTimeTempSent < MESSAGE_INTERVAL_TEMP) {
        return;
    }


    /* ############### WARNING - THIS CAUSES THE HEADUNIT TO SEND A FAULTY PONG FRAME AND THUS RESULTS IN A DISCONNECT OF THE OLIMEX WS CLIENT */
    // webSocket.sendPing();
    /* ############### WARNING - THIS CAUSES THE HEADUNIT TO SEND A FAULTY PONG FRAME AND THUS RESULTS IN A DISCONNECT OF THE OLIMEX WS CLIENT */


    // Get temperature data from sensors
    std::vector<float> temperatures = sensorLoop();
    Serial.println("Sensors array before sending: ");
    for (float temp : temperatures) {
        Serial.print(temp);
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
    doc["zone"] = "battery";
    doc["command"] = "getTemp";
    JsonArray value = doc["value"].to<JsonArray>();
    for (float temp : temperatures) {
        value.add(temp);
    }

    // Optional: Reduce memory footprint
    // doc.shrinkToFit();

    // Serialize JSON to buffer
    size_t n = serializeJson(doc, output, sizeof(output));
    if (n == sizeof(output)) {
        Serial.println(F("Error: JSON message truncated"));
    } else {
        if(webSocket.sendTXT(output)) {
            Serial.println(F("Temperature data sent"));
            Serial.println(output);
            lastTimeTempSent = millis();
        } else {
            Serial.println(F("Failed to send temperature data"));
            lastTimeTempSent = millis();
        }
    }
}

void sendBmsMsg() {
    if (millis() - lastTimeBmsSent < MESSAGE_INTERVAL_BMS) {
        return;
    }
    bms.update();

    // Send BMS voltage data to WebSocket server
    /*
    Format of the JSON message:
    {
        "zone": "battery",
        "command": "getVoltage",
        "value": 123.4
    }
    */
    char output[256];
    StaticJsonDocument<256> doc;
    doc["zone"] = "battery";
    doc["command"] = "getVoltage";
    doc["value"] = bms.get.packVoltage;
    // Serialize JSON to buffer
    size_t n = serializeJson(doc, output, sizeof(output));
    if (n == sizeof(output)) {
        Serial.println(F("Error: JSON message truncated"));
    } else {
        if(webSocket.sendTXT(output)) {
            Serial.println(F("Voltage data sent"));
            Serial.println(output);
            lastTimeBmsSent = millis();
        } else {
            Serial.println(F("Failed to send voltage data"));
            lastTimeBmsSent = millis();
        }
    }

        /*
    Format of the JSON message:
    {
        "zone": "battery",
        "command": "getCurrent",
        "value": 95.0
    }
    */
    char output2[256];
    StaticJsonDocument<256> doc2;
    doc["zone"] = "battery";
    doc["command"] = "getCurrent";
    doc["value"] = bms.get.packCurrent;
    // Serialize JSON to buffer
    size_t n2 = serializeJson(doc, output2, sizeof(output2));
    if (n2 == sizeof(output2)) {
        Serial.println(F("Error: JSON message truncated"));
    } else {
        if(webSocket.sendTXT(output2)) {
            Serial.println(F("Current data sent"));
            Serial.println(output2);
            lastTimeBmsSent = millis();
        } else {
            Serial.println(F("Failed to send current data"));
            lastTimeBmsSent = millis();
        }
    }
}