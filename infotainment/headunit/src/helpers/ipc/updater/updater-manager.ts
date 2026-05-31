import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { exec } from 'child_process';
import log from 'electron-log/main';
import { UpdateProgress } from '@/data/updater/updater-types';

export function downloadDeb(
    downloadUrl: string,
    destPath: string,
    onProgress: (progress: UpdateProgress) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        const file = fs.createWriteStream(destPath);

        const doGet = (url: string): void => {
            const protocol = url.startsWith('https') ? https : http;
            const req = protocol.get(url, { headers: { 'User-Agent': 'asl-gokart-headunit' } }, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    // Drain and discard the redirect response body, then follow.
                    // Do NOT close `file` — the WriteStream must stay open across redirects.
                    res.resume();
                    doGet(res.headers.location!);
                    return;
                }

                if (res.statusCode !== 200) {
                    file.close();
                    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                    reject(new Error(`Download failed with HTTP ${res.statusCode}`));
                    return;
                }

                const total = parseInt(res.headers['content-length'] ?? '0', 10);
                let downloaded = 0;

                res.on('data', (chunk: Buffer) => {
                    downloaded += chunk.length;
                    const percent = total > 0 ? Math.round((downloaded / total) * 100) : -1;
                    onProgress({ percent, bytesDownloaded: downloaded, totalBytes: total });
                });

                res.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
                        log.info(`[updater-manager] Download complete: ${destPath}`);
                        resolve();
                    });
                });
            });

            req.on('error', (err) => {
                file.close();
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                reject(err);
            });

            req.setTimeout(120_000, () => {
                req.destroy();
                reject(new Error('Download timed out after 120s'));
            });
        };

        doGet(downloadUrl);
    });
}

export function installDeb(debPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        log.info(`[updater-manager] Running: sudo dpkg -i "${debPath}"`);
        exec(`sudo dpkg -i "${debPath}"`, (error, stdout, stderr) => {
            if (error) {
                log.error(`[updater-manager] dpkg failed: ${stderr}`);
                reject(new Error(stderr || error.message));
            } else {
                log.info(`[updater-manager] dpkg succeeded:\n${stdout}`);
                resolve();
            }
        });
    });
}
