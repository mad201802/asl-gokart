FROM debian:bullseye

WORKDIR /app/asl-gokart/infotainment/asl-gokart-dashboard

RUN apt-get update && apt-get install -y \
    vim \
    curl \
    && apt install -y \
    libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    && apt-get clean

# Install Rust
RUN curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh -s -- -y

ENV PATH="/root/.cargo/bin:${PATH}"

RUN rustup update

# Install NODE

RUN curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh && bash nodesource_setup.sh && apt-get install -y nodejs

# Setup Tauri

RUN cargo install tauri-cli 

RUN npm cache clean --force && npm install --save-dev @tauri-apps/cli

# Set up cross compiling

RUN rustup target add aarch64-unknown-linux-gnu && \
dpkg --add-architecture arm64 && \
apt-get update && apt-get upgrade -y && \
apt-get install -y gcc-aarch64-linux-gnu libwebkit2gtk-4.0-dev:arm64 libssl-dev:arm64 && \
apt-get clean

ENV PKG_CONFIG_SYSROOT_DIR=/usr/aarch64-linux-gnu/

CMD ["bash"]

# To build/start the container run docker-compose up -d

# To build a binary for arm run 'docker exec -it gokart_arm_compilr cargo tauri build --target aarch64-unknown-linux-gnu'

# Note that the config.toml has to contain:
# [target.aarch64-unknown-linux-gnu]
# linker = "aarch64-linux-gnu-gcc"

# The tauri.conf.json need to contain deb as target '"targets": ["deb"],'