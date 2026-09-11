#include <Arduino.h>
#include <NeoPixelBus.h>
#include <tester_config.hpp>

// ============================================================================
// ARGB LED Hardware Testbench for ASL Go-Kart
// Target: AZ-Delivery ESP32-WROOM-32 Dev Kit
// ============================================================================

// ── Strips & Output Methods ─────────────────────────────────────────────────
// NeoEsp32RmtXWs2812xMethod uses hardware RMT channels 0, 1, 2
using RearMethod     = NeoEsp32Rmt0Ws2812xMethod;
using DrlLeftMethod  = NeoEsp32Rmt1Ws2812xMethod;
using DrlRightMethod = NeoEsp32Rmt2Ws2812xMethod;

static NeoPixelBus<NeoGrbFeature, RearMethod>     strip_rear(RearLightBarConfig::NUM_LEDS, TesterHwConfig::LED_PIN_ARGB_REAR);
static NeoPixelBus<NeoGrbFeature, DrlLeftMethod>  strip_drl_l(FrontDrlConfig::NUM_LEDS, TesterHwConfig::LED_PIN_ARGB_FRONT_LEFT);
static NeoPixelBus<NeoGrbFeature, DrlRightMethod> strip_drl_r(FrontDrlConfig::NUM_LEDS, TesterHwConfig::LED_PIN_ARGB_FRONT_RIGHT);

// ── Testbench State ─────────────────────────────────────────────────────────
enum class TestMode : uint8_t {
    OFF,
    MANUAL,
    RGB_CHECK,
    CHASER,
    FRONT_DRL,
    REAR_ZONES,
    VEHICLE_SIM,
    AUTO
};

enum class TestTarget : uint8_t {
    ALL,
    REAR,
    DRL_LEFT,
    DRL_RIGHT
};

static TestMode   g_mode       = TestMode::AUTO;
static TestTarget g_target     = TestTarget::ALL;
static uint8_t    g_brightness = TesterDefaults::SAFE_BRIGHTNESS;
static uint32_t   g_speed_ms   = 40;     // General animation/chaser tick
static bool       g_zigzag     = true;   // Serpentine matrix wiring toggle

// Manual color state
static RgbColor   g_manual_color = TesterColors::RED;
static int32_t    g_single_pixel = -1;   // -1 = none, >=0 = index

// Timing state
static uint32_t   g_last_tick_ms = 0;
static uint32_t   g_mode_start_ms = 0;
static uint32_t   g_step_index   = 0;

// Serial input buffer
static String     g_serial_buf   = "";

// ── Matrix Coordinate Helper ────────────────────────────────────────────────
// Converts logical (col, row) to physical strip index
static inline uint16_t rear_pixel_index(uint16_t col, uint16_t row) {
    if (g_zigzag && (row & 1)) {
        return row * RearLightBarConfig::WIDTH + (RearLightBarConfig::WIDTH - 1 - col);
    }
    return row * RearLightBarConfig::WIDTH + col;
}

// ── Color Scaling Helper ────────────────────────────────────────────────────
static inline RgbColor scale_color(const RgbColor& c, uint8_t bright) {
    float f = static_cast<float>(bright) / 255.0f;
    return RgbColor::LinearBlend(TesterColors::OFF, c, f);
}

// ── Hardware Output Helpers ─────────────────────────────────────────────────
static void clear_all_strips() {
    strip_rear.ClearTo(TesterColors::OFF);
    strip_drl_l.ClearTo(TesterColors::OFF);
    strip_drl_r.ClearTo(TesterColors::OFF);
}

static void show_all_strips() {
    strip_rear.Show();
    strip_drl_l.Show();
    strip_drl_r.Show();
}

static void set_target_solid(const RgbColor& c) {
    RgbColor scaled = scale_color(c, g_brightness);
    if (g_target == TestTarget::ALL || g_target == TestTarget::REAR) {
        strip_rear.ClearTo(scaled);
    }
    if (g_target == TestTarget::ALL || g_target == TestTarget::DRL_LEFT) {
        strip_drl_l.ClearTo(scaled);
    }
    if (g_target == TestTarget::ALL || g_target == TestTarget::DRL_RIGHT) {
        strip_drl_r.ClearTo(scaled);
    }
}

