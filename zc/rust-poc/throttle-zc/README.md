### How install the toolchain:
Follow https://docs.esp-rs.org/book/installation/index.html

### Commands:
- Compile and flash: CARGO_TARGET_DIR="./build" cargo run  
- Compile: CARGO_TARGET_DIR="./build" cargo build
- Run tests: CARGO_TARGET_DIR="./build" cargo test

I recommend setting the CARGO_TARGET_DIR, because otherwise the build cache will get invalidated by rust analyzer and you'll have to build more crates.