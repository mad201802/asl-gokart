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
        mockCurrentVersion: 'v0.3.1',
        mockOnline: true,
    },
    {
        id: 'zc_lights',
        displayName: 'Lights Controller',
        githubAssetName: 'firmware_zc_lights.bin',
        mockCurrentVersion: 'v0.4.15',
        mockOnline: true,
    },
    {
        id: 'zc_battery',
        displayName: 'Battery Controller',
        githubAssetName: 'firmware_zc_battery.bin',
        mockCurrentVersion: 'v0.4.16',
        mockOnline: false,
    },
    {
        id: 'zc_throttle',
        displayName: 'Throttle Controller',
        githubAssetName: 'firmware_zc_throttle.bin',
        mockCurrentVersion: 'v0.2.0',
        mockOnline: true,
    },
];
