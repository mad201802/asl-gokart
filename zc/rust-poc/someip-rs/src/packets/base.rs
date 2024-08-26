use rmp_serde::{Deserializer, Serializer};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub enum SomeIpPacketType {
    MethodInvoke = 0x00,
    MethodResponse = 0x01,

    EventSubscribe = 0x02,
    EventSubscribeAck = 0x03,
    EventTrigger = 0x04,
    EventUnsubscribe = 0x05,
    EventUnsubscribeAck = 0x06,
}

impl From<u8> for SomeIpPacketType {
    fn from(value: u8) -> Self {
        match value {
            0x00 => SomeIpPacketType::MethodInvoke,
            0x01 => SomeIpPacketType::MethodResponse,
            0x02 => SomeIpPacketType::EventSubscribe,
            0x03 => SomeIpPacketType::EventSubscribeAck,
            0x04 => SomeIpPacketType::EventTrigger,
            0x05 => SomeIpPacketType::EventUnsubscribe,
            0x06 => SomeIpPacketType::EventUnsubscribeAck,
            _ => panic!("Invalid SomeIpPacketType value"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct SomeIpPacket {
    pub packet_type: SomeIpPacketType,
    pub payload: Vec<u8>,
}

impl SomeIpPacket {
    pub fn to_msgpack(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        self.serialize(&mut Serializer::new(&mut buf)).unwrap();

        buf
    }

    pub fn from_msgpack(msgpack: &[u8]) -> Result<Self, rmp_serde::decode::Error> {
        let mut de = Deserializer::new(msgpack);
        Deserialize::deserialize(&mut de)
    }

    pub fn new<T: Serialize>(packet_type: SomeIpPacketType, payload: T) -> Self {
        let payload = rmp_serde::to_vec(&payload).unwrap();

        SomeIpPacket {
            packet_type,
            payload,
        }
    }

    pub fn get_packet_type(&self) -> SomeIpPacketType {
        self.packet_type.clone()
    }

    pub fn get_payload<T: for<'a> Deserialize<'a>>(&self) -> T {
        rmp_serde::from_slice(&self.payload).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_packet_type_conversion() {
        assert_eq!(SomeIpPacketType::from(0x00), SomeIpPacketType::MethodInvoke);
        assert_eq!(
            SomeIpPacketType::from(0x01),
            SomeIpPacketType::MethodResponse
        );
        assert_eq!(
            SomeIpPacketType::from(0x02),
            SomeIpPacketType::EventSubscribe
        );
        assert_eq!(
            SomeIpPacketType::from(0x03),
            SomeIpPacketType::EventSubscribeAck
        );
        assert_eq!(SomeIpPacketType::from(0x04), SomeIpPacketType::EventTrigger);
        assert_eq!(
            SomeIpPacketType::from(0x05),
            SomeIpPacketType::EventUnsubscribe
        );
        assert_eq!(
            SomeIpPacketType::from(0x06),
            SomeIpPacketType::EventUnsubscribeAck
        );
    }

    #[test]
    #[should_panic(expected = "Invalid SomeIpPacketType value")]
    fn test_invalid_packet_type_conversion() {
        SomeIpPacketType::from(0x07);
    }

    #[test]
    fn test_new_some_ip_header() {
        let packet_type = SomeIpPacketType::MethodInvoke;
        let payload = "Hello, World!".to_string();
        let packet = SomeIpPacket::new(packet_type.clone(), payload.clone());

        assert_eq!(packet.packet_type, packet_type);
        assert_eq!(packet.payload, payload);
    }

    #[test]
    fn test_to_msgpack() {
        let packet_type = SomeIpPacketType::MethodInvoke;
        let payload = "Hello, World!".to_string();
        let packet = SomeIpPacket::new(packet_type, payload);

        let msgpack = packet.to_msgpack();
        assert_eq!(
            msgpack,
            vec![
                146, 172, 77, 101, 116, 104, 111, 100, 73, 110, 118, 111, 107, 101, 173, 72, 101,
                108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33
            ]
        ); // Example msgpack bytes for "Hello, World!"
    }

    #[test]
    fn test_from_msgpack() {
        let msgpack = vec![
            146, 172, 77, 101, 116, 104, 111, 100, 73, 110, 118, 111, 107, 101, 173, 72, 101, 108,
            108, 111, 44, 32, 87, 111, 114, 108, 100, 33,
        ];
        let packet = SomeIpPacket::from_msgpack(&msgpack).unwrap();

        let packet_type = SomeIpPacketType::MethodInvoke;
        let payload = "Hello, World!".to_string();
        let expected_packet = SomeIpPacket::new(packet_type, payload);

        assert_eq!(packet, expected_packet);
    }
}
