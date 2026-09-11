# ARGB LED Tester - Pinout & Electrical Documentation

Hardware testbench pinout, electrical connections, and troubleshooting guide for testing the ASL Go-Kart front DRLs and rear taillight LED bar on an **AZ-Delivery ESP32-WROOM-32 Dev Kit** (NodeMCU-32S / ESP32 DevKit v4).

---

## 1. Pin Connection Table

| Signal | ESP32 GPIO | AZ-Delivery Header Pin | Wire Function | Target Hardware | RMT Channel |
|---|---|---|---|---|---|
| **Rear Light Bar Data** | **GPIO 4** | **D4** (or `IO4`) | `DIN` (Data In) | Rear 144×3 LED Bar (432 LEDs) | RMT Channel 0 |
| **Front Left DRL Data** | **GPIO 16** | **RX2** (or `D16` / `16`) | `DIN` (Data In) | Front Left DRL Strip (15 LEDs) | RMT Channel 1 |
| **Front Right DRL Data** | **GPIO 13** | **D13** (or `IO13` / `13`) | `DIN` (Data In) | Front Right DRL Strip (15 LEDs) | RMT Channel 2 |
| **Common Ground** | **GND** | **GND** | `GND` | Power Supply Ground & Strip Ground | Common Reference |
| **Logic Power (ESP32)** | **VIN** or USB | **VIN** (5V) or Micro-USB | 5V DC | ESP32 Power | - |

> [!CAUTION]
> **NEVER POWER THE LED STRIPS DIRECTLY FROM THE ESP32 BOARD!**
> - Total LED count: 432 (Rear) + 15 (Front L) + 15 (Front R) = **462 LEDs**.
> - At full white (100% brightness, all R+G+B on @ 60mA per pixel), total current draw is **~27.7 Amps** at 5V!
> - Even at safe testbench brightness (40/255 = ~15%), current draw is **~2.5A to 4.5A**.
> - Power the LEDs directly from a dedicated 5V bench power supply or a high-current 5V PSU.
> - Connect the **ESP32 GND** and the **External 5V Power Supply GND** together (**Common Ground is mandatory**).

---

## 2. Wiring & Electrical Schematic

```
                          EXTERNAL 5V POWER SUPPLY (e.g. 5V 10A-30A)
                         +-----------------------------------------+
                         |  +5V --------------------------------+  |
                         |  GND -----------------------------+  |  |
                         +-----------------------------------+--+--+
                                                             |  |
          AZ-DELIVERY ESP32                                  |  |
         +-----------------+                                 |  |
         |                 |                                 |  |
 USB --->| [Micro-USB]     |                                 |  |
         |                 |                                 |  |
         |             GND |---------------------------------+  | (Common GND)
         |                 |                                 |  |
         |      GPIO 4(D4) |---[ 330Ω ]---> DIN (Rear Strip) |  |
         |    GPIO 16(RX2) |---[ 330Ω ]---> DIN (Front L)    |  |
         |    GPIO 13(D13) |---[ 330Ω ]---> DIN (Front R)    |  |
         +-----------------+                                 |  |
                                                             |  |
                                                +------------+--+------------+
                                                |  [ 1000 µF Electrolytic ]  |
                                                +------------+--+------------+
                                                             |  |
                                                             V  V
                                                    LED STRIPS (+5V & GND)
```

### Best Practices:
1. **Series Resistors on Data Lines:**
   Place a **330 Ω to 470 Ω resistor** in series on each data line as close to the ESP32 GPIO pin as possible. This dampens signal reflections and protects the GPIO from voltage spikes.
2. **Buffer Capacitor:**
   Place a **1000 µF (6.3V or 16V) capacitor** across the 5V and GND lines at the power entry point of the LED strips to prevent voltage droop during sudden current transitions.
3. **Logic Level Shifter:**
   ESP32 outputs 3.3V logic signals. Standard WS2812B/SK6812 chips specify minimum high logic level as $0.7 \times V_{CC} = 3.5\text{V}$. If you experience flickering, erratic colors, or dropped pixels, use a fast 74AHCT125 or 74HCT245 level shifter IC to boost the 3.3V signals to 5V.

---

## 3. Light Bar Zone Layout & Addressing

### Front DRLs
- **Count:** 15 LEDs each.
- **Left Strip:** GPIO 16 (RX2), sweeps outward.
- **Right Strip:** GPIO 13 (D13), sweeps outward.

### Rear Light Bar (144 × 3 Matrix = 432 LEDs)
The rear light bar consists of 144 columns by 3 rows wired in **serpentine / zigzag** layout:
- **Row 0 (Top):** Wired Left to Right (Cols 0 → 143)
- **Row 1 (Middle):** Wired Right to Left (Cols 143 → 0)
- **Row 2 (Bottom):** Wired Left to Right (Cols 0 → 143)

```
Col 0                                                                   Col 143
┌───────────────┬─────────┬───────────────────┬─────────┬───────────────┐
│   TURN LEFT   │  REV L  │    BRAKE LIGHT    │  REV R  │  TURN RIGHT   │
│   Cols 0–35   │Cols 36–53│     Cols 54–89    │Cols 90–107│  Cols 108–143 │
│   (36 cols)   │(18 cols)│     (36 cols)     │(18 cols)│   (36 cols)   │
└───────────────┴─────────┴───────────────────┴─────────┴───────────────┘
                ▲                                       ▲
                └─────── TAIL BASELINE (Cols 36–107) ───┘
```

---

## 4. Hardware Diagnostic & Troubleshooting Guide

| Symptom | Probable Cause | How to Diagnose & Fix with Testbench |
|---|---|---|
| **No LEDs light up at all** | 1. Floating ground (ESP32 and LED power not tied together).<br>2. Data line connected to `DOUT` instead of `DIN`.<br>3. Reverse 5V/GND polarity. | - Check continuity between ESP32 GND and LED PSU GND.<br>- Verify wire is connected to `DIN` arrow pointing away from ESP32.<br>- Run `mode rgb` and check serial log. |
| **First few LEDs work, rest are dark** | Bad LED chip or broken solder joint at the last working pixel. | - Run `mode chaser` and watch serial log.<br>- Serial prints the exact pixel index (e.g. `Index: 57`). The pixel that does not light up is broken or has a cracked cold solder joint on `DIN`/`DOUT`. |
| **Red shows as Green, Green shows as Red** | Color order mismatch (`RGB` vs `GRB`). | - Run `mode rgb` or command `r` / `g`.<br>- WS2812B uses GRB format (`NeoGrbFeature`). Some batches or chips (WS2811/SK6812) use RGB or BGR.<br>- If `r` produces green, the physical strip is RGB. |
| **LEDs flicker or display random disco flashes** | 1. 3.3V logic level too low for 5V LED controller.<br>2. Long unshielded data wire picking up EMI.<br>3. Missing common ground. | - Insert 74AHCT125 level shifter between ESP32 GPIO and strip `DIN`.<br>- Add a 330Ω resistor in series on data line.<br>- Keep data wire under 30 cm if unbuffered. |
| **White turns yellow or red towards strip end** | Severe voltage drop along the 5V bus traces. | - Run command `w` (solid white).<br>- Measure voltage at end of strip with a multimeter (if < 4.2V, injection is needed).<br>- Inject 5V and GND at both ends and the middle of the 144x3 bar. |
| **Rear animation appears scrambled or inverted** | Serpentine / zigzag mismatch. | - Type `zigzag 0` to disable zigzag and test progressive mapping.<br>- Type `row 1` to illuminate only the middle row and verify row direction. |
