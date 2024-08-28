use std::{io, time::Duration};

use esp_idf_svc::hal::delay::{FreeRtos, BLOCK};
use log::{error, debug};

pub const PACKET_LENGTH: usize = 19;
pub const CRC_INDEX: usize = 18;
//pub const ERROR: i32 = -1;


pub fn bswap_16(x: u16) -> u16 {
    ((x >> 8) & 0xff) | ((x << 8) & 0xff00)
}

#[derive(Debug, PartialEq)]
pub enum PacketType {
    PacketA,
    PacketB,
}

#[derive(Debug, Default)]
pub struct GenericPacket {
    pub bytes: [u8; PACKET_LENGTH],
}

#[derive(Debug, Default)]
pub struct PacketA {
    pub command: u8,
    pub static_var: u8,
    pub throttle: u8,
    pub brake_pedal: u8,
    pub brake_switch: u8,
    pub foot_switch: u8,
    pub forward_switch: u8,
    pub reverse: bool,
    pub hall_a: bool,
    pub hall_b: bool,
    pub hall_c: bool,
    pub battery_voltage: u8,
    pub motor_temp: u8,
    pub controller_temp: u8,
    pub setting_dir: bool,
    pub actual_dir: bool,
    pub unknown_1: u8,
    pub unknown_2: u8,
    pub crc: u8,
}

#[derive(Debug, Default)]
pub struct PacketB {
    pub padding_1: u8,
    pub padding_2: u8,
    pub padding_3: u8,
    pub padding_4: u8,
    pub rpm: u16,
    pub phase_current: u16,
    pub padding_5: u8,
    pub padding_6: u8,
    pub padding_7: u8,
    pub padding_8: u8,
    pub padding_9: u8,
    pub padding_10: u8,
    pub padding_11: u8,
    pub padding_12: u8,
    pub padding_13: u8,
    pub padding_14: u8,
    pub crc: u8,
}

#[derive(Debug, Default)]
pub struct PacketsStruct {
    pub a: PacketA,
    pub b: PacketB,
}

pub fn calculate_crc(pkt: &GenericPacket) -> u8 {
    pkt.bytes[..CRC_INDEX].iter().fold(0u8, |acc, &byte| acc.wrapping_add(byte))
}

pub fn validate_checksum(pkt: &GenericPacket) -> bool {
    calculate_crc(pkt) == pkt.bytes[CRC_INDEX]
}

pub fn determine_packet_type(pkt: &GenericPacket) -> Option<PacketType> {
    match pkt.bytes[0] {
        0x3A => Some(PacketType::PacketA),
        0x3B => Some(PacketType::PacketB),
        _ => None,
    }
}

pub fn bytes_to_packet(pkt: &mut GenericPacket, bytes: &[u8]) {
    pkt.bytes.copy_from_slice(&bytes[..PACKET_LENGTH]);
}

pub fn import_bytes_to_packets(pkts: &mut PacketsStruct, bytes: &[u8]) {
    let mut gpkt = GenericPacket::default();
    bytes_to_packet(&mut gpkt, bytes);

    if validate_checksum(&gpkt) {
        match determine_packet_type(&gpkt) {
            Some(PacketType::PacketA) => {
                pkts.a.command = gpkt.bytes[0];
                pkts.a.static_var = gpkt.bytes[1];
                pkts.a.throttle = gpkt.bytes[2];
                pkts.a.brake_pedal = gpkt.bytes[3];
                pkts.a.brake_switch = gpkt.bytes[4];
                pkts.a.foot_switch = gpkt.bytes[5];
                pkts.a.forward_switch = gpkt.bytes[6];
                pkts.a.reverse = gpkt.bytes[7] != 0;
                pkts.a.hall_a = gpkt.bytes[8] != 0;
                pkts.a.hall_b = gpkt.bytes[9] != 0;
                pkts.a.hall_c = gpkt.bytes[10] != 0;
                pkts.a.battery_voltage = gpkt.bytes[11];
                pkts.a.motor_temp = gpkt.bytes[12];
                pkts.a.controller_temp = gpkt.bytes[13];
                pkts.a.setting_dir = gpkt.bytes[14] != 0;
                pkts.a.actual_dir = gpkt.bytes[15] != 0;
                pkts.a.unknown_1 = gpkt.bytes[16];
                pkts.a.unknown_2 = gpkt.bytes[17];
                pkts.a.crc = gpkt.bytes[18];
            }
            Some(PacketType::PacketB) => {
                pkts.b.padding_1 = gpkt.bytes[0];
                pkts.b.padding_2 = gpkt.bytes[1];
                pkts.b.padding_3 = gpkt.bytes[2];
                pkts.b.padding_4 = gpkt.bytes[3];
                pkts.b.rpm = bswap_16(u16::from_le_bytes([gpkt.bytes[4], gpkt.bytes[5]]));
                pkts.b.phase_current = bswap_16(u16::from_le_bytes([gpkt.bytes[6], gpkt.bytes[7]]));
                pkts.b.padding_5 = gpkt.bytes[8];
                pkts.b.padding_6 = gpkt.bytes[9];
                pkts.b.padding_7 = gpkt.bytes[10];
                pkts.b.padding_8 = gpkt.bytes[11];
                pkts.b.padding_9 = gpkt.bytes[12];
                pkts.b.padding_10 = gpkt.bytes[13];
                pkts.b.padding_11 = gpkt.bytes[14];
                pkts.b.padding_12 = gpkt.bytes[15];
                pkts.b.padding_13 = gpkt.bytes[16];
                pkts.b.padding_14 = gpkt.bytes[17];
                pkts.b.crc = gpkt.bytes[18];
            }
            None => {}
        }
    }
}

pub fn read_controller(packet_a: bool, packet_b: bool, uart_driver: &esp_idf_svc::hal::uart::UartDriver) -> io::Result<PacketsStruct> {
    let mut packets = PacketsStruct::default();
    
    if packet_a {
        let packet_a_command: [u8; 3] = [0x3a, 0x00, 0x3a];
        
        if let Err(e) = uart_driver.write(&packet_a_command) {
            error!("Failed to write packet_a_command: {}", e);
        }
        debug!("Wrote packet_a_command");

        let mut packet_response = [0u8; PACKET_LENGTH];

        //TODO Consider setting a hard timeout instead of waiting unlimited
        if let Err(e) = uart_driver.read(&mut packet_response, 100) {
            error!("Failed to read packet_response: {}", e);
        }
        debug!("Received packet_response: {:?}", packet_response);

        import_bytes_to_packets(&mut packets, &packet_response);
        debug!("Updated packets: {:?}", packets);
    }

    if packet_b {
        let packet_b_command: [u8; 3] = [0x3b, 0x00, 0x3b];
        uart_driver.write(&packet_b_command).unwrap();
        debug!("wrote b");

        let mut packet_response = [0u8; PACKET_LENGTH];
        uart_driver.read(&mut packet_response, 100).unwrap();

        debug!("Received packet_response: {:?}", packet_response);

        import_bytes_to_packets(&mut packets, &packet_response);
        debug!("Updated packets: {:?}", packets);
    }

    Ok(packets)
}
