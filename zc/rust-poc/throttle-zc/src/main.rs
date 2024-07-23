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
#[cfg(esp32)]
use log::info;

#[cfg(esp32)]
use std::net::UdpSocket;

#[cfg(esp32)]
fn main() -> anyhow::Result<()> {
    use std::net::Ipv4Addr;

    use esp_idf_svc::{ipv4::{ClientSettings}, netif::{NetifConfiguration, NetifStack}};

    esp_idf_svc::sys::link_patches();
    EspLogger::initialize_default();

    let peripherals = Peripherals::take()?;
    let pins = peripherals.pins;
    let sys_loop = EspSystemEventLoop::take()?;

    //ETH power
    let mut led = PinDriver::output(pins.gpio12)?;
    led.set_high()?;

    // Make sure to configure ethernet in sdkconfig and adjust the parameters below for your hardware
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
        // Replace with IP101 if you have that variant, or with some of the others in the `RmiiEthChipset`` enum
        esp_idf_svc::eth::RmiiEthChipset::LAN87XX,
        Some(0),
        sys_loop.clone(),
    )?;

    let client_settings = ClientSettings {
        ip: Ipv4Addr::new(192, 0, 0, 69),
        subnet: ipv4::Subnet { gateway: (Ipv4Addr::new(192, 0, 0, 1)), mask: ( ipv4::Mask((24)) ) },
        dns: Option::None,
        secondary_dns: Option::None,
    };

    let client_conf = ipv4::ClientConfiguration::Fixed((client_settings));

    let static_conf = NetifConfiguration {
        key: "ETH_CL_DE".try_into().unwrap(),
        description: "eth".try_into().unwrap(),
        route_priority: 60,
        ip_configuration: ipv4::Configuration::Client((client_conf)), //ipv4::Configuration::Client(Default::default()),
        stack: NetifStack::Eth,
        custom_mac: None,
    };

    let netif_static =  EspNetif::new_with_conf(&static_conf).expect("Failed to create EspNetif");

    let eth = EspEth::wrap_all(eth_driver, netif_static)?;
    info!("Eth created");

    let mut eth = BlockingEth::wrap(eth, sys_loop.clone())?;

    info!("Starting eth...");
    

    eth.start()?;
    //info!("Waiting for DHCP lease...");

    //eth.wait_netif_up()?;

    let ip_info = eth.eth().netif().get_ip_info()?;

    info!("Eth uplink info: {:?}", ip_info);

    // Create a UDP socket and send a packet
    let socket = UdpSocket::bind("0.0.0.0:0")?;
    let target_addr = "192.168.1.100:12345"; // Replace with the target IP and port

    let data = b"Hello, world!";
    socket.send_to(data, target_addr)?;

    info!("UDP packet sent to {}", target_addr);

    Ok(())
}

#[cfg(not(esp32))]
fn main() {
    use esp_idf_svc::{self as _};


    panic!("This example is configured for esp32, please adjust pins to your module");
}
