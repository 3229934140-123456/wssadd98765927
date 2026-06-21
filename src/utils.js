const tirePositions = [
  { key: 'frontLeft', label: '前桥左轮', category: '前桥' },
  { key: 'frontRight', label: '前桥右轮', category: '前桥' },
  { key: 'rearLeft1', label: '后桥左轮外', category: '后桥' },
  { key: 'rearLeft2', label: '后桥左轮内', category: '后桥' },
  { key: 'rearRight1', label: '后桥右轮外', category: '后桥' },
  { key: 'rearRight2', label: '后桥右轮内', category: '后桥' },
  { key: 'spare', label: '备胎', category: '备胎' }
]

export const TIRE_POSITIONS = tirePositions

export function isEmptyValue(val) {
  if (val === null || val === undefined) return true
  if (typeof val === 'string' && val.trim() === '') return true
  return false
}

export function isValidNumber(val) {
  if (val === null || val === undefined) return false
  if (typeof val === 'string' && val.trim() === '') return false
  const num = parseFloat(val)
  return !isNaN(num)
}

export function formatNumber(val, decimals = 1) {
  if (!isValidNumber(val)) return null
  return parseFloat(val).toFixed(decimals)
}

export function displayValue(val, unit = '', emptyText = '未记录') {
  if (isValidNumber(val)) {
    return formatNumber(val) + (unit ? ' ' + unit : '')
  }
  return emptyText
}

