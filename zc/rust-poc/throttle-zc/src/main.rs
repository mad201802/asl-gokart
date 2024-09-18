use crossbeam_channel::Sender;
// Espressif IDF Service layer imports
use esp_idf_svc::hal::{
    adc::{
        attenuation::{DB_11, DB_6},
        oneshot::{config::AdcChannelConfig, AdcChannelDriver, AdcDriver},
        ADC1, ADC2,
    },
    cpu::Core,
    gpio::Gpio35,
    i2c::I2cDriver,
    task::thread::ThreadSpawnConfiguration,
    units::Hertz,
};
#[cfg(esp32)]
use esp_idf_svc::{eventloop::EspSystemEventLoop, hal::prelude::Peripherals, log::EspLogger};
// Standard library imports
use std::{
    cmp::min,
    env,
    net::UdpSocket,
    sync::{
        atomic::{AtomicU16, AtomicU32, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};

// Module imports
mod kelly_decoder;
mod uart;
use uart::configure_uart;

mod communication;
use communication::eth_setup::start_eth;
use protocoll_lib::protocoll::{
    ThrottleController, ZoneControllerFactory,
};

// MCP4728 related imports
use mcp4728::{GainMode, VoltageReferenceMode, MCP4728};

// Logging
use log::info;


#[cfg(esp32)]
#[cfg(not(any(feature = "adc-oneshot-legacy", esp_idf_version_major = "4")))]
fn main() -> anyhow::Result<()> {
    use communication::ws_client;
    use esp_idf_svc::ws::FrameType;
    use mcp4728::{Channel, ChannelState, OutputEnableMode};

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
    let (_lan_power, _eth) = start_eth(
        p.mac,
        pins.gpio12,
        pins.gpio25,
        pins.gpio26,
        pins.gpio27,
        pins.gpio23,
        pins.gpio22,
        pins.gpio21,
        pins.gpio19,
        pins.gpio18,
        pins.gpio17,
        pins.gpio5,
        &sys_loop,
    );
    let _socket = UdpSocket::bind("0.0.0.0:0").unwrap();

    // Motor Controller UART
    let tx_left = pins.gpio4;
    let rx_left = pins.gpio36;
    let tx_right = pins.gpio32; //By default 16 and 17
    let rx_right = pins.gpio33;

    let uart_left = configure_uart(p.uart1, tx_left, rx_left);
    let uart_right = configure_uart(p.uart2, tx_right, rx_right);

    //I2C
    //Baud rate of 1.4 MHz: https://forum.arduino.cc/t/undocumented-i2c-clock-speeds-for-mcp4728/574527
    info!("Setup i2c");
    let i2c_config = esp_idf_svc::hal::i2c::config::Config::new().baudrate(Hertz(10_000)); // Set to 400 kHz
    let i2c = match I2cDriver::new(p.i2c0, pins.gpio13, pins.gpio16, &i2c_config) {
        Ok(driver) => {
            info!("I2C initialized");
            driver
        }
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
    let _ = dac.write_voltage_reference_mode(
        voltage_reference,
        voltage_reference,
        voltage_reference,
        voltage_reference,
    );

    // Kanalstatus-Konfiguration
    let channel_state = ChannelState {
        voltage_reference_mode: VoltageReferenceMode::External,
        power_down_mode: mcp4728::PowerDownMode::PowerDownFiveHundredK,
        gain_mode: GainMode::TimesOne,
        value: 4095, // Setze Standard-Ausgabewert auf 0
    };

    // Erstellen des Channel-Update-Arrays
    let _channel_updates: [(Channel, OutputEnableMode, ChannelState); 4] = [
        (Channel::A, OutputEnableMode::Update, channel_state),
        (Channel::B, OutputEnableMode::Update, channel_state),
        (Channel::C, OutputEnableMode::Update, channel_state),
        (Channel::D, OutputEnableMode::Update, channel_state),
    ];

    // Multi-Write Befehl senden
    //dac.multi_write(&channel_updates).expect("Failed to set power-down mode");

    dac.single_write(Channel::A, OutputEnableMode::Update, &channel_state)
        .expect("failed to write");
    thread::sleep(Duration::from_secs(1));
    dac.single_write(Channel::B, OutputEnableMode::Update, &channel_state)
        .expect("failed to write");

    //in %
    let _throttle_limiter = 50;
    //in rpm &AdcDriver<'_, ADC1>
    let _rpm_limit = 3000;

    let throttle_controller = ZoneControllerFactory::create_throttle_controller();
    let rx_send = throttle_controller.rx_send.clone();
    let received_packet_tx = throttle_controller.received_packet_tx.clone();
    let _ws_client_thread = thread::spawn(move || {
        const SERVER_URI: &str = "ws://192.168.1.100:6969";
        let mut client = ws_client::create(SERVER_URI, received_packet_tx);
        for outgoing_message in rx_send.iter() {
            info!("Sending message: {:?}", outgoing_message);
            if let Err(e) = client.send(FrameType::Text(false), outgoing_message.as_bytes()) {
                info!("Failed to send message: {:?}", e);
            }
        }
    });
    let throttle_controller = throttle_controller.start_message_handler_thread();

    ThreadSpawnConfiguration {
        name: Some(b"esc_read\0"),
        pin_to_core: Some(Core::Core0),
        stack_size: 20000,
        ..Default::default()
    }
    .set()
    .unwrap();

    let rpm_left = Arc::new(AtomicU16::new(0));

    // Clone the Arc to share with the UART reading thread
    let rpm_left_writer = Arc::clone(&rpm_left);
    let rpm_left_sender = throttle_controller.tx_send.clone();

    let _esc_left_thread = thread::spawn(move || {
        kelly_decoder::read_and_process(rpm_left_sender, rpm_left_writer, uart_left)
    });

    let rpm_right = Arc::new(AtomicU16::new(0));

    // Clone the Arc to share with the UART reading thread
    let rpm_right_writer = Arc::clone(&rpm_right);
    let rpm_right_sender = throttle_controller.tx_send.clone();

    let _esc_right_thread = thread::spawn(move || {
        kelly_decoder::read_and_process(rpm_right_sender, rpm_right_writer, uart_right)
    });

    ThreadSpawnConfiguration {
        name: Some(b"gas_pedal\0"),
        pin_to_core: Some(Core::Core1),
        stack_size: 20000,
        ..Default::default()
    }
    .set()
    .unwrap();

    let rpm_limit = throttle_controller.rpm_limit.clone();
    let gas_sender = throttle_controller.tx_send.clone();
    let _gas_thread = thread::spawn(move || {
        gas_pedal_chain(
            gas_sender,
            rpm_left,
            rpm_right,
            rpm_limit,
            p.adc1,
            pins.gpio35,
            dac,
        )
    });

    loop{
        thread::sleep(second);
    }
}

fn gas_pedal_chain(
    tx_gas_send: Sender<String>,
    rpm_left: Arc<AtomicU16>,
    rpm_right: Arc<AtomicU16>,
    rpm_limit: Arc<AtomicU32>,
    adc: ADC1,
    pin: Gpio35,
    mut dac: MCP4728<I2cDriver<'_>>,
) {
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
    let mut i: u8 = 0;
    loop {
        // let start = Instant::now();
        let rpm_left = rpm_left.load(Ordering::SeqCst);
        let rpm_right = rpm_right.load(Ordering::SeqCst);
        let rpm_limit = rpm_limit.load(Ordering::SeqCst);
        let throttle_read: u32 = throttle.read(&mut throttle_pin).unwrap().into();
        //info!("dalc throttle {}", current_throttle);
        let mut to_substract = GAS_LOW;
        if throttle_read < GAS_LOW {
            to_substract = throttle_read;
        }
        let mut calculated_throttle: u32 = throttle_read - to_substract; //(throttle * throttle_limiter) / 100;
                                                                            //info!("After subtract {}", calculated_throttle);
        calculated_throttle = (calculated_throttle * 4095) / (GAS_HIGH - GAS_LOW);
        //info!("After stretch {}", calculated_throttle);
        //set throttle to 0 if current rpm is over the limit
        calculated_throttle *=
            (rpm_limit >= rpm_left.into() && rpm_limit >= rpm_right.into()) as u32;
        //calculated_throttle *= (rpm_limit >= rpm_right.into()) as u32;
        //maximum allowed value of throttle is 4095, because it's 12 bit
        let calculated_throttle: u16 = min(4095, calculated_throttle) as u16;
        let _ = dac.fast_write(
            calculated_throttle,
            calculated_throttle,
            calculated_throttle,
            calculated_throttle,
        );

        //equals about 150ms
        if i == 50 {
            i = 0;
            ThrottleController::send_throttle(&tx_gas_send, throttle_read as f32 / 4095_f32, calculated_throttle as f32 / 4095_f32);
            info!("[Gas Pedal Chain] RPM Limit: {} | RPM Left: {} | RPM Right: {}", rpm_limit, rpm_left, rpm_right);
            let _message = format!(r#"{{"calculated_throttle": {}}}"#, calculated_throttle);
            info!("[Gas Pedal Chain] Calculated Throttle {}", calculated_throttle);
        }

        //info!("{}", message);
        //let duration = start.elapsed();
        //thread::sleep(Duration::from_millis(50));
        //println!("Time taken for execution in throttle thread: {:?}", duration);
        //client.send(FrameType::Text(false), message.as_bytes())?;
        i += 1;
    }
}

#[cfg(not(esp32))]
fn main() {
    use esp_idf_svc::{self as _};

    panic!("This example is configured for esp32, please adjust pins to your module");
}