// ── Diagnostic Banner & Docs ────────────────────────────────────────────────
static void print_pinout_docs() {
    Serial.println();
    Serial.println(F("================================================================================"));
    Serial.println(F("           ASL GO-KART ARGB LED TESTBENCH - PINOUT & WIRING DOCS               "));
    Serial.println(F("================================================================================"));
    Serial.println(F("Board: AZ-Delivery ESP32-WROOM-32 Dev Kit (30-pin or 38-pin NodeMCU-32S)"));
    Serial.println();
    Serial.println(F("PIN CONNECTION TABLE:"));
    Serial.println(F("+--------------------+-----------+----------------+----------------+-----------+"));
    Serial.println(F("| Strip Signal       | ESP32 Pin | Header Label   | LED Strip Wire | RMT Chan  |"));
    Serial.println(F("+--------------------+-----------+----------------+----------------+-----------+"));
    Serial.println(F("| Rear Light Bar     | GPIO 4    | D4   (or IO4)  | DATA (DIN)     | RMT Ch 0  |"));
    Serial.println(F("| Front DRL Left     | GPIO 16   | RX2  (or D16)  | DATA (DIN)     | RMT Ch 1  |"));
    Serial.println(F("| Front DRL Right    | GPIO 13   | D13  (or IO13) | DATA (DIN)     | RMT Ch 2  |"));
    Serial.println(F("| Common Ground      | GND       | GND            | GND            | -         |"));
    Serial.println(F("+--------------------+-----------+----------------+----------------+-----------+"));
    Serial.println();
    Serial.println(F("CRITICAL POWER & ELECTRICAL GUIDELINES:"));
    Serial.println(F(" 1. DO NOT power LEDs from ESP32 3V3 or VIN pin! 462 LEDs @ full white draw ~27A."));
    Serial.println(F(" 2. Power LED 5V rails directly from external high-current 5V PSU or bench supply."));
    Serial.println(F(" 3. COMMON GND is MANDATORY: Connect ESP32 GND directly to LED PSU GND."));
    Serial.println(F(" 4. Use 330-470 Ohm series resistors on data lines near ESP32 if signals glitch."));
    Serial.println(F(" 5. Inject 5V and GND at multiple points on the 144x3 rear light bar."));
    Serial.println(F("================================================================================"));
    Serial.println();
}

static void print_help() {
    Serial.println();
    Serial.println(F("--- TESTBENCH COMMANDS ---"));
    Serial.println(F("  help / ?              - Show this menu"));
    Serial.println(F("  pinout                - Display complete pinout & electrical documentation"));
    Serial.println(F("  status                - Show current state and estimated power consumption"));
    Serial.println();
    Serial.println(F("TEST MODES:"));
    Serial.println(F("  mode auto             - Auto cycle through all test patterns"));
    Serial.println(F("  mode rgb              - RGB channel verification (Red -> Green -> Blue -> White)"));
    Serial.println(F("  mode chaser           - Walking single pixel (finds broken LED / broken trace)"));
    Serial.println(F("  mode drl              - Front DRL test (steady white, amber sweep, welcome)"));
    Serial.println(F("  mode rear             - Rear light bar zone test (Tail, Brake, Rev, Turn, Rows)"));
    Serial.println(F("  mode vehicle          - Full kart lighting simulation cycle"));
    Serial.println(F("  mode manual           - Manual holding mode"));
    Serial.println(F("  off                   - Turn all strips OFF"));
    Serial.println();
    Serial.println(F("DIRECT CONTROLS:"));
    Serial.println(F("  target <all|rear|drl_l|drl_r> - Select target strip for tests"));
    Serial.println(F("  bright <0-255>        - Set global brightness (default 40 safe, max 255)"));
    Serial.println(F("  speed <ms>            - Set animation / chaser step interval in ms"));
    Serial.println(F("  color <r> <g> <b>     - Set solid color (0-255 each)"));
    Serial.println(F("  r / g / b / w         - Quick solid color (Red, Green, Blue, White)"));
    Serial.println(F("  pixel <index>         - Light single pixel index (-1 to clear)"));
    Serial.println(F("  col <0-143>           - Light single vertical column on rear bar"));
    Serial.println(F("  row <0|1|2>           - Light single row on rear bar"));
    Serial.printf("  zigzag <0|1>          - Toggle serpentine/zigzag matrix mapping (current: %s)\n", g_zigzag ? "ON" : "OFF");
    Serial.println(F("--------------------------"));
}

static void print_status() {
    const char* mode_str = "?";
    switch (g_mode) {
        case TestMode::OFF:         mode_str = "OFF"; break;
        case TestMode::MANUAL:      mode_str = "MANUAL"; break;
        case TestMode::RGB_CHECK:   mode_str = "RGB_CHECK"; break;
        case TestMode::CHASER:      mode_str = "CHASER"; break;
        case TestMode::FRONT_DRL:   mode_str = "FRONT_DRL"; break;
        case TestMode::REAR_ZONES:  mode_str = "REAR_ZONES"; break;
        case TestMode::VEHICLE_SIM: mode_str = "VEHICLE_SIM"; break;
        case TestMode::AUTO:        mode_str = "AUTO"; break;
    }
    const char* target_str = (g_target == TestTarget::ALL) ? "ALL" :
                             (g_target == TestTarget::REAR) ? "REAR" :
                             (g_target == TestTarget::DRL_LEFT) ? "DRL_LEFT" : "DRL_RIGHT";

    Serial.println();
    Serial.println(F("--- TESTBENCH STATUS ---"));
    Serial.printf("  Mode:        %s\n", mode_str);
    Serial.printf("  Target:      %s\n", target_str);
    Serial.printf("  Brightness:  %u / 255 (%.1f %%)\n", g_brightness, (g_brightness / 255.0f) * 100.0f);
    Serial.printf("  Speed:       %u ms per step\n", g_speed_ms);
    Serial.printf("  Zigzag:      %s (Rear matrix serpentine)\n", g_zigzag ? "ENABLED" : "DISABLED");
    Serial.println(F("  Active Pins: GPIO 4 (Rear), GPIO 16 (DRL Left), GPIO 13 (DRL Right)"));
    Serial.println(F("------------------------"));
}

