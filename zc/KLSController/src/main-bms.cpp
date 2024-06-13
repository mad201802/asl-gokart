#include <Arduino.h>
#include "controllerdata.h"

struct SerialDataPacket
{
   uint8_t poti;
   uint8_t throttle;
   uint16_t rpm;
};

void setup()
{
    Serial.begin(19200);
    Serial1.begin(19200, SERIAL_8N1, 36, 4);
}

_packets_struct read_controller(bool packet_a, bool packet_b) {
    _packets_struct packets;

    if(packet_a) {
        byte packetA[] = {0x3a, 0x00, 0x3a};
        Serial1.write(packetA, sizeof(packetA));
        int packetSize = 19;
        byte packetResponse[packetSize];
        Serial1.readBytes(packetResponse, packetSize);

        import_bytes_to_packets(&packets, packetResponse);
    }

    if(packet_b) {
        byte packetB[] = {0x3b, 0x00, 0x3b};
        Serial1.write(packetB, sizeof(packetB));
        int packetSize = 19;
        byte packetResponse[packetSize];
        Serial1.readBytes(packetResponse, packetSize);

        import_bytes_to_packets(&packets, packetResponse);
    }

    return packets;
}

void loop()
{
    // put your main code here, to run repeatedly:
    auto packets = read_controller(true, true);
    
    // Put information into a struct
    SerialDataPacket data;
    data.poti = 0;
    data.throttle = packets.a.throttle;
    data.rpm = packets.b.rpm;

    // Send data to serial
    Serial.write((uint8_t*)&data, sizeof(data));
}
