# ARGB LED Hardware Testbench

A dedicated hardware testbench firmware for debugging, verifying, and validating the ARGB LED lighting hardware on the **ASL Go-Kart**.

Designed for testing:
1. **Front Daytime Running Lights (DRLs):** 2 strips × 15 LEDs (Left & Right)
2. **Rear Taillight LED Light Bar:** 144 columns × 3 rows matrix (432 LEDs)

Target microcontroller: **AZ-Delivery ESP32-WROOM-32 Dev Kit** (NodeMCU-32S / ESP32 DevKit v4).

For detailed wiring diagrams, level shifting, and electrical guidelines, see [PINOUT.md](PINOUT.md).

---

## Hardware Pin Connections

| Strip | ESP32 GPIO | AZ-Delivery Header | LED Strip Signal | RMT Channel |
|---|---|---|---|---|
| **Rear Light Bar** | `GPIO 4` | `D4` | `DIN` (432 LEDs) | RMT 0 |
| **Front Left DRL** | `GPIO 16` | `RX2` (or `D16`) | `DIN` (15 LEDs) | RMT 1 |
| **Front Right DRL** | `GPIO 13` | `D13` | `DIN` (15 LEDs) | RMT 2 |
| **Common Ground** | `GND` | `GND` | `GND` (Tie to PSU GND) | Common |

> [!WARNING]
> Do NOT power the LEDs from the ESP32! 462 LEDs @ 100% white draw up to **27 Amps**. Use an external 5V power supply and tie grounds together.

---

## Quick Start (PlatformIO)

### 1. Build and Flash
From inside this directory:
```bash
# Build firmware
pio run

# Flash to connected ESP32
pio run --target upload

# Open interactive Serial Monitor (115200 baud)
pio device monitor
```
Or use the PlatformIO extension in VSCode: click **Upload** and **Serial Monitor**.

---

## Testbench Modes

When you boot the ESP32, it displays a complete banner, pinout table, and starts in **AUTO** mode. You can switch modes at any time by typing commands in the serial monitor:

| Mode Command | Description | What to Look For |
|---|---|---|
| `mode auto` | Continuously cycles through RGB Check → DRL → Rear Zones → Vehicle Sim | General soak test & demonstration |
| `mode rgb` | Cycles solid **Red** (2.5s) → **Green** (2.5s) → **Blue** (2.5s) → **White** (2.5s) | **Color order validation**: if Red lights up Green, wire format is RGB instead of GRB.<br>**Voltage drop**: if White shifts to yellow/red at the end of the bar, inject power. |
| `mode chaser` | Single walking pixel through every LED index (0 to 431 on rear, 0 to 14 on DRLs) | **Broken pixel isolation**: if LED stops lighting up after index X, pixel X is defective or has a cracked solder joint. |
| `mode drl` | Dedicated front DRL test: steady white DRL, amber left sweep, amber right sweep, breathing welcome glow | Verify left and right sweep direction and brightness balance. |
| `mode rear` | Tests each zone of the 144×3 rear bar individually (Tail, Brake, Reverse, Left/Right Turn, Row 0, Row 1, Row 2) | Verify zone boundaries and verify that Row 1 reverses properly in zigzag layout. |
| `mode vehicle` | Full real-world kart lighting simulation cycle (Welcome sweep → DRL/Tail → Turn Left → Turn Right → Hard Brake → Reverse → Hazard) | End-to-end operational check matching vehicle behavior. |
| `mode manual` | Holds static state controlled by direct serial commands | Hands-on bench testing |
| `off` | Turns all strips completely OFF | Safety cutoff |

---

## Interactive Serial CLI Commands

Type any of the following into your serial monitor and press **Enter**:

### Mode Selection
- `mode auto` — Cycle through all test patterns
- `mode rgb` — Run RGB channel diagnostics
- `mode chaser` — Run walking single-pixel test
- `mode drl` — Test front DRLs
- `mode rear` — Test rear light bar zones
- `mode vehicle` — Run full kart driving simulation
- `mode manual` — Switch to manual control
- `off` — Turn all LEDs off

### Direct Strip Controls
- `target <all|rear|drl_l|drl_r>` — Set target strip for subsequent commands (e.g. `target rear`)
- `r` / `g` / `b` / `w` — Quick solid colors (Red, Green, Blue, White)
- `color <r> <g> <b>` — Set custom RGB color (e.g. `color 255 100 0`)
- `bright <0-255>` — Set global brightness (default is **40** for bench safety)
- `speed <ms>` — Set step delay in milliseconds (default **40 ms**)
- `pixel <index>` — Light up a single pixel by index (e.g. `pixel 143`)
- `col <0-143>` — Light up an entire vertical column across all 3 rows on the rear bar
- `row <0|1|2>` — Light up an entire row on the rear bar
- `zigzag <0|1>` — Enable (`1`) or disable (`0`) serpentine row mapping

### Diagnostics
- `pinout` — Print the wiring table and electrical guidelines to serial
- `status` — Show active mode, target, brightness, and pin assignments
- `help` or `?` — Print the full command list
