//! This example demonstrates how to configure an RMII based Ethernet adapter
//!
//! To use it, you need an RMII-capable Espressif MCU, like the original ESP32 chip

#[cfg(esp32)]
use esp_idf_svc::{
    eventloop::EspSystemEventLoop,
    hal::prelude::Peripherals,
    log::EspLogger,
};

use std::net::UdpSocket;

mod kelly_decoder;
use kelly_decoder::read_controller;

mod eth_setup;
use eth_setup::start_eth;

mod uart;
use uart::configure_uart;

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
    use esp_idf_svc::hal::{i2c::I2cDriver, units::Hertz};
    use esp_idf_svc::hal::adc::attenuation::DB_11;
    use esp_idf_svc::hal::adc::oneshot::config::AdcChannelConfig;
    use esp_idf_svc::hal::adc::oneshot::*;


    if env::var("RUST_LOG").is_err() {
        env::set_var("RUST_LOG", "debug");
    }

    esp_idf_svc::sys::link_patches();
    EspLogger::initialize_default();

    let p = Peripherals::take()?;
    let pins = p.pins;
    //let second = time::Duration::from_millis(1000);

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
    let i2c_config = esp_idf_svc::hal::i2c::config::Config::new().baudrate(Hertz(1400000));
    let i2c = I2cDriver::new(p.i2c0, pins.gpio13, pins.gpio16, &i2c_config).unwrap();
    //0x60 is the default address for the adafruit MCP4728
    let mut dac = MCP4728::new(i2c, 0x60);

    //Set VCC as maximum volume
    let gain = GainMode::TimesOne;
    let voltage_reference = VoltageReferenceMode::External;
    let _ = dac.write_gain_mode(gain, gain, gain, gain);
    let _ = dac.write_voltage_reference_mode(voltage_reference, voltage_reference, voltage_reference, voltage_reference);

    //Gas input
    let throttle = AdcDriver::new(p.adc1)?;
    // configuring pin to analog read, you can regulate the adc input voltage range depending on your need
    // for this example we use the attenuation of 11db which sets the input voltage range to around 0-3.6V
    let config = AdcChannelConfig {
        attenuation: DB_11,
        calibration: true,
        ..Default::default()
    };

    let mut throttle_pin = AdcChannelDriver::new(&throttle, pins.gpio35, &config)?;


    //WELCOME
    let target_addr = "192.168.1.100:12345";
    let data = b"Hello, world!";
    socket.send_to(data, target_addr)?;

    info!("UDP packet sent to {}", target_addr);

    //in %
    let throttle_limiter = 50;
    //in rpm
    let rpm_limit = 3000;
    loop {
        //info!("AH AH AH AH STAYIN ALIVE");

        let start = Instant::now();

        //Needs about 34ms for each esc
        let esc_left = read_controller(true, true, &uart_left).unwrap();
        let esc_right = read_controller(true, true, &uart_right).unwrap();

        //Formatting + sending needs about 2ms
        let controller_data = format!(
            "RPM {:?} {:?} Throttle {:?} {:?}\n", 
            esc_left.b.rpm, 
            esc_right.b.rpm, 
            esc_left.a.throttle, 
            esc_right.a.throttle
        ).into_bytes();

        let throttle = throttle.read(&mut throttle_pin).unwrap();

        let mut calculated_throttle = (throttle * throttle_limiter) / 100;
        //set throttle to 0 if current rpm is over the limit
        calculated_throttle *= (rpm_limit >= esc_left.b.rpm || rpm_limit >= esc_right.b.rpm) as u16;
        //maximum allowed value of throttle is 4095, because it's 12 bit
        calculated_throttle = min(4095, calculated_throttle);

        let _ = dac.fast_write(calculated_throttle, calculated_throttle, calculated_throttle, calculated_throttle);

        socket.send_to(&controller_data, target_addr)?;

        info!("RPM {:?} {:?} Throttle {:?} {:?}", esc_left.b.rpm, esc_left.b.rpm, esc_left.a.throttle, esc_left.a.throttle);

        let duration = start.elapsed();
info!("Time taken for execution: {:?}", duration);
        //thread::sleep(second);
    }
    

    //Ok(())
}

#[cfg(not(esp32))]
fn main() {
    use esp_idf_svc::{self as _};


    panic!("This example is configured for esp32, please adjust pins to your module");
}
