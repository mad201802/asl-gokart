use std::
    time::Duration
;

use crossbeam_channel::Sender;
use log::{error, info};

use esp_idf_svc::{
    io::EspIOError,
    ws::client::{
        EspWebSocketClient, EspWebSocketClientConfig, WebSocketEvent, WebSocketEventType,
    },
};

use protocoll_lib::protocoll::{deserialize, ReceivedPacket, SocketEvent};

pub fn create(server_uri: &str, ws_tx: Sender<ReceivedPacket>) -> EspWebSocketClient<'_> {
    let timeout = Duration::from_secs(10);
    let wsconfig = EspWebSocketClientConfig {
        ..Default::default()
    };
    
    
    EspWebSocketClient::new(server_uri, &wsconfig, timeout, move |event| {
        handle_event(ws_tx.clone(), event)
    })
    .unwrap()
}

fn handle_event(ws_tx: Sender<ReceivedPacket>, event: &Result<WebSocketEvent, EspIOError>) {
    if let Ok(event) = event {
        match event.event_type {
            WebSocketEventType::BeforeConnect => {
                info!("Websocket before connect");
            }
            WebSocketEventType::Connected => {
                info!("Websocket connected");
                let packet = ReceivedPacket {
                    event: SocketEvent::Connected,
                    payload: None,
                };

                ws_tx.send(packet).ok();
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
                    payload: None,
                };

                ws_tx.send(packet).ok();
            }
            WebSocketEventType::Text(text) => {
                info!("Websocket recv, text: {text}");
                match deserialize(text) {
                    Ok(p) => {
                        let packet = ReceivedPacket {
                            event: SocketEvent::MessageReceived,
                            payload: Some(p),
                        };
                        ws_tx.send(packet).ok();
                    }
                    Err(e) => {
                        error!("Error deserializing {}", text);
                        error!("{}", e);
                    }
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
