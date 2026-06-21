import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { store } from '../store.js'
import {
  TIRE_POSITIONS,
  isValidNumber,
  formatNumber,
  displayValue,
  calculateFinalResult,
  generateRepairAdvice,
  generateOrderNo
} from '../utils.js'

function DeliveryOrder({
  getVehicleById,
  getInspectionByVehicleId,
  saveInspections,
  inspections,
  saveVehicles,
  vehicles,
  deliveryOrders,
  saveDeliveryOrders
}) {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const vehicle = getVehicleById(vehicleId)
  const inspection = getInspectionByVehicleId(vehicleId)

  const [savedOrder, setSavedOrder] = useState(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)

  const tireData = inspection?.tireData || {}
  const coldData = inspection?.coldMachineData || {}

  const result = useMemo(() => {
    if (!vehicle || !inspection) return { approved: false, reason: '数据不完整' }
    return calculateFinalResult(vehicle, tireData, coldData)
  }, [vehicle, inspection])

  const repairAdvice = useMemo(() => {
    if (!vehicle || !tireData || !coldData) return null
    return generateRepairAdvice(vehicle, tireData, coldData)
  }, [vehicle, tireData, coldData])

  const orderNo = useMemo(() => generateOrderNo(vehicleId), [vehicleId])

  function getRecommendedPressure(actualPressure, standardPressure) {
    if (!isValidNumber(actualPressure)) return formatNumber(standardPressure)
    const actual = parseFloat(actualPressure)
    if (actual < standardPressure - 0.5) {
      return formatNumber(standardPressure)
    }
    return formatNumber(actual)
  }

  function getTireStatus(actualPressure, standardPressure, sensorStatus) {
    if (!isValidNumber(actualPressure)) {
      return { text: '未检测', level: 'warning' }
    }
    const actual = parseFloat(actualPressure)
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

  async function handleSaveAndConfirm() {
    if (!vehicle || !inspection) return

    const now = new Date()
    const createdAt = now.toISOString()
    const createdAtStr = now.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

    const orderData = {
      id: 'do' + Date.now(),
      orderNo,
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.model,
      carrier: vehicle.carrier,
      standardPressure: vehicle.standardPressure,
      inspector: inspection.inspector,
      startTime: inspection.startTime,
      endTime: inspection.endTime || createdAtStr,
      createdAt,
      createdAtStr,
      tireData: JSON.parse(JSON.stringify(tireData)),
      coldMachineData: JSON.parse(JSON.stringify(coldData)),
      repairAdvice: repairAdvice ? repairAdvice.adviceText : '',
      riskLevel: repairAdvice ? repairAdvice.riskLevel : 'low',
      finalResult: {
        approved: result.approved,
        reason: result.reason
      }
    }

    const newOrders = [...deliveryOrders, orderData]
    await saveDeliveryOrders(newOrders)

    const updatedInspections = inspections.map(i =>
      i.id === inspection.id
        ? { ...i, status: 'completed' }
        : i
    )
    await saveInspections(updatedInspections)

    setSavedOrder(orderData)
    setHasSaved(true)
    alert(`交车单已保存！\n单号：${orderNo}`)
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

  const compressorMap = {
    normal: '启停正常',
    frequent: '启停频繁',
    not_start: '无法启动'
  }

  const loadBeforeVal = parseFloat(coldData.loadBefore)
  const loadAfterVal = parseFloat(coldData.loadAfter)
  const hasLoadData = !isNaN(loadBeforeVal) && !isNaN(loadAfterVal)
  const loadDiff = hasLoadData ? (loadBeforeVal - loadAfterVal).toFixed(1) : null

  const displayOrderNo = savedOrder ? savedOrder.orderNo : orderNo

  return (
    <div>
      {!isPrinting && (
        <div className="page-header">
          <h2>📋 交车单</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn" onClick={handleBackToInspection}>← 返回检查</button>
            <button className="btn btn-primary" onClick={handlePrint}>🖨 打印交车单</button>
            {!hasSaved && (
              <button className="btn btn-success" onClick={handleSaveAndConfirm}>
                💾 保存为正式记录
              </button>
            )}
            {hasSaved && (
              <span style={{
                padding: '8px 12px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                color: '#52c41a',
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                ✓ 已保存
              </span>
            )}
          </div>
        </div>
      )}

      <div className="card delivery-order">
        <div className="order-header">
          <h2>冷藏车出车前检查交车单</h2>
          <div className="order-no">单据编号：{displayOrderNo}{hasSaved && '（已归档）'}</div>
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
              {TIRE_POSITIONS.map(pos => {
                const tire = tireData[pos.key] || {}
                const status = getTireStatus(tire.pressure, vehicle.standardPressure, tire.sensorStatus)
                const recommended = getRecommendedPressure(tire.pressure, vehicle.standardPressure)
                return (
                  <tr key={pos.key}>
                    <td>{pos.label}</td>
                    <td>{displayValue(tire.pressure, 'Bar', '未记录')}</td>
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
              <span className="value">{displayValue(coldData.returnTemp, '°C')}</span>
            </div>
            <div className="order-info-item">
              <span className="label">设定温度</span>
              <span className="value">{displayValue(coldData.setTemp, '°C')}</span>
            </div>
            <div className="order-info-item">
              <span className="label">压缩机状态</span>
              <span className="value">{coldData.compressorStatus ? compressorMap[coldData.compressorStatus] : '未记录'}</span>
            </div>
            <div className="order-info-item">
              <span className="label">补气前负载</span>
              <span className="value">{displayValue(coldData.loadBefore, '%')}</span>
            </div>
            <div className="order-info-item">
              <span className="label">补气后负载</span>
              <span className="value">{displayValue(coldData.loadAfter, '%')}</span>
            </div>
            <div className="order-info-item">
              <span className="label">负载差值</span>
              <span className="value" style={{
                color: loadDiff !== null && parseFloat(loadDiff) > 10 ? '#d48806' : '#333'
              }}>
                {loadDiff !== null ? loadDiff + '%' : '未记录'}
              </span>
            </div>
          </div>

          {repairAdvice && (
            <div style={{
              marginTop: '16px',
              padding: '14px',
              background: '#e6fffb',
              border: '1px solid #87e8de',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#08979c', marginBottom: '6px' }}>
                🛠 维修建议摘要（补气前后对比）
              </div>
              <div style={{ fontSize: '13px', color: '#262626', lineHeight: 1.7 }}>
                {repairAdvice.adviceText}
              </div>
            </div>
          )}

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
          交车单一式两份，维修班组和调度各留存一份 | {hasSaved ? '已归档保存' : '点击"保存为正式记录"完成归档'}
        </div>
      )}
    </div>
  )
}

export default DeliveryOrder