// ── Test Mode Implementations ───────────────────────────────────────────────

// 1. RGB Channel Verification
static void run_test_rgb_check(uint32_t now) {
    // 4 steps, 2.5s each: RED, GREEN, BLUE, WHITE
    uint32_t elapsed = now - g_mode_start_ms;
    uint32_t step = (elapsed / 2500) % 4;

    if (step != g_step_index) {
        g_step_index = step;
        switch (step) {
            case 0:
                set_target_solid(TesterColors::RED);
                show_all_strips();
                Serial.println(F("[RGB CHECK] >> RED (255, 0, 0) <<"));
                Serial.println(F("  Check LEDs: Must be RED. If GREEN, strip wire order is RGB, not GRB!"));
                break;
            case 1:
                set_target_solid(TesterColors::GREEN);
                show_all_strips();
                Serial.println(F("[RGB CHECK] >> GREEN (0, 255, 0) <<"));
                Serial.println(F("  Check LEDs: Must be GREEN. If RED, strip wire order is RGB, not GRB!"));
                break;
            case 2:
                set_target_solid(TesterColors::BLUE);
                show_all_strips();
                Serial.println(F("[RGB CHECK] >> BLUE (0, 0, 255) <<"));
                Serial.println(F("  Check LEDs: Must be BLUE."));
                break;
            case 3:
                set_target_solid(TesterColors::WHITE);
                show_all_strips();
                Serial.println(F("[RGB CHECK] >> WHITE (255, 255, 255) <<"));
                Serial.println(F("  Check LEDs: Must be CLEAN WHITE. If yellow/red at far end, voltage drop is high!"));
                break;
        }
    }
}

// 2. Chaser / Walker (Single pixel walking through entire strip)
static void run_test_chaser(uint32_t now) {
    if (now - g_last_tick_ms < g_speed_ms) return;
    g_last_tick_ms = now;

    clear_all_strips();
    RgbColor dot = scale_color(TesterColors::WHITE, g_brightness);

    if (g_target == TestTarget::ALL || g_target == TestTarget::REAR) {
        uint16_t max_rear = RearLightBarConfig::NUM_LEDS;
        uint16_t idx = g_step_index % max_rear;
        strip_rear.SetPixelColor(idx, dot);

        uint16_t row = idx / RearLightBarConfig::WIDTH;
        uint16_t col = g_zigzag && (row & 1) ?
                       (RearLightBarConfig::WIDTH - 1 - (idx % RearLightBarConfig::WIDTH)) :
                       (idx % RearLightBarConfig::WIDTH);

        if (idx % 36 == 0 || idx == max_rear - 1) {
            Serial.printf("[CHASER REAR] Index: %3u / %u (Row: %u, Col: %3u)\n", idx, max_rear, row, col);
        }
    }

    if (g_target == TestTarget::ALL || g_target == TestTarget::DRL_LEFT) {
        uint16_t idx_l = g_step_index % FrontDrlConfig::NUM_LEDS;
        strip_drl_l.SetPixelColor(idx_l, dot);
    }
    if (g_target == TestTarget::ALL || g_target == TestTarget::DRL_RIGHT) {
        uint16_t idx_r = g_step_index % FrontDrlConfig::NUM_LEDS;
        strip_drl_r.SetPixelColor(idx_r, dot);
    }

    show_all_strips();
    g_step_index++;
}

