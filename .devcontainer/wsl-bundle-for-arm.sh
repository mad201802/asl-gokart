# This script bundles the Tauri applucation for ARM architecture (Raspberry Pi)
cd ../infotainment/asl-gokart-dashboard/src-tauri
export PKG_CONFIG_SYSROOT_DIR=/usr/aarch64-linux-gnu/
cargo tauri build --target aarch64-unknown-linux-gnu

# Print the path to the built application
echo "The built application is located at: target/release/bundle"