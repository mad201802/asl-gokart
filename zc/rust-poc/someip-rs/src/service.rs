use std::collections::HashMap;
use std::net::SocketAddr;

use crate::packets::{
    SomeIpMethodInvoke, SomeIpMethodInvokeResponse, SomeIpPacket, SomeIpPacketType,
};

pub struct SomeIpService {
    pub socket_addr: SocketAddr,
    pub service_id: u8,
    methods: HashMap<u8, fn(Vec<u8>) -> Vec<u8>>,
}

impl SomeIpService {
    pub fn new(service_id: u8) -> Self {
        SomeIpService {
            socket_addr: SocketAddr::from(([127, 0, 0, 1], 0)),
            service_id,
            methods: HashMap::new(),
        }
    }

    pub fn offer_method(&mut self, method_id: u8, method: fn(Vec<u8>) -> Vec<u8>) {
        self.methods.insert(method_id, method);
    }

    pub fn call_method(
        &self,
        remote_ip: SocketAddr,
        method_id: u8,
        payload: Vec<u8>,
        response_handler: fn(Vec<u8>),
    ) {
        print!("Calling method {} with payload {:?}...", method_id, payload);
        let method_invoke = SomeIpPacket::new(
            SomeIpPacketType::MethodInvoke,
            SomeIpMethodInvoke {
                service_id: self.service_id,
                method_id,
                payload,
            },
        );

        let method_invoke_msgpack = method_invoke.to_msgpack();
        let socket = std::net::UdpSocket::bind(self.socket_addr).expect("Failed to bind socket");
        socket
            .send_to(&method_invoke_msgpack, remote_ip)
            .expect("Failed to send method invoke");
    }

    pub fn run(&self) {
        let socket = std::net::UdpSocket::bind(self.socket_addr).expect("Failed to bind socket");

        loop {
            let mut buf = [0; 1024];
            let (len, remote_ip) = socket.recv_from(&mut buf).expect("Failed to receive data");

            let packet = SomeIpPacket::from_msgpack(&buf[..len]).expect("Failed to parse packet");

            match packet.get_packet_type() {
                SomeIpPacketType::MethodInvoke => {
                    let method_invoke = packet.get_payload::<SomeIpMethodInvoke>();
                    let method_id = method_invoke.method_id;
                    let payload = method_invoke.payload;

                    if let Some(method) = self.methods.get(&method_id) {
                        let response = method(payload);
                        let response_packet = SomeIpPacket::new(
                            SomeIpPacketType::MethodResponse,
                            SomeIpMethodInvokeResponse {
                                service_id: self.service_id,
                                method_id,
                                response_code: 0x00,
                                payload: response,
                            },
                        );

                        let response_msgpack = response_packet.to_msgpack();
                        socket
                            .send_to(&response_msgpack, remote_ip)
                            .expect("Failed to send response");
                    }
                }
                SomeIpPacketType::MethodResponse => todo!(),
                SomeIpPacketType::EventSubscribe => todo!(),
                SomeIpPacketType::EventSubscribeAck => todo!(),
                SomeIpPacketType::EventTrigger => todo!(),
                SomeIpPacketType::EventUnsubscribe => todo!(),
                SomeIpPacketType::EventUnsubscribeAck => todo!(),
            }
        }
    }
}
