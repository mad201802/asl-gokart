# ASL GoKart - AI Coding Agent Instructions

## Project Architecture

This is a multi-component electric go-kart control and analytics system with three main subsystems:

### 1. Headunit (`infotainment/headunit`)
**Electron + React dashboard** for the go-kart driver interface.

- **Tech Stack**: Electron, React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand for state
- **Zone Controller Architecture**: The backend communicates with microcontrollers via WebSocket on port `6969`
  - Each zone (throttle, battery, buttons, lights) registers by sending `{"zone": "throttle"}` packet
  - Data flows: `ZoneController` → WebSocket → `ws-server.ts` → IPC → React components → Zustand stores
  - See `src/helpers/ipc/websocket/ws-server.ts` and `src/data/zonecontrollers/` for implementation
- **SOMEIP Integration**: Uses `@asl-gokart/someip-node` (custom Rust NAPI module) for automotive protocol communication
- **State Management**: Zustand slices in `src/stores/` - composed in `useStore.ts` (motor, battery, system, shared, lights slices)

**Build Commands**:
- Development: `npm run start`
- Pi 4 ARM64: `npm run make:pi4` → outputs to `./out/make/deb/arm64/headunit_X.X.X_arm64.deb`
- ODROID ARMv7: `npm run make:odroid` → outputs to `./out/make/deb/armv7l/headunit_X.X.X_armhf.deb`
- Tests: `npm run test` (Jest unit tests in `src/tests/unit`), `npm run test:e2e` (Playwright)

**Path Alias**: `@/*` maps to `./src/*` (configured in `tsconfig.json` and `vite.*.config.ts`)

### 2. Analytics (`analytics`)
**T3 Stack web dashboard** for telemetry visualization and fleet management.

- **Tech Stack**: Next.js 15 (Turbo), TypeScript, tRPC, Prisma (SQLite), NextAuth, Tailwind CSS, Recharts
- **Data Infrastructure**: 
  - InfluxDB 3 Core for time-series telemetry (runs on `:8181`)
  - Grafana for visualizations (runs on `:8182`)
  - SQLite + Prisma for user/session management
- **tRPC API**: Routers in `src/server/api/routers/` follow T3 conventions - use `createTRPCRouter` and define procedures
- **Environment Setup**: 
  1. `docker compose up -d` starts InfluxDB + Grafana
  2. Create admin token inside container: `docker exec -it influxdb3-core bash` → `influxdb3 create token --admin`
  3. Set `INFLUX_TOKEN` in `.env`, create database `asl-gokart`
  4. Run `npx prisma db push` to initialize SQLite schema

**Development**: `npm run dev --turbo`

**Database Commands**: `npm run db:push` (sync schema), `npm run db:studio` (open Prisma Studio)

### 3. SOMEIP Native Module (`infotainment/someip-node`)
**Rust NAPI-RS module** implementing SOMEIP automotive protocol for Node.js.

- **Purpose**: Bridges the custom `protocol` library (ESP32 communication protocol) to Node.js
- **Architecture**: Rust bindings in `src/lib.rs` expose `ServiceApplication` class to JavaScript
- **Build**: `yarn build` (for local arch), cross-platform only in GitHub Actions
- **Multi-platform**: Targets defined in `package.json` include x64/ARM Linux
- **Publishing**: Uses GitHub Actions to build and publish to private npm registry (`registry.leotm.de`). DO NOT publish manually.

### 4. ESP32 Protocol (`esp32-protocol`)
**Rust-based communication protocol** for embedded ESP32 microcontrollers.

- **Structure**: 
  - `protocol/`: Platform-agnostic Rust library (Service Discovery, RPC, Pub/Sub)
  - `embedded-poc/`: ESP32-specific implementation using `esp-idf-svc`
- **Key Insight**: Uses **Multicast** (not broadcast) for Service Discovery to prevent buffer overflow from self-received packets
- **Build**: 
  - Protocol library: `cd protocol && cargo build`
  - ESP32 firmware: `cd embedded-poc && cargo run` (requires ESP Rust toolchain - see README)
- **ESP Toolchain Setup**: `espup install` → `. ~/export-esp.sh`
- **Flash to ESP32**: Use `cargo run --example <your_example_file>` in `embedded-poc`

## Development Workflows

### Working on Headunit
1. If modifying SOMEIP integration: `cd someip-node && yarn build && ./build-and-install.sh`
2. Start dev server: `cd headunit && npm run start`
3. WebSocket testing: Use `test/ws_test.py` to simulate zone controllers

### Working on Analytics
1. Ensure Docker containers running: `sudo docker compose up -d`
2. After schema changes: `npm run db:push`
3. Check database: `npm run db:studio`

### Cross-Compilation for Raspberry Pi
- Headunit uses Electron Forge with `@electron-forge/maker-deb` configured in `forge.config.ts`
- Deployment: Use `autodeploy-on-rpi-2.sh` to fetch and install releases from GitHub

### Testing Patterns
- **Headunit**: Jest for unit tests (`@swc/jest` transform), Playwright for E2E
- **Analytics**: T3 stack doesn't include tests by default - add as needed
- **Protocol**: Rust standard `cargo test`

## Project-Specific Conventions

### TypeScript/JavaScript
- **Strict TypeScript**: All projects use strict mode, no implicit any
- **Import Paths**: Use `@/` alias for src imports (headunit, analytics)
- **Formatting**: Prettier with Tailwind plugin, 120 char print width (someip-node)
- **Naming**: 
  - Zone enums: `Zones.BATTERY`, `ThrottleCommands.GET_RPM`
  - Stores: `useStore()` with slice pattern (e.g., `createMotorSlice`)

### Rust
- **Error Handling**: Use `anyhow::Result` in protocol library
- **Concurrency**: `crossbeam` for channels, `parking_lot` for mutexes
- **Logging**: `env_logger` with `RUST_LOG=debug` for verbose output

### WebSocket Protocol Format
```typescript
// Register: {"zone": "throttle"}
// Data: {"zone": "throttle", "command": "getThrottle", "value": 0.25}
```
Validated via Zod schemas (though not yet in ws-server.ts - TODO noted in code)

## Common Pitfalls

1. **Multicast Required**: ESP32 protocol Service Discovery will NOT work with broadcast (buffer overflow issue)
2. **SOMEIP Module Installation**: After rebuilding, MUST run `build-and-install.sh` - `npm install` alone won't update in headunit
3. **InfluxDB Token**: Must be created inside running container, then container restarted for Grafana to pick it up
4. **Electron Packaging**: Different architectures need `--arch` flag: `arm64` for Pi 4, `armv7l` for ODROID
5. **Path Aliases**: Vite configs need explicit path resolution - check `vite.*.config.ts` if imports break

## External Dependencies

- **Hardware**: ESP32 with Ethernet (e.g., Olimex ESP32-POE), Raspberry Pi 4 / ODROID for headunit
- **Network**: Multicast-capable switch required for Service Discovery
- **Credentials**: GitHub token needed for `autodeploy-on-rpi-2.sh` (currently placeholder)

## Key Files to Reference

- WebSocket architecture: `headunit/src/helpers/ipc/websocket/ws-server.ts`
- Zone controllers: `headunit/src/data/zonecontrollers/zonecontrollers.ts`
- tRPC API: `analytics/src/server/api/root.ts`
- Protocol core: `esp32-protocol/protocol/src/lib.rs` (SD in `sd/`, RPC in `application/`)
- NAPI bindings: `someip-node/src/lib.rs`

---
