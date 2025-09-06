#![deny(clippy::all)]

use napi_derive::napi;
use napi::bindgen_prelude::*;
use napi::threadsafe_function::ThreadsafeFunctionCallMode;
use napi::{
    Error, Result
};

//use std::fmt::Result;
use std::net::Ipv4Addr;

use std::{
    collections::{HashMap, HashSet},
    net::IpAddr,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};

use protocol::{application::{
    _impl_sync::ServiceApplication, message::ApplicationResponseErrorMessage,
}, sd::ServiceDiscovery};

// JS-friendly IP address
#[napi(object)]
pub struct IpAddressJs {
    pub a: u8,
    pub b: u8,
    pub c: u8,
    pub d: u8,
}

impl From<IpAddressJs> for Ipv4Addr {
    fn from(ip: IpAddressJs) -> Self {
        Ipv4Addr::new(ip.a, ip.b, ip.c, ip.d)
    }
}

// JS-friendly static service entry
#[napi(object)]
pub struct StaticServiceJs {
    pub service_id: u16,
    pub ip_address: IpAddressJs,
}

// Configuration objects
#[napi(object)]
pub struct ServiceApplicationConfigJs {
    pub port: u16,
    pub use_service_discovery: bool,
}

// Method call result
#[napi(object)]
pub struct MethodCallResult {
    pub success: bool,
    pub data: Option<Buffer>,
    pub error_message: Option<String>,
}


// Main SOMEIP Application class
#[napi(js_name = "ServiceApplication")]
pub struct ServiceApplicationJs {
    service_id: u16,
    app: ServiceApplication<ServiceDiscovery>,
}

#[napi]
impl ServiceApplicationJs {
    #[napi(constructor)]
    pub fn new(service_id: u16) -> Self {

        // Create and store the application
        let app = ServiceApplication::<ServiceDiscovery>::new(service_id);

        Self {
            service_id,
            app
        }
    }

    #[napi]
    pub fn init(&mut self) -> Result<()> {
        self.app.init().map_err(|err| Error::new(Status::GenericFailure, format!("Query failed {}", err)))
    }

    #[napi]
    pub fn start(&mut self, blocking: bool) -> Result<()> {
        self.app.start(blocking).map_err(|err| Error::new(Status::GenericFailure, format!("Query failed {}", err)))
    }

    #[napi]
    pub fn offer_method(&mut self, method_id: u16, callback: Function<Vec<u8>, u8>) -> Result<()> {
        let tsfn = callback.build_threadsafe_function().build().unwrap();

        let rust_callback = Arc::new(move |x: Vec<u8>| -> std::result::Result<Vec<u8>, ApplicationResponseErrorMessage> {
            let status = tsfn.call(x, ThreadsafeFunctionCallMode::Blocking);
            match status {
                napi::Status::Ok => Ok(vec![]), // Empty response
                status => Err(ApplicationResponseErrorMessage {
                    error_code: 0xFF,
                    error_message: format!("Error calling JS callback: {:?}", status),
                })
            }
        });

        self.app.offer_method(method_id, rust_callback);
        Ok(())
    }

    #[napi]
    pub fn call_method(&mut self, service_id: u16, method_id: u16, payload: Vec<u8>, callback: Function<Vec<u8>, u8>) -> Result<()> {
        let tsfn = callback.build_threadsafe_function().build().unwrap();

        let rust_callback = Arc::new(move |x: std::result::Result<Vec<u8>, ApplicationResponseErrorMessage>| -> std::result::Result<Vec<u8>, ApplicationResponseErrorMessage> {
            // TODO: Remove unwrap
            let status = tsfn.call(x.unwrap(), ThreadsafeFunctionCallMode::Blocking);
            match status {
                napi::Status::Ok => Ok(vec![]), // Empty response
                status => Err(ApplicationResponseErrorMessage {
                    error_code: 0xFF,
                    error_message: format!("Error calling JS callback: {:?}", status),
                })
            }
        });

        self.app.call_method(service_id, method_id, payload, rust_callback);
        Ok(())
    }

    #[napi]
    pub fn offer_event(&mut self, event_id: u16) {
        self.app.offer_event(event_id);
    }

    #[napi]
    pub fn subscribe(&mut self, service_id: u16, event_id: u16, callback: Function<Vec<u8>, u8>) -> Result<()> {
        let tsfn = callback.build_threadsafe_function().build().unwrap();

        let rust_callback = Arc::new(move |x: Vec<u8>| {
            tsfn.call(x, ThreadsafeFunctionCallMode::Blocking);
        });

        self.app.subscribe(service_id, event_id, rust_callback);
        Ok(())
    }
}