const { app, BrowserWindow } = require('electron')

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 850,
    webPreferences: {
      nodeIntegration: true
    }
  })

    win.maximize();
    win.loadFile('index.html');

}

app.whenReady().then(createWindow)
