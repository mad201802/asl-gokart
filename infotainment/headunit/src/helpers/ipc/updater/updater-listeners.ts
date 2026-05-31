import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log/main';
import {
    UPDATER_GET_RELEASES_CHANNEL,
    UPDATER_INSTALL_CHANNEL,
    UPDATER_PROGRESS_CHANNEL,
    UPDATER_RELAUNCH_CHANNEL,
} from './updater-channels';
import { fetchAppReleases } from './updater-github-releases';
import { downloadDeb, installDeb } from './updater-manager';

export function registerUpdaterListeners(mainWindow: BrowserWindow): void {
    ipcMain.handle(UPDATER_GET_RELEASES_CHANNEL, async () => {
        return fetchAppReleases();
    });

    ipcMain.handle(
        UPDATER_INSTALL_CHANNEL,
        async (_event, tag: string, downloadUrl: string, assetName: string) => {
            const destPath = path.join(app.getPath('temp'), 'headunit-update', assetName);

            log.info(`[updater] Starting install of ${tag}`);

            if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
            }

            try {
                await downloadDeb(downloadUrl, destPath, (progress) => {
                    mainWindow.webContents.send(UPDATER_PROGRESS_CHANNEL, progress);
                });

                await installDeb(destPath);
            } finally {
                try {
                    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                } catch {
                    // best effort cleanup
                }
            }
        }
    );

    ipcMain.handle(UPDATER_RELAUNCH_CHANNEL, () => {
        log.info('[updater] Relaunching app after update');
        app.relaunch();
        app.quit();
    });
}
