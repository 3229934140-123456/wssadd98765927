const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: '冷藏车维保系统',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

const dataDir = path.join(app.getPath('userData'), 'data')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function getDataFilePath(filename) {
  return path.join(dataDir, filename)
}

function readJsonFile(filename, defaultValue) {
  ensureDataDir()
  const filePath = getDataFilePath(filename)
  if (!fs.existsSync(filePath)) {
    return defaultValue
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    return defaultValue
  }
}

function writeJsonFile(filename, data) {
  ensureDataDir()
  const filePath = getDataFilePath(filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

ipcMain.handle('get-vehicles', () => {
  return readJsonFile('vehicles.json', [])
})

ipcMain.handle('save-vehicles', (_, vehicles) => {
  writeJsonFile('vehicles.json', vehicles)
  return true
})

ipcMain.handle('get-inspections', () => {
  return readJsonFile('inspections.json', [])
})

ipcMain.handle('save-inspections', (_, inspections) => {
  writeJsonFile('inspections.json', inspections)
  return true
})

ipcMain.handle('get-delivery-orders', () => {
  return readJsonFile('deliveryOrders.json', [])
})

ipcMain.handle('save-delivery-orders', (_, orders) => {
  writeJsonFile('deliveryOrders.json', orders)
  return true
})
