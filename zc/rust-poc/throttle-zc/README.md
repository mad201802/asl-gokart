### How install the toolchain:
Follow https://docs.esp-rs.org/book/installation/index.html
Note, that we our ESPs have Xtensa chips and we use rusts std library

Then, run `cargo install ldproxy`.

### Commands:
- Compile and flash: CARGO_TARGET_DIR="./build" cargo run  
- Compile: CARGO_TARGET_DIR="./build" cargo build
- Run tests: CARGO_TARGET_DIR="./build" cargo test

I recommend setting the CARGO_TARGET_DIR, because otherwise the build cache will get invalidated by rust analyzer and you'll have to build more crates.


### Common Problems:
- Toolchain not found:
  - Source the export file: . $HOME/export-esp.sh or add it to your .bashrc / .zshrc


### Pinout of `zc_throttle`

#### DAC I²C (Throttle Signal to Motor Controllers)

| Description | Olimex ESP32-POE-ISO Pin | Wire Color | Wire To |
|-------------|--------------------------|------------|---------|
| Olimex SDA | `GPIO13`                        | ?      | SDA of DAC      |
| Olimex SCL | `GPIO16`                        | ?      | SCL of DAC      |


#### Raw Throttle Analog Input (ADC)

| Description | Olimex ESP32-POE-ISO Pin | Wire Color | Wire To |
|-------------|--------------------------|------------|---------|
| Throttle Signal ADC | `GPIO35`                        | ?      | Throttle Pedal Signal     |

#### Left Motor Controller UART

| Description | Olimex ESP32-POE-ISO Pin | Wire Color | Wire To |
|-------------|--------------------------|------------|---------|
| Olimex TX      | `GPIO4`                        | ?      | RX of Left Motor Controller      |
| Olimex RX      | `GPIO36`                        | ?      | TX of Left Motor Controller      |

#### Right Motor Controller UART

| Description | Olimex ESP32-POE-ISO Pin | Wire Color | Wire To |
|-------------|--------------------------|------------|---------|
| Olimex TX      | `GPIO32`                        | ?      | RX of Right Motor Controller      |
| Olimex RX      | `GPIO33`                        | ?      | TX of Right Motor Controller      |