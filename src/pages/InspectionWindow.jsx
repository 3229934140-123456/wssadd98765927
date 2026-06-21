import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const tirePositions = [
  { key: 'frontLeft', label: '前桥左轮', category: '前桥' },
  { key: 'frontRight', label: '前桥右轮', category: '前桥' },
  { key: 'rearLeft1', label: '后桥左轮外', category: '后桥' },
  { key: 'rearLeft2', label: '后桥左轮内', category: '后桥' },
  { key: 'rearRight1', label: '后桥右轮外', category: '后桥' },
  { key: 'rearRight2', label: '后桥右轮内', category: '后桥' },
  { key: 'spare', label: '备胎', category: '备胎' }
]

function InspectionWindow({
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
  const existingInspection = getInspectionByVehicleId(vehicleId)

  const [currentStep, setCurrentStep] = useState(1)
  const [inspector, setInspector] = useState('')
  const [tireData, setTireData] = useState({})
  const [coldMachineData, setColdMachineData] = useState(null)

  useEffect(() => {
    if (existingInspection) {
      setInspector(existingInspection.inspector || '')
      setTireData(existingInspection.tireData || {})
      setColdMachineData(existingInspection.coldMachineData)
      if (existingInspection.status === 'tire_done') {
        setCurrentStep(2)
      } else if (existingInspection.status === 'cold_done' || existingInspection.status === 'completed') {
        setCurrentStep(2)
      }
    } else {
      initTireData()
      initColdMachineData()
    }
  }, [vehicleId])

  function initTireData() {
    const data = {}
    tirePositions.forEach(pos => {
      data[pos.key] = {
        pressure: '',
        sensorStatus: 'normal'
      }
    })
    setTireData(data)
  }

  function initColdMachineData() {
    setColdMachineData({
      returnTemp: '',
      setTemp: '',
      compressorStatus: 'normal',
      loadBefore: '',
      loadAfter: '',
      remarks: ''
    })
  }

  function handleTirePressureChange(key, value) {
    setTireData(prev => ({
      ...prev,
      [key]: { ...prev[key], pressure: value }
    }))
  }

  function handleSensorStatusChange(key, status) {
    setTireData(prev => ({
      ...prev,
      [key]: { ...prev[key], sensorStatus: status }
    }))
  }

  function handleColdMachineChange(field, value) {
    setColdMachineData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  function calculateRisk() {
    if (!vehicle || !tireData || !coldMachineData) return null

    const standardPressure = vehicle.standardPressure
    let lowTireCount = 0
    let driftCount = 0

    Object.values(tireData).forEach(tire => {
      const pressure = parseFloat(tire.pressure)
      if (!isNaN(pressure) && pressure < standardPressure - 0.5) {
        lowTireCount++
      }
      if (tire.sensorStatus === 'drift') {
        driftCount++
      }
    })

    const loadBefore = parseFloat(coldMachineData.loadBefore)
    const loadAfter = parseFloat(coldMachineData.loadAfter)
    let loadDiff = 0
    if (!isNaN(loadBefore) && !isNaN(loadAfter)) {
      loadDiff = loadBefore - loadAfter
    }

    let riskLevel = 'low'
    let riskDesc = '当前车辆状态良好，无明显能耗风险。'

    if (lowTireCount >= 3 || (lowTireCount >= 2 && loadDiff > 15)) {
      riskLevel = 'high'
      riskDesc = '存在较高运输能耗风险！多个轮胎胎压不足，将导致冷机负载增加，建议立即补气后再出车。'
    } else if (lowTireCount >= 1 || driftCount >= 2 || (loadDiff > 10 && lowTireCount > 0)) {
      riskLevel = 'medium'
      riskDesc = '存在一定能耗风险，部分轮胎胎压偏低或传感器有漂移现象，建议补气后再观察冷机负载情况。'
    }

    return {
      level: riskLevel,
      description: riskDesc,
      lowTireCount,
      driftCount,
      loadDiff: loadDiff.toFixed(1)
    }
  }

  async function handleNextStep() {
    if (currentStep === 1) {
      await saveTireInspection()
      setCurrentStep(2)
    } else if (currentStep === 2) {
      await saveFullInspection()
      navigate(`/delivery/${vehicleId}`)
    }
  }

  async function handlePrevStep() {
    if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  async function saveTireInspection() {
    const now = new Date()
    const timeStr = now.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

    if (existingInspection) {
      const updated = inspections.map(i =>
        i.id === existingInspection.id
          ? { ...i, tireData, inspector, status: 'tire_done' }
          : i
      )
      await saveInspections(updated)
    } else {
      const newInspection = {
        id: 'ins' + Date.now(),
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        inspector,
        startTime: timeStr,
        status: 'tire_done',
        tireData,
        coldMachineData: null
      }
      await saveInspections([...inspections, newInspection])

      const updatedVehicles = vehicles.map(v =>
        v.id === vehicle.id ? { ...v, status: 'inspecting' } : v
      )
      await saveVehicles(updatedVehicles)
    }
  }

  async function saveFullInspection() {
    const now = new Date()
    const timeStr = now.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

    if (existingInspection) {
      const updated = inspections.map(i =>
        i.id === existingInspection.id
          ? { ...i, tireData, coldMachineData, inspector, endTime: timeStr, status: 'cold_done' }
          : i
      )
      await saveInspections(updated)
    }

    const updatedVehicles = vehicles.map(v =>
      v.id === vehicle.id ? { ...v, status: 'completed' } : v
    )
    await saveVehicles(updatedVehicles)
  }

  function handleBack() {
    navigate('/')
  }

  if (!vehicle) {
    return <div>车辆不存在</div>
  }

  const riskAssessment = currentStep === 2 ? calculateRisk() : null

  return (
    <div>
      <div className="page-header">
        <h2>🔧 车辆检查</h2>
        <button className="btn" onClick={handleBack}>← 返回车辆列表</button>
      </div>

      <div className="step-indicator">
        <div className={`step-item ${currentStep >= 1 ? (currentStep > 1 ? 'done' : 'active') : ''}`}>
          <div className="step-number">1</div>
          <div className="step-text">胎压检查</div>
        </div>
        <div className={`step-line ${currentStep > 1 ? 'done' : ''}`}></div>
        <div className={`step-item ${currentStep >= 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-text">冷机联动试车</div>
        </div>
      </div>

      <div className="vehicle-info-bar">
        <div className="vehicle-info-item">
          <span className="label">车牌号</span>
          <span className="value">{vehicle.plate}</span>
        </div>
        <div className="vehicle-info-item">
          <span className="label">车型</span>
          <span className="value">{vehicle.model}</span>
        </div>
        <div className="vehicle-info-item">
          <span className="label">承运商</span>
          <span className="value">{vehicle.carrier}</span>
        </div>
        <div className="vehicle-info-item">
          <span className="label">标准胎压</span>
          <span className="value">{vehicle.standardPressure} Bar</span>
        </div>
        <div className="vehicle-info-item">
          <span className="label">检验员</span>
          <span className="value" style={{ color: '#1890ff' }}>
            <input
              type="text"
              value={inspector}
              onChange={e => setInspector(e.target.value)}
              placeholder="输入姓名"
              style={{ width: '100px', padding: '4px 8px', border: '1px solid #91d5ff', borderRadius: '4px' }}
            />
          </span>
        </div>
      </div>

      {currentStep === 1 && (
        <div className="card">
          <div className="card-title">🛞 胎压与传感器状态检查</div>

          <h3 className="section-title">前桥</h3>
          <div className="tire-grid">
            {tirePositions.filter(p => p.category === '前桥').map(pos => (
              <TireInputItem
                key={pos.key}
                position={pos}
                tireData={tireData[pos.key]}
                standardPressure={vehicle.standardPressure}
                onPressureChange={val => handleTirePressureChange(pos.key, val)}
                onSensorChange={status => handleSensorStatusChange(pos.key, status)}
              />
            ))}
          </div>

          <h3 className="section-title">后桥</h3>
          <div className="tire-grid">
            {tirePositions.filter(p => p.category === '后桥').map(pos => (
              <TireInputItem
                key={pos.key}
                position={pos}
                tireData={tireData[pos.key]}
                standardPressure={vehicle.standardPressure}
                onPressureChange={val => handleTirePressureChange(pos.key, val)}
                onSensorChange={status => handleSensorStatusChange(pos.key, status)}
              />
            ))}
          </div>

          <h3 className="section-title">备胎</h3>
          <div className="tire-grid" style={{ gridTemplateColumns: '1fr' }}>
            {tirePositions.filter(p => p.category === '备胎').map(pos => (
              <TireInputItem
                key={pos.key}
                position={pos}
                tireData={tireData[pos.key]}
                standardPressure={vehicle.standardPressure}
                onPressureChange={val => handleTirePressureChange(pos.key, val)}
                onSensorChange={status => handleSensorStatusChange(pos.key, status)}
              />
            ))}
          </div>

          <div className="action-bar">
            <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
              提示：标准胎压 {vehicle.standardPressure} Bar，低于标准 0.5 Bar 以上建议补气
            </div>
            <div className="action-bar-right">
              <button className="btn" onClick={handleBack}>取消</button>
              <button className="btn btn-primary" onClick={handleNextStep}>
                下一步：冷机试车 →
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="card">
          <div className="card-title">❄️ 冷机联动试车</div>

          <div className="cold-machine-section">
            <div>
              <h3 className="section-title">温度记录</h3>

              <div className="form-row">
                <div className="form-item">
                  <label>回风温度 (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="如：-18.5"
                    value={coldMachineData?.returnTemp || ''}
                    onChange={e => handleColdMachineChange('returnTemp', e.target.value)}
                  />
                </div>
                <div className="form-item">
                  <label>设定温度 (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="如：-20.0"
                    value={coldMachineData?.setTemp || ''}
                    onChange={e => handleColdMachineChange('setTemp', e.target.value)}
                  />
                </div>
              </div>

              <h3 className="section-title">压缩机启停表现</h3>
              <div className="compressor-status">
                <div
                  className={`compressor-item ${coldMachineData?.compressorStatus === 'normal' ? 'selected' : ''}`}
                  onClick={() => handleColdMachineChange('compressorStatus', 'normal')}
                >
                  <div className="icon">✅</div>
                  <div className="text">启停正常</div>
                </div>
                <div
                  className={`compressor-item ${coldMachineData?.compressorStatus === 'frequent' ? 'selected' : ''}`}
                  onClick={() => handleColdMachineChange('compressorStatus', 'frequent')}
                >
                  <div className="icon">⚠️</div>
                  <div className="text">启停频繁</div>
                </div>
                <div
                  className={`compressor-item ${coldMachineData?.compressorStatus === 'not_start' ? 'selected' : ''}`}
                  onClick={() => handleColdMachineChange('compressorStatus', 'not_start')}
                >
                  <div className="icon">❌</div>
                  <div className="text">无法启动</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="section-title">怠速负载对比（补气前后）</h3>
              <div className="load-compare">
                <h4>⚡ 冷机怠速负载（%）</h4>
                <div className="load-inputs">
                  <div className="form-item">
                    <label>补气前负载</label>
                    <input
                      type="number"
                      placeholder="0-100"
                      value={coldMachineData?.loadBefore || ''}
                      onChange={e => handleColdMachineChange('loadBefore', e.target.value)}
                    />
                  </div>
                  <div className="form-item">
                    <label>补气后负载</label>
                    <input
                      type="number"
                      placeholder="0-100"
                      value={coldMachineData?.loadAfter || ''}
                      onChange={e => handleColdMachineChange('loadAfter', e.target.value)}
                    />
                  </div>
                </div>
                {coldMachineData?.loadBefore && coldMachineData?.loadAfter && (
                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#d48806' }}>
                    负载差值：{(parseFloat(coldMachineData.loadBefore) - parseFloat(coldMachineData.loadAfter)).toFixed(1)}%
                    {parseFloat(coldMachineData.loadBefore) - parseFloat(coldMachineData.loadAfter) > 10
                      ? '（差值较大，胎压影响明显）'
                      : '（差值在正常范围内）'}
                  </div>
                )}
              </div>

              {riskAssessment && (
                <div className={`risk-assessment risk-${riskAssessment.level}`}>
                  <div className="risk-title">
                    {riskAssessment.level === 'high' ? '🔴 高风险' : riskAssessment.level === 'medium' ? '🟡 中风险' : '🟢 低风险'}
                    能耗风险评估
                  </div>
                  <div className="risk-desc">{riskAssessment.description}</div>
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    胎压不足轮位数：{riskAssessment.lowTireCount} 个 |
                    传感器漂移：{riskAssessment.driftCount} 个 |
                    负载降幅：{riskAssessment.loadDiff}%
                  </div>
                </div>
              )}
            </div>
          </div>

          <h3 className="section-title">备注说明</h3>
          <textarea
            className="remarks-input"
            placeholder="记录其他观察到的问题或处理措施..."
            value={coldMachineData?.remarks || ''}
            onChange={e => handleColdMachineChange('remarks', e.target.value)}
          ></textarea>

          <div className="action-bar">
            <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
              完成冷机检查后生成交车单
            </div>
            <div className="action-bar-right">
              <button className="btn" onClick={handlePrevStep}>← 上一步</button>
              <button className="btn btn-success btn-lg" onClick={handleNextStep}>
                ✓ 生成交车单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TireInputItem({ position, tireData, standardPressure, onPressureChange, onSensorChange }) {
  if (!tireData) return null

  const pressure = parseFloat(tireData.pressure)
  const isLow = !isNaN(pressure) && pressure < standardPressure - 0.5
  const isNormal = !isNaN(pressure) && pressure >= standardPressure - 0.5 && pressure <= standardPressure + 0.3

  return (
    <div className="tire-item" style={{ borderColor: isLow ? '#ffa39e' : isNormal ? '#b7eb8f' : undefined }}>
      <h4>{position.label}</h4>
      <div className="tire-pressure-input">
        <input
          type="number"
          step="0.1"
          placeholder="实测胎压"
          value={tireData.pressure}
          onChange={e => onPressureChange(e.target.value)}
        />
        <span>Bar</span>
      </div>
      {!isNaN(pressure) && (
        <div style={{ fontSize: '12px', marginBottom: '10px', color: isLow ? '#cf1322' : '#389e0d' }}>
          {isLow ? '⚠ 低于标准，建议补气' : isNormal ? '✓ 胎压正常' : '胎压偏高'}
        </div>
      )}
      <div className="sensor-options">
        <label>
          <input
            type="radio"
            name={`sensor-${position.key}`}
            checked={tireData.sensorStatus === 'normal'}
            onChange={() => onSensorChange('normal')}
          />
          读数一致
        </label>
        <label>
          <input
            type="radio"
            name={`sensor-${position.key}`}
            checked={tireData.sensorStatus === 'drift'}
            onChange={() => onSensorChange('drift')}
          />
          读数漂移
        </label>
      </div>
    </div>
  )
}

export default InspectionWindow
