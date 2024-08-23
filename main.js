const { app, BrowserWindow } = require('electron');
const electronReload = require('electron-reload');
const path = require('path')

electronReload(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});


function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 850,
        webPreferences: {
            nodeIntegration: true
        }
    });

    win.maximize();
    // win.loadURL('http://localhost:8000');
    win.loadFile('index.html')
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
