import { app, BrowserWindow } from "electron";
import registerListeners from "./helpers/ipc/listeners-register";
import path from "path";

const inDevelopment = process.env.NODE_ENV === "development";

if (require("electron-squirrel-startup")) {
    app.quit();
}

function createWindow() {
    const preload = path.join(__dirname, "preload.js");
    const mainWindow = new BrowserWindow({
        width: 1024,
        height: 600,
        webPreferences: {
            devTools: true,
            contextIsolation: true,
            nodeIntegration: true,
            nodeIntegrationInSubFrames: false,
            webSecurity: false,
            preload: preload,
        },
        titleBarStyle: "default",
        autoHideMenuBar: true,
    });
    registerListeners(mainWindow);

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(
            path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
        );
    }
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

//osX only
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
//osX only ends
