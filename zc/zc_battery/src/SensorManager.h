// SensorManager.h

#ifndef SENSORMANAGER_H
#define SENSORMANAGER_H

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <vector>
#include <cmath>

// #define PP2 2   // TempSensors (DS18B20) 1-wire Interface connected to Port Pins D2..D5
// #define PP3 3
// #define PP4 4
#define PP5 5
#define NoIFs 4          // Set number of 1-wire Interfaces
#define NoSensors_IF 10  // Set number of sensors per 1-wire Interface. Can be a maximum of 20 devices
#define ROMsize 8        // DS18B20 sensor ROM size
#define AMOUNT_OF_ONEWIRE_INSTANCES 4

extern OneWire oneWires[AMOUNT_OF_ONEWIRE_INSTANCES];
extern DallasTemperature sensors[AMOUNT_OF_ONEWIRE_INSTANCES];
extern byte allAddrses[AMOUNT_OF_ONEWIRE_INSTANCES][NoSensors_IF][ROMsize];
extern byte totalDevs[AMOUNT_OF_ONEWIRE_INSTANCES];
extern int TempA[NoIFs * NoSensors_IF];
extern int SenDiff[NoIFs * NoSensors_IF];
extern byte S_totalCnt;
extern int cycle_time;

void initializeSensors();
std::vector<float> sensorLoop();

// Add function declarations
byte discoverOneWireDevices(OneWire oneWire_X, byte allAddr_X[NoSensors_IF][ROMsize]);
void setSensorResolution(byte totalDev_X, DallasTemperature sensor_X, byte allAddr_X[NoSensors_IF][ROMsize]);
void print_shortAddr(DeviceAddress addr);
void Temp_X(DeviceAddress addr, DallasTemperature sensor_X, int index, byte allAddr_X[NoSensors_IF][ROMsize]);
void Daempfung();
std::vector<float> setupSensorTemperature(DallasTemperature sensor_X, byte totalDev_X, byte allAddr_X[NoSensors_IF][ROMsize], int index, byte* ii);

#endif // SENSORMANAGER_H
