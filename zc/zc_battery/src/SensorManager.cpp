// SensorManager.cpp

#include "SensorManager.h"

OneWire oneWires[AMOUNT_OF_ONEWIRE_INSTANCES] = {
    OneWire(PP2),
    OneWire(PP3),
    OneWire(PP4),
    OneWire(PP5)
};

DallasTemperature sensors[AMOUNT_OF_ONEWIRE_INSTANCES];

byte allAddrses[AMOUNT_OF_ONEWIRE_INSTANCES][NoSensors_IF][ROMsize];
byte totalDevs[AMOUNT_OF_ONEWIRE_INSTANCES];

int TempA[NoIFs * NoSensors_IF];
int SenDiff[NoIFs * NoSensors_IF];
float tempC;
byte S_totalCnt = 0;
long lastTime;
byte i, j, k, ii = 0;
int cycle_time;
int daempf;
long milltempo;
byte tempDFF = 100;
byte tempAbz = 10;
byte Pause = 15;
byte Fehlmess = 2;

int datarate = 115200;
byte resolution = 12;
char add = 'a';

void initializeSensors() {
    for (int i = 0; i < AMOUNT_OF_ONEWIRE_INSTANCES; i++) {
        sensors[i] = DallasTemperature(&oneWires[i]);
    }
    
    for (int i = 0; i < (NoIFs * NoSensors_IF); i++) {
        SenDiff[i] = tempDFF;
        TempA[i] = (-2000);   
    }
  
    Serial.begin(datarate);
    
    for (int i = 0; i < AMOUNT_OF_ONEWIRE_INSTANCES; i++) {
        sensors[i].begin();
    }

    Serial.print("......Modified by ASL Gokart.......\n");
    Serial.print("...................................\n");
    Serial.print(".Temperatursensoren Dallas DS18B20.\n");
    Serial.print("...  Max 10 Sensoren pro Pin    ...\n");
    Serial.print("...................................\n");
    
    S_totalCnt = 0;
  
    for (int i = 0; i < AMOUNT_OF_ONEWIRE_INSTANCES; i++) {
        Serial.print("\n sensors at interface ");
        Serial.print(i + 1);
        Serial.print(": ");
        totalDevs[i] = discoverOneWireDevices(oneWires[i], allAddrses[i]);
        setSensorResolution(totalDevs[i], sensors[i], allAddrses[i]);
    }
   
    Serial.print("\n ... A total number of ");
    Serial.print(S_totalCnt, DEC);
    Serial.print(" sensors found\n\n");
    
    if (S_totalCnt != 0)
        cycle_time = (S_totalCnt * 750);
    else
        cycle_time = 1000;
}

std::vector<float> setupSensorTemperature(DallasTemperature sensor_X, byte totalDev_X, byte allAddr_X[NoSensors_IF][ROMsize], int index, byte* ii) {
    std::vector<float> temperatures; // Vector to store temperatures
    sensor_X.requestTemperatures();

    for (byte i = 0; i < totalDev_X; i++) {
        // Obtain temperature from sensor
        Temp_X(allAddr_X[i], sensor_X, index, allAddr_X); // Assuming Temp_X modifies tempC
        Daempfung(); // Assuming this modifies tempDFF, SenDiff, etc.

        // Calculate the difference and update if necessary
        float currentTempC = static_cast<float>(tempC) / 100; // Assuming tempC is in hundredths of degrees

        if (std::abs(currentTempC - TempA[*ii]) + 5 > SenDiff[*ii]) {
            if (currentTempC > -20.0) {  // Adjusted threshold to degrees Celsius
                Fehlmess = 2;
                Serial.print("tempT");
                Serial.print(add);
                Serial.print(index);
                Serial.print(" sensor ");
                print_shortAddr(allAddr_X[i]); // Assume this prints the sensor address
                Serial.print(" ");
                Serial.print(currentTempC, 1);
                Serial.print("\n");
            }
            SenDiff[*ii] = tempDFF; // Updating the sensor difference
            TempA[*ii] = tempC; // Storing the raw temperature in TempA
        } else {
            SenDiff[*ii] = SenDiff[*ii] * (100 - tempAbz) / 100;
        }

        temperatures.push_back(currentTempC); // Store the temperature in vector
        (*ii)++;
    }

    return temperatures; // Return the vector of temperatures
}

