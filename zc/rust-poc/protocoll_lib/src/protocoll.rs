use std::{sync::{atomic::{AtomicU16, AtomicU32, Ordering}, Arc, Mutex}, thread::JoinHandle};
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
enum GeneralCommands {
    Register,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "zone", rename_all = "camelCase")]
pub enum Command {
    Throttle(ThrottleCommands),
    General(GeneralCommands),
}

#[derive(Debug)]
enum MessageType {
    Command,
    Ack,
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
enum NumericValue {
    UnsignedInt(u32),
    Float(f32),
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct Packet {
    #[serde(flatten)]
    pub command: Command,
    pub value: NumericValue,
}

pub trait ZoneController {
    fn handle_incoming(packet: Packet, concurrency: &ZoneControllerConcurrency);
    fn build_outgoing(command: Command, value: NumericValue) -> String {
        let rpm_packet = Packet {
            command: command,
            value: value
        };
        return serde_json::to_string(&rpm_packet).expect("failed to serialize outgoing packet");
    }
}

enum ZoneControllerConcurrency {
    Throttle {rpm_limit: Arc<AtomicU32>}
    
}

pub struct ZoneControllerFactory;

impl ZoneControllerFactory {
    fn create_battery_controller() -> BatteryController {
        BatteryController{}
    }

    pub fn create_throttle_controller() -> ThrottleController {
        let (tx, rx) = unbounded::<ReceivedPacket>();
        let (tx_send, rx_send) = unbounded::<String>();
        let intern_tx_send = tx_send.clone();
        let rpm_limit = Arc::new(AtomicU32::new(0));
        let rpm_limit_writer = Arc::clone(&rpm_limit);
        rpm_limit_writer.store(500, Ordering::SeqCst);

        ThrottleController {
            zone: Zones::Throttle,
            tx: tx,
            rx: rx,
            intern_tx_send: intern_tx_send,
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
    pub tx: Sender<ReceivedPacket>,
    rx: Receiver<ReceivedPacket>,
    intern_tx_send: Sender<String>,
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
        }
    }
}
impl ThrottleController {
    pub fn send_rpm(&self, rpm: u16) {
        let serialized = ThrottleController::build_outgoing(Command::Throttle(ThrottleCommands::GetRpm), NumericValue::UnsignedInt(rpm.into()));
        self.tx_send.send(serialized).expect("Failed to send rpm into crossbeam channel");
    }
    pub fn send_throttle(&self, throttle: f32) {
        let serialized = ThrottleController::build_outgoing(Command::Throttle(ThrottleCommands::GetThrottle), NumericValue::Float(throttle));
        self.tx_send.send(serialized).expect("Failed to send throttle into crossbeam channel");
    }
    pub fn start_message_handler_thread(mut self) -> ThrottleController{
        let rpm_limit_writer = self.rpm_limit_writer.clone();
        let tx_send= self.tx_send.clone();
        let rx = self.rx.clone();
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

