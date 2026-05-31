export interface AppRelease {
    tag: string;
    version: string;
    publishedAt: string;
    downloadUrl: string;
    assetName: string;
    assetSize: number;
    isPrerelease: boolean;
}

export interface UpdateProgress {
    percent: number;
    bytesDownloaded: number;
    totalBytes: number;
}

export enum UpdatePhase {
    Idle = "Idle",
    Confirming = "Confirming",
    Downloading = "Downloading",
    Installing = "Installing",
    Success = "Success",
    Error = "Error",
}
