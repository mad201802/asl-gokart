use std::{cmp::Reverse, sync::{atomic::{AtomicBool, AtomicU16, AtomicU32, Ordering}, Arc, Mutex}, thread::JoinHandle};
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
pub enum ThrottleZoneCommands {
    SetLimit,
    SetPipeThroughRawThrottle,
    SetPedalMultiplier,
    GetThrottle,
    GetRpm,
    CalibrateLow,
    CalibrateHigh,
    EscData,
    GetReverse,
    SetReconnectUART
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "command", rename_all = "camelCase")]
pub enum ZoneIndependentCommands {
    Register,
}

//Contains a entry for each zone that refers to the enum that contains the available commands for this zone.
//In addition there are shared commands refered to with 'General'
#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "zone", rename_all = "camelCase")]
pub enum Command {
    Throttle(ThrottleZoneCommands),
    General(ZoneIndependentCommands),
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
    Boolean(bool)
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
    Throttle {rpm_limit: Arc<AtomicU32>, pipe_through_raw_throttle: Arc<AtomicBool>, pedal_multiplier: Arc<AtomicU32>, reconnect_uart: Arc<AtomicBool>}
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
        let pipe_through_raw_throttle = Arc::new(AtomicBool::new(false));
        let pipe_through_raw_throttle_writer = Arc::clone(&pipe_through_raw_throttle);
        let pedal_multiplier = Arc::new(AtomicU32::new(100));
        let pedal_multiplier_writer = Arc::clone(&pedal_multiplier);
        let reconnect_uart = Arc::new(AtomicBool::new(false));
        let reconnect_uart_writer=Arc::clone(&reconnect_uart);
        
        rpm_limit_writer.store(500, Ordering::SeqCst);

        ThrottleController {
            zone: Zones::Throttle,
            received_packet_tx,
            received_packet_rx,
            tx_send,
            rx_send,
            rpm_limit,
            rpm_limit_writer,
            pipe_through_raw_throttle,
            pipe_through_raw_throttle_writer,
            pedal_multiplier,
            pedal_multiplier_writer,
            reconnect_uart,
            reconnect_uart_writer,
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
    pub pipe_through_raw_throttle: Arc<AtomicBool>,
    pipe_through_raw_throttle_writer: Arc<AtomicBool>, //Used to bypass rpm limiter; pedal_multiplier is still used
    pub pedal_multiplier: Arc<AtomicU32>,
    pedal_multiplier_writer: Arc<AtomicU32>, //Multiplier in %; when set to 50, the throttle output is 50% (when using fun mode)
    pub reconnect_uart: Arc<AtomicBool>,
    reconnect_uart_writer: Arc<AtomicBool>, //Multiplier in %; when set to 50, the throttle output is 50% (when using fun mode)
    join_handle: Option<JoinHandle<()>>,
}

impl ZoneController for ThrottleController {

