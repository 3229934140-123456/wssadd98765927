const isElectron = window.electronAPI !== undefined

const mockVehicles = [
  { id: 'v1', plate: '京A12345', model: '福田欧曼', carrier: '北京冷链物流', standardPressure: 8.5, status: 'pending' },
  { id: 'v2', plate: '京B67890', model: '东风天龙', carrier: '顺丰冷运', standardPressure: 9.0, status: 'pending' },
  { id: 'v3', plate: '沪C11111', model: '解放J6', carrier: '京东物流', standardPressure: 8.8, status: 'inspecting' },
  { id: 'v4', plate: '粤D22222', model: '重汽豪沃', carrier: '圆通冷链', standardPressure: 8.5, status: 'completed' },
  { id: 'v5', plate: '津E33333', model: '陕汽德龙', carrier: '中通快递', standardPressure: 9.2, status: 'pending' }
]

const mockInspections = [
  {
    id: 'ins1',
    vehicleId: 'v3',
    plate: '沪C11111',
    inspector: '张师傅',
    startTime: '2024-01-15 09:30',
    status: 'tire_done',
    tireData: {
      frontLeft: { pressure: 8.2, sensorStatus: 'drift' },
      frontRight: { pressure: 8.5, sensorStatus: 'normal' },
      rearLeft1: { pressure: 8.3, sensorStatus: 'normal' },
      rearLeft2: { pressure: 8.1, sensorStatus: 'normal' },
      rearRight1: { pressure: 8.4, sensorStatus: 'normal' },
      rearRight2: { pressure: 8.0, sensorStatus: 'drift' },
      spare: { pressure: 8.5, sensorStatus: 'normal' }
    },
    coldMachineData: null
  }
]

export const store = {
  async getVehicles() {
    if (isElectron) {
      const result = await window.electronAPI.getVehicles()
      if (result && result.length > 0) return result
      await window.electronAPI.saveVehicles(mockVehicles)
      return mockVehicles
    } else {
      const data = localStorage.getItem('vehicles')
      if (data) return JSON.parse(data)
      localStorage.setItem('vehicles', JSON.stringify(mockVehicles))
      return mockVehicles
    }
  },

  async saveVehicles(vehicles) {
    if (isElectron) {
      return await window.electronAPI.saveVehicles(vehicles)
    } else {
      localStorage.setItem('vehicles', JSON.stringify(vehicles))
      return true
    }
  },

  async getInspections() {
    if (isElectron) {
      const result = await window.electronAPI.getInspections()
      if (result && result.length > 0) return result
      await window.electronAPI.saveInspections(mockInspections)
      return mockInspections
    } else {
      const data = localStorage.getItem('inspections')
      if (data) return JSON.parse(data)
      localStorage.setItem('inspections', JSON.stringify(mockInspections))
      return mockInspections
    }
  },

  async saveInspections(inspections) {
    if (isElectron) {
      return await window.electronAPI.saveInspections(inspections)
    } else {
      localStorage.setItem('inspections', JSON.stringify(inspections))
      return true
    }
  },

  async getDeliveryOrders() {
    if (isElectron) {
      return await window.electronAPI.getDeliveryOrders()
    } else {
      const data = localStorage.getItem('deliveryOrders')
      return data ? JSON.parse(data) : []
    }
  },

  async saveDeliveryOrders(orders) {
    if (isElectron) {
      return await window.electronAPI.saveDeliveryOrders(orders)
    } else {
      localStorage.setItem('deliveryOrders', JSON.stringify(orders))
      return true
    }
  }
}
