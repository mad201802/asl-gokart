use std::{sync::{atomic::{AtomicU16, AtomicU32, Ordering}, Arc, Mutex}, thread::JoinHandle};
use crossbeam_channel::{unbounded, Receiver, Sender};
use esp_idf_svc::ws::{client::EspWebSocketClient, FrameType};
use serde::{Deserialize, Serialize};
use log::{debug, info};

use super::ws_client::{self};

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

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "command", rename_all = "camelCase")]
pub enum ThrottleCommands {
    SetLimit,
    CalibrateLow,
    CalibrateHigh,
    EscData,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "command", rename_all = "camelCase")]
enum GeneralCommands {
    Register,
}

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
pub struct Packet {
    #[serde(flatten)]
    pub command: Command,
    pub value: u32,
}

pub trait ZoneController {
    fn handle_incoming(packet: Packet, concurrency: &ZoneControllerConcurrency);
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
        const SERVER_URI: &str = "ws://192.168.1.100:6969";
        let (tx, rx) = unbounded::<ReceivedPacket>();
        let tx2 = tx.clone();
        let rpm_limit = Arc::new(AtomicU32::new(0));
        let rpm_limit_writer = Arc::clone(&rpm_limit);
        rpm_limit_writer.store(20000, Ordering::SeqCst);

        let join_handle = std::thread::spawn(move || {
            let concurrent = ZoneControllerConcurrency::Throttle { rpm_limit: (rpm_limit_writer) };

            let mut client = ws_client::create(SERVER_URI, tx.clone());
            
            loop {
                for packet in rx.iter() {
                    match packet.event {
                        SocketEvent::Connected => {
                            info!("Sending initial message after connection...");
                            let message = format!(r#"{{"zone": "{}"}}"#, Zones::Throttle).to_ascii_lowercase();
                            if let Err(e) = client.send(FrameType::Text(false), message.as_bytes()) {
                                info!("Failed to send message: {:?}", e);
                            }
                        }
                        SocketEvent::MessageReceived => {
                            ThrottleController::handle_incoming(packet.payload.unwrap(), &concurrent);
                        }
                        _ => {}
                    }
                }
            }
        });

        ThrottleController {
            zone: Zones::Throttle,
            tx: tx2,
            rpm_limit: rpm_limit,
            join_handle:  join_handle,
        }
    }
}

pub struct BatteryController;

pub struct ThrottleController {
    zone: Zones,
    tx: Sender<ReceivedPacket>,
    pub rpm_limit: Arc<AtomicU32>,
    join_handle: JoinHandle<()>,
}

impl ZoneController for ThrottleController {
    fn handle_incoming(packet:Packet, concurrent: &ZoneControllerConcurrency) {
        match packet.command {
            Command::Throttle(throttle_cmd) => {
                match throttle_cmd {
                    ThrottleCommands::SetLimit => {
                        if let ZoneControllerConcurrency::Throttle { rpm_limit } = concurrent {
                             // Modify the value
                            rpm_limit.store(packet.value, Ordering::SeqCst);
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
                }
            }
            Command::General(general_cmd) => {
                handle_general_commands(general_cmd);
            }
        }
    }
}

fn handle_general_commands(command: GeneralCommands) {
    match command {
        GeneralCommands::Register => {
            debug!("Handling General: Register command");
        }
    }
}