// 3. Front DRL Test (Steady DRL White, Sequential Amber Turn Sweeps, Welcome Glow)
static void run_test_front_drl(uint32_t now) {
    uint32_t elapsed = now - g_mode_start_ms;
    uint32_t phase = (elapsed / 4000) % 4;

    RgbColor drl_col = scale_color(TesterColors::WHITE, g_brightness);
    RgbColor amber   = scale_color(TesterColors::AMBER, g_brightness);
    RgbColor blue    = scale_color(TesterColors::WELCOME, g_brightness);

    switch (phase) {
        case 0: { // Steady DRL White
            if (g_step_index != 0) {
                g_step_index = 0;
                Serial.println(F("[FRONT DRL] Phase 1: Steady White DRL"));
            }
            strip_drl_l.ClearTo(drl_col);
            strip_drl_r.ClearTo(drl_col);
            show_all_strips();
            break;
        }
        case 1: { // Left Turn Sweep
            if (g_step_index != 1) {
                g_step_index = 1;
                Serial.println(F("[FRONT DRL] Phase 2: Left Turn Signal Sweep (Amber)"));
            }
            uint32_t t = (elapsed % 700);
            uint16_t count = (t < 400) ? ((t * FrontDrlConfig::NUM_LEDS) / 400) + 1 : 0;
            strip_drl_l.ClearTo(TesterColors::OFF);
            for (uint16_t i = 0; i < FrontDrlConfig::NUM_LEDS; i++) {
                if (i < count) strip_drl_l.SetPixelColor(i, amber);
            }
            strip_drl_r.ClearTo(drl_col); // Right remains steady DRL
            show_all_strips();
            break;
        }
        case 2: { // Right Turn Sweep
            if (g_step_index != 2) {
                g_step_index = 2;
                Serial.println(F("[FRONT DRL] Phase 3: Right Turn Signal Sweep (Amber)"));
            }
            uint32_t t = (elapsed % 700);
            uint16_t count = (t < 400) ? ((t * FrontDrlConfig::NUM_LEDS) / 400) + 1 : 0;
            strip_drl_l.ClearTo(drl_col); // Left remains steady DRL
            strip_drl_r.ClearTo(TesterColors::OFF);
            for (uint16_t i = 0; i < FrontDrlConfig::NUM_LEDS; i++) {
                if (i < count) strip_drl_r.SetPixelColor(i, amber);
            }
            show_all_strips();
            break;
        }
        case 3: { // Welcome Glow Pulsing
            if (g_step_index != 3) {
                g_step_index = 3;
                Serial.println(F("[FRONT DRL] Phase 4: Welcome Light Breathing Pulse"));
            }
            float breath = (sinf((elapsed % 2000) * (2.0f * PI / 2000.0f)) + 1.0f) * 0.5f;
            uint8_t br = static_cast<uint8_t>(breath * g_brightness);
            RgbColor pulse = scale_color(blue, br);
            strip_drl_l.ClearTo(pulse);
            strip_drl_r.ClearTo(pulse);
            show_all_strips();
            break;
        }
    }
}

// 4. Rear Light Bar Zone Test
static void run_test_rear_zones(uint32_t now) {
    uint32_t elapsed = now - g_mode_start_ms;
    uint32_t phase = (elapsed / 3000) % 8;

    if (phase != g_step_index) {
        g_step_index = phase;
        strip_rear.ClearTo(TesterColors::OFF);

        RgbColor red   = scale_color(TesterColors::RED, g_brightness);
        RgbColor white = scale_color(TesterColors::WHITE, g_brightness);
        RgbColor amber = scale_color(TesterColors::AMBER, g_brightness);

        switch (phase) {
            case 0: // Tail Baseline (Center cols 36 to 107, 30% brightness)
                Serial.println(F("[REAR ZONES] Zone 1: Tail Light Baseline (Cols 36-107, Dim Red)"));
                for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
                    for (uint16_t c = RearLightBarConfig::CENTER_START; c < RearLightBarConfig::CENTER_END; c++) {
                        strip_rear.SetPixelColor(rear_pixel_index(c, r), scale_color(red, 80));
                    }
                }
                break;
            case 1: // Brake (Center cols 54 to 89, 100% brightness)
                Serial.println(F("[REAR ZONES] Zone 2: Brake Light (Cols 54-89, Bright Red)"));
                for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
                    for (uint16_t c = RearLightBarConfig::BRAKE_START; c < RearLightBarConfig::BRAKE_END; c++) {
                        strip_rear.SetPixelColor(rear_pixel_index(c, r), red);
                    }
                }
                break;
            case 2: // Reverse (Cols 36-53 and 90-107, White)
                Serial.println(F("[REAR ZONES] Zone 3: Reverse Lights (Cols 36-53 & 90-107, White)"));
                for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
                    for (uint16_t c = RearLightBarConfig::REVERSE_L_START; c < RearLightBarConfig::REVERSE_L_END; c++) {
                        strip_rear.SetPixelColor(rear_pixel_index(c, r), white);
                    }
                    for (uint16_t c = RearLightBarConfig::REVERSE_R_START; c < RearLightBarConfig::REVERSE_R_END; c++) {
                        strip_rear.SetPixelColor(rear_pixel_index(c, r), white);
                    }
                }
                break;
            case 3: // Turn Left Zone Solid (Cols 0-35, Amber)
                Serial.println(F("[REAR ZONES] Zone 4: Turn Left Zone (Cols 0-35, Amber)"));
                for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
                    for (uint16_t c = RearLightBarConfig::TURN_LEFT_START; c < RearLightBarConfig::TURN_LEFT_END; c++) {
                        strip_rear.SetPixelColor(rear_pixel_index(c, r), amber);
                    }
                }
                break;
            case 4: // Turn Right Zone Solid (Cols 108-143, Amber)
                Serial.println(F("[REAR ZONES] Zone 5: Turn Right Zone (Cols 108-143, Amber)"));
                for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
                    for (uint16_t c = RearLightBarConfig::TURN_RIGHT_START; c < RearLightBarConfig::TURN_RIGHT_END; c++) {
                        strip_rear.SetPixelColor(rear_pixel_index(c, r), amber);
                    }
                }
                break;
            case 5: // Row 0 Only (Top Row)
                Serial.println(F("[REAR ZONES] Alignment: ROW 0 ONLY (Top Row)"));
                for (uint16_t c = 0; c < RearLightBarConfig::WIDTH; c++) {
                    strip_rear.SetPixelColor(rear_pixel_index(c, 0), white);
                }
                break;
            case 6: // Row 1 Only (Middle Row - Zigzag Reverse Check)
                Serial.printf("[REAR ZONES] Alignment: ROW 1 ONLY (Middle Row - Zigzag: %s)\n", g_zigzag ? "ENABLED" : "OFF");
                for (uint16_t c = 0; c < RearLightBarConfig::WIDTH; c++) {
                    strip_rear.SetPixelColor(rear_pixel_index(c, 1), white);
                }
                break;
            case 7: // Row 2 Only (Bottom Row)
                Serial.println(F("[REAR ZONES] Alignment: ROW 2 ONLY (Bottom Row)"));
                for (uint16_t c = 0; c < RearLightBarConfig::WIDTH; c++) {
                    strip_rear.SetPixelColor(rear_pixel_index(c, 2), white);
                }
                break;
        }
        strip_rear.Show();
    }
}

