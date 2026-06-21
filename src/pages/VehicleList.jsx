import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function VehicleList({ vehicles, inspections, deliveryOrders, saveVehicles, saveInspections }) {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const statusMap = {
    pending: { text: '待检查', className: 'status-pending' },
    inspecting: { text: '检查中', className: 'status-inspecting' },
    completed: { text: '已完成', className: 'status-completed' }
  }

  const filterOptions = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待检查' },
    { key: 'inspecting', label: '检查中' },
    { key: 'completed', label: '已完成' }
  ]

  const filteredVehicles = vehicles.filter(v => {
    const matchSearch = v.plate.includes(searchText) || v.model.includes(searchText) || v.carrier.includes(searchText)
    const matchFilter = activeFilter === 'all' || v.status === activeFilter
    return matchSearch && matchFilter
  })

  function getInspectionInfo(vehicleId) {
    const inspection = inspections.find(i => i.vehicleId === vehicleId)
    return inspection || null
  }

  function getLastDeliveryOrder(vehicleId) {
    const orders = deliveryOrders.filter(o => o.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return orders.length > 0 ? orders[0] : null
  }

  function getDeliveryOrderCount(vehicleId) {
    return deliveryOrders.filter(o => o.vehicleId === vehicleId).length
  }

  function handleStartInspection(vehicle) {
    navigate(`/inspection/${vehicle.id}`)
  }

  function handleViewDelivery(vehicle) {
    navigate(`/delivery/${vehicle.id}`)
  }

  function handleViewHistory(vehicle) {
    navigate(`/history/${vehicle.id}`)
  }

  function handleAddVehicle() {
    const newVehicle = {
      id: 'v' + Date.now(),
      plate: '新车辆',
      model: '待录入',
      carrier: '待录入',
      standardPressure: 8.5,
      status: 'pending'
    }
    const newVehicles = [...vehicles, newVehicle]
    saveVehicles(newVehicles)
  }

  return (
    <div>
      <div className="page-header">
        <h2>🚚 待检车辆清单</h2>
        <button className="btn btn-primary" onClick={handleAddVehicle}>
          + 新增车辆
        </button>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索车牌号、车型、承运商..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <div className="filter-tabs">
            {filterOptions.map(opt => (
              <div
                key={opt.key}
                className={`filter-tab ${activeFilter === opt.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(opt.key)}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>

        {filteredVehicles.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <div className="text">暂无符合条件的车辆</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>车牌号</th>
                <th>车型</th>
                <th>承运商</th>
                <th>标准胎压</th>
                <th>状态</th>
                <th>历史交车单</th>
                <th>最近检查</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map(vehicle => {
                const inspection = getInspectionInfo(vehicle.id)
                const lastOrder = getLastDeliveryOrder(vehicle.id)
                const orderCount = getDeliveryOrderCount(vehicle.id)
                const statusInfo = statusMap[vehicle.status] || statusMap.pending
                return (
                  <tr key={vehicle.id}>
                    <td style={{ fontWeight: 600, fontSize: '15px' }}>{vehicle.plate}</td>
                    <td>{vehicle.model}</td>
                    <td>{vehicle.carrier}</td>
                    <td style={{ textAlign: 'center' }}>{vehicle.standardPressure} Bar</td>
                    <td>
                      <span className={`status-tag ${statusInfo.className}`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td>
                      {orderCount > 0 ? (
                        <span
                          onClick={() => handleViewHistory(vehicle)}
                          style={{ color: '#1890ff', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          共 {orderCount} 条（{lastOrder?.createdAtStr?.slice(0, 10) || ''}）
                        </span>
                      ) : (
                        <span style={{ color: '#bfbfbf' }}>无</span>
                      )}
                    </td>
                    <td style={{ color: '#8c8c8c', fontSize: '13px' }}>
                      {inspection ? inspection.startTime : '未检查'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-sm"
                        style={{ marginRight: '6px' }}
                        onClick={() => handleViewHistory(vehicle)}
                        title="查看历史记录"
                      >
                        📜 历史
                      </button>
                      {vehicle.status === 'completed' ? (
                        <>
                          <button
                            className="btn btn-sm btn-success"
                            style={{ marginRight: '6px' }}
                            onClick={() => handleViewDelivery(vehicle)}
                          >
                            查看交车单
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={() => handleStartInspection(vehicle)}
                          >
                            复检
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleStartInspection(vehicle)}
                        >
                          {vehicle.status === 'inspecting' ? '继续检查' : '开始检查'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-title">📊 今日检查统计</div>
        <div style={{ display: 'flex', gap: '40px', padding: '10px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1890ff' }}>
              {vehicles.filter(v => v.status === 'pending').length}
            </div>
            <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '4px' }}>待检查</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#fa8c16' }}>
              {vehicles.filter(v => v.status === 'inspecting').length}
            </div>
            <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '4px' }}>检查中</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#52c41a' }}>
              {vehicles.filter(v => v.status === 'completed').length}
            </div>
            <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '4px' }}>已完成</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#722ed1' }}>
              {deliveryOrders.length}
            </div>
            <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '4px' }}>累计交车单</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#262626' }}>
              {vehicles.length}
            </div>
            <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '4px' }}>总计车辆</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VehicleList
