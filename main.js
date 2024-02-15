const { app, BrowserWindow } = require('electron')

require('electron-reload')(__dirname, {
  electron: require('./node_modules/electron')
});


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
