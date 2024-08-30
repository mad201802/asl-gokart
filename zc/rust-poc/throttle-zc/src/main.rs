//! This example demonstrates how to configure an RMII based Ethernet adapter
//!
//! To use it, you need an RMII-capable Espressif MCU, like the original ESP32 chip

use esp_idf_svc::hal::adc::attenuation::DB_11;
use esp_idf_svc::hal::adc::oneshot::config::AdcChannelConfig;
use esp_idf_svc::hal::adc::oneshot::{AdcChannelDriver, AdcDriver};
use esp_idf_svc::hal::adc::{AdcContDriver, ADC1};
use esp_idf_svc::hal::gpio::{ADCPin, Gpio35, IOPin};
use esp_idf_svc::hal::i2c::I2cDriver;
use esp_idf_svc::hal::peripheral::Peripheral;
#[cfg(esp32)]
use esp_idf_svc::{
    eventloop::EspSystemEventLoop,
    hal::prelude::Peripherals,
    log::EspLogger,
};

use esp_idf_svc::ws::client::{
    EspWebSocketClient, EspWebSocketClientConfig, FrameType, WebSocketEvent, WebSocketEventType,
};
use esp_idf_svc::io::EspIOError;

use std::sync::atomic::{AtomicU16, Ordering};
use std::sync::{mpsc, Arc};

use std::net::UdpSocket;

mod kelly_decoder;
use kelly_decoder::read_controller;

mod uart;
use uart::configure_uart;

mod communication;

use communication::{eth_setup::start_eth, ws_client};


use mcp4728::{MCP4728, GainMode, VoltageReferenceMode};

#[cfg(esp32)]
use log::info;

#[cfg(esp32)]
use std::time::Instant;
use std::env;
use std::cmp::min;

#[cfg(esp32)]
#[cfg(not(any(feature = "adc-oneshot-legacy", esp_idf_version_major = "4")))]
fn main() -> anyhow::Result<()> {
    use std::sync::atomic::{AtomicU16, AtomicUsize};
    use std::sync::Arc;
    use std::thread;
    use std::time::Duration;

    use esp_idf_svc::hal::cpu::Core;
    use esp_idf_svc::hal::task::thread::ThreadSpawnConfiguration;
    use esp_idf_svc::hal::{i2c::I2cDriver, units::Hertz};
    use esp_idf_sys::CONFIG_SOC_TWAI_CONTROLLER_NUM;
    use log::info;


    if env::var("RUST_LOG").is_err() {
        env::set_var("RUST_LOG", "debug");
    }

    esp_idf_svc::sys::link_patches();
    EspLogger::initialize_default();

    let p = Peripherals::take()?;
    let pins = p.pins;
    let second = Duration::from_millis(1000);

    let sys_loop = EspSystemEventLoop::take()?;
    
    //LAN
    let (_lan_power, _eth)  = start_eth(p.mac, pins.gpio12, pins.gpio25, pins.gpio26, pins.gpio27, pins.gpio23, pins.gpio22, pins.gpio21, pins.gpio19, pins.gpio18, pins.gpio17, pins.gpio5, &sys_loop);
    let socket = UdpSocket::bind("0.0.0.0:0").unwrap();

    //UART
    let tx_left = pins.gpio4;
    let rx_left = pins.gpio36;
    //By default 16 and 17
    let tx_right = pins.gpio32;
    let rx_right = pins.gpio33;

    let uart_left = configure_uart(p.uart1, tx_left, rx_left);
    let uart_right = configure_uart(p.uart2,  tx_right, rx_right);

    //I2C
    //TODO find appropiate pins
    //Baud rate of 1.4 MHz: https://forum.arduino.cc/t/undocumented-i2c-clock-speeds-for-mcp4728/574527
    info!("Setup i2c");
    let i2c_config = esp_idf_svc::hal::i2c::config::Config::new().baudrate(Hertz(10_000)); // Set to 400 kHz
    let i2c = match I2cDriver::new(p.i2c0, pins.gpio13, pins.gpio16, &i2c_config) {
        Ok(driver) => {
            info!("I2C initialized");
            driver
            },
        Err(e) => {
            println!("Failed to initialize I2C driver: {:?}", e);
            return Err(Box::new(e).into()); // or handle the error appropriately
        }
    };
        //0x60 is the default address for the adafruit MCP4728
    info!("Setup DAC");
    let mut dac = MCP4728::new(i2c, 0x60);

    //Set VCC as maximum volume
    let gain = GainMode::TimesOne;
    let voltage_reference = VoltageReferenceMode::External;
    let _ = dac.write_gain_mode(gain, gain, gain, gain);
    let _ = dac.write_voltage_reference_mode(voltage_reference, voltage_reference, voltage_reference, voltage_reference);

    //thread::sleep(Duration::from_secs(1000));

    //in %
    let throttle_limiter = 50;
    //in rpm &AdcDriver<'_, ADC1>
    let rpm_limit = 3000;

    const ECHO_SERVER_URI: &str = "ws://192.168.1.100:6969";

    //let mut client = ws_client::create(ECHO_SERVER_URI);
    
    // assert_eq!(rx.recv(), Ok(ExampleEvent::Connected));
    // assert!(client.is_connected());

    // Send message and receive it back
    let message = "Hello, World!";
    info!("Websocket send, text: {}", message);
    //client.send(FrameType::Text(false), message.as_bytes())?;
    // assert_eq!(rx.recv(), Ok(ExampleEvent::MessageReceived));

    ThreadSpawnConfiguration {
        name: Some(b"esc_read\0"),
        pin_to_core: Some(Core::Core0),
        ..Default::default()
    }
    .set()
    .unwrap();

    let rpm_left = Arc::new(AtomicU16::new(0));

    // Clone the Arc to share with the UART reading thread
    let rpm_left_writer = Arc::clone(&rpm_left);

    let esc_left_thread = thread::spawn(move || kelly_decoder::read_and_process(rpm_left_writer, uart_left));

    let rpm_right = Arc::new(AtomicU16::new(0));

    // Clone the Arc to share with the UART reading thread
    let rpm_right_writer = Arc::clone(&rpm_right);

    let esc_right_thread = thread::spawn(move || kelly_decoder::read_and_process(rpm_right_writer, uart_right));

    ThreadSpawnConfiguration {
        name: Some(b"gas_pedal\0"),
        pin_to_core: Some(Core::Core1),
        ..Default::default()
    }
    .set()
    .unwrap();

    let gas_thread = thread::spawn(move || gas_pedal_chain(rpm_left, p.adc1, pins.gpio35, dac));

    loop {
        //info!("AH AH AH AH STAYIN ALIVE");

        let start = Instant::now();

        // //Needs about 34ms for each esc
        // let esc_left = read_controller(true, true, &uart_left).unwrap();
        // let esc_right = read_controller(true, true, &uart_right).unwrap();

        // info!("RPM {:?} {:?} Throttle {:?} {:?}", esc_left.b.rpm, esc_left.b.rpm, esc_left.a.throttle, esc_left.a.throttle);

        // //Formatting + sending needs about 2ms
        // let controller_data = format!(
        //     "RPM {:?} {:?} Throttle {:?} {:?}\n", 
        //     esc_left.b.rpm, 
        //     esc_right.b.rpm, 
        //     esc_left.a.throttle, 
        //     esc_right.a.throttle
        // ).into_bytes();

        // info!("read throttle");
        // let current_throttle :u32 = throttle.read(&mut throttle_pin).unwrap().into();
        // // info!("dalc throttle");
        // let mut calculated_throttle :u32 = current_throttle;//(throttle * throttle_limiter) / 100;
        // //set throttle to 0 if current rpm is over the limit
        // // calculated_throttle *= (rpm_limit >= esc_left.b.rpm || rpm_limit >= esc_right.b.rpm) as u32;
        // //maximum allowed value of throttle is 4095, because it's 12 bit
        // let calculated_throttle :u16 = min(4095, calculated_throttle) as u16;
        // let duration = start.elapsed();  
        // let _ = dac.fast_write(calculated_throttle, calculated_throttle, calculated_throttle, calculated_throttle);
        // let message = format!(r#"{{"calculated_throttle": {}}}"#, calculated_throttle);
        // client.send(FrameType::Text(false), message.as_bytes())?;
        // //let _ = dac.
        // info!("Time taken for fast write: {:?}", duration);
        // info!("send");
        // socket.send_to(&controller_data, target_addr)?;

        // info!("RPM {:?} {:?} Throttle {:?} {:?}", esc_left.b.rpm, esc_left.b.rpm, esc_left.a.throttle, esc_left.a.throttle);

        let duration = start.elapsed();
info!("Time taken for execution: {:?}", duration);
        thread::sleep(second);
    }
    

    //Ok(())
}

