use std::{sync::mpsc, time::Duration};

use log::info;

use esp_idf_svc::{io::EspIOError, ws::client::{
    EspWebSocketClient, EspWebSocketClientConfig, FrameType, WebSocketEvent, WebSocketEventType,
}};

enum ExampleEvent {
    Connected,
    MessageReceived,
    Closed,
}

pub fn create(server_uri: &str) -> EspWebSocketClient<'_>{
    let timeout = Duration::from_secs(10);
    let (tx, rx) = mpsc::channel::<ExampleEvent>();
    let wsconfig = EspWebSocketClientConfig {
        ..Default::default()
    };
    let mut client =
    EspWebSocketClient::new(server_uri, &wsconfig, timeout, move |event| {
        handle_event(&tx, event)
    }).unwrap();
    return client;
}

fn handle_event(tx: &mpsc::Sender<ExampleEvent>, event: &Result<WebSocketEvent, EspIOError>) {
    
    if let Ok(event) = event {
        match event.event_type {
            WebSocketEventType::BeforeConnect => {
                info!("Websocket before connect");
            }
            WebSocketEventType::Connected => {
                info!("Websocket connected");
                tx.send(ExampleEvent::Connected).ok();
            }
            WebSocketEventType::Disconnected => {
                info!("Websocket disconnected");
            }
            WebSocketEventType::Close(reason) => {
                info!("Websocket close, reason: {reason:?}");
            }
            WebSocketEventType::Closed => {
                info!("Websocket closed");
                tx.send(ExampleEvent::Closed).ok();
            }
            WebSocketEventType::Text(text) => {
                info!("Websocket recv, text: {text}");
                if text == "Hello, World!" {
                    tx.send(ExampleEvent::MessageReceived).ok();
                }
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