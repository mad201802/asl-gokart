use std::{cmp::Reverse, sync::{atomic::{AtomicU16, AtomicU32, Ordering}, Arc, Mutex}, thread::JoinHandle};
use crossbeam_channel::{unbounded, Receiver, Sender};
use serde::{Deserialize, Serialize};
use log::{debug, info};
use serde::de;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Zones {
    Throttle,
    Battery,
}

impl std::fmt::Display for Zones {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "command", rename_all = "camelCase")]
pub enum ThrottleCommands {
    SetLimit,
    GetThrottle,
    GetRpm,
    CalibrateLow,
    CalibrateHigh,
    EscData,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "command", rename_all = "camelCase")]
pub enum ReverseCommands {
    GetReverse,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "command", rename_all = "camelCase")]
pub enum GeneralCommands {
    Register,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "zone", rename_all = "camelCase")]
pub enum Command {
    Throttle(ThrottleCommands),
    Reverse(ReverseCommands),
    General(GeneralCommands),
}

pub enum SocketEvent {
    Connected,
    MessageReceived,
    Closed,
}

pub struct ReceivedPacket {
    pub event: SocketEvent,
    pub payload: Option<Packet>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
//Int must be before float, because otherwise serde will always deserialize to a float
pub enum NumericValue {
    UnsignedInt(u32),
    Float(f32),
    MultiValue([f32; 2]),
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct Packet {
    #[serde(flatten)]
    pub command: Command,
    pub value: NumericValue,
}

pub trait ZoneController {

    /// Handle incoming packets
    fn handle_incoming(packet: Packet, concurrency: &ZoneControllerConcurrency);

    fn build_outgoing(command: Command, value: NumericValue) -> String {
        let packet = Packet {
            command: command,
            value: value
        };
        return serde_json::to_string(&packet).expect("failed to serialize outgoing packet");
    }
}

pub enum ZoneControllerConcurrency {
    Throttle {rpm_limit: Arc<AtomicU32>}
}

pub struct ZoneControllerFactory;

impl ZoneControllerFactory {

    #[allow(dead_code)]
    fn create_battery_controller() -> BatteryController {
        BatteryController{}
    }

    pub fn create_throttle_controller() -> ThrottleController {
        let (received_packet_tx, received_packet_rx) = unbounded::<ReceivedPacket>();
        let (tx_send, rx_send) = unbounded::<String>();
        let rpm_limit = Arc::new(AtomicU32::new(0));
        let rpm_limit_writer = Arc::clone(&rpm_limit);
        
        rpm_limit_writer.store(500, Ordering::SeqCst);

        ThrottleController {
            zone: Zones::Throttle,
            received_packet_tx,
            received_packet_rx,
            tx_send: tx_send,
            rx_send: rx_send,
            rpm_limit: rpm_limit,
            rpm_limit_writer: rpm_limit_writer,
            join_handle:  None,
        }
    }
}

pub struct BatteryController;

pub struct ThrottleController {
    zone: Zones,
    pub received_packet_tx: Sender<ReceivedPacket>,
    received_packet_rx: Receiver<ReceivedPacket>,
    pub tx_send: Sender<String>,
    pub rx_send: Receiver<String>,
    pub rpm_limit: Arc<AtomicU32>,
    rpm_limit_writer: Arc<AtomicU32>,
    join_handle: Option<JoinHandle<()>>,
}

impl ZoneController for ThrottleController {

