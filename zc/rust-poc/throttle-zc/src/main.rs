// Espressif IDF Service layer imports
use esp_idf_svc::hal::{
    adc::{ADC1, attenuation::DB_11},
    adc::oneshot::{config::AdcChannelConfig, AdcDriver, AdcChannelDriver},
    gpio::Gpio35,
    i2c::I2cDriver,
    cpu::Core,
    task::thread::ThreadSpawnConfiguration,
    units::Hertz
};
#[cfg(esp32)]
use esp_idf_svc::{
    eventloop::EspSystemEventLoop,
    hal::prelude::Peripherals,
    log::EspLogger
};
// Standard library imports
use std::{
    cmp::min, env, net::UdpSocket, sync::{atomic::{AtomicU16, AtomicU32, Ordering}, Arc}, thread, time::Duration
};

// Module imports
mod kelly_decoder;
mod uart;
use uart::configure_uart;

mod communication;
use communication::{
    eth_setup::start_eth,
    protocoll::{Command, Packet, ThrottleCommands, ZoneControllerFactory}
};

// MCP4728 related imports
use mcp4728::{MCP4728, GainMode, VoltageReferenceMode};

// Logging
use log::info;

#[cfg(esp32)]
use std::time::Instant;


#[cfg(esp32)]
#[cfg(not(any(feature = "adc-oneshot-legacy", esp_idf_version_major = "4")))]
fn main() -> anyhow::Result<()> {

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

    //let esc_right_thread = thread::spawn(move || kelly_decoder::read_and_process(rpm_right_writer, uart_right));

    ThreadSpawnConfiguration {
        name: Some(b"gas_pedal\0"),
        pin_to_core: Some(Core::Core1),
        ..Default::default()
    }
    .set()
    .unwrap();

    let controller = ZoneControllerFactory::create_throttle_controller();
    let gas_thread = thread::spawn(move || gas_pedal_chain(rpm_left, rpm_right, controller.rpm_limit, p.adc1, pins.gpio35, dac));
    
    loop {
        //info!("AH AH AH AH STAYIN ALIVE");

        let start = Instant::now();
        let duration = start.elapsed();
info!("Time taken for execution: {:?}", duration);
        thread::sleep(second);
    }
    

    //Ok(())
}

fn gas_pedal_chain(rpm_left: Arc<AtomicU16>, rpm_right: Arc<AtomicU16>, rpm_limit: Arc<AtomicU32>, adc: ADC1, pin: Gpio35, mut dac: MCP4728<I2cDriver<'_>>) {
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

    const GAS_LOW: u32 = 900;
    const GAS_HIGH: u32 = 3155;
    const STRETCH_FACTOR: u32 = 4095 / (GAS_HIGH-GAS_LOW);
    loop {
        let start = Instant::now();
        let rpm_left = rpm_left.load(Ordering::SeqCst);
        let rpm_right = rpm_right.load(Ordering::SeqCst);
        let rpm_limit = rpm_limit.load(Ordering::SeqCst);
        info!("rpm_limit {}", rpm_limit);
        //println!("rpm_left {}", rpm_left);
        let current_throttle :u32 = throttle.read(&mut throttle_pin).unwrap().into();
        info!("dalc throttle {}", current_throttle);
        let mut to_substract = GAS_LOW;
        if current_throttle < GAS_LOW {
            to_substract = current_throttle;
        } 
        let mut calculated_throttle :u32 = current_throttle - to_substract;//(throttle * throttle_limiter) / 100;
        info!("After subtract {}", calculated_throttle);
        calculated_throttle = (calculated_throttle * 4095) / (GAS_HIGH - GAS_LOW);
        info!("After stretch {}", calculated_throttle);
        //set throttle to 0 if current rpm is over the limit
        calculated_throttle *= (rpm_limit >= rpm_left.into() || rpm_limit >= rpm_right.into()) as u32;
        //maximum allowed value of throttle is 4095, because it's 12 bit
        let calculated_throttle :u16 = min(4095, calculated_throttle) as u16;
        let _ = dac.fast_write(calculated_throttle, calculated_throttle, calculated_throttle, calculated_throttle);
        let message = format!(r#"{{"calculated_throttle": {}}}"#, calculated_throttle);
        info!("{}", message);
        let duration = start.elapsed();  
        thread::sleep(Duration::from_millis(5000));
        println!("Time taken for execution in throttle thread: {:?}", duration);
        //client.send(FrameType::Text(false), message.as_bytes())?;
    }
}

#[cfg(not(esp32))]
fn main() {
    use esp_idf_svc::{self as _};


    panic!("This example is configured for esp32, please adjust pins to your module");
}
