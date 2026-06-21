import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  TIRE_POSITIONS,
  displayValue
} from '../utils.js'

function DeliveryArchive({ vehicles, deliveryOrders, getVehicleById, getDeliveryOrderById }) {
  const { orderId } = useParams()
  const navigate = useNavigate()

  const [searchPlate, setSearchPlate] = useState('')
  const [filterApproved, setFilterApproved] = useState('all')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')

  const viewingOrder = orderId ? getDeliveryOrderById(orderId) : null

  const filtered = useMemo(() => {
    return deliveryOrders
      .filter(o => {
        const plate = o.plate || ''
        if (searchPlate && !plate.includes(searchPlate)) return false
        if (filterApproved !== 'all') {
          const approved = o.finalResult?.approved
          if (filterApproved === 'approved' && !approved) return false
          if (filterApproved === 'rejected' && approved !== false) return false
        }
        if (filterDateStart && o.createdAtStr) {
          if (o.createdAtStr.slice(0, 10) < filterDateStart) return false
        }
        if (filterDateEnd && o.createdAtStr) {
          if (o.createdAtStr.slice(0, 10) > filterDateEnd) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [deliveryOrders, searchPlate, filterApproved, filterDateStart, filterDateEnd])

  function handleBack() {
    if (viewingOrder) {
      navigate('/archive')
    } else {
      navigate('/')
    }
  }

  function handleView(order) {
    navigate(`/archive/view/${order.id}`)
  }

  if (viewingOrder) {
    return <FullOrderView order={viewingOrder} onBack={handleBack} />
  }

  return (
    <div>
      <div className="page-header">
        <h2>📂 交车单归档</h2>
        <button className="btn" onClick={handleBack}>← 返回车辆列表</button>
      </div>

      <div className="card">
        <div className="card-title">筛选条件</div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div className="form-item" style={{ minWidth: '180px' }}>
            <label>车牌号</label>
            <input
              type="text"
              placeholder="如：京A12345"
              value={searchPlate}
              onChange={e => setSearchPlate(e.target.value)}
            />
          </div>
          <div className="form-item" style={{ minWidth: '150px' }}>
            <label>放行结论</label>
            <select
              value={filterApproved}
              onChange={e => setFilterApproved(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="approved">仅允许出车</option>
              <option value="rejected">仅暂不放行</option>
            </select>
          </div>
          <div className="form-item" style={{ minWidth: '160px' }}>
            <label>开始日期</label>
            <input
              type="date"
              value={filterDateStart}
              onChange={e => setFilterDateStart(e.target.value)}
            />
          </div>
          <div className="form-item" style={{ minWidth: '160px' }}>
            <label>结束日期</label>
            <input
              type="date"
              value={filterDateEnd}
              onChange={e => setFilterDateEnd(e.target.value)}
            />
          </div>
          <div className="form-item" style={{ minWidth: '120px', justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn" onClick={() => {
              setSearchPlate(''); setFilterApproved('all'); setFilterDateStart(''); setFilterDateEnd('')
            }}>清空筛选</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          归档列表（共 {filtered.length} 张）
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📄</div>
            <div className="text">暂无符合条件的交车单</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>单号</th>
                <th>车牌号</th>
                <th>承运商</th>
                <th>检验员</th>
                <th>归档时间</th>
                <th>风险</th>
                <th>放行结论</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const riskColor =
                  o.riskLevel === 'high' ? '#cf1322' :
                  o.riskLevel === 'medium' ? '#d48806' : '#389e0d'
                const riskLabel =
                  o.riskLevel === 'high' ? '高' :
                  o.riskLevel === 'medium' ? '中' : '低'
                return (
                  <tr key={o.id}>
                    <td style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#1890ff'
                    }}>{o.orderNo}</td>
                    <td style={{ fontWeight: 600 }}>{o.plate}</td>
                    <td>{o.carrier || '-'}</td>
                    <td>{o.inspector || '-'}</td>
                    <td style={{ color: '#8c8c8c', fontSize: '13px' }}>
                      {o.createdAtStr || '-'}
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        background: o.riskLevel === 'high' ? '#fff1f0' :
                          o.riskLevel === 'medium' ? '#fffbe6' : '#f6ffed',
                        color: riskColor
                      }}>
                        {riskLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`status-tag ${o.finalResult?.approved
                        ? 'status-completed' : 'status-pending'}`}>
                        {o.finalResult?.approved ? '✓ 允许出车' : '✗ 暂不放行'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleView(o)}
                      >
                        查看完整
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function FullOrderView({ order, onBack }) {
  const [isPrinting, setIsPrinting] = useState(false)

  if (!order) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="icon">❓</div>
          <div className="text">未找到该交车单</div>
          <button style={{ marginTop: '20px' }} className="btn btn-primary" onClick={onBack}>返回列表</button>
        </div>
      </div>
    )
  }

  const vehicle = {
    plate: order.plate,
    model: order.model,
    carrier: order.carrier,
    standardPressure: order.standardPressure
  }
  const tireData = order.tireData || {}
  const coldData = order.coldMachineData || {}
  const approved = order.finalResult?.approved
  const reason = order.finalResult?.reason

  function handlePrint() {
    setIsPrinting(true)
    setTimeout(() => { window.print(); setIsPrinting(false) }, 300)
  }

  return (
    <div>
      {!isPrinting && (
        <div className="page-header">
          <h2>📋 交车单详情（归档视图）</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn" onClick={onBack}>← 返回列表</button>
            <button className="btn btn-primary" onClick={handlePrint}>🖨 打印</button>
          </div>
        </div>
      )}

      <div className="card delivery-order">
        <div className="order-header">
          <h2>冷藏车出车前检查交车单</h2>
          <div className="order-no">单据编号：{order.orderNo} <span style={{ color: '#52c41a' }}>（已归档）</span></div>
          {order.linkOrderNo && (
            <div style={{ fontSize: '12px', color: '#d46b08', marginTop: '4px' }}>
              ↩ 本单为复检，关联：{order.linkOrderNo}
            </div>
          )}
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
              <span className="value">{vehicle.model || '-'}</span>
            </div>
            <div className="order-info-item">
              <span className="label">承运商</span>
              <span className="value">{vehicle.carrier || '-'}</span>
            </div>
            <div className="order-info-item">
              <span className="label">标准胎压</span>
              <span className="value">{vehicle.standardPressure} Bar</span>
            </div>
            <div className="order-info-item">
              <span className="label">检验员</span>
              <span className="value">{order.inspector || '-'}</span>
            </div>
            <div className="order-info-item">
              <span className="label">归档时间</span>
              <span className="value">{order.createdAtStr || '-'}</span>
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
                const actual = parseFloat(tire.pressure)
                const standard = order.standardPressure
                let statusText = '未记录', level = 'warning'
                if (!isNaN(actual)) {
                  statusText = ''
                  if (actual < standard - 0.5) { statusText += '胎压不足 '; level = 'bad' }
                  else if (actual > standard + 0.3) { statusText += '胎压偏高 '; level = 'warning' }
                  else { statusText += '胎压正常 '; level = 'normal' }
                  if (tire.sensorStatus === 'drift') {
                    statusText += '· 传感器漂移'
                    if (level === 'normal') level = 'warning'
                  }
                }
                const recommend = !isNaN(actual)
                  ? (actual < standard - 0.5 ? standard.toFixed(1) : actual.toFixed(1))
                  : standard.toFixed(1)
                return (
                  <tr key={pos.key}>
                    <td>{pos.label}</td>
                    <td>{displayValue(tire.pressure, 'Bar', '未记录')}</td>
                    <td style={{ color: '#1890ff', fontWeight: 600 }}>{recommend}</td>
                    <td>{tire.sensorStatus === 'drift' ? '读数漂移' : '读数一致'}</td>
                    <td style={{
                      color: level === 'bad' ? '#cf1322' : level === 'warning' ? '#d48806' : '#389e0d'
                    }}>{statusText}</td>
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
              <span className="label">压缩机</span>
              <span className="value">
                {coldData.compressorStatus === 'normal' ? '启停正常' :
                  coldData.compressorStatus === 'frequent' ? '启停频繁' :
                    coldData.compressorStatus === 'not_start' ? '无法启动' : '未记录'}
              </span>
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
              <span className="value">
                {!isNaN(parseFloat(coldData.loadBefore)) && !isNaN(parseFloat(coldData.loadAfter))
                  ? (parseFloat(coldData.loadBefore) - parseFloat(coldData.loadAfter)).toFixed(1) + '%'
                  : '未记录'}
              </span>
            </div>
          </div>

          {order.repairAdvice && (
            <div style={{
              marginTop: '16px', padding: '14px',
              background: '#e6fffb', border: '1px solid #87e8de', borderRadius: '6px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#08979c', marginBottom: '6px' }}>
                🛠 维修建议摘要
              </div>
              <div style={{ fontSize: '13px', color: '#262626', lineHeight: 1.7 }}>
                {order.repairAdvice}
              </div>
            </div>
          )}

          {coldData.remarks && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', color: '#8c8c8c', marginBottom: '6px' }}>备注说明：</div>
              <div style={{ fontSize: '14px', padding: '10px', background: '#fafafa', borderRadius: '4px' }}>
                {coldData.remarks}
              </div>
            </div>
          )}
        </div>

        <div className={`final-result ${approved ? 'approved' : 'rejected'}`}>
          <div className="result-text">
            {approved ? '✓ 允许装货出车' : '✗ 暂不允许出车'}
          </div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>{reason}</div>
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
    </div>
  )
}

export default DeliveryArchive
