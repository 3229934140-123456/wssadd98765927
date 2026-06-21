import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { store } from '../store.js'

const tirePositions = [
  { key: 'frontLeft', label: '前桥左轮', category: '前桥' },
  { key: 'frontRight', label: '前桥右轮', category: '前桥' },
  { key: 'rearLeft1', label: '后桥左轮外', category: '后桥' },
  { key: 'rearLeft2', label: '后桥左轮内', category: '后桥' },
  { key: 'rearRight1', label: '后桥右轮外', category: '后桥' },
  { key: 'rearRight2', label: '后桥右轮内', category: '后桥' },
  { key: 'spare', label: '备胎', category: '备胎' }
]

function DeliveryOrder({
  getVehicleById,
  getInspectionByVehicleId,
  saveInspections,
  inspections,
  saveVehicles,
  vehicles
}) {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const vehicle = getVehicleById(vehicleId)
  const inspection = getInspectionByVehicleId(vehicleId)

  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    const orders = await store.getDeliveryOrders()
    setDeliveryOrders(orders)
  }

  function getRecommendedPressure(actualPressure, standardPressure) {
    const actual = parseFloat(actualPressure)
    if (isNaN(actual)) return standardPressure.toFixed(1)
    if (actual < standardPressure - 0.5) {
      return standardPressure.toFixed(1)
    }
    return actual.toFixed(1)
  }

  function getTireStatus(actualPressure, standardPressure, sensorStatus) {
    const actual = parseFloat(actualPressure)
    if (isNaN(actual)) return { text: '未检测', level: 'normal' }

    let statusText = ''
    let level = 'normal'

    if (actual < standardPressure - 0.5) {
      statusText += '胎压不足 '
      level = 'bad'
    } else if (actual > standardPressure + 0.3) {
      statusText += '胎压偏高 '
      level = 'warning'
    } else {
      statusText += '胎压正常 '
    }

    if (sensorStatus === 'drift') {
      statusText += '· 传感器漂移'
      if (level === 'normal') level = 'warning'
    }

    return { text: statusText.trim(), level }
  }

  function calculateOverallResult() {
    if (!vehicle || !inspection) return { approved: false, reason: '数据不完整' }

    const standardPressure = vehicle.standardPressure
    const tireData = inspection.tireData || {}
    const coldData = inspection.coldMachineData || {}

    let issues = []
    let criticalIssues = []

    Object.entries(tireData).forEach(([key, tire]) => {
      const pressure = parseFloat(tire.pressure)
      if (!isNaN(pressure) && pressure < standardPressure - 0.8) {
        criticalIssues.push(`${tirePositions.find(p => p.key === key)?.label || key}严重缺气`)
      } else if (!isNaN(pressure) && pressure < standardPressure - 0.5) {
        issues.push(`${tirePositions.find(p => p.key === key)?.label || key}胎压偏低`)
      }
      if (tire.sensorStatus === 'drift') {
        issues.push(`${tirePositions.find(p => p.key === key)?.label || key}传感器漂移`)
      }
    })

    if (coldData.compressorStatus === 'not_start') {
      criticalIssues.push('冷机无法启动')
    } else if (coldData.compressorStatus === 'frequent') {
      issues.push('冷机启停频繁')
    }

    const returnTemp = parseFloat(coldData.returnTemp)
    const setTemp = parseFloat(coldData.setTemp)
    if (!isNaN(returnTemp) && !isNaN(setTemp) && returnTemp > setTemp + 3) {
      issues.push('回风温度偏高，制冷效果不佳')
    }

    const loadBefore = parseFloat(coldData.loadBefore)
    const loadAfter = parseFloat(coldData.loadAfter)
    if (!isNaN(loadBefore) && !isNaN(loadAfter) && loadBefore - loadAfter > 15) {
      issues.push('补气前后负载差较大，胎压影响能耗显著')
    }

    const approved = criticalIssues.length === 0 && issues.length <= 2

    let reason = ''
    if (criticalIssues.length > 0) {
      reason = '存在严重问题，禁止出车：' + criticalIssues.join('；')
    } else if (issues.length > 2) {
      reason = '问题较多，建议处理后再出车：' + issues.slice(0, 3).join('；') + '等'
    } else if (issues.length > 0) {
      reason = '基本合格，注意事项：' + issues.join('；')
    } else {
      reason = '各项检查合格，允许装货出车'
    }

    return { approved, reason, issues, criticalIssues }
  }

  function handleBackToInspection() {
    navigate(`/inspection/${vehicleId}`)
  }

  function handleBackToList() {
    navigate('/')
  }

  function handlePrint() {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 300)
  }

  if (!vehicle || !inspection) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="icon">📄</div>
          <div className="text">未找到相关检查记录</div>
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={handleBackToList}>
            返回车辆列表
          </button>
        </div>
      </div>
    )
  }

  const result = calculateOverallResult()
  const tireData = inspection.tireData || {}
  const coldData = inspection.coldMachineData || {}
  const orderNo = 'JC' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + vehicleId.slice(-4).toUpperCase()

  return (
    <div>
      {!isPrinting && (
        <div className="page-header">
          <h2>📋 交车单</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn" onClick={handleBackToInspection}>← 返回检查</button>
            <button className="btn btn-primary" onClick={handlePrint}>🖨 打印交车单</button>
          </div>
        </div>
      )}

      <div className="card delivery-order">
        <div className="order-header">
          <h2>冷藏车出车前检查交车单</h2>
          <div className="order-no">单据编号：{orderNo}</div>
        </div>

        <div className="order-section">
          <h3>一、车辆信息</h3>
          <div className="order-info-grid">
            <div className="order-info-item">
              <span className="label">车牌号</span>
              <span className="value" style={{ fontWeight: 700 }}>{vehicle.plate}</span>
            </div>
            <div className="order-info-item">
              <span className="label">车型</span>
              <span className="value">{vehicle.model}</span>
            </div>
            <div className="order-info-item">
              <span className="label">承运商</span>
              <span className="value">{vehicle.carrier}</span>
            </div>
            <div className="order-info-item">
              <span className="label">标准胎压</span>
              <span className="value">{vehicle.standardPressure} Bar</span>
            </div>
            <div className="order-info-item">
              <span className="label">检验员</span>
              <span className="value">{inspection.inspector || '未填写'}</span>
            </div>
            <div className="order-info-item">
              <span className="label">检查时间</span>
              <span className="value">{inspection.startTime || '-'}</span>
            </div>
          </div>
        </div>

        <div className="order-section">
          <h3>二、胎压检查结果</h3>
          <table className="tire-result-table">
            <thead>
              <tr>
                <th>轮位</th>
                <th>实测胎压 (Bar)</th>
                <th>建议胎压 (Bar)</th>
                <th>传感器状态</th>
                <th>状态评估</th>
              </tr>
            </thead>
            <tbody>
              {tirePositions.map(pos => {
                const tire = tireData[pos.key] || {}
                const status = getTireStatus(tire.pressure, vehicle.standardPressure, tire.sensorStatus)
                const recommended = getRecommendedPressure(tire.pressure, vehicle.standardPressure)
                return (
                  <tr key={pos.key}>
                    <td>{pos.label}</td>
                    <td>{tire.pressure || '-'}</td>
                    <td style={{ color: '#1890ff', fontWeight: 600 }}>{recommended}</td>
                    <td>{tire.sensorStatus === 'drift' ? '读数漂移' : '读数一致'}</td>
                    <td style={{
                      color: status.level === 'bad' ? '#cf1322' : status.level === 'warning' ? '#d48806' : '#389e0d'
                    }}>
                      {status.text}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="order-section">
          <h3>三、冷机观察结果</h3>
          <div className="order-info-grid">
            <div className="order-info-item">
              <span className="label">回风温度</span>
              <span className="value">{coldData.returnTemp ? coldData.returnTemp + ' °C' : '-'}</span>
            </div>
            <div className="order-info-item">
              <span className="label">设定温度</span>
              <span className="value">{coldData.setTemp ? coldData.setTemp + ' °C' : '-'}</span>
            </div>
            <div className="order-info-item">
              <span className="label">压缩机状态</span>
              <span className="value">
                {coldData.compressorStatus === 'normal' ? '启停正常' :
                 coldData.compressorStatus === 'frequent' ? '启停频繁' :
                 coldData.compressorStatus === 'not_start' ? '无法启动' : '-'}
              </span>
            </div>
            <div className="order-info-item">
              <span className="label">补气前负载</span>
              <span className="value">{coldData.loadBefore ? coldData.loadBefore + '%' : '-'}</span>
            </div>
            <div className="order-info-item">
              <span className="label">补气后负载</span>
              <span className="value">{coldData.loadAfter ? coldData.loadAfter + '%' : '-'}</span>
            </div>
            <div className="order-info-item">
              <span className="label">负载差值</span>
              <span className="value" style={{
                color: coldData.loadBefore && coldData.loadAfter &&
                  parseFloat(coldData.loadBefore) - parseFloat(coldData.loadAfter) > 10
                  ? '#d48806' : '#333'
              }}>
                {coldData.loadBefore && coldData.loadAfter
                  ? (parseFloat(coldData.loadBefore) - parseFloat(coldData.loadAfter)).toFixed(1) + '%'
                  : '-'}
              </span>
            </div>
          </div>

          {coldData.remarks && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', color: '#8c8c8c', marginBottom: '6px' }}>备注说明：</div>
              <div style={{ fontSize: '14px', color: '#262626', padding: '10px', background: '#fafafa', borderRadius: '4px' }}>
                {coldData.remarks}
              </div>
            </div>
          )}
        </div>

        <div className={`final-result ${result.approved ? 'approved' : 'rejected'}`}>
          <div className="result-text">
            {result.approved ? '✓ 允许装货出车' : '✗ 暂不允许出车'}
          </div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>{result.reason}</div>
        </div>

        <div className="signature-area">
          <div className="signature-item">
            <div className="signature-line"></div>
            <div style={{ fontSize: '13px', color: '#595959' }}>维修班组签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-line"></div>
            <div style={{ fontSize: '13px', color: '#595959' }}>司机签字</div>
          </div>
          <div className="signature-item">
            <div className="signature-line"></div>
            <div style={{ fontSize: '13px', color: '#595959' }}>调度确认</div>
          </div>
        </div>
      </div>

      {!isPrinting && (
        <div style={{ textAlign: 'center', marginTop: '20px', color: '#8c8c8c', fontSize: '13px' }}>
          交车单一式两份，维修班组和调度各留存一份
        </div>
      )}
    </div>
  )
}

export default DeliveryOrder
