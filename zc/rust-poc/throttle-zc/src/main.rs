//! This example demonstrates how to configure an RMII based Ethernet adapter
//!
//! To use it, you need an RMII-capable Espressif MCU, like the original ESP32 chip

#[cfg(esp32)]
use esp_idf_svc::{
    ipv4,
    eth::{BlockingEth, EspEth, EthDriver},
    eventloop::EspSystemEventLoop,
    hal::{gpio, prelude::Peripherals, gpio::PinDriver},
    log::EspLogger,
    netif::EspNetif,
};

use std::{thread, time};

mod kelly_decoder;

use kelly_decoder::{PacketsStruct, import_bytes_to_packets, PACKET_LENGTH};

#[cfg(esp32)]
use log::info;

#[cfg(esp32)]
use std::net::UdpSocket;
use std::time::Instant;

#[cfg(esp32)]
fn main() -> anyhow::Result<()> {

    if env::var("RUST_LOG").is_err() {
        env::set_var("RUST_LOG", "debug");
    }
    
    use std::{env, net::Ipv4Addr, sync::Arc};

    use esp_idf_svc::{hal::{delay::BLOCK, uart::{Uart, UartDriver, UART1}, units::Hertz}, io::Read, ipv4::ClientSettings, netif::{NetifConfiguration, NetifStack}};
    use kelly_decoder::read_controller;

    esp_idf_svc::sys::link_patches();
    EspLogger::initialize_default();

    let peripherals = Peripherals::take()?;
    let pins = peripherals.pins;
    let sys_loop = EspSystemEventLoop::take()?;

    //ETH power
    let mut lan_power: PinDriver<_, gpio::Output> = PinDriver::output(pins.gpio12)?;
    lan_power.set_high()?;

    let eth_driver = EthDriver::new_rmii(
        peripherals.mac,
        pins.gpio25,
        pins.gpio26,
        pins.gpio27,
        pins.gpio23,
        pins.gpio22,
        pins.gpio21,
        pins.gpio19,
        pins.gpio18,
        esp_idf_svc::eth::RmiiClockConfig::<gpio::Gpio0, gpio::Gpio16, gpio::Gpio17>::OutputInvertedGpio17(
            pins.gpio17,
        ),
        Some(pins.gpio5),
        esp_idf_svc::eth::RmiiEthChipset::LAN87XX,
        Some(0),
        sys_loop.clone(),
    )?;

    //Custom config to set a static IP instead of using DHCP
    let client_settings = ClientSettings {
        ip: Ipv4Addr::new(192, 168, 1, 69),
        subnet: ipv4::Subnet { gateway: (Ipv4Addr::new(192, 168, 1, 1)), mask: ( ipv4::Mask(24) ) },
        dns: Option::None,
        secondary_dns: Option::None,
    };

    let client_conf = ipv4::ClientConfiguration::Fixed((client_settings));

    let static_conf = NetifConfiguration {
        key: "ETH_CL_DE".try_into().unwrap(),
        description: "eth".try_into().unwrap(),
        route_priority: 60,
        ip_configuration: ipv4::Configuration::Client(client_conf), //ipv4::Configuration::Client(Default::default()),
        stack: NetifStack::Eth,
        custom_mac: None,
    };

    let netif_static =  EspNetif::new_with_conf(&static_conf).expect("Failed to create EspNetif");

    let eth = EspEth::wrap_all(eth_driver, netif_static)?;
    info!("Eth created");

    let mut eth = BlockingEth::wrap(eth, sys_loop.clone())?;

    info!("Starting eth...");
    

    eth.start()?;

    let ip_info = eth.eth().netif().get_ip_info()?;

    info!("Eth uplink info: {:?}", ip_info);

    // Create a UDP socket and send a packet
    let socket = UdpSocket::bind("0.0.0.0:0")?;
    let target_addr = "192.168.1.100:12345"; // Replace with the target IP and port

    let data = b"Hello, world!";
    socket.send_to(data, target_addr)?;

    info!("UDP packet sent to {}", target_addr);
    
    let second = time::Duration::from_millis(1000);

    let tx_left = pins.gpio4;
    let rx_left = pins.gpio36;

    //By default 17
    let tx_right = pins.gpio32;
    let rx_right = pins.gpio33;

    let config = esp_idf_svc::hal::uart::config::Config::new().baudrate(Hertz(19_200));
    let uart_left = UartDriver::new(
        peripherals.uart1,
        tx_left,
        rx_left,
        Option::<gpio::Gpio0>::None,
        Option::<gpio::Gpio1>::None,
        &config,
    )
    .unwrap();

    let uart_right = UartDriver::new(
        peripherals.uart2,
        tx_right,
        rx_right,
        Option::<gpio::Gpio0>::None,
        Option::<gpio::Gpio1>::None,
        &config,
    )
    .unwrap();

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

        socket.send_to(&controller_data, target_addr)?;

        info!("RPM {:?} {:?} Throttle {:?} {:?}", esc_left.b.rpm, esc_left.b.rpm, esc_left.a.throttle, esc_left.a.throttle);

        let duration = start.elapsed();
info!("Time taken for execution: {:?}", duration);
        //thread::sleep(second);
    }
    

    Ok(())
}

#[cfg(not(esp32))]
fn main() {
    use esp_idf_svc::{self as _};


    panic!("This example is configured for esp32, please adjust pins to your module");
}
