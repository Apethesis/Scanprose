const { app, BrowserWindow } = require('electron')

require('electron-reload')(__dirname, {
  electron: require('./node_modules/electron')
});


function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 650,
    webPreferences: {
      nodeIntegration: true
    }
  })

    win.loadFile('index.html');

}

app.whenReady().then(createWindow)