byte discoverOneWireDevices(OneWire oneWire_X, byte allAddr_X[NoSensors_IF][ROMsize]) { 
    j = 0; 
    while ((j < NoSensors_IF) && (oneWire_X.search(allAddr_X[j]))) {
        j++;
    }
    for (i = 0; i < j; i++) {
        Serial.print(" ...");
        print_shortAddr(allAddr_X[i]);
        S_totalCnt++;
    }
    return j;
}

void setSensorResolution(byte totalDev_X, DallasTemperature sensor_X, byte allAddr_X[NoSensors_IF][ROMsize]) {
    for (i = 0; i < totalDev_X; i++) {
        sensor_X.setResolution(allAddr_X[i], resolution);
    }
}

void print_shortAddr(DeviceAddress addr) {
    for (k = 2; k < (ROMsize - 1); k++) {
        if (addr[k] < 16) {
            Serial.print('0');
        } 
        Serial.print(addr[k], HEX); 
        if (k > 2) {
            k = k + 3;
        }
    }
}

void Temp_X(DeviceAddress addr, DallasTemperature sensor_X, int index, byte allAddr_X[NoSensors_IF][ROMsize]) {
    tempC = (sensor_X.getTempC(addr)); 
    if (tempC == DEVICE_DISCONNECTED_C || tempC == 85  || tempC == 0) {
        Serial.print("Error-");
        Serial.print(add);
        Serial.print(index + ",sensor=");
        print_shortAddr(allAddr_X[i]);
        Serial.print(" value=");
        Serial.print(tempC, 1);
        Serial.print("\n");
        tempC = -2000;
    } else {
        tempC = tempC * 100;
    }
}

void Daempfung() {
    delay(300);
    if (TempA[ii] > (-2000)) {
        if (tempC == -1270 || tempC == 850 || tempC == 0) {
            Serial.println("");
            Serial.print("Fehler_");
            Serial.print(tempC);
            Serial.println("-");
        } else {
            daempf = ((abs((tempC) - TempA[ii])) / 100) + 3;
            tempC = ((tempC * daempf) + TempA[ii]) / (1 + daempf);
        }
        if (abs((tempC) - TempA[ii]) > 1000) { 
            if (Fehlmess > 0) {
                Fehlmess = Fehlmess - 1;
                tempC = -2000;
                i = i - 1;
                delay(750);
            } 
        }
    } else {
        TempA[ii] = tempC;
        SenDiff[ii] = 0;
    }
}

std::vector<float> sensorLoop() {
    std::vector<float> allTemperatures; // Vector to store all sensor readings
    byte ii = 0; // Local ii for use in temperature readings

    // Iterate over all OneWire instances
    for (int i = 0; i < AMOUNT_OF_ONEWIRE_INSTANCES; i++) {
        // Get the temperatures from each OneWire instance and add to allTemperatures
        std::vector<float> temperatures = setupSensorTemperature(sensors[i], totalDevs[i], allAddrses[i], i + 1, &ii);
        allTemperatures.insert(allTemperatures.end(), temperatures.begin(), temperatures.end());
    }

    // Implement pause logic
    if (Pause > 30) {
        delay((Pause - 30) * 1000);
    }

    long milltempo = millis();
    if (milltempo >= 0) {
        milltempo = Pause * 1000 - (milltempo - ((milltempo / Pause / 1000)) * Pause * 1000);
    } else {
        milltempo = ((milltempo / Pause / 1000)) * Pause * 1000 - milltempo;
    }
    delay(milltempo);

    return allTemperatures; // Return all collected temperatures
}