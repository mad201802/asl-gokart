use crossbeam_channel::Sender;
// Espressif IDF Service layer imports
use esp_idf_svc::hal::{
    adc::{
        attenuation::DB_11,
        oneshot::{config::AdcChannelConfig, AdcChannelDriver, AdcDriver},
        ADC1,
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
        atomic::{AtomicBool, AtomicU16, AtomicU32, Ordering},
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
    let fun_mode = throttle_controller.fun_mode.clone();
    let pedal_multiplier = throttle_controller.pedal_multiplier.clone();
    let gas_sender = throttle_controller.tx_send.clone();
    let _gas_thread = thread::spawn(move || {
        gas_pedal_chain(
            gas_sender,
            rpm_left,
            rpm_right,
            rpm_limit,
            fun_mode,
            pedal_multiplier,
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
    fun_mode: Arc<AtomicBool>,
    pedal_multiplier: Arc<AtomicU32>,
    adc: ADC1,
    pin: Gpio35,
    mut dac: MCP4728<I2cDriver<'_>>,
) {
    // Gas input
    let throttle = AdcDriver::new(adc).unwrap();
    let config = AdcChannelConfig {
        attenuation: DB_11,
        calibration: true,
        ..Default::default()
    };
    let mut throttle_pin = AdcChannelDriver::new(&throttle, pin, &config).unwrap();

    const GAS_LOW: u32 = 650;
    const GAS_HIGH: u32 = 3050;
    const MAX_THROTTLE: u16 = 4095;  // 12-bit DAC max value
    const INTEGRAL_LIMIT: f32 = 1000.0;  // Anti-windup limit for the integral term
    
    // PID controller gains
    const KP: f32 = 0.5;   // Proportional gain
    const KI: f32 = 0.01;  // Integral gain
    const KD: f32 = 0.1;   // Derivative gain

    let mut integral_sum: f32 = 0.0;     // Integral term accumulator
    let mut previous_error: f32 = 0.0;   // Previous error for derivative calculation
    let mut i: u8 = 0;
    let mut bypass_pid = fun_mode.load(Ordering::SeqCst);
    let mut current_pedal_multiplier = pedal_multiplier.load(Ordering::SeqCst);

    loop {
        // Throttle input
        let throttle_read: u32 = throttle.read(&mut throttle_pin).unwrap().into();
        let mut to_subtract = GAS_LOW;
        if throttle_read < GAS_LOW {
            to_subtract = throttle_read;
        }

        let mut calculated_throttle: u32 = throttle_read - to_subtract;
        calculated_throttle = (calculated_throttle * MAX_THROTTLE as u32) / (GAS_HIGH - GAS_LOW);
        let mapped_throttle = calculated_throttle.clone();

        let mut calculated_throttle: u16 = calculated_throttle as u16;

        if !bypass_pid {
            let rpm_left = rpm_left.load(Ordering::SeqCst) as u32;
            let rpm_right = rpm_right.load(Ordering::SeqCst) as u32;
            let rpm_limit = rpm_limit.load(Ordering::SeqCst);

            calculated_throttle = (((calculated_throttle as u32) * current_pedal_multiplier) / 100) as u16;

            calculated_throttle *= (rpm_limit >= rpm_left.into() && rpm_limit >= rpm_right.into()) as u16;

            //maximum allowed value of throttle is 4095, because it's 12 bit
            let calculated_throttle :u16 = min(4095, calculated_throttle) as u16;
            let _ = dac.fast_write(
                calculated_throttle,
                calculated_throttle,
                calculated_throttle,
                calculated_throttle,
            );        
        } else {
            //Limit the throttle by the pedal mutliplier percentage
            calculated_throttle = (((calculated_throttle as u32) * current_pedal_multiplier) / 100) as u16;
            //maximum allowed value of throttle is 4095, because it's 12 bit
            calculated_throttle = min(4095, calculated_throttle) as u16;
            let _ = dac.fast_write(
                calculated_throttle,
                calculated_throttle,
                calculated_throttle,
                calculated_throttle,
            );
        }

        //Send current throttle values to the headunit every 10 iterations
        if i == 10 {
            i = 0;
            ThrottleController::send_throttle(
                &tx_gas_send,
                mapped_throttle as f32 / 4095_f32,
                calculated_throttle as f32 / 4095_f32
            );
            bypass_pid = fun_mode.load(Ordering::SeqCst);
            current_pedal_multiplier = pedal_multiplier.load(Ordering::SeqCst);
        }

        i += 1;
    }

}


//// PID:
/// 
///             
// Calculate RPM average and error
// let rpm_avg = (rpm_left + rpm_right) / 2;
// let rpm_error = (rpm_limit - rpm_avg) as f32;

// // Proportional term
// let proportional = KP * rpm_error;

// // Integral term with anti-windup
// integral_sum += rpm_error * KI;
// if integral_sum > INTEGRAL_LIMIT {
//     integral_sum = INTEGRAL_LIMIT;
// } else if integral_sum < -INTEGRAL_LIMIT {
//     integral_sum = -INTEGRAL_LIMIT;
// }

// // Derivative term
// let derivative = KD * (rpm_error - previous_error);
// previous_error = rpm_error;

// // PID output: combination of P, I, and D terms
// let mut throttle_adjustment = proportional + integral_sum + derivative;
// throttle_adjustment = throttle_adjustment.clamp(0.0, MAX_THROTTLE as f32);

// // Set throttle to 0 if RPM exceeds the limit
// if rpm_left >= rpm_limit || rpm_right >= rpm_limit {
//     throttle_adjustment = 0.0;
// }

// // Write the calculated throttle to the DAC
// calculated_throttle = throttle_adjustment as u16;
// let _ = dac.fast_write(
//     calculated_throttle,
//     calculated_throttle,
//     calculated_throttle,
//     calculated_throttle,
// );

#[cfg(not(esp32))]
fn main() {
    use esp_idf_svc::{self as _};

    panic!("This example is configured for esp32, please adjust pins to your module");
}
