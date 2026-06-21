import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  TIRE_POSITIONS,
  isValidNumber,
  validateTireData,
  validateColdMachineData,
  generateRepairAdvice,
  extractProblemItemsFromOrder
} from '../utils.js'

function InspectionWindow({
  getVehicleById,
  getInspectionByVehicleId,
  getLatestDeliveryOrderByVehicleId,
  saveInspections,
  inspections,
  saveVehicles,
  vehicles
}) {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const vehicle = getVehicleById(vehicleId)
  const existingInspection = getInspectionByVehicleId(vehicleId)
  const latestOrder = getLatestDeliveryOrderByVehicleId(vehicleId)

  const [currentStep, setCurrentStep] = useState(1)
  const [inspector, setInspector] = useState('')
  const [tireData, setTireData] = useState({})
  const [coldMachineData, setColdMachineData] = useState(null)
  const [tireValidation, setTireValidation] = useState({ valid: true, missing: [] })
  const [coldValidation, setColdValidation] = useState({ valid: true, missing: [] })
  const [showTireError, setShowTireError] = useState(false)
  const [showColdError, setShowColdError] = useState(false)
  const [problemItems, setProblemItems] = useState(null)

  useEffect(() => {
    if (existingInspection) {
      setInspector(existingInspection.inspector || '')
      const td = existingInspection.tireData || initEmptyTireData()
      setTireData(td)
      const cold = existingInspection.coldMachineData || initEmptyColdData()
      setColdMachineData(cold)
      if (existingInspection.status === 'tire_done') {
        setCurrentStep(2)
      } else if (existingInspection.status === 'cold_done' || existingInspection.status === 'completed') {
        setCurrentStep(2)
      }
    } else {
      setTireData(initEmptyTireData())
      setColdMachineData(initEmptyColdData())
    }
    if (latestOrder) {
      const problems = extractProblemItemsFromOrder(latestOrder)
      if (problems.focusTires.length > 0 || problems.focusColdItems.length > 0) {
        setProblemItems(problems)
      }
    }
  }, [vehicleId, latestOrder])

  useEffect(() => {
    setTireValidation(validateTireData(tireData))
  }, [tireData])

  useEffect(() => {
    setColdValidation(validateColdMachineData(coldMachineData))
  }, [coldMachineData])

  function initEmptyTireData() {
    const data = {}
    TIRE_POSITIONS.forEach(pos => {
      data[pos.key] = { pressure: '', sensorStatus: 'normal' }
    })
    return data
  }

  function initEmptyColdData() {
    return {
      returnTemp: '',
      setTemp: '',
      compressorStatus: '',
      loadBefore: '',
      loadAfter: '',
      remarks: ''
    }
  }

  function handleTirePressureChange(key, value) {
    const val = value === '' ? '' : value
    setTireData(prev => ({
      ...prev,
      [key]: { ...prev[key], pressure: val }
    }))
  }

  function handleSensorStatusChange(key, status) {
    setTireData(prev => ({
      ...prev,
      [key]: { ...prev[key], sensorStatus: status }
    }))
  }

  function handleColdMachineChange(field, value) {
    const val = value === '' ? '' : value
    setColdMachineData(prev => ({
      ...prev,
      [field]: val
    }))
  }

  const repairAdvice = (vehicle && tireData && coldMachineData)
    ? generateRepairAdvice(vehicle, tireData, coldMachineData)
    : null

  async function handleNextStep() {
    if (currentStep === 1) {
      const validation = validateTireData(tireData)
      if (!validation.valid) {
        setTireValidation(validation)
        setShowTireError(true)
        return
      }
      setShowTireError(false)
      await saveTireInspection()
      setCurrentStep(2)
    } else if (currentStep === 2) {
      const validation = validateColdMachineData(coldMachineData)
      if (!validation.valid) {
        setColdValidation(validation)
        setShowColdError(true)
        return
      }
      if (!inspector.trim()) {
        alert('请先填写检验员姓名')
        return
      }
      setShowColdError(false)
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

    const linkedData = problemItems ? {
      ...tireData,
      _linkToOrder: problemItems.prevOrderId,
      _linkOrderNo: problemItems.prevOrderNo
    } : tireData

    if (existingInspection) {
      const updated = inspections.map(i =>
        i.id === existingInspection.id
          ? { ...i, tireData: linkedData, inspector, status: 'tire_done' }
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
        tireData: linkedData,
        coldMachineData: null,
        linkToOrder: problemItems ? problemItems.prevOrderId : null,
        linkOrderNo: problemItems ? problemItems.prevOrderNo : null
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
    const advice = generateRepairAdvice(vehicle, tireData, coldMachineData)
    const coldDataWithAdvice = {
      ...coldMachineData,
      repairAdvice: advice ? advice.adviceText : '',
      riskLevel: advice ? advice.riskLevel : 'low'
    }

    if (existingInspection) {
      const updated = inspections.map(i =>
        i.id === existingInspection.id
          ? {
              ...i,
              tireData,
              coldMachineData: coldDataWithAdvice,
              inspector,
              endTime: timeStr,
              status: 'cold_done',
              linkToOrder: problemItems ? problemItems.prevOrderId : i.linkToOrder,
              linkOrderNo: problemItems ? problemItems.prevOrderNo : i.linkOrderNo
            }
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
        endTime: timeStr,
        status: 'cold_done',
        tireData,
        coldMachineData: coldDataWithAdvice,
        linkToOrder: problemItems ? problemItems.prevOrderId : null,
        linkOrderNo: problemItems ? problemItems.prevOrderNo : null
      }
      await saveInspections([...inspections, newInspection])
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

  const isFocusTire = (key) => problemItems?.focusTires.some(t => t.key === key)
  const focusColdKey = (key) => problemItems?.focusColdItems.some(c => c.key === key)

  function renderTireItems(category) {
    return TIRE_POSITIONS.filter(p => p.category === category).map(pos => {
      const focus = isFocusTire(pos.key)
      const focusInfo = problemItems?.focusTires.find(t => t.key === pos.key)
      return (
        <TireInputItem
          key={pos.key}
          position={pos}
          tireData={tireData[pos.key]}
          standardPressure={vehicle.standardPressure}
          onPressureChange={val => handleTirePressureChange(pos.key, val)}
          onSensorChange={status => handleSensorStatusChange(pos.key, status)}
          hasError={showTireError && tireData[pos.key] && !isValidNumber(tireData[pos.key].pressure)}
          isFocus={focus}
          focusInfo={focusInfo}
        />
      )
    })
  }

  return (
    <div>
      <div className="page-header">
        <h2>🔧 车辆检查{problemItems ? '（复检）' : ''}</h2>
        <button className="btn" onClick={handleBack}>← 返回车辆列表</button>
      </div>

      {problemItems && (
        <div className="card" style={{
          borderLeft: '4px solid #fa8c16',
          background: '#fffbe6'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#d46b08', marginBottom: '10px' }}>
            🔍 本次为复检（关联单号：{problemItems.prevOrderNo}）— 请重点复查以下项目：
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            {problemItems.focusTires.length > 0 && (
              <div>
                <strong>🛞 轮位：</strong>
                {problemItems.focusTires.map(t => (
                  <span key={t.key} style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    margin: '0 4px 4px 0',
                    background: '#fff1f0',
                    border: '1px solid #ffa39e',
                    color: '#cf1322',
                    borderRadius: '4px'
                  }}>
                    {t.label}
                    {t.prevPressure !== null ? ` (上次${t.prevPressure.toFixed(1)}Bar)` : ''}
                    {t.prevDrift ? ' · 漂移' : ''}
                  </span>
                ))}
              </div>
            )}
            {problemItems.focusColdItems.length > 0 && (
              <div>
                <strong>❄️ 冷机：</strong>
                {problemItems.focusColdItems.map(c => (
                  <span key={c.key} style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    margin: '0 4px 4px 0',
                    background: '#fff7e6',
                    border: '1px solid #ffd591',
                    color: '#d46b08',
                    borderRadius: '4px'
                  }}>
                    {c.label}（上次：{c.prevValue}）
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
              placeholder="请输入姓名 *"
              style={{ width: '120px', padding: '4px 8px', border: '1px solid #91d5ff', borderRadius: '4px' }}
            />
          </span>
        </div>
      </div>

      {currentStep === 1 && (
        <div className="card">
          <div className="card-title">🛞 胎压与传感器状态检查</div>

          {showTireError && tireValidation.missing.length > 0 && (
            <div style={{
              background: '#fff1f0',
              border: '1px solid #ffa39e',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ color: '#cf1322', fontWeight: 600, marginBottom: '8px' }}>
                ⚠ 以下必填项未完成，请补充后再进入下一步：
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#cf1322', fontSize: '13px' }}>
                {tireValidation.missing.map((m, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <h3 className="section-title">前桥（2个轮位）</h3>
          <div className="tire-grid">{renderTireItems('前桥')}</div>

          <h3 className="section-title">后桥（4个轮位）</h3>
          <div className="tire-grid">{renderTireItems('后桥')}</div>

          <h3 className="section-title">备胎（1个轮位）</h3>
          <div className="tire-grid" style={{ gridTemplateColumns: '1fr' }}>
            {renderTireItems('备胎')}
          </div>

          <div className="action-bar">
            <div style={{ color: tireValidation.valid ? '#52c41a' : '#ff4d4f', fontSize: '13px' }}>
              {tireValidation.valid
                ? '✓ 胎压数据已填写完整'
                : `⚠ 还有 ${tireValidation.missing.length} 项未完成`}
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

          {showColdError && coldValidation.missing.length > 0 && (
            <div style={{
              background: '#fff1f0',
              border: '1px solid #ffa39e',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ color: '#cf1322', fontWeight: 600, marginBottom: '8px' }}>
                ⚠ 以下必填项未完成，请补充后再生成交车单：
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#cf1322', fontSize: '13px' }}>
                {coldValidation.missing.map((m, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="cold-machine-section">
            <div>
              <h3 className="section-title">温度记录</h3>

              <div className="form-row">
                <div className="form-item">
                  <label>回风温度 (°C) <span style={{ color: '#ff4d4f' }}>*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="如：-18.5"
                    value={coldMachineData?.returnTemp ?? ''}
                    onChange={e => handleColdMachineChange('returnTemp', e.target.value)}
                    style={{
                      borderColor: (showColdError && !isValidNumber(coldMachineData?.returnTemp))
                        || (focusColdKey('temp')) ? '#ff4d4f' : undefined,
                      boxShadow: focusColdKey('temp') ? '0 0 0 2px #ffd66655' : undefined
                    }}
                  />
                </div>
                <div className="form-item">
                  <label>设定温度 (°C) <span style={{ color: '#ff4d4f' }}>*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="如：-20.0"
                    value={coldMachineData?.setTemp ?? ''}
                    onChange={e => handleColdMachineChange('setTemp', e.target.value)}
                    style={{
                      borderColor: showColdError && !isValidNumber(coldMachineData?.setTemp) ? '#ff4d4f' : undefined
                    }}
                  />
                </div>
              </div>

              <h3 className="section-title">
                压缩机启停表现 <span style={{ color: '#ff4d4f', fontSize: '12px' }}>*必须手动点选</span>
                {focusColdKey('compressor') && (
                  <span style={{ fontSize: '12px', color: '#d46b08', marginLeft: '10px' }}>（上次有问题，重点复查）</span>
                )}
              </h3>
              <div className="compressor-status" style={{
                border: showColdError && !coldMachineData?.compressorStatus ? '2px dashed #ff4d4f' : 'none',
                borderRadius: '8px',
                padding: showColdError && !coldMachineData?.compressorStatus ? '8px' : '0'
              }}>
                <div
                  className={`compressor-item ${coldMachineData?.compressorStatus === 'normal' ? 'selected' : ''}`}
                  onClick={() => handleColdMachineChange('compressorStatus', 'normal')}
                  style={{
                    borderColor: focusColdKey('compressor') ? '#fa8c16' : undefined
                  }}
                >
                  <div className="icon">✅</div>
                  <div className="text">启停正常</div>
                </div>
                <div
                  className={`compressor-item ${coldMachineData?.compressorStatus === 'frequent' ? 'selected' : ''}`}
                  onClick={() => handleColdMachineChange('compressorStatus', 'frequent')}
                  style={{
                    borderColor: focusColdKey('compressor') ? '#fa8c16' : undefined
                  }}
                >
                  <div className="icon">⚠️</div>
                  <div className="text">启停频繁</div>
                </div>
                <div
                  className={`compressor-item ${coldMachineData?.compressorStatus === 'not_start' ? 'selected' : ''}`}
                  onClick={() => handleColdMachineChange('compressorStatus', 'not_start')}
                  style={{
                    borderColor: focusColdKey('compressor') ? '#fa8c16' : undefined
                  }}
                >
                  <div className="icon">❌</div>
                  <div className="text">无法启动</div>
                </div>
              </div>
              {showColdError && !coldMachineData?.compressorStatus && (
                <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '6px' }}>
                  ⚠ 请点选压缩机状态
                </div>
              )}
            </div>

            <div>
              <h3 className="section-title">
                怠速负载对比（补气前后）
                <span style={{ color: '#ff4d4f', fontSize: '12px' }}> *必填</span>
                {focusColdKey('load') && (
                  <span style={{ fontSize: '12px', color: '#d46b08', marginLeft: '10px' }}>（上次差值大，重点复查）</span>
                )}
              </h3>
              <div className="load-compare">
                <h4>⚡ 冷机怠速负载（%）</h4>
                <div className="load-inputs">
                  <div className="form-item">
                    <label>补气前负载 <span style={{ color: '#ff4d4f' }}>*</span></label>
                    <input
                      type="number"
                      placeholder="0-100"
                      value={coldMachineData?.loadBefore ?? ''}
                      onChange={e => handleColdMachineChange('loadBefore', e.target.value)}
                      style={{
                        borderColor: (showColdError && !isValidNumber(coldMachineData?.loadBefore))
                          || focusColdKey('load') ? '#ff4d4f' : undefined
                      }}
                    />
                  </div>
                  <div className="form-item">
                    <label>补气后负载 <span style={{ color: '#ff4d4f' }}>*</span></label>
                    <input
                      type="number"
                      placeholder="0-100"
                      value={coldMachineData?.loadAfter ?? ''}
                      onChange={e => handleColdMachineChange('loadAfter', e.target.value)}
                      style={{
                        borderColor: (showColdError && !isValidNumber(coldMachineData?.loadAfter))
                          || focusColdKey('load') ? '#ff4d4f' : undefined
                      }}
                    />
                  </div>
                </div>
                {isValidNumber(coldMachineData?.loadBefore) && isValidNumber(coldMachineData?.loadAfter) && (
                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#d48806' }}>
                    负载差值：{(parseFloat(coldMachineData.loadBefore) - parseFloat(coldMachineData.loadAfter)).toFixed(1)}%
                    {parseFloat(coldMachineData.loadBefore) - parseFloat(coldMachineData.loadAfter) > 10
                      ? '（差值较大，胎压影响明显）'
                      : '（差值在正常范围内）'}
                  </div>
                )}
              </div>

              {repairAdvice && (
                <>
                  <div className={`risk-assessment risk-${repairAdvice.riskLevel}`}>
                    <div className="risk-title">
                      {repairAdvice.riskLevel === 'high' ? '🔴 高风险' : repairAdvice.riskLevel === 'medium' ? '🟡 中风险' : '🟢 低风险'}
                      能耗风险评估
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>
                      低胎压轮位：{repairAdvice.lowTireList.length} 个 |
                      传感器漂移：{repairAdvice.driftTireList.length} 个
                      {repairAdvice.loadDiff !== null ? ` | 负载降幅：${repairAdvice.loadDiff.toFixed(1)}%` : ''}
                    </div>
                  </div>

                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: '#e6fffb',
                    border: '1px solid #87e8de',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#08979c', marginBottom: '8px' }}>
                      🛠 维修建议摘要（补气前后对比）
                    </div>
                    <div style={{ fontSize: '13px', color: '#262626', lineHeight: 1.7 }}>
                      {repairAdvice.adviceText}
                    </div>
                  </div>
                </>
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
            <div style={{ color: coldValidation.valid ? '#52c41a' : '#ff4d4f', fontSize: '13px' }}>
              {coldValidation.valid
                ? '✓ 冷机数据已填写完整'
                : `⚠ 还有 ${coldValidation.missing.length} 项未完成`}
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

function TireInputItem({ position, tireData, standardPressure, onPressureChange, onSensorChange, hasError, isFocus, focusInfo }) {
  if (!tireData) return null

  const pressure = parseFloat(tireData.pressure)
  const hasValue = !isNaN(pressure)
  const isLow = hasValue && pressure < standardPressure - 0.5
  const isNormal = hasValue && pressure >= standardPressure - 0.5 && pressure <= standardPressure + 0.3

  let borderColor = undefined
  if (isFocus) borderColor = '#fa8c16'
  else if (hasError) borderColor = '#ff4d4f'
  else if (isLow) borderColor = '#ffa39e'
  else if (isNormal) borderColor = '#b7eb8f'

  return (
    <div className="tire-item" style={{
      borderColor,
      boxShadow: isFocus ? '0 0 0 3px #ffd66655, 0 2px 12px #fa8c1633' : undefined,
      position: 'relative'
    }}>
      {isFocus && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '10px',
          background: '#fa8c16',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 600
        }}>
          ⚠ 重点复查
        </div>
      )}
      <h4>{position.label}</h4>
      <div className="tire-pressure-input">
        <input
          type="number"
          step="0.1"
          placeholder="实测胎压"
          value={tireData.pressure ?? ''}
          onChange={e => onPressureChange(e.target.value)}
          style={{
            borderColor: hasError ? '#ff4d4f' : undefined
          }}
        />
        <span>Bar</span>
      </div>
      {focusInfo && (
        <div style={{ fontSize: '11px', color: '#d46b08', marginBottom: '6px' }}>
          上次记录：{focusInfo.prevPressure !== null ? `${focusInfo.prevPressure.toFixed(1)} Bar` : '未记'}
          {focusInfo.prevDrift ? ' · 漂移' : ''}
        </div>
      )}
      {hasValue && (
        <div style={{ fontSize: '12px', marginBottom: '10px', color: isLow ? '#cf1322' : '#389e0d' }}>
          {isLow ? '⚠ 低于标准，建议补气' : isNormal ? '✓ 胎压正常' : '胎压偏高'}
        </div>
      )}
      {hasError && (
        <div style={{ fontSize: '12px', marginBottom: '10px', color: '#cf1322' }}>
          ⚠ 必填项
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