    fn handle_incoming(packet:Packet, concurrent: &ZoneControllerConcurrency) {
        match packet.command {
            Command::Throttle(throttle_cmd) => {
                match throttle_cmd {
                    ThrottleZoneCommands::SetLimit => {
                        if let ZoneControllerConcurrency::Throttle { rpm_limit, pipe_through_raw_throttle, pedal_multiplier , reconnect_uart} = concurrent {
                             // Modify the value
                            rpm_limit.store(numeric_value_to_u32(&packet.value), Ordering::SeqCst);
                            println!("Updated RPM limit: {}", rpm_limit.load(Ordering::Relaxed));
                        }
                        debug!("Handling Throttle: SetLimit command");
                    }
                    ThrottleZoneCommands::CalibrateLow => {
                        debug!("Handling Throttle: CalibrateLow command");
                    }
                    ThrottleZoneCommands::CalibrateHigh => {
                        debug!("Handling Throttle: CalibrateHigh command");
                    }
                    ThrottleZoneCommands::EscData => {
                        debug!("Handling Throttle: EscData command");
                    }
                    ThrottleZoneCommands::GetThrottle => todo!(),
                    ThrottleZoneCommands::GetRpm => todo!(),
                    ThrottleZoneCommands::GetReverse => {
                        debug!("Handling Reverse: GetReverse command");
                    }
                    ThrottleZoneCommands::SetPipeThroughRawThrottle => {
                        if let ZoneControllerConcurrency::Throttle { rpm_limit, pipe_through_raw_throttle, pedal_multiplier, reconnect_uart } = concurrent {
                            // Modify the value
                           pipe_through_raw_throttle.store(numeric_value_to_bool(&packet.value), Ordering::SeqCst);
                           println!("Updated fun mode to: {}", pipe_through_raw_throttle.load(Ordering::Relaxed));
                       }
                        debug!("Handling Throttle: SetFun command");
                    },
                    ThrottleZoneCommands::SetPedalMultiplier => {
                        if let ZoneControllerConcurrency::Throttle { rpm_limit, pipe_through_raw_throttle, pedal_multiplier, reconnect_uart } = concurrent {
                            // Modify the value
                           pedal_multiplier.store(numeric_value_to_u32(&packet.value), Ordering::SeqCst);
                           println!("Updated Pedal multiplier: {}", pedal_multiplier.load(Ordering::Relaxed));
                       }
                        debug!("Handling Throttle: SetPedalMutiplier command");
                    },
                    ThrottleZoneCommands::SetReconnectUART => {
                        if let ZoneControllerConcurrency::Throttle { rpm_limit, pipe_through_raw_throttle, pedal_multiplier, reconnect_uart } = concurrent {
                            // Modify the value
                            reconnect_uart.store(numeric_value_to_bool(&packet.value), Ordering::SeqCst);
                           println!("Updated reconnect uart trigger: {}", reconnect_uart.load(Ordering::Relaxed));
                       }
                        debug!("Handling Throttle: SetPedalMutiplier command");
                    },
                }
            }
            Command::General(general_cmd) => {
                handle_general_commands(general_cmd);
            },
        }
    }
}
impl ThrottleController {
    pub fn send_rpm(tx_send: &Sender<String>, rpm: u16) {
        let serialized = ThrottleController::build_outgoing(Command::Throttle(ThrottleZoneCommands::GetRpm), NumericValue::UnsignedInt(rpm.into()));
        tx_send.send(serialized).expect("Failed to send rpm into crossbeam channel");
    }
    pub fn send_reverse(tx_send: &Sender<String>, reverse: bool) {
        let serialized = ThrottleController::build_outgoing(Command::Throttle(ThrottleZoneCommands::GetReverse), NumericValue::UnsignedInt(reverse as u32));
        tx_send.send(serialized).expect("Failed to send reverse into crossbeam channel");
    }
    pub fn send_throttle(tx_send: &Sender<String>, raw_throttle: f32, adjusted_throttle: f32) {
        let serialized = ThrottleController::build_outgoing(Command::Throttle(ThrottleZoneCommands::GetThrottle), NumericValue::MultiValue([raw_throttle, adjusted_throttle]));
        tx_send.send(serialized).expect("Failed to send throttle into crossbeam channel");
    }
    pub fn start_message_handler_thread(mut self) -> ThrottleController{
        let rpm_limit_writer = self.rpm_limit_writer.clone();
        let pipe_through_raw_throttle_writer = self.pipe_through_raw_throttle_writer.clone();
        let pedal_multiplier_writer = self.pedal_multiplier_writer.clone();
        let reconnect_uart_writer = self.reconnect_uart_writer.clone();
        let tx_send= self.tx_send.clone();
        let rx = self.received_packet_rx.clone();
        let join_handle = std::thread::spawn(move || {
            let concurrent = ZoneControllerConcurrency::Throttle { 
                rpm_limit: rpm_limit_writer,
                pipe_through_raw_throttle: pipe_through_raw_throttle_writer,
                pedal_multiplier: pedal_multiplier_writer,
                reconnect_uart: reconnect_uart_writer
            };
            
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
fn handle_general_commands(command: ZoneIndependentCommands) {
    match command {
        ZoneIndependentCommands::Register => {
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

fn numeric_value_to_bool(numeric_value: &NumericValue) -> bool {
    match numeric_value {
        NumericValue::Boolean(f) => *f as bool, // Convert float to u32
        _ => false,
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
        let command = Command::Throttle(ThrottleZoneCommands::GetThrottle);
        let value = NumericValue::Float(0.25);

        let json_output = ThrottleController::build_outgoing(command, value);

        assert_eq!(
            json_output,
            r#"{"zone":"throttle","command":"getThrottle","value":0.25}"#
        );
    }
    #[test]
    fn test_serialize_rpm_packet() {
        let command = Command::Throttle(ThrottleZoneCommands::GetRpm);
        let value = NumericValue::UnsignedInt(4000);

        let json_output = ThrottleController::build_outgoing(command, value);

        assert_eq!(
            json_output,
            r#"{"zone":"throttle","command":"getRpm","value":4000}"#
        );
    }
    #[test]
    fn test_serialize_reverse_status_packet() {
        let command = Command::Throttle(ThrottleZoneCommands::GetReverse);
        let value = NumericValue::UnsignedInt(0);

        let json_output = ThrottleController::build_outgoing(command, value);

        assert_eq!(
            json_output,
            r#"{"zone":"throttle","command":"getReverse","value":0}"#
        );
    }
    #[test]
    fn test_deserialize_limit_packet() {
        let packet = r#"{"zone":"throttle","command":"setLimit","value":3000}"#;

        let output: Packet = deserialize(&packet).ok().expect("Failed to deserialize");

        assert_eq!(
            output,
            Packet {
                command: Command::Throttle(ThrottleZoneCommands::SetLimit),
                value: NumericValue::UnsignedInt(3000)
            }
        );
    }

    #[test]
    fn test_deserialize_set_pipe_through_raw_throttle_packet() {
        let packet = r#"{"zone":"throttle","command":"setPipeThroughRawThrottle","value":true}"#;
        let output: Packet = deserialize(&packet).ok().expect("Failed to deserialize");

        let expected = Packet {
            command: Command::Throttle(ThrottleZoneCommands::SetPipeThroughRawThrottle),
            value: NumericValue::Boolean(true)
        };

        assert_eq!(
            output,
            expected
        );
    }

    #[test]
    fn test_deserialize_set_pedal_multiplier_packet() {
        let packet = r#"{"zone":"throttle","command":"setPedalMultiplier","value":50}"#;
        let output: Packet = deserialize(&packet).ok().expect("Failed to deserialize");

        let expected = Packet {
            command: Command::Throttle(ThrottleZoneCommands::SetPedalMultiplier),
            value: NumericValue::UnsignedInt(50)
        };

        assert_eq!(
            output,
            expected
        );
    }

    #[test]
    fn test_deserialize_reconnect_uart() {
        let packet = r#"{"zone":"throttle","command":"setReconnectUART","value":True}"#;
        let output: Packet = deserialize(&packet).ok().expect("Failed to deserialize");

        let expected = Packet {
            command: Command::Throttle(ThrottleZoneCommands::SetReconnectUART),
            value: NumericValue::Boolean(true)
        };

        assert_eq!(
            output,
            expected
        );
    }

}

