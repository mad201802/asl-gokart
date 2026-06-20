import { EcuDefinition } from './ecu-types';

/**
 * TODO: 
 * This data should all come from the ECUs themselves.
 * ECUs should report their current firmware version and 
 * online status via Sero telemetry / self-description on connect.
 */ 
export const ECU_DEFINITIONS: EcuDefinition[] = [
    {
        id: 'zc_buttons',
        displayName: 'Button Controller',
        githubAssetName: 'firmware_zc_buttons.bin',
        seroServiceId: 0x0002,
        mockCurrentVersion: 'v0.3.1',
        mockOnline: true,
    },
    {
        id: 'zc_lights',
        displayName: 'Lights Controller',
        githubAssetName: 'firmware_zc_lights.bin',
        seroServiceId: 0x0001,
        mockCurrentVersion: 'v0.4.15',
        mockOnline: true,
    },
    {
        id: 'zc_battery',
        displayName: 'Battery Controller',
        githubAssetName: 'firmware_zc_battery.bin',
        seroServiceId: 0x0003,
        mockCurrentVersion: 'v0.4.16',
        mockOnline: true,
    },
    {
        id: 'zc_motor',
        displayName: 'Motor Controller',
        githubAssetName: 'firmware_zc_motor.bin',
        seroServiceId: 0x0004,
        mockCurrentVersion: 'v0.2.0',
        mockOnline: true,
    },
];
