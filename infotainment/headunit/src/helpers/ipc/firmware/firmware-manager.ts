import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import http from 'http';
import { app } from 'electron';
import log from 'electron-log/main';
import { EcuId } from '@/data/ecu/ecu-types';
import { getBindAddress } from '@/helpers/ipc/hardware/network-config';
import { FIRMWARE_SERVER_PORT } from '@/data/config';

export function getFirmwarePath(ecuId: EcuId, tag: string): string {
    return path.join(app.getPath('userData'), 'firmware', ecuId, tag, 'fw.bin');
}

export function isDownloaded(ecuId: EcuId, tag: string): boolean {
    return fs.existsSync(getFirmwarePath(ecuId, tag));
}

export function downloadFirmware(ecuId: EcuId, tag: string, downloadUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const filePath = getFirmwarePath(ecuId, tag);
        const dir = path.dirname(filePath);

        fs.mkdirSync(dir, { recursive: true });

        const file = fs.createWriteStream(filePath);
        const protocol = downloadUrl.startsWith('https') ? https : http;

        log.info(`[firmware-manager] Downloading ${ecuId} ${tag} from ${downloadUrl}`);

        const request = protocol.get(downloadUrl, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                // Follow redirect (GitHub release assets redirect to S3)
                file.close();
                fs.unlinkSync(filePath);
                downloadFirmware(ecuId, tag, res.headers.location!).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                file.close();
                fs.unlinkSync(filePath);
                reject(new Error(`Download failed with status ${res.statusCode}`));
                return;
            }

            res.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    log.info(`[firmware-manager] Downloaded ${ecuId} ${tag} to ${filePath}`);
                    resolve();
                });
            });
        });

        request.on('error', (err) => {
            file.close();
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            reject(err);
        });

        request.setTimeout(60_000, () => {
            request.destroy();
            reject(new Error('Download timed out'));
        });
    });
}

export function getCachedVersions(): Record<string, string[]> {
    const root = path.join(app.getPath('userData'), 'firmware');
    const result: Record<string, string[]> = {};

    if (!fs.existsSync(root)) return result;

    for (const ecuId of fs.readdirSync(root)) {
        const ecuDir = path.join(root, ecuId);
        if (!fs.statSync(ecuDir).isDirectory()) continue;
        result[ecuId] = fs.readdirSync(ecuDir).filter((tag) => {
            return fs.existsSync(path.join(ecuDir, tag, 'fw.bin'));
        });
    }

    return result;
}

export function getFirmwareLocalUrl(ecuId: EcuId, tag: string): string {
    const bindAddress = getBindAddress();
    return `http://${bindAddress}:${FIRMWARE_SERVER_PORT}/firmware/${ecuId}/${tag}/fw.bin`;
}
