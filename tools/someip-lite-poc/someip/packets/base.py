from dataclasses import dataclass
from enum import Enum

class SomeIpLitePacketType(Enum):
    METHOD_INVOKE = 0x00
    METHOD_RESPONSE = 0x01

    EVENT_SUBSCRIBE = 0x02
    EVENT_SUBSCRIBE_ACK = 0x03
    EVENT_TRIGGER = 0x04
    EVENT_UNSUBSCRIBE = 0x05
    EVENT_UNSUBSCRIBE_ACK = 0x06

@dataclass
class SomeIpLitePacket:
    packet_type: int
    payload: bytes

    def __bytes__(self):
        packet_type_bytes = self.packet_type.to_bytes(4, byteorder='big')
        return packet_type_bytes + self.payload
    
    def parse(data: bytes):
        packet_type = int.from_bytes(data[0:4], byteorder='big')
        payload = data[4:]
        return SomeIpLitePacket(packet_type, payload)