// 5. Vehicle Simulator Mode (Emulates complete real-world kart behavior)
static void run_test_vehicle_sim(uint32_t now) {
    uint32_t elapsed = now - g_mode_start_ms;
    uint32_t cycle   = elapsed % 30000; // 30s loop

    // Clear frame
    clear_all_strips();

    RgbColor red_tail = scale_color(TesterColors::RED, 70);
    RgbColor red_brk  = scale_color(TesterColors::RED, g_brightness);
    RgbColor drl_col  = scale_color(TesterColors::WHITE, g_brightness);
    RgbColor amber    = scale_color(TesterColors::AMBER, g_brightness);
    RgbColor white    = scale_color(TesterColors::WHITE, g_brightness);

    // State 1: Boot Welcome Sweep (0 - 4s)
    if (cycle < 4000) {
        if (g_step_index != 10) {
            g_step_index = 10;
            Serial.println(F("[VEHICLE SIM] 1. Welcome Animation"));
        }
        float progress = (cycle % 2000) / 2000.0f;
        uint16_t sweep_reach = static_cast<uint16_t>(progress * (RearLightBarConfig::WIDTH / 2));
        uint16_t center_l = (RearLightBarConfig::WIDTH / 2) - 1;
        uint16_t center_r = (RearLightBarConfig::WIDTH / 2);

        RgbColor blue = scale_color(TesterColors::WELCOME, g_brightness);
        for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
            for (uint16_t i = 0; i <= sweep_reach; i++) {
                if (center_l >= i) strip_rear.SetPixelColor(rear_pixel_index(center_l - i, r), blue);
                if (center_r + i < RearLightBarConfig::WIDTH) strip_rear.SetPixelColor(rear_pixel_index(center_r + i, r), blue);
            }
        }
        strip_drl_l.ClearTo(blue);
        strip_drl_r.ClearTo(blue);
        show_all_strips();
        return;
    }

    // Baseline: Normal Driving (DRL ON + Tail ON)
    strip_drl_l.ClearTo(drl_col);
    strip_drl_r.ClearTo(drl_col);
    for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
        for (uint16_t c = RearLightBarConfig::CENTER_START; c < RearLightBarConfig::CENTER_END; c++) {
            strip_rear.SetPixelColor(rear_pixel_index(c, r), red_tail);
        }
    }

    // State 2: Left Turn Indicator (4s - 10s)
    if (cycle >= 4000 && cycle < 10000) {
        if (g_step_index != 11) {
            g_step_index = 11;
            Serial.println(F("[VEHICLE SIM] 2. Left Turn Signal Active"));
        }
        uint32_t t = (cycle % 700);
        if (t < 400) {
            uint16_t reach = (t * RearLightBarConfig::TURN_SIGNAL_WIDTH) / 400;
            // Rear left sweeps outward: col 35 -> 0
            for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
                for (uint16_t i = 0; i <= reach; i++) {
                    uint16_t col = (RearLightBarConfig::TURN_LEFT_END - 1) - i;
                    strip_rear.SetPixelColor(rear_pixel_index(col, r), amber);
                }
            }
            // Front left sweep
            uint16_t reach_drl = (t * FrontDrlConfig::NUM_LEDS) / 400;
            strip_drl_l.ClearTo(TesterColors::OFF);
            for (uint16_t i = 0; i <= reach_drl && i < FrontDrlConfig::NUM_LEDS; i++) {
                strip_drl_l.SetPixelColor(i, amber);
            }
        }
    }
    // State 3: Right Turn Indicator (10s - 16s)
    else if (cycle >= 10000 && cycle < 16000) {
        if (g_step_index != 12) {
            g_step_index = 12;
            Serial.println(F("[VEHICLE SIM] 3. Right Turn Signal Active"));
        }
        uint32_t t = (cycle % 700);
        if (t < 400) {
            uint16_t reach = (t * RearLightBarConfig::TURN_SIGNAL_WIDTH) / 400;
            // Rear right sweeps outward: col 108 -> 143
            for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
                for (uint16_t i = 0; i <= reach; i++) {
                    uint16_t col = RearLightBarConfig::TURN_RIGHT_START + i;
                    strip_rear.SetPixelColor(rear_pixel_index(col, r), amber);
                }
            }
            // Front right sweep
            uint16_t reach_drl = (t * FrontDrlConfig::NUM_LEDS) / 400;
            strip_drl_r.ClearTo(TesterColors::OFF);
            for (uint16_t i = 0; i <= reach_drl && i < FrontDrlConfig::NUM_LEDS; i++) {
                strip_drl_r.SetPixelColor(i, amber);
            }
        }
    }
    // State 4: Hard Braking (16s - 22s)
    else if (cycle >= 16000 && cycle < 22000) {
        if (g_step_index != 13) {
            g_step_index = 13;
            Serial.println(F("[VEHICLE SIM] 4. Hard Braking Applied"));
        }
        for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
            for (uint16_t c = RearLightBarConfig::BRAKE_START; c < RearLightBarConfig::BRAKE_END; c++) {
                strip_rear.SetPixelColor(rear_pixel_index(c, r), red_brk);
            }
        }
    }
    // State 5: Reverse Gear (22s - 26s)
    else if (cycle >= 22000 && cycle < 26000) {
        if (g_step_index != 14) {
            g_step_index = 14;
            Serial.println(F("[VEHICLE SIM] 5. Reverse Lights Active"));
        }
        for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
            for (uint16_t c = RearLightBarConfig::REVERSE_L_START; c < RearLightBarConfig::REVERSE_L_END; c++) {
                strip_rear.SetPixelColor(rear_pixel_index(c, r), white);
            }
            for (uint16_t c = RearLightBarConfig::REVERSE_R_START; c < RearLightBarConfig::REVERSE_R_END; c++) {
                strip_rear.SetPixelColor(rear_pixel_index(c, r), white);
            }
        }
    }
    // State 6: Hazard Lights (26s - 30s)
    else if (cycle >= 26000) {
        if (g_step_index != 15) {
            g_step_index = 15;
            Serial.println(F("[VEHICLE SIM] 6. Hazard Warning Active"));
        }
        uint32_t t = (cycle % 700);
        if (t < 400) {
            uint16_t reach = (t * RearLightBarConfig::TURN_SIGNAL_WIDTH) / 400;
            for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
                for (uint16_t i = 0; i <= reach; i++) {
                    strip_rear.SetPixelColor(rear_pixel_index((RearLightBarConfig::TURN_LEFT_END - 1) - i, r), amber);
                    strip_rear.SetPixelColor(rear_pixel_index(RearLightBarConfig::TURN_RIGHT_START + i, r), amber);
                }
            }
            uint16_t reach_drl = (t * FrontDrlConfig::NUM_LEDS) / 400;
            strip_drl_l.ClearTo(TesterColors::OFF);
            strip_drl_r.ClearTo(TesterColors::OFF);
            for (uint16_t i = 0; i <= reach_drl && i < FrontDrlConfig::NUM_LEDS; i++) {
                strip_drl_l.SetPixelColor(i, amber);
                strip_drl_r.SetPixelColor(i, amber);
            }
        }
    }

    show_all_strips();
}

