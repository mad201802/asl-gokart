#include <Arduino.h>
#include <Wire.h>

constexpr int SDA_PIN = 13;
constexpr int SCL_PIN = 16;

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    delay(10);
  }
  Wire.begin(SDA_PIN, SCL_PIN);
  Serial.println("I2C scanner ready");
}

void loop() {
  int found = 0;

  Serial.println("Scanning...");
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    uint8_t error = Wire.endTransmission();

    if (error == 0) {
      Serial.printf("Device found at 0x%02X\n", addr);
      found++;
    } else if (error == 4) {
      Serial.printf("Unknown error at 0x%02X\n", addr);
    }
  }

  if (found == 0) {
    Serial.println("No devices found");
  } else {
    Serial.printf("Done. %d device(s)\n", found);
  }

  delay(5000);
}
