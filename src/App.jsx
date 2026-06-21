import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import VehicleList from './pages/VehicleList.jsx'
import InspectionWindow from './pages/InspectionWindow.jsx'
import DeliveryOrder from './pages/DeliveryOrder.jsx'
import { store } from './store.js'

function App() {
  const [vehicles, setVehicles] = useState([])
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [vData, iData] = await Promise.all([
        store.getVehicles(),
        store.getInspections()
      ])
      setVehicles(vData)
      setInspections(iData)
    } catch (e) {
      console.error('加载数据失败:', e)
    } finally {
      setLoading(false)
    }
  }

  async function saveVehicles(newVehicles) {
    setVehicles(newVehicles)
    await store.saveVehicles(newVehicles)
  }

  async function saveInspections(newInspections) {
    setInspections(newInspections)
    await store.saveInspections(newInspections)
  }

  function getVehicleById(id) {
    return vehicles.find(v => v.id === id)
  }

  function getInspectionByVehicleId(vehicleId) {
    return inspections.find(i => i.vehicleId === vehicleId)
  }

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ padding: '100px', textAlign: 'center' }}>
          正在加载...
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1>❄️ 冷藏车维保系统</h1>
          <div className="sub-title">胎压与冷机联动巡检 · 出车前安全检查</div>
        </div>
        <div style={{ fontSize: '13px', opacity: 0.9 }}>
          维修班组工作台
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={
              <VehicleList
                vehicles={vehicles}
                inspections={inspections}
                saveVehicles={saveVehicles}
                saveInspections={saveInspections}
              />
            }
          />
          <Route
            path="/inspection/:vehicleId"
            element={
              <InspectionWindow
                getVehicleById={getVehicleById}
                getInspectionByVehicleId={getInspectionByVehicleId}
                saveInspections={saveInspections}
                inspections={inspections}
                saveVehicles={saveVehicles}
                vehicles={vehicles}
              />
            }
          />
          <Route
            path="/delivery/:vehicleId"
            element={
              <DeliveryOrder
                getVehicleById={getVehicleById}
                getInspectionByVehicleId={getInspectionByVehicleId}
                saveInspections={saveInspections}
                inspections={inspections}
                saveVehicles={saveVehicles}
                vehicles={vehicles}
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
