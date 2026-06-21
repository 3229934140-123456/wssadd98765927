import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  TIRE_POSITIONS,
  isValidNumber,
  displayValue
} from '../utils.js'

function InspectionHistory({ getVehicleById, getDeliveryOrdersByVehicleId }) {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const vehicle = getVehicleById(vehicleId)
  const orders = getDeliveryOrdersByVehicleId(vehicleId)
  const [expandedIndex, setExpandedIndex] = useState(0)

  const repeatedIssues = useMemo(() => {
    if (!orders || orders.length < 2) return null
    const tireIssueCount = {}
    const driftCount = {}
    const coldIssues = []

    orders.forEach(order => {
      const tireData = order.tireData || {}
      const standard = order.standardPressure || 8.5
      Object.entries(tireData).forEach(([key, tire]) => {
        const pos = TIRE_POSITIONS.find(p => p.key === key)
        const label = pos ? pos.label : key
        const pressure = parseFloat(tire.pressure)
        if (!isNaN(pressure) && pressure < standard - 0.5) {
          tireIssueCount[label] = (tireIssueCount[label] || 0) + 1
        }
        if (tire.sensorStatus === 'drift') {
          driftCount[label] = (driftCount[label] || 0) + 1
        }
      })
      const cold = order.coldMachineData || {}
      if (cold.compressorStatus === 'frequent') coldIssues.push('启停频繁')
      if (cold.compressorStatus === 'not_start') coldIssues.push('无法启动')
    })

    const repeatedTire = Object.entries(tireIssueCount)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
    const repeatedDrift = Object.entries(driftCount)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])

    return { repeatedTire, repeatedDrift, coldIssues }
  }, [orders])

  function handleBack() {
    navigate('/')
  }

  function handleNewInspection() {
    navigate(`/inspection/${vehicleId}`)
  }

  if (!vehicle) {
    return <div>车辆不存在</div>
  }

  const compressorMap = {
    normal: '启停正常',
    frequent: '启停频繁',
    not_start: '无法启动'
  }

  const riskLevelMap = {
    high: { label: '高风险', color: '#cf1322', bg: '#fff1f0' },
    medium: { label: '中风险', color: '#d48806', bg: '#fffbe6' },
    low: { label: '低风险', color: '#389e0d', bg: '#f6ffed' }
  }

  return (
    <div>
      <div className="page-header">
        <h2>📜 检查历史记录 - {vehicle.plate}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn" onClick={handleBack}>← 返回车辆列表</button>
          <button className="btn btn-primary" onClick={handleNewInspection}>+ 发起新检查</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">🚛 车辆信息</div>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>车牌号：</span>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>{vehicle.plate}</span>
          </div>
          <div>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>车型：</span>
            <span>{vehicle.model}</span>
          </div>
          <div>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>承运商：</span>
            <span>{vehicle.carrier}</span>
          </div>
          <div>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>标准胎压：</span>
            <span>{vehicle.standardPressure} Bar</span>
          </div>
          <div>
            <span style={{ color: '#8c8c8c', fontSize: '13px' }}>历史交车单数：</span>
            <span style={{ color: '#1890ff', fontWeight: 600 }}>{orders.length} 次</span>
          </div>
        </div>
      </div>

      {repeatedIssues && (repeatedIssues.repeatedTire.length > 0 || repeatedIssues.repeatedDrift.length > 0 || repeatedIssues.coldIssues.length >= 2) && (
        <div className="card" style={{ borderLeft: '4px solid #fa8c16' }}>
          <div className="card-title" style={{ color: '#d46b08' }}>⚠ 反复出现问题预警（最近 {orders.length} 次检查）</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {repeatedIssues.repeatedTire.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', color: '#595959', marginBottom: '4px' }}>
                  <strong>🔻 反复缺气的轮位：</strong>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {repeatedIssues.repeatedTire.map(([label, count]) => (
                    <span key={label} style={{
                      padding: '4px 12px',
                      background: '#fff1f0',
                      border: '1px solid #ffa39e',
                      borderRadius: '4px',
                      color: '#cf1322',
                      fontSize: '13px'
                    }}>
                      {label} × {count}次
                    </span>
                  ))}
                </div>
              </div>
            )}
            {repeatedIssues.repeatedDrift.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', color: '#595959', marginBottom: '4px' }}>
                  <strong>📡 传感器反复漂移的轮位：</strong>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {repeatedIssues.repeatedDrift.map(([label, count]) => (
                    <span key={label} style={{
                      padding: '4px 12px',
                      background: '#fffbe6',
                      border: '1px solid #ffe58f',
                      borderRadius: '4px',
                      color: '#d48806',
                      fontSize: '13px'
                    }}>
                      {label} × {count}次
                    </span>
                  ))}
                </div>
              </div>
            )}
            {repeatedIssues.coldIssues.length >= 2 && (
              <div>
                <div style={{ fontSize: '13px', color: '#595959', marginBottom: '4px' }}>
                  <strong>❄️ 冷机问题：</strong>
                </div>
                <div style={{ fontSize: '13px', color: '#cf1322' }}>
                  共出现 {repeatedIssues.coldIssues.length} 次异常（{[...new Set(repeatedIssues.coldIssues)].join('、')}），建议排查冷机系统
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">📜</div>
            <div className="text">暂无历史检查记录</div>
            <button
              className="btn btn-primary"
              style={{ marginTop: '20px' }}
              onClick={handleNewInspection}
            >
              发起第一次出车前检查
            </button>
          </div>
        </div>
      ) : (
        orders.map((order, idx) => {
          const tireData = order.tireData || {}
          const coldData = order.coldMachineData || {}
          const riskInfo = riskLevelMap[order.riskLevel] || riskLevelMap.low
          const isExpanded = expandedIndex === idx
          return (
            <div key={order.id} className="card" style={{ marginBottom: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '8px 0'
                }}
                onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '15px' }}>
                    {isExpanded ? '▼' : '▶'} 第 {orders.length - idx} 次检查
                  </strong>
                  <span style={{ color: '#8c8c8c', fontSize: '13px' }}>
                    单号：{order.orderNo}
                  </span>
                  <span style={{ color: '#8c8c8c', fontSize: '13px' }}>
                    时间：{order.createdAtStr}
                  </span>
                  <span style={{ color: '#8c8c8c', fontSize: '13px' }}>
                    检验员：{order.inspector || '-'}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: riskInfo.bg,
                    color: riskInfo.color,
                    border: `1px solid ${riskInfo.color}33`
                  }}>
                    {riskInfo.label}
                  </span>
                  <span className={`status-tag ${order.finalResult?.approved ? 'status-completed' : 'status-pending'}`}
                    style={{ fontWeight: 600 }}>
                    {order.finalResult?.approved ? '✓ 允许出车' : '✗ 暂不放行'}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                  <h4 style={{ marginBottom: '12px', color: '#262626' }}>🛞 胎压记录</h4>
                  <table style={{ fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        {TIRE_POSITIONS.map(pos => (
                          <th key={pos.key} style={{ padding: '8px', textAlign: 'center' }}>{pos.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {TIRE_POSITIONS.map(pos => {
                          const tire = tireData[pos.key] || {}
                          const hasValue = isValidNumber(tire.pressure)
                          const pressure = parseFloat(tire.pressure)
                          const isLow = hasValue && pressure < (order.standardPressure - 0.5)
                          return (
                            <td key={pos.key} style={{ padding: '8px', textAlign: 'center' }}>
                              <div style={{
                                color: isLow ? '#cf1322' : '#333',
                                fontWeight: isLow ? 600 : 400
                              }}>
                                {displayValue(tire.pressure, 'Bar', '-')}
                              </div>
                              <div style={{ fontSize: '11px', color: tire.sensorStatus === 'drift' ? '#d48806' : '#8c8c8c', marginTop: '2px' }}>
                                {tire.sensorStatus === 'drift' ? '⚠漂移' : '正常'}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>

                  <h4 style={{ margin: '20px 0 12px', color: '#262626' }}>❄️ 冷机记录</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>回风温度</div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{displayValue(coldData.returnTemp, '°C')}</div>
                    </div>
                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>设定温度</div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{displayValue(coldData.setTemp, '°C')}</div>
                    </div>
                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>压缩机</div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>
                        {coldData.compressorStatus ? compressorMap[coldData.compressorStatus] : '-'}
                      </div>
                    </div>
                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>补气前负载</div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{displayValue(coldData.loadBefore, '%')}</div>
                    </div>
                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>补气后负载</div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{displayValue(coldData.loadAfter, '%')}</div>
                    </div>
                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>负载差值</div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>
                        {isValidNumber(coldData.loadBefore) && isValidNumber(coldData.loadAfter)
                          ? (parseFloat(coldData.loadBefore) - parseFloat(coldData.loadAfter)).toFixed(1) + '%'
                          : '-'}
                      </div>
                    </div>
                  </div>

                  {order.repairAdvice && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      background: '#e6fffb',
                      border: '1px solid #87e8de',
                      borderRadius: '6px'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#08979c', marginBottom: '4px' }}>
                        🛠 维修建议
                      </div>
                      <div style={{ fontSize: '13px', color: '#262626', lineHeight: 1.7 }}>
                        {order.repairAdvice}
                      </div>
                    </div>
                  )}

                  {order.finalResult && (
                    <div style={{
                      marginTop: '16px',
                      padding: '14px',
                      background: order.finalResult.approved ? '#f6ffed' : '#fff1f0',
                      border: `1px solid ${order.finalResult.approved ? '#b7eb8f' : '#ffa39e'}`,
                      borderRadius: '6px'
                    }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: order.finalResult.approved ? '#389e0d' : '#cf1322',
                        marginBottom: '6px'
                      }}>
                        {order.finalResult.approved ? '✓ 允许装货出车' : '✗ 暂不允许出车'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#595959' }}>
                        {order.finalResult.reason}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

export default InspectionHistory