fn gas_pedal_chain(shared_rpm: Arc<AtomicU16>, adc: ADC1, pin: Gpio35, mut dac: MCP4728<I2cDriver<'_>>) {
    //Gas input
    let throttle = AdcDriver::new(adc).unwrap();
    // configuring pin to analog read, you can regulate the adc input voltage range depending on your need
    // for this example we use the attenuation of 11db which sets the input voltage range to around 0-3.6V
    let config = AdcChannelConfig {
        attenuation: DB_11,
        calibration: true,
        ..Default::default()
    };

    let mut throttle_pin = AdcChannelDriver::new(&throttle, pin, &config).unwrap();
    let rpm_limit = 100;

    loop {
        let start = Instant::now();
        let rpm_left = shared_rpm.load(Ordering::SeqCst);
        let rpm_right = rpm_left;
        println!("rpm_left {}", rpm_left);
        let current_throttle :u32 = throttle.read(&mut throttle_pin).unwrap().into();
        // info!("dalc throttle");
        let mut calculated_throttle :u32 = current_throttle;//(throttle * throttle_limiter) / 100;
        //set throttle to 0 if current rpm is over the limit
        calculated_throttle *= (rpm_limit >= rpm_left || rpm_limit >= rpm_right) as u32;
        //maximum allowed value of throttle is 4095, because it's 12 bit
        let calculated_throttle :u16 = min(4095, calculated_throttle) as u16;
        let duration = start.elapsed();  
        let _ = dac.fast_write(calculated_throttle, calculated_throttle, calculated_throttle, calculated_throttle);
        let message = format!(r#"{{"calculated_throttle": {}}}"#, calculated_throttle);
        println!("Time taken for execution in throttle thread: {:?}", duration);
        //client.send(FrameType::Text(false), message.as_bytes())?;
    }
}

#[cfg(not(esp32))]
fn main() {
    use esp_idf_svc::{self as _};


    panic!("This example is configured for esp32, please adjust pins to your module");
}
