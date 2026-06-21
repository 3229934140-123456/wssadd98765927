import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  TIRE_POSITIONS,
  isValidNumber,
  displayValue,
  buildTrendData
} from '../utils.js'

function InspectionHistory({ getVehicleById, getDeliveryOrdersByVehicleId }) {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const vehicle = getVehicleById(vehicleId)
  const orders = getDeliveryOrdersByVehicleId(vehicleId)
  const [expandedIndex, setExpandedIndex] = useState(0)
  const [trendTab, setTrendTab] = useState('tire')

  const trendData = useMemo(() => buildTrendData(orders), [orders])

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

  function handleBack() { navigate('/') }
  function handleNewInspection() { navigate(`/inspection/${vehicleId}`) }
  function handleViewOrder(orderId) { navigate(`/archive/view/${orderId}`) }

  if (!vehicle) { return <div>车辆不存在</div> }

  const compressorMap = { normal: '启停正常', frequent: '启停频繁', not_start: '无法启动' }
  const riskLevelMap = {
    high: { label: '高风险', color: '#cf1322', bg: '#fff1f0' },
    medium: { label: '中风险', color: '#d48806', bg: '#fffbe6' },
    low: { label: '低风险', color: '#389e0d', bg: '#f6ffed' }
  }

  const labels = trendData.coldTrend.labels
  const maxOrders = Math.min(orders.length, 10)

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
          <div><span style={{ color: '#8c8c8c', fontSize: '13px' }}>车牌号：</span><span style={{ fontWeight: 600, fontSize: '15px' }}>{vehicle.plate}</span></div>
          <div><span style={{ color: '#8c8c8c', fontSize: '13px' }}>车型：</span><span>{vehicle.model}</span></div>
          <div><span style={{ color: '#8c8c8c', fontSize: '13px' }}>承运商：</span><span>{vehicle.carrier}</span></div>
          <div><span style={{ color: '#8c8c8c', fontSize: '13px' }}>标准胎压：</span><span>{vehicle.standardPressure} Bar</span></div>
          <div><span style={{ color: '#8c8c8c', fontSize: '13px' }}>历史交车单数：</span><span style={{ color: '#1890ff', fontWeight: 600 }}>{orders.length} 次</span></div>
        </div>
      </div>

      {repeatedIssues && (repeatedIssues.repeatedTire.length > 0 || repeatedIssues.repeatedDrift.length > 0 || repeatedIssues.coldIssues.length >= 2) && (
        <div className="card" style={{ borderLeft: '4px solid #fa8c16' }}>
          <div className="card-title" style={{ color: '#d46b08' }}>⚠ 反复出现问题预警（最近 {orders.length} 次检查）</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {repeatedIssues.repeatedTire.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', color: '#595959', marginBottom: '4px' }}><strong>🔻 反复缺气的轮位：</strong></div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {repeatedIssues.repeatedTire.map(([label, count]) => (
                    <span key={label} style={{ padding: '4px 12px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: '4px', color: '#cf1322', fontSize: '13px' }}>
                      {label} × {count}次
                    </span>
                  ))}
                </div>
              </div>
            )}
            {repeatedIssues.repeatedDrift.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', color: '#595959', marginBottom: '4px' }}><strong>📡 传感器反复漂移的轮位：</strong></div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {repeatedIssues.repeatedDrift.map(([label, count]) => (
                    <span key={label} style={{ padding: '4px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '4px', color: '#d48806', fontSize: '13px' }}>
                      {label} × {count}次
                    </span>
                  ))}
                </div>
              </div>
            )}
            {repeatedIssues.coldIssues.length >= 2 && (
              <div>
                <div style={{ fontSize: '13px', color: '#595959', marginBottom: '4px' }}><strong>❄️ 冷机问题：</strong></div>
                <div style={{ fontSize: '13px', color: '#cf1322' }}>
                  共出现 {repeatedIssues.coldIssues.length} 次异常（{[...new Set(repeatedIssues.coldIssues)].join('、')}），建议排查冷机系统
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {orders.length >= 2 && (
        <div className="card">
          <div className="card-title">📈 趋势对比分析</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div
              className={`filter-tab ${trendTab === 'tire' ? 'active' : ''}`}
              onClick={() => setTrendTab('tire')}
              style={{ padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            >
              🛞 轮位胎压趋势
            </div>
            <div
              className={`filter-tab ${trendTab === 'cold' ? 'active' : ''}`}
              onClick={() => setTrendTab('cold')}
              style={{ padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            >
              ❄️ 冷机参数趋势
            </div>
          </div>

          {trendTab === 'tire' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {Object.entries(trendData.tireTrend).map(([key, info]) => (
                  <TireTrendChart
                    key={key}
                    info={info}
                    standardPressure={vehicle.standardPressure}
                    labels={labels}
                    orderCount={maxOrders}
                  />
                ))}
              </div>
            </div>
          )}

          {trendTab === 'cold' && (
            <ColdTrendChart coldTrend={trendData.coldTrend} orderCount={maxOrders} />
          )}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">📜</div>
            <div className="text">暂无历史检查记录</div>
            <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={handleNewInspection}>
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
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '8px 0', flexWrap: 'wrap', gap: '12px' }}
                onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '15px' }}>
                    {isExpanded ? '▼' : '▶'} 第 {orders.length - idx} 次检查
                  </strong>
                  <span style={{ color: '#8c8c8c', fontSize: '13px', fontFamily: 'monospace' }}>单号：{order.orderNo}</span>
                  {order.linkOrderNo && (
                    <span style={{ padding: '2px 8px', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: '4px', color: '#d46b08', fontSize: '12px' }}>
                      ↩ 复检（关联 {order.linkOrderNo}）
                    </span>
                  )}
                  <span style={{ color: '#8c8c8c', fontSize: '13px' }}>时间：{order.createdAtStr}</span>
                  <span style={{ color: '#8c8c8c', fontSize: '13px' }}>检验员：{order.inspector || '-'}</span>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: riskInfo.bg, color: riskInfo.color, border: `1px solid ${riskInfo.color}33` }}>
                    {riskInfo.label}
                  </span>
                  <span className={`status-tag ${order.finalResult?.approved ? 'status-completed' : 'status-pending'}`} style={{ fontWeight: 600 }}>
                    {order.finalResult?.approved ? '✓ 允许出车' : '✗ 暂不放行'}
                  </span>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleViewOrder(order.id) }}
                >
                  📄 完整归档
                </button>
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
                              <div style={{ color: isLow ? '#cf1322' : '#333', fontWeight: isLow ? 600 : 400 }}>
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
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{coldData.compressorStatus ? compressorMap[coldData.compressorStatus] : '-'}</div>
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
                    <div style={{ marginTop: '16px', padding: '12px', background: '#e6fffb', border: '1px solid #87e8de', borderRadius: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#08979c', marginBottom: '4px' }}>🛠 维修建议</div>
                      <div style={{ fontSize: '13px', color: '#262626', lineHeight: 1.7 }}>{order.repairAdvice}</div>
                    </div>
                  )}

                  {order.finalResult && (
                    <div style={{ marginTop: '16px', padding: '14px', background: order.finalResult.approved ? '#f6ffed' : '#fff1f0',
                      border: `1px solid ${order.finalResult.approved ? '#b7eb8f' : '#ffa39e'}`, borderRadius: '6px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700,
                        color: order.finalResult.approved ? '#389e0d' : '#cf1322', marginBottom: '6px' }}>
                        {order.finalResult.approved ? '✓ 允许装货出车' : '✗ 暂不允许出车'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#595959' }}>{order.finalResult.reason}</div>
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

function TireTrendChart({ info, standardPressure, labels, orderCount }) {
  const pressures = info.pressures.slice(-orderCount).reverse()
  const xLabels = labels.slice(-orderCount).reverse()
  const count = pressures.length
  if (count < 2) {
    return (
      <div style={{ background: '#fafafa', padding: '20px', borderRadius: '6px', textAlign: 'center', color: '#8c8c8c', fontSize: '12px' }}>
        <div style={{ fontWeight: 600, color: '#262626', marginBottom: '6px', fontSize: '13px' }}>{info.label}</div>
        数据不足2次，无法生成趋势
      </div>
    )
  }

  const min = Math.min(standardPressure - 2, ...pressures.filter(p => p !== null))
  const max = Math.max(standardPressure + 1, ...pressures.filter(p => p !== null))
  const range = max - min || 1
  const width = 280
  const height = 120
  const padding = { left: 36, right: 12, top: 16, bottom: 28 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = pressures.map((p, i) => {
    if (p === null) return null
    const x = padding.left + (i / (count - 1)) * chartW
    const y = padding.top + ((max - p) / range) * chartH
    return { x, y, value: p }
  })

  const standardY = padding.top + ((max - standardPressure) / range) * chartH
  const pathD = points.filter(Boolean).map((p, i, arr) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  const barColors = points.map((p, i) => {
    if (!p) return '#e0e0e0'
    if (p.value < standardPressure - 0.5) return '#ff4d4f'
    if (p.value > standardPressure + 0.3) return '#faad14'
    return '#52c41a'
  })

  return (
    <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#262626' }}>{info.label}</div>
        <div style={{ fontSize: '11px', display: 'flex', gap: '8px' }}>
          <span style={{ color: '#cf1322' }}>缺气 {info.lowCount}</span>
          <span style={{ color: '#d48806' }}>漂移 {info.driftCount}</span>
        </div>
      </div>

      <svg width={width} height={height} style={{ display: 'block' }}>
        <line x1={padding.left} y1={standardY} x2={padding.left + chartW} y2={standardY}
          stroke="#1890ff" strokeWidth="1" strokeDasharray="3,3" />
        <text x={padding.left + chartW} y={standardY - 3} textAnchor="end"
          fontSize="9" fill="#1890ff">标准 {standardPressure}</text>

        {points.filter(Boolean).length >= 2 && (
          <path d={pathD} fill="none" stroke="#1890ff" strokeWidth="2" />
        )}

        {points.map((p, i) => p && (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={barColors[i]} stroke="#fff" strokeWidth="1" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fill="#595959">{p.value.toFixed(1)}</text>
          </g>
        ))}

        {xLabels.map((lbl, i) => {
          const x = padding.left + (i / (count - 1)) * chartW
          return (
            <text key={i} x={x} y={height - 6} textAnchor="middle" fontSize="9" fill="#8c8c8c">
              {lbl.split('\n')[0] || '第' + (i + 1) + '次'}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function ColdTrendChart({ coldTrend, orderCount }) {
  const labels = coldTrend.labels.slice(-orderCount).reverse()
  const returnTemps = coldTrend.returnTemps.slice(-orderCount).reverse()
  const setTemps = coldTrend.setTemps.slice(-orderCount).reverse()
  const loadBefores = coldTrend.loadBefores.slice(-orderCount).reverse()
  const loadAfters = coldTrend.loadAfters.slice(-orderCount).reverse()
  const compressors = coldTrend.compressorStatuses.slice(-orderCount).reverse()
  const count = labels.length

  if (count < 2) {
    return (
      <div style={{ background: '#fafafa', padding: '40px', borderRadius: '6px', textAlign: 'center', color: '#8c8c8c' }}>
        数据不足2次，无法生成冷机趋势
      </div>
    )
  }

  const allTemps = [...returnTemps, ...setTemps].filter(v => !isNaN(v))
  const tempMin = allTemps.length > 0 ? Math.min(...allTemps) - 2 : -25
  const tempMax = allTemps.length > 0 ? Math.max(...allTemps) + 2 : 5
  const tempRange = tempMax - tempMin || 1

  const loadMin = 0
  const loadMax = 100

  const width = 560
  const height = 200
  const padding = { left: 48, right: 20, top: 24, bottom: 36 }
  const cw = width - padding.left - padding.right
  const ch = (height - padding.top - padding.bottom) / 2 - 8

  function tempY(v) {
    return padding.top + ((tempMax - v) / tempRange) * ch
  }
  function loadY(v) {
    return padding.top + ch + 16 + ((loadMax - v) / (loadMax - loadMin)) * ch
  }
  function pointX(i) {
    return padding.left + (count <= 1 ? cw / 2 : (i / (count - 1)) * cw)
  }

  const tempPathReturn = returnTemps.map((v, i) => isNaN(v) ? null : `${i === 0 ? 'M' : 'L'}${pointX(i)},${tempY(v)}`).filter(Boolean).join(' ')
  const tempPathSet = setTemps.map((v, i) => isNaN(v) ? null : `${i === 0 ? 'M' : 'L'}${pointX(i)},${tempY(v)}`).filter(Boolean).join(' ')
  const loadPathBefore = loadBefores.map((v, i) => isNaN(v) ? null : `${i === 0 ? 'M' : 'L'}${pointX(i)},${loadY(v)}`).filter(Boolean).join(' ')
  const loadPathAfter = loadAfters.map((v, i) => isNaN(v) ? null : `${i === 0 ? 'M' : 'L'}${pointX(i)},${loadY(v)}`).filter(Boolean).join(' ')

  const compMap = { normal: { label: '正常', color: '#52c41a' }, frequent: { label: '频繁', color: '#faad14' }, not_start: { label: '无法启动', color: '#ff4d4f' } }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        {['回风温度', '设定温度', '补气前负载', '补气后负载', '压缩机异常'].map((lbl, idx) => {
          let countV = 0
          if (idx === 0) countV = returnTemps.filter(v => !isNaN(v)).length
          else if (idx === 1) countV = setTemps.filter(v => !isNaN(v)).length
          else if (idx === 2) countV = loadBefores.filter(v => !isNaN(v)).length
          else if (idx === 3) countV = loadAfters.filter(v => !isNaN(v)).length
          else countV = compressors.filter(c => c && c !== 'normal').length
          const abnormal = idx === 2 || idx === 3
            ? Math.abs(loadBefores[i] - loadAfters[i]) > 10
            : false
          return (
            <div key={lbl} style={{ padding: '10px', background: '#fafafa', borderRadius: '4px', fontSize: '12px' }}>
              <div style={{ color: '#8c8c8c' }}>{lbl}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: idx === 4 ? '#fa8c16' : '#262626' }}>
                {idx < 2 ? `${countV} 次有效` : idx === 4 ? `${countV} 次` : `${countV} 次有效`}
              </div>
            </div>
          )
        })}
      </div>

      <svg width={width} height={height + 50} style={{ display: 'block', margin: '0 auto' }}>
        <text x={padding.left} y={14} fontSize="11" fill="#595959">温度（°C）</text>
        <line x1={padding.left} y1={padding.top} x2={padding.left + cw} y2={padding.top} stroke="#f0f0f0" />
        <line x1={padding.left} y1={padding.top + ch} x2={padding.left + cw} y2={padding.top + ch} stroke="#f0f0f0" />
        {[tempMin, (tempMin + tempMax) / 2, tempMax].map((v, i) => (
          <text key={i} x={padding.left - 4} y={tempY(v) + 3} textAnchor="end" fontSize="9" fill="#8c8c8c">{v.toFixed(0)}</text>
        ))}
        <path d={tempPathReturn} fill="none" stroke="#1890ff" strokeWidth="2" />
        <path d={tempPathSet} fill="none" stroke="#eb2f96" strokeWidth="2" strokeDasharray="4,2" />
        {returnTemps.map((v, i) => !isNaN(v) && <circle key={'r' + i} cx={pointX(i)} cy={tempY(v)} r="3.5" fill="#1890ff" />)}
        {setTemps.map((v, i) => !isNaN(v) && <circle key={'s' + i} cx={pointX(i)} cy={tempY(v)} r="3.5" fill="#eb2f96" />)}

        <line x1={0} y1={padding.top + ch + 8} x2={width} y2={padding.top + ch + 8} stroke="#e0e0e0" />

        <text x={padding.left} y={padding.top + ch + 24} fontSize="11" fill="#595959">负载（%）</text>
        <line x1={padding.left} y1={loadY(50)} x2={padding.left + cw} y2={loadY(50)} stroke="#f0f0f0" />
        <line x1={padding.left} y1={loadY(0)} x2={padding.left + cw} y2={loadY(0)} stroke="#d9d9d9" />
        {[0, 50, 100].map((v, i) => (
          <text key={i} x={padding.left - 4} y={loadY(v) + 3} textAnchor="end" fontSize="9" fill="#8c8c8c">{v}</text>
        ))}
        <path d={loadPathBefore} fill="none" stroke="#fa8c16" strokeWidth="2" />
        <path d={loadPathAfter} fill="none" stroke="#52c41a" strokeWidth="2" />
        {loadBefores.map((v, i) => !isNaN(v) && <circle key={'lb' + i} cx={pointX(i)} cy={loadY(v)} r="3.5" fill="#fa8c16" />)}
        {loadAfters.map((v, i) => !isNaN(v) && <circle key={'la' + i} cx={pointX(i)} cy={loadY(v)} r="3.5" fill="#52c41a" />)}

        {labels.map((lbl, i) => (
          <g key={i}>
            <text x={pointX(i)} y={height + 18} textAnchor="middle" fontSize="9" fill="#8c8c8c">
              {(lbl || '').split('\n')[0] || '第' + (i + 1) + '次'}
            </text>
            {compressors[i] && compressors[i] !== 'normal' && (
              <text x={pointX(i)} y={height + 34} textAnchor="middle" fontSize="9" fill={compMap[compressors[i]]?.color || '#8c8c8c'}>
                ⚠ {compMap[compressors[i]]?.label || compressors[i]}
              </text>
            )}
          </g>
        ))}

        <g>
          <circle cx={padding.left + 4} cy={height + 44} r="3" fill="#1890ff" /><text x={padding.left + 12} y={height + 48} fontSize="9" fill="#595959">回风温度</text>
          <circle cx={padding.left + 90} cy={height + 44} r="3" fill="#eb2f96" /><text x={padding.left + 98} y={height + 48} fontSize="9" fill="#595959">设定温度</text>
          <circle cx={padding.left + 180} cy={height + 44} r="3" fill="#fa8c16" /><text x={padding.left + 188} y={height + 48} fontSize="9" fill="#595959">补气前负载</text>
          <circle cx={padding.left + 280} cy={height + 44} r="3" fill="#52c41a" /><text x={padding.left + 288} y={height + 48} fontSize="9" fill="#595959">补气后负载</text>
        </g>
      </svg>
    </div>
  )
}

export default InspectionHistory
