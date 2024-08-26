use std::thread;
use std::time::Duration;

use esp_idf_hal::adc::{attenuation, AdcChannelDriver, AdcConfig};
use esp_idf_hal::adc::{AdcContDriver, AdcDriver};
use esp_idf_hal::cpu::Core;
use esp_idf_hal::gpio::DACPin;
use esp_idf_hal::task::thread::ThreadSpawnConfiguration;
use esp_idf_svc::hal::{adc::AdcContConfig, gpio::PinDriver, prelude::Peripherals};

use esp_idf_hal::adc::config::Config;

// CONFIG VARIABLES:
const READ_DELAY: i8 = 50;
const GAS_IN_LIMITS: (i16, i16) = (400, 3200);
const GAS_OUT_LIMIT: (i16, i16) = (25, 255);

// fn main() {
//     // It is necessary to call this function once. Otherwise some patches to the runtime
//     // implemented by esp-idf-sys might not link properly. See https://github.com/esp-rs/esp-idf-template/issues/71
//     esp_idf_svc::sys::link_patches();

//     // Bind the log crate to the ESP Logging facilities
//     esp_idf_svc::log::EspLogger::initialize_default();

//     let peripherals = Peripherals::take().unwrap();

//     let mut adc2 = AdcDriver::new(peripherals.adc2, &Config::new().calibration(true)).unwrap();
//     let mut dac1 = DAC::dac1(peripherals.pins.gpio25).unwrap();
//     let dac_value: u8 = 128;
//     dac1.

//     let mut gas_out_adc_pin: esp_idf_hal::adc::AdcChannelDriver<{ attenuation::DB_11 }, _> =
//         AdcChannelDriver::new(peripherals.pins.gpio25).unwrap();
// }

fn main() {
    ThreadSpawnConfiguration {
        name: Some(b"counter1\0"),
        ..Default::default()
    }
    .set()
    .unwrap();

    thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {i} from the spawned thread! 1");
        }
    });

    ThreadSpawnConfiguration {
        name: Some(b"counter2\0"),
        ..Default::default()
    }
    .set()
    .unwrap();

    thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {i} from the spawned thread! 2");
        }
    });

    for i in 1..5 {
        println!("hi number {i} from the main thread!");
    }
}

pub fn map_range(value: i16, in_tuple: (i16, i16), out_tuple: (i16, i16)) -> i16 {
    let (in_min, in_max) = in_tuple;
    let (out_min, out_max) = out_tuple;
    (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
}
