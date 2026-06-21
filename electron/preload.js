const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getVehicles: () => ipcRenderer.invoke('get-vehicles'),
  saveVehicles: (vehicles) => ipcRenderer.invoke('save-vehicles', vehicles),
  getInspections: () => ipcRenderer.invoke('get-inspections'),
  saveInspections: (inspections) => ipcRenderer.invoke('save-inspections', inspections),
  getDeliveryOrders: () => ipcRenderer.invoke('get-delivery-orders'),
  saveDeliveryOrders: (orders) => ipcRenderer.invoke('save-delivery-orders', orders)
})
