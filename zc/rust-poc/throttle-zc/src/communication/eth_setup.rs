use esp_idf_svc::{
    eth::{BlockingEth, EspEth, EthDriver, RmiiEth},
    eventloop::EspSystemEventLoop,
    hal::{
        gpio::{
            self, Gpio12, Gpio17, Gpio18, Gpio19, Gpio21, Gpio22, Gpio23, Gpio25, Gpio26, Gpio27,
            Gpio5, PinDriver,
        },
        mac::MAC,
    },
    ipv4,
    netif::{EspNetif, NetifConfiguration, NetifStack},
};

use std::net::Ipv4Addr;

use log::info;

#[allow(clippy::too_many_arguments)]
pub fn start_eth(
    mac: MAC,
    gpio12: Gpio12,
    gpio25: Gpio25,
    gpio26: Gpio26,
    gpio27: Gpio27,
    gpio23: Gpio23,
    gpio22: Gpio22,
    gpio21: Gpio21,
    gpio19: Gpio19,
    gpio18: Gpio18,
    gpio17: Gpio17,
    gpio5: Gpio5,
    sys_loop: &EspSystemEventLoop,
) -> (
    PinDriver<Gpio12, gpio::Output>,
    BlockingEth<EspEth<RmiiEth>>,
) {
    //ETH power
    let mut lan_power: PinDriver<_, gpio::Output> = PinDriver::output(gpio12).unwrap();
    lan_power.set_high().unwrap();

    let eth_driver = EthDriver::new_rmii(
        mac,
        gpio25,
        gpio26,
        gpio27,
        gpio23,
        gpio22,
        gpio21,
        gpio19,
        gpio18,
        esp_idf_svc::eth::RmiiClockConfig::<gpio::Gpio0, gpio::Gpio16, gpio::Gpio17>::OutputInvertedGpio17(
            gpio17,
        ),
        Some(gpio5),
        esp_idf_svc::eth::RmiiEthChipset::LAN87XX,
        Some(0),
        sys_loop.clone(),
    ).unwrap();

    //Custom config to set a static IP instead of using DHCP
    let client_settings = ipv4::ClientSettings {
        ip: Ipv4Addr::new(192, 168, 1, 69),
        subnet: ipv4::Subnet {
            gateway: (Ipv4Addr::new(192, 168, 1, 1)),
            mask: (ipv4::Mask(24)),
        },
        dns: Option::None,
        secondary_dns: Option::None,
    };

    let client_conf = ipv4::ClientConfiguration::Fixed(client_settings);

    let static_conf = NetifConfiguration {
        key: "ETH_CL_DE".try_into().unwrap(),
        description: "eth".try_into().unwrap(),
        route_priority: 60,
        ip_configuration: ipv4::Configuration::Client(client_conf), //ipv4::Configuration::Client(Default::default()),
        stack: NetifStack::Eth,
        custom_mac: None,
    };

    let netif_static = EspNetif::new_with_conf(&static_conf).expect("Failed to create EspNetif");

    let eth = EspEth::wrap_all(eth_driver, netif_static).unwrap();
    info!("Eth created");

    let mut eth = BlockingEth::wrap(eth, sys_loop.clone()).unwrap();

    info!("Starting eth...");

    eth.start().unwrap();

    let ip_info = eth.eth().netif().get_ip_info().unwrap();

    info!("Eth uplink info: {:?}", ip_info);

    //lan_power needs to be returned because otherwise the power for the ethernet module will be shut off
    //eth needs to be returned because otherwise the interface is deleted by rust after this function finishes
    (lan_power, eth)
}
