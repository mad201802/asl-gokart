#include <Arduino.h>
#include <ETH.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>

// configure the Ethernet connection
IPAddress IPv4(192, 168, 1, 10);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);

// IP address of the WebSocket server machine 
// (e.g. the tools/websocket-server in the repository)
String wsServerIPv4 = "192.168.1.2";
// port and path of the WebSocket server
int wsServerPort = 8765;
String wsServerPath = "/";

WebSocketsClient ws;

// put function declarations here:
void sendWsMessage(String message, String event);

void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  delay(3000);
  Serial.println("Starting Ethernet...");
  ETH.begin();
  ETH.config(IPv4, gateway, subnet);
  Serial.println("Ethernet started");
  Serial.println("--------------------");
  Serial.print("IP Address: ");
  Serial.println(ETH.localIP());
  Serial.print("MAC Address: ");
  Serial.println(ETH.macAddress());
  Serial.print("Link Speed: ");
  Serial.println(ETH.linkSpeed());
  Serial.println("--------------------");

  Serial.println("Connecting to WebSocket...");
  ws.begin(wsServerIPv4, wsServerPort, wsServerPath);

  Serial.println("WebSocket connected");
  sendWsMessage("Hello from ESP32", "message");
}

void loop() {
  // put your main code here, to run repeatedly:
  delay(1000);
  sendWsMessage("heartbeat", "DATA-FROM-OLIMEX-ESP32");
}

void sendWsMessage(String message, String event) {
  DynamicJsonDocument doc(1024);
  doc["event"] = event;
  doc["data"] = message;
  String output;
  serializeJson(doc, output);
  ws.sendTXT(output);
}