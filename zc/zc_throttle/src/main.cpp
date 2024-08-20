#include <Arduino.h>

/* PIN-DEFINITIONEN */
const int PIN_GAS_IN = 35;        //Input Gaspedal in ESP
const int PIN_GAS_OUT_R = 25;     //Output - Verbunden mit Rechtem Controller
const int PIN_GAS_OUT_L = 26;     //Output - Verbunden mit Linkem Controller

/* KONFIGURATIONSVARIABLEN */
const int BAUD_RATE = 115200;     //BAUD-Rate für serielle Kommunikation
const int READ_DELAY = 50;        //Delay zwischen den Reads in ms

const int MIN_GAS_IN = 400;       //out range - Min Input
const int MAX_GAS_IN = 3200;      //out range - Max Input (max analog read is 4096)
const int MIN_GAS_OUT = 25;       //out range- Min 
const int MAX_GAS_OUT = 255;      //out range - Max (max power = 255)
const int MIN_GAS_OUT_LIM = 60;   
const int MAX_GAS_OUT_LIM = 150;

const bool LIMITER = false;        //Limiter aktivieren/deaktivieren

long mapValue(long x, long in_min, long in_max, long out_min, long out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

void setup() {
  pinMode(PIN_GAS_IN, INPUT);
  pinMode(PIN_GAS_OUT_R, OUTPUT);
  pinMode(PIN_GAS_OUT_L, OUTPUT);
  Serial.begin(BAUD_RATE);
  Serial.println("Setup finished");
}

void loop() {
  int gasIn = analogRead(PIN_GAS_IN);
  int gasOut = mapValue(gasIn, MIN_GAS_IN, MAX_GAS_IN, MIN_GAS_OUT, MAX_GAS_OUT);
  
  if (LIMITER) {
    gasOut = mapValue(gasIn, MIN_GAS_IN, MAX_GAS_IN, MIN_GAS_OUT_LIM, MAX_GAS_OUT_LIM);
  }

  dacWrite(PIN_GAS_OUT_R, gasOut);
  dacWrite(PIN_GAS_OUT_L, gasOut);

  delay(READ_DELAY);
  Serial.println(gasOut);
}