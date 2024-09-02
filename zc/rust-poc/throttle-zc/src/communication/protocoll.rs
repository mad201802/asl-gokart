use std::{sync::{Arc, Mutex}, thread::JoinHandle};
use crossbeam_channel::{unbounded, Receiver, Sender};
use esp_idf_svc::ws::{client::EspWebSocketClient, FrameType};
use log::info;

use super::ws_client::{self, ExampleEvent};

#[derive(Debug)]
enum Zones {
    Throttle,
    Motor,
    MotorThrottle,
    Battery,
}

impl std::fmt::Display for Zones {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Debug)]
enum ThrottleCommands {
    SetLimit,
    CalibrateLow,
    CalibrateHigh,
    EscData,
    General(GeneralCommands),
}

#[derive(Debug)]
enum GeneralCommands {
    Register,
}

#[derive(Debug)]
enum Commands {
    Throttle(ThrottleCommands),
    General(GeneralCommands),
}

#[derive(Debug)]
enum MessageType {
    Command,
    Ack,
}

#[derive(Debug)]
struct Packet {
    message_type: MessageType,
    command: Commands,
    payload: [u8],
}

pub trait ZoneController {
    fn handle_incoming(&self);
    fn register_zone(&self);
}

pub struct ZoneControllerFactory;

impl ZoneControllerFactory {
    fn create_battery_controller() -> BatteryController {
        BatteryController{}
    }

    pub fn create_motor_and_throttle_controller() -> MotorThrottleController {
        const SERVER_URI: &str = "ws://192.168.1.100:6969";
        let (tx, rx) = unbounded();
        let tx2 = tx.clone();

        let join_handle = std::thread::spawn(move || {

            let mut client = ws_client::create(SERVER_URI, tx.clone());

            for event in rx.iter() {
                match event {
                    ExampleEvent::Connected => {
                        info!("Sending initial message after connection...");
                        let message = format!(r#"{{"zone": "{}"}}"#, Zones::Throttle).to_ascii_lowercase();
                        if let Err(e) = client.send(FrameType::Text(false), message.as_bytes()) {
                            info!("Failed to send message: {:?}", e);
                        }
                    }
                    _ => {}
                }
            }
        });

        MotorThrottleController {
            zone: Zones::MotorThrottle,
            tx: tx2,
            join_handle:  join_handle, // Wrap client in Arc<Mutex<>>
        }
    }
}

pub struct BatteryController;

pub struct MotorThrottleController {
    zone: Zones,
    tx: Sender<ExampleEvent>,
    join_handle: JoinHandle<()>,
}

impl ZoneController for MotorThrottleController {
    fn handle_incoming(&self) {
        // Implementation here
    }

    fn register_zone(&self) {
        // Implementation here
    }

}