export function validateTireData(tireData) {
  const missing = []
  if (!tireData) return { valid: false, missing: ['胎压数据未初始化'], details: {} }

  const categories = {
    '前桥': ['frontLeft', 'frontRight'],
    '后桥': ['rearLeft1', 'rearLeft2', 'rearRight1', 'rearRight2'],
    '备胎': ['spare']
  }

  for (const [cat, keys] of Object.entries(categories)) {
    const catMissing = []
    keys.forEach(k => {
      const td = tireData[k]
      if (!td || !isValidNumber(td.pressure)) {
        const pos = tirePositions.find(p => p.key === k)
        catMissing.push(pos ? pos.label : k)
      }
    })
    if (catMissing.length > 0) {
      missing.push(`${cat}：${catMissing.join('、')} 未填写胎压`)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    details: categories
  }
}

export function validateColdMachineData(coldMachineData) {
  const missing = []
  if (!coldMachineData) return { valid: false, missing: ['冷机数据未初始化'] }

  if (!isValidNumber(coldMachineData.returnTemp)) {
    missing.push('回风温度未填写')
  }
  if (!isValidNumber(coldMachineData.setTemp)) {
    missing.push('设定温度未填写')
  }
  if (!coldMachineData.compressorStatus) {
    missing.push('压缩机状态未选择')
  }
  if (!isValidNumber(coldMachineData.loadBefore)) {
    missing.push('补气前负载未填写')
  }
  if (!isValidNumber(coldMachineData.loadAfter)) {
    missing.push('补气后负载未填写')
  }

  return { valid: missing.length === 0, missing }
}

export function generateRepairAdvice(vehicle, tireData, coldMachineData) {
  if (!vehicle || !tireData || !coldMachineData) {
    return null
  }

  const standardPressure = vehicle.standardPressure
  const lowTireList = []
  const driftTireList = []

  Object.entries(tireData).forEach(([key, tire]) => {
    const pressure = parseFloat(tire.pressure)
    const pos = tirePositions.find(p => p.key === key)
    const label = pos ? pos.label : key

    if (!isNaN(pressure) && pressure < standardPressure - 0.5) {
      lowTireList.push(`${label}(${pressure.toFixed(1)}Bar)`)
    }
    if (tire.sensorStatus === 'drift') {
      driftTireList.push(label)
    }
  })

  const loadBefore = parseFloat(coldMachineData.loadBefore)
  const loadAfter = parseFloat(coldMachineData.loadAfter)
  let loadDiff = 0
  let hasLoadData = false
  if (!isNaN(loadBefore) && !isNaN(loadAfter)) {
    loadDiff = loadBefore - loadAfter
    hasLoadData = true
  }

  const parts = []

  if (lowTireList.length > 0) {
    parts.push(`低胎压轮位共 ${lowTireList.length} 个：${lowTireList.join('、')}，建议补气至标准胎压 ${standardPressure.toFixed(1)} Bar`)
  }

  if (driftTireList.length > 0) {
    parts.push(`传感器读数漂移：${driftTireList.join('、')}，建议检查或更换传感器`)
  }

  if (hasLoadData && loadDiff > 10) {
    parts.push(`补气前后冷机负载下降 ${loadDiff.toFixed(1)}%（${loadBefore.toFixed(1)}% → ${loadAfter.toFixed(1)}%），胎压对能耗影响显著，务必保持标准胎压出车`)
  } else if (hasLoadData && loadDiff > 0) {
    parts.push(`补气前后冷机负载下降 ${loadDiff.toFixed(1)}%，在正常范围内`)
  }

  if (coldMachineData.compressorStatus === 'frequent') {
    parts.push('冷机启停频繁，建议排查制冷系统压力是否异常')
  } else if (coldMachineData.compressorStatus === 'not_start') {
    parts.push('冷机无法启动，严禁出车，需立即安排维修')
  }

  if (parts.length === 0) {
    parts.push('胎压、传感器、冷机运行状态均正常，可正常出车')
  }

  let riskLevel = 'low'
  if (lowTireList.length >= 3 || (lowTireList.length >= 2 && loadDiff > 15) || coldMachineData.compressorStatus === 'not_start') {
    riskLevel = 'high'
  } else if (lowTireList.length >= 1 || driftTireList.length >= 2 || (hasLoadData && loadDiff > 10)) {
    riskLevel = 'medium'
  }

  return {
    lowTireList,
    driftTireList,
    loadDiff: hasLoadData ? loadDiff : null,
    loadBefore: hasLoadData ? loadBefore : null,
    loadAfter: hasLoadData ? loadAfter : null,
    adviceText: parts.join('；') + '。',
    riskLevel
  }
}

export function calculateFinalResult(vehicle, tireData, coldMachineData) {
  if (!vehicle || !tireData || !coldMachineData) {
    return { approved: false, reason: '数据不完整' }
  }

  const standardPressure = vehicle.standardPressure
  const issues = []
  const criticalIssues = []

  Object.entries(tireData).forEach(([key, tire]) => {
    const pressure = parseFloat(tire.pressure)
    const pos = tirePositions.find(p => p.key === key)
    const label = pos ? pos.label : key

    if (!isNaN(pressure) && pressure < standardPressure - 0.8) {
      criticalIssues.push(`${label}严重缺气`)
    } else if (!isNaN(pressure) && pressure < standardPressure - 0.5) {
      issues.push(`${label}胎压偏低`)
    }
    if (tire.sensorStatus === 'drift') {
      issues.push(`${label}传感器漂移`)
    }
  })

  if (coldMachineData.compressorStatus === 'not_start') {
    criticalIssues.push('冷机无法启动')
  } else if (coldMachineData.compressorStatus === 'frequent') {
    issues.push('冷机启停频繁')
  }

  const returnTemp = parseFloat(coldMachineData.returnTemp)
  const setTemp = parseFloat(coldMachineData.setTemp)
  if (!isNaN(returnTemp) && !isNaN(setTemp) && returnTemp > setTemp + 3) {
    issues.push('回风温度偏高，制冷效果不佳')
  }

  const loadBefore = parseFloat(coldMachineData.loadBefore)
  const loadAfter = parseFloat(coldMachineData.loadAfter)
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

export function generateOrderNo(vehicleId) {
  const d = new Date()
  const datePart = d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  const suffix = (vehicleId || 'XXXX').slice(-4).toUpperCase()
  const seq = String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0')
  return `JC${datePart}-${seq}-${suffix}`
}
