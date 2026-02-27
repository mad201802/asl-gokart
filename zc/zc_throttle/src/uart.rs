use esp_idf_svc::hal::{gpio::{self, InputPin, OutputPin}, peripheral::Peripheral, uart::{Uart, UartDriver}, units::Hertz};

//impl Unlike to java you have to explicitly state that the input implements an interface: https://stackoverflow.com/questions/57562632/why-is-impl-needed-when-passing-traits-as-function-parameters

pub fn configure_uart<'a, UART: Uart>(uart: impl Peripheral<P = UART> + 'a, tx: impl OutputPin + 'a, rx: impl InputPin + 'a) 
-> UartDriver<'a>{
    let config = esp_idf_svc::hal::uart::config::Config::new().baudrate(Hertz(19_200));
    let uart_driver = UartDriver::new(
        uart,
        tx,
        rx,
        Option::<gpio::Gpio0>::None,
        Option::<gpio::Gpio1>::None,
        &config,
    )
    .unwrap();
    uart_driver
}