// 6. Auto Test Sequencer (Cycles all modes)
static void run_test_auto(uint32_t now) {
    uint32_t elapsed = now - g_mode_start_ms;
    // Sequence:
    //  0 - 10s: RGB Channel Check
    // 10 - 22s: Front DRL Test
    // 22 - 46s: Rear Zones Test
    // 46 - 76s: Vehicle Sim
    // Loop
    uint32_t total = 76000;
    uint32_t sub = elapsed % total;

    if (sub < 10000) {
        run_test_rgb_check(now);
    } else if (sub < 22000) {
        run_test_front_drl(now);
    } else if (sub < 46000) {
        run_test_rear_zones(now);
    } else {
        run_test_vehicle_sim(now);
    }
}

// ── Serial CLI Processor ────────────────────────────────────────────────────
// // ponytail: simple string tokenizer without external command parsing libraries
static void process_serial_command(String cmd) {
    cmd.trim();
    if (cmd.length() == 0) return;

    Serial.printf("\n> %s\n", cmd.c_str());

    int space_idx = cmd.indexOf(' ');
    String action = (space_idx == -1) ? cmd : cmd.substring(0, space_idx);
    String args   = (space_idx == -1) ? "" : cmd.substring(space_idx + 1);
    args.trim();

    action.toLowerCase();

    if (action == "help" || action == "?") {
        print_help();
    }
    else if (action == "pinout") {
        print_pinout_docs();
    }
    else if (action == "status") {
        print_status();
    }
    else if (action == "off") {
        g_mode = TestMode::OFF;
        clear_all_strips();
        show_all_strips();
        Serial.println(F("[OK] All strips OFF"));
    }
    else if (action == "r") {
        g_mode = TestMode::MANUAL;
        g_manual_color = TesterColors::RED;
        set_target_solid(g_manual_color);
        show_all_strips();
        Serial.println(F("[OK] Solid RED"));
    }
    else if (action == "g") {
        g_mode = TestMode::MANUAL;
        g_manual_color = TesterColors::GREEN;
        set_target_solid(g_manual_color);
        show_all_strips();
        Serial.println(F("[OK] Solid GREEN"));
    }
    else if (action == "b") {
        g_mode = TestMode::MANUAL;
        g_manual_color = TesterColors::BLUE;
        set_target_solid(g_manual_color);
        show_all_strips();
        Serial.println(F("[OK] Solid BLUE"));
    }
    else if (action == "w") {
        g_mode = TestMode::MANUAL;
        g_manual_color = TesterColors::WHITE;
        set_target_solid(g_manual_color);
        show_all_strips();
        Serial.println(F("[OK] Solid WHITE"));
    }
    else if (action == "mode") {
        args.toLowerCase();
        g_mode_start_ms = millis();
        g_step_index = 999; // force print
        if (args == "auto") {
            g_mode = TestMode::AUTO;
            Serial.println(F("[OK] Mode: AUTO (Cycling all tests)"));
        } else if (args == "rgb") {
            g_mode = TestMode::RGB_CHECK;
            Serial.println(F("[OK] Mode: RGB_CHECK"));
        } else if (args == "chaser" || args == "walk") {
            g_mode = TestMode::CHASER;
            g_step_index = 0;
            Serial.println(F("[OK] Mode: CHASER"));
        } else if (args == "drl") {
            g_mode = TestMode::FRONT_DRL;
            Serial.println(F("[OK] Mode: FRONT_DRL"));
        } else if (args == "rear") {
            g_mode = TestMode::REAR_ZONES;
            Serial.println(F("[OK] Mode: REAR_ZONES"));
        } else if (args == "vehicle" || args == "sim") {
            g_mode = TestMode::VEHICLE_SIM;
            Serial.println(F("[OK] Mode: VEHICLE_SIM"));
        } else if (args == "manual") {
            g_mode = TestMode::MANUAL;
            Serial.println(F("[OK] Mode: MANUAL"));
        } else {
            Serial.printf("[ERROR] Unknown mode '%s'. Use: auto, rgb, chaser, drl, rear, vehicle, manual, off\n", args.c_str());
        }
    }
    else if (action == "target") {
        args.toLowerCase();
        if (args == "all") g_target = TestTarget::ALL;
        else if (args == "rear") g_target = TestTarget::REAR;
        else if (args == "drl_l" || args == "left") g_target = TestTarget::DRL_LEFT;
        else if (args == "drl_r" || args == "right") g_target = TestTarget::DRL_RIGHT;
        else {
            Serial.println(F("[ERROR] Target must be: all, rear, drl_l, drl_r"));
            return;
        }
        Serial.printf("[OK] Target set to: %s\n", args.c_str());
    }
    else if (action == "bright") {
        int val = args.toInt();
        if (val < 0 || val > 255) {
            Serial.println(F("[ERROR] Brightness must be 0 to 255"));
            return;
        }
        g_brightness = static_cast<uint8_t>(val);
        Serial.printf("[OK] Brightness set to %u / 255\n", g_brightness);
        if (g_brightness > 128) {
            Serial.println(F("  [WARNING] High brightness draws substantial current! Ensure external 5V PSU is rated for load."));
        }
    }
    else if (action == "speed") {
        int val = args.toInt();
        if (val < 5 || val > 5000) {
            Serial.println(F("[ERROR] Speed must be 5 to 5000 ms"));
            return;
        }
        g_speed_ms = static_cast<uint32_t>(val);
        Serial.printf("[OK] Step speed set to %u ms\n", g_speed_ms);
    }
    else if (action == "color") {
        int r, g, b;
        if (sscanf(args.c_str(), "%d %d %d", &r, &g, &b) == 3) {
            g_mode = TestMode::MANUAL;
            g_manual_color = RgbColor(constrain(r, 0, 255), constrain(g, 0, 255), constrain(b, 0, 255));
            set_target_solid(g_manual_color);
            show_all_strips();
            Serial.printf("[OK] Solid Color (%d, %d, %d)\n", r, g, b);
        } else {
            Serial.println(F("[ERROR] Usage: color <r> <g> <b> (e.g. color 255 128 0)"));
        }
    }
    else if (action == "pixel") {
        int idx = args.toInt();
        g_mode = TestMode::MANUAL;
        clear_all_strips();
        RgbColor c = scale_color(TesterColors::WHITE, g_brightness);
        if (g_target == TestTarget::REAR || g_target == TestTarget::ALL) {
            if (idx >= 0 && idx < RearLightBarConfig::NUM_LEDS) strip_rear.SetPixelColor(idx, c);
        }
        if (g_target == TestTarget::DRL_LEFT || g_target == TestTarget::ALL) {
            if (idx >= 0 && idx < FrontDrlConfig::NUM_LEDS) strip_drl_l.SetPixelColor(idx, c);
        }
        if (g_target == TestTarget::DRL_RIGHT || g_target == TestTarget::ALL) {
            if (idx >= 0 && idx < FrontDrlConfig::NUM_LEDS) strip_drl_r.SetPixelColor(idx, c);
        }
        show_all_strips();
        Serial.printf("[OK] Lit Pixel Index %d\n", idx);
    }
    else if (action == "col") {
        int col = args.toInt();
        if (col < 0 || col >= RearLightBarConfig::WIDTH) {
            Serial.printf("[ERROR] Column must be 0 to %u\n", RearLightBarConfig::WIDTH - 1);
            return;
        }
        g_mode = TestMode::MANUAL;
        clear_all_strips();
        RgbColor c = scale_color(TesterColors::WHITE, g_brightness);
        for (uint16_t r = 0; r < RearLightBarConfig::HEIGHT; r++) {
            strip_rear.SetPixelColor(rear_pixel_index(col, r), c);
        }
        strip_rear.Show();
        Serial.printf("[OK] Lit Column %d on Rear Bar (Rows 0, 1, 2)\n", col);
    }
    else if (action == "row") {
        int row = args.toInt();
        if (row < 0 || row >= RearLightBarConfig::HEIGHT) {
            Serial.printf("[ERROR] Row must be 0 to %u\n", RearLightBarConfig::HEIGHT - 1);
            return;
        }
        g_mode = TestMode::MANUAL;
        clear_all_strips();
        RgbColor c = scale_color(TesterColors::WHITE, g_brightness);
        for (uint16_t col = 0; col < RearLightBarConfig::WIDTH; col++) {
            strip_rear.SetPixelColor(rear_pixel_index(col, row), c);
        }
        strip_rear.Show();
        Serial.printf("[OK] Lit Row %d on Rear Bar (Cols 0 to %u)\n", row, RearLightBarConfig::WIDTH - 1);
    }
    else if (action == "zigzag") {
        int z = args.toInt();
        g_zigzag = (z != 0);
        Serial.printf("[OK] Zigzag / Serpentine matrix mapping is now: %s\n", g_zigzag ? "ENABLED" : "DISABLED");
    }
    else {
        Serial.printf("[ERROR] Unknown command '%s'. Type 'help' for command list.\n", action.c_str());
    }
}