    fn handle_incoming(packet:Packet, concurrent: &ZoneControllerConcurrency) {
        match packet.command {
            Command::Throttle(throttle_cmd) => {
                match throttle_cmd {
                    ThrottleCommands::SetLimit => {
                        if let ZoneControllerConcurrency::Throttle { rpm_limit } = concurrent {
                             // Modify the value
                            rpm_limit.store(numeric_value_to_u32(&packet.value), Ordering::SeqCst);
                            println!("Updated RPM limit: {}", rpm_limit.load(Ordering::Relaxed));
                        }
                        debug!("Handling Throttle: SetLimit command");
                    }
                    ThrottleCommands::CalibrateLow => {
                        debug!("Handling Throttle: CalibrateLow command");
                    }
                    ThrottleCommands::CalibrateHigh => {
                        debug!("Handling Throttle: CalibrateHigh command");
                    }
                    ThrottleCommands::EscData => {
                        debug!("Handling Throttle: EscData command");
                    }
                    ThrottleCommands::GetThrottle => todo!(),
                    ThrottleCommands::GetRpm => todo!(),
                }
            }
            Command::General(general_cmd) => {
                handle_general_commands(general_cmd);
            }
            Command::Reverse(reverse_commands) => {
                match reverse_commands {
                    ReverseCommands::GetReverse => {
                        debug!("Handling Reverse: GetReverse command");
                    }
                }
            },
        }
    }
}
impl ThrottleController {
    pub fn send_rpm(tx_send: &Sender<String>, rpm: u16) {
        let serialized = ThrottleController::build_outgoing(Command::Throttle(ThrottleCommands::GetRpm), NumericValue::UnsignedInt(rpm.into()));
        tx_send.send(serialized).expect("Failed to send rpm into crossbeam channel");
    }
    pub fn send_reverse(tx_send: &Sender<String>, reverse: bool) {
        let serialized = ThrottleController::build_outgoing(Command::Reverse(ReverseCommands::GetReverse), NumericValue::UnsignedInt(reverse as u32));
        tx_send.send(serialized).expect("Failed to send reverse into crossbeam channel");
    }
    pub fn send_throttle(tx_send: &Sender<String>, raw_throttle: f32, adjusted_throttle: f32) {
        let serialized = ThrottleController::build_outgoing(Command::Throttle(ThrottleCommands::GetThrottle), NumericValue::MultiValue([raw_throttle, adjusted_throttle]));
        tx_send.send(serialized).expect("Failed to send throttle into crossbeam channel");
    }
    pub fn start_message_handler_thread(mut self) -> ThrottleController{
        let rpm_limit_writer = self.rpm_limit_writer.clone();
        let tx_send= self.tx_send.clone();
        let rx = self.received_packet_rx.clone();
        let join_handle = std::thread::spawn(move || {
            let concurrent = ZoneControllerConcurrency::Throttle { rpm_limit: (rpm_limit_writer) };
            
            loop {
                for packet in rx.iter() {
                    match packet.event {
                        SocketEvent::Connected => {
                            info!("Sending initial message after connection...");
                            let message = format!(r#"{{"zone": "{}"}}"#, Zones::Throttle).to_ascii_lowercase();
                            tx_send.send(message);
                        }
                        SocketEvent::MessageReceived => {
                            ThrottleController::handle_incoming(packet.payload.unwrap(), &concurrent);
                        }
                        _ => {}
                    }
                }
            }
        });
        self.join_handle = Some(join_handle);
        return self;
    }
}
fn handle_general_commands(command: GeneralCommands) {
    match command {
        GeneralCommands::Register => {
            debug!("Handling General: Register command");
        }
    }
}

fn numeric_value_to_u32(numeric_value: &NumericValue) -> u32 {
    match numeric_value {
        NumericValue::Float(f) => *f as u32, // Convert float to u32
        NumericValue::UnsignedInt(u) => *u as u32, // Convert unsigned integer to u32
        _ => 0,
    }
}

pub fn deserialize<'a, T> (text: &'a str) -> serde_json::Result<T>
    where
    T: de::Deserialize<'a>,
    {
    return serde_json::from_str::<T>(text);
}



#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialize_throttle_packet() {
        let command = Command::Throttle(ThrottleCommands::GetThrottle);
        let value = NumericValue::Float(0.25);

        let json_output = ThrottleController::build_outgoing(command, value);

        assert_eq!(
            json_output,
            r#"{"zone":"throttle","command":"getThrottle","value":0.25}"#
        );
    }
    #[test]
    fn test_serialize_rpm_packet() {
        let command = Command::Throttle(ThrottleCommands::GetRpm);
        let value = NumericValue::UnsignedInt(4000);

        let json_output = ThrottleController::build_outgoing(command, value);

        assert_eq!(
            json_output,
            r#"{"zone":"throttle","command":"getRpm","value":4000}"#
        );
    }
    #[test]
    fn test_deserialize_limit_packet() {
        let packet = r#"{"zone":"throttle","command":"setLimit","value":3000}"#;

        let output: Packet = deserialize(&packet).ok().expect("Failed to deserialize");

        assert_eq!(
            output,
            Packet {
                command: Command::Throttle(ThrottleCommands::SetLimit),
                value: NumericValue::UnsignedInt(3000)
            }
        );
    }
}

