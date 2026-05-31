export type EcuId = 'zc_buttons' | 'zc_lights' | 'zc_battery' | 'zc_throttle';


/**
 * TODO:
 * This data should all come from the ECUs themselves.
 * ECUs should report their current firmware version and 
 * online status via Sero telemetry / self-description on connect.
 */
export interface EcuDefinition {
    id: EcuId;
    displayName: string;
    /** Asset filename in GitHub releases, e.g. "firmware_zc_battery.bin" */
    githubAssetName: string;
    /** Sero service ID for this ECU (used to route OTA trigger method calls). */
    seroServiceId: number;
    /** Mock current firmware version until ECUs report their own */
    mockCurrentVersion: string;
    /** Mock online status until real telemetry is available */
    mockOnline: boolean;
}

export interface FirmwareRelease {
    tag: string;
    version: string;
    publishedAt: string;
    downloadUrl: string;
    isPrerelease: boolean;
}

export enum OtaPhase {
    Idle = 'idle',
    Downloading = 'downloading',
    Flashing = 'flashing',
    Success = 'success',
    Error = 'error',
}

export interface OtaState {
    phase: OtaPhase;
    error?: string;
}