// ── Setup & Loop ────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(TesterDefaults::SERIAL_BAUD);
    delay(500);

    // Initialise NeoPixelBus output channels
    strip_rear.Begin();
    strip_drl_l.Begin();
    strip_drl_r.Begin();

    clear_all_strips();
    show_all_strips();

    // Print welcome documentation
    print_pinout_docs();
    print_help();

    g_mode_start_ms = millis();
    g_last_tick_ms  = millis();
    g_mode          = TestMode::AUTO;

    Serial.println(F("\n[INIT] Testbench running! Starting in AUTO mode..."));
    Serial.println(F("Type 'help' and press Enter to interact."));
}

void loop() {
    // 1. Non-blocking Serial Command Reading
    while (Serial.available() > 0) {
        char c = static_cast<char>(Serial.read());
        if (c == '\r' || c == '\n') {
            if (g_serial_buf.length() > 0) {
                process_serial_command(g_serial_buf);
                g_serial_buf = "";
            }
        } else {
            g_serial_buf += c;
        }
    }

    // 2. State Machine Dispatcher
    // // ponytail: single-threaded non-blocking tick architecture. Zero RTOS queues or mutexes needed for bench testing.
    uint32_t now = millis();
    switch (g_mode) {
        case TestMode::OFF:
        case TestMode::MANUAL:
            // Holding state, updated on command
            break;
        case TestMode::RGB_CHECK:
            run_test_rgb_check(now);
            break;
        case TestMode::CHASER:
            run_test_chaser(now);
            break;
        case TestMode::FRONT_DRL:
            run_test_front_drl(now);
            break;
        case TestMode::REAR_ZONES:
            run_test_rear_zones(now);
            break;
        case TestMode::VEHICLE_SIM:
            run_test_vehicle_sim(now);
            break;
        case TestMode::AUTO:
            run_test_auto(now);
            break;
    }

    delay(5); // Yield briefly
}