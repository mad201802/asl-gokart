#include <Arduino.h>
#include <ETH.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "SensorManager.h"

// Olimex IP-Adresse unten im Code anpassen!
// WICHITG: IP-Adresse und Port des WebSocket-Servers hier anpassen:
#define WEB_SOCKET_SERVER_IP "192.168.1.100"
#define WEB_SOCKET_SERVER_PORT 6969

float EXAMPLE_TEMP_ARRAY[] = { 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0};

WebSocketsClient webSocket;

void sendRegisterPacket();
void onWebSocketEvent(WStype_t type, uint8_t *payload, size_t length);

void onWebSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Serial.printf("Disconnected!\n");
            break;
        case WStype_CONNECTED:
            Serial.printf("Connected to URL: %s\n", payload);
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
    Serial.begin(115200);
    
    // Initialize Ethernet
    ETH.begin();
    
    /* -------------------- HIER DIE IP-Adressen vom ESP und Gateway konfigurieren -------------------- */
    ETH.config(IPAddress(192, 168, 1, 2), IPAddress(192, 168, 1, 1), IPAddress(255, 255, 255, 0));
    /* -------------------------------------------------------------------------------------------------*/
    
    // Wait for Ethernet to connect
    Serial.print("Connecting to Ethernet");
    while (!ETH.linkUp()) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("Connected to Ethernet");

    // Initialize WebSocket client
    webSocket.begin(WEB_SOCKET_SERVER_IP, WEB_SOCKET_SERVER_PORT);
    webSocket.onEvent(onWebSocketEvent);
    sendRegisterPacket();
    Serial.println("WebSocket client initialized");

    // Initialize sensors
    initializeSensors();
}

void loop() {
    // Maintain WebSocket connection
    webSocket.loop();
    std::vector<float> temperatures = sensorLoop();

    // Send temperature data to WebSocket server
    /*
    Format of the JSON message:
    {
        "valueType": "getTemp",
        "value": [20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0]
    }
    */
   
    char output[256];
    StaticJsonDocument<256> doc;

    doc["valueType"] = "getTemp";
    JsonArray value = doc["value"].to<JsonArray>();
    for (float temp : temperatures) {
        value.add(temp);
    }

    doc.shrinkToFit();  // optional

    serializeJson(doc, output, sizeof(output));
    webSocket.sendTXT(output);
    Serial.println("Temperature data sent");
    delay(500);

}


void sendRegisterPacket() {
    // Send register packet to WebSocket server
    /*
    Format of the JSON message:
    {
        "zone": "battery"
    }
    */

    char output[256];
    StaticJsonDocument<256> doc;

    doc["zone"] = "battery";

    doc.shrinkToFit();  // optional

    serializeJson(doc, output, sizeof(output));
    webSocket.sendTXT(output);
    delay(1000);
    Serial.println("Register packet sent");
}