use std::{sync::mpsc::{self}, time::Duration};

use crossbeam_channel::{unbounded, Sender, Receiver};
use log::{error, info};

use esp_idf_svc::{io::EspIOError, ws::client::{
    EspWebSocketClient, EspWebSocketClientConfig, WebSocketEvent, WebSocketEventType,
}};

use crate::communication::protocoll::{Packet, SocketEvent};

use super::protocoll::ReceivedPacket;


// pub fn create(server_uri: &str) -> (EspWebSocketClient<'_>, crossbeam_channel::Receiver<ExampleEvent>) {
//     let timeout = Duration::from_secs(10);
//     let (tx, rx) = unbounded();
//     let wsconfig = EspWebSocketClientConfig {
//         ..Default::default()
//     };
//     let client =
//     EspWebSocketClient::new(server_uri, &wsconfig, timeout, move |event| {
//         handle_event(tx.clone(), event)
//     }).unwrap();
//     return (client, rx);
// }

pub fn create(server_uri: &str, tx: Sender<ReceivedPacket>) -> EspWebSocketClient<'_> {
    let timeout = Duration::from_secs(10);
    let wsconfig = EspWebSocketClientConfig {
        ..Default::default()
    };
    let client =
    EspWebSocketClient::new(server_uri, &wsconfig, timeout, move |event| {
        handle_event(tx.clone(), event)
    }).unwrap();
    return client;
}


fn handle_event(tx: Sender<ReceivedPacket>, event: &Result<WebSocketEvent, EspIOError>) {
    
    if let Ok(event) = event {
        match event.event_type {
            WebSocketEventType::BeforeConnect => {
                info!("Websocket before connect");
            }
            WebSocketEventType::Connected => {
                info!("Websocket connected");
                let packet = ReceivedPacket {
                    event: SocketEvent::Connected,
                    payload: None
                };

                tx.send(packet).ok();
            }
            WebSocketEventType::Disconnected => {
                info!("Websocket disconnected");
            }
            WebSocketEventType::Close(reason) => {
                info!("Websocket close, reason: {reason:?}");
            }
            WebSocketEventType::Closed => {
                info!("Websocket closed");
                let packet = ReceivedPacket {
                    event: SocketEvent::Closed,
                    payload: None
                };

                tx.send(packet).ok(); 
           }
            WebSocketEventType::Text(text) => {
                info!("Websocket recv, text: {text}");
                match serde_json::from_str::<Packet>(text) {
                    Ok(p)  =>  {               
                        let packet = ReceivedPacket {
                            event: SocketEvent::MessageReceived,
                            payload: Some(p)
                        };
                        tx.send(packet).ok();
                    },
                    Err(e) => {
                        error!("Error deserializing {}", text);
                        error!("{}", e);
                    },
                };
            }
            WebSocketEventType::Binary(binary) => {
                info!("Websocket recv, binary: {binary:?}");
            }
            WebSocketEventType::Ping => {
                info!("Websocket ping");
            }
            WebSocketEventType::Pong => {
                info!("Websocket pong");
            }
        }
    }
}