import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CFormInput, CFormLabel, CFormSelect, CNav,
  CNavItem, CNavLink, CProgress, CProgressBar, CRow, CSpinner, CTable, CTableBody, CTableDataCell,
  CTableHead, CTableHeaderCell, CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilX } from '@coreui/icons'
import branchService from '../../services/branchService'
import areaService from '../../services/areaService'
import employeeService from '../../services/employeeService'
import targetAnalyticsService from '../../services/targetAnalyticsService'
import { Loader } from '../../components'
import { toastError, toastSuccess } from '../../utils/toast'

const PERIOD_OPTIONS = [{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]
const SIDEBAR_WIDTH = 380
const TABLE_TAB = { active: 'active', history: 'history' }
const VIEW_TAB = { branch: 'branch', zone: 'zone', employee: 'employee' }

const extractListFromResponse = (response, keys = []) => {
  const data = response?.data || response
  const nested = data?.data ?? data
  for (const key of keys) {
    if (Array.isArray(nested?.[key])) return nested[key]
    if (Array.isArray(data?.[key])) return data[key]
  }
  if (Array.isArray(nested)) return nested
  if (Array.isArray(data)) return data
  return []
}
const normalizeId = (value) => {
  if (!value) return ''
  if (typeof value === 'object') return String(value._id || value.id || '')
  return String(value)
}
const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-')
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value))
const getPeriodRange = (period) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start = new Date(today)
  let end = new Date(today)
  if (period === 'weekly') start.setDate(today.getDate() - 6)
  else {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    end = new Date(today.getFullYear(), today.getMonth(), Math.min(30, lastDay))
  }
  const toInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { from: toInput(start), to: toInput(end) }
}
const getProgressMeta = (targetAmount, achievedAmount) => {
  const target = Number(targetAmount || 0)
  const achieved = Number(achievedAmount || 0)
  if (target <= 0) return { actualPercent: 0, displayPercent: 0, color: 'danger' }
  const actualPercent = (achieved / target) * 100
  const displayPercent = clamp(actualPercent)
  if (actualPercent < 50) return { actualPercent, displayPercent, color: 'danger' }
  if (actualPercent < 80) return { actualPercent, displayPercent, color: 'warning' }
  return { actualPercent, displayPercent, color: 'success' }
}

const decodeTokenPayload = (token) => {
  try {
    const parts = String(token || '').split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return JSON.parse(atob(padded))
  } catch (_err) {
    return null
  }
}

const TargetAnalytics = () => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [viewTab, setViewTab] = useState(VIEW_TAB.branch)
  const [tableTab, setTableTab] = useState(TABLE_TAB.active)
  const [summaryPeriod, setSummaryPeriod] = useState('weekly')
  const [summaryBranchId, setSummaryBranchId] = useState('')
  const [summaryZoneId, setSummaryZoneId] = useState('')
  const [summaryEmployeeId, setSummaryEmployeeId] = useState('')
  const [summary, setSummary] = useState({ targetAmount: 0, achievedAmount: 0, remainingAmount: 0 })
  const [activeTargets, setActiveTargets] = useState([])
  const [historyTargets, setHistoryTargets] = useState([])
  const [branches, setBranches] = useState([])
  const [zones, setZones] = useState([])
  const [employees, setEmployees] = useState([])
  const [isHod, setIsHod] = useState(false)
  const [isSalesRole, setIsSalesRole] = useState(false)
  const [currentEmployeeId, setCurrentEmployeeId] = useState('')

  const [formBranchId, setFormBranchId] = useState('')
  const [formZoneId, setFormZoneId] = useState('')
  const [formEmployeeId, setFormEmployeeId] = useState('')
  const [formPeriod, setFormPeriod] = useState('weekly')
  const [formDateFrom, setFormDateFrom] = useState('')
  const [formDateTo, setFormDateTo] = useState('')
  const [formTargetAmount, setFormTargetAmount] = useState('')

  const progressMeta = useMemo(() => getProgressMeta(summary.targetAmount, summary.achievedAmount), [summary])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const payload = decodeTokenPayload(token)
    const tokenRole = String(payload?.role || '').toLowerCase()
    const tokenEmployeeId = String(payload?.id || '')
    const tokenBranchId =
      typeof payload?.branchId === 'object'
        ? payload?.branchId?._id || payload?.branchId?.id
        : payload?.branchId

    const userRaw = localStorage.getItem('migticrm_user')
    const user = userRaw ? JSON.parse(userRaw) : {}
    const fallbackRole = String(user?.role || '').toLowerCase()
    const role = tokenRole || fallbackRole
    const hodMode = role === 'head_of_department'
    const salesMode = role.includes('sales')
    setIsHod(hodMode)
    setIsSalesRole(salesMode)
    if (tokenEmployeeId) setCurrentEmployeeId(tokenEmployeeId)
    if (hodMode && (tokenBranchId || user?.branchId)) {
      const fallbackBranchId = typeof user.branchId === 'object' ? user.branchId._id || user.branchId.id : user.branchId
      const branchId = tokenBranchId || fallbackBranchId
      setSummaryBranchId(String(branchId || ''))
      setFormBranchId(String(branchId || ''))
    }
    if (salesMode && (tokenBranchId || user?.branchId)) {
      const fallbackBranchId = typeof user.branchId === 'object' ? user.branchId._id || user.branchId.id : user.branchId
      const branchId = tokenBranchId || fallbackBranchId
      setSummaryBranchId(String(branchId || ''))
      setFormBranchId(String(branchId || ''))
      setViewTab(VIEW_TAB.employee)
    }
  }, [])

  useEffect(() => {
    const range = getPeriodRange(formPeriod)
    setFormDateFrom(range.from)
    setFormDateTo(range.to)
  }, [formPeriod])

  const loadMasterData = async () => {
    const [branchesRes, zonesRes, employeesRes] = await Promise.all([
      branchService.getAll({ pageNumber: 1, pageSize: 100 }),
      areaService.getAll({ pageNumber: 1, pageSize: 100 }),
      employeeService.getAll({ pageNumber: 1, pageSize: 100 }),
    ])
    const branchList = extractListFromResponse(branchesRes, ['branches']).map((b) => ({ ...b, id: b._id || b.id }))
    const zoneData = zonesRes?.data?.data || zonesRes?.data || zonesRes
    const zoneList = (zoneData?.areas || zoneData || []).map((z) => ({ ...z, id: z._id || z.id }))
    const empList = extractListFromResponse(employeesRes, ['employees']).map((e) => ({ ...e, id: e._id || e.id }))
    setBranches(branchList)
    setZones(zoneList)
    setEmployees(empList)
    if (!summaryBranchId && branchList.length) setSummaryBranchId(String(branchList[0].id))
  }

  const loadTargetLists = async () => {
    const branchId = summaryBranchId || undefined
    if (viewTab === VIEW_TAB.branch) {
      const res = await targetAnalyticsService.getData({ branchId, period: summaryPeriod })
      const data = res?.data?.data || res?.data || {}
      setActiveTargets(data.activeTargets || [])
      setHistoryTargets(data.history || [])
      return
    }
    if (viewTab === VIEW_TAB.zone) {
      const res = await targetAnalyticsService.getZoneData({ branchId, zoneId: summaryZoneId || undefined, period: summaryPeriod })
      const data = res?.data?.data || res?.data || {}
      setActiveTargets(data.activeTargets || [])
      setHistoryTargets(data.history || [])
      return
    }
    const res = await targetAnalyticsService.getEmployeeData({ branchId, employeeId: summaryEmployeeId || undefined, period: summaryPeriod })
    const data = res?.data?.data || res?.data || {}
    setActiveTargets(data.activeTargets || [])
    setHistoryTargets(data.history || [])
  }

  const loadSummary = async () => {
    if (!summaryBranchId) return
    let data = {}
    if (viewTab === VIEW_TAB.branch) {
      const res = await targetAnalyticsService.getSummary({ branchId: summaryBranchId, period: summaryPeriod })
      data = res?.data?.data || res?.data || {}
    } else if (viewTab === VIEW_TAB.zone) {
      if (!summaryZoneId) return
      const res = await targetAnalyticsService.getZoneSummary({ branchId: summaryBranchId, zoneId: summaryZoneId, period: summaryPeriod })
      data = res?.data?.data || res?.data || {}
    } else {
      if (!summaryEmployeeId) return
      const res = await targetAnalyticsService.getEmployeeSummary({ branchId: summaryBranchId, employeeId: summaryEmployeeId, period: summaryPeriod })
      data = res?.data?.data || res?.data || {}
    }
    setSummary({
      targetAmount: Number(data.targetAmount || 0),
      achievedAmount: Number(data.achievedAmount || 0),
      remainingAmount: Number(data.remainingAmount || 0),
    })
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      await loadMasterData()
    } catch (err) {
      toastError(err?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadTargetLists(); loadSummary() }, [viewTab, summaryBranchId, summaryZoneId, summaryEmployeeId, summaryPeriod])

  const zoneOptions = useMemo(
    () => zones.filter((z) => !summaryBranchId || normalizeId(z.branchId) === String(summaryBranchId)),
    [zones, summaryBranchId]
  )
  const employeeOptions = useMemo(
    () => employees.filter((e) => !summaryBranchId || normalizeId(e.branchId) === String(summaryBranchId)),
    [employees, summaryBranchId]
  )

  useEffect(() => {
    if (!isSalesRole || !employees.length) return
    const self =
      employees.find((e) => String(e.id) === String(currentEmployeeId)) ||
      employees.find((e) => String(e._id) === String(currentEmployeeId))
    if (!self) return
    const zoneId = normalizeId(self.zoneId)
    setSummaryEmployeeId(String(self.id || self._id || ''))
    setFormEmployeeId(String(self.id || self._id || ''))
    setSummaryZoneId(zoneId)
    setFormZoneId(zoneId)
  }, [isSalesRole, employees, currentEmployeeId])

  const openAddTargetSidebar = () => {
    const range = getPeriodRange('weekly')
    setFormPeriod('weekly')
    setFormDateFrom(range.from)
    setFormDateTo(range.to)
    setFormTargetAmount('')
    setFormBranchId(summaryBranchId || formBranchId)
    setFormZoneId(summaryZoneId || '')
    setFormEmployeeId(summaryEmployeeId || '')
    setIsSidebarOpen(true)
  }

  const onSave = async () => {
    if (!formBranchId) return toastError('Please select branch')
    if (!formDateFrom || !formDateTo) return toastError('Please select date range')
    if (formTargetAmount === '' || Number(formTargetAmount) < 0) return toastError('Enter valid target amount')
    setSaving(true)
    try {
      if (viewTab === VIEW_TAB.branch) {
        await targetAnalyticsService.upsertTarget({ branchId: formBranchId, period: formPeriod, dateFrom: formDateFrom, dateTo: formDateTo, targetAmount: Number(formTargetAmount) })
      } else if (viewTab === VIEW_TAB.zone) {
        if (!formZoneId) throw new Error('Please select zone')
        await targetAnalyticsService.upsertZoneTarget({ branchId: formBranchId, zoneId: formZoneId, period: formPeriod, dateFrom: formDateFrom, dateTo: formDateTo, targetAmount: Number(formTargetAmount) })
      } else {
        if (!formEmployeeId) throw new Error('Please select employee')
        const emp = employees.find((e) => String(e.id) === String(formEmployeeId))
        await targetAnalyticsService.upsertEmployeeTarget({
          branchId: formBranchId,
          zoneId: emp?.zoneId || null,
          employeeId: formEmployeeId,
          period: formPeriod,
          dateFrom: formDateFrom,
          dateTo: formDateTo,
          targetAmount: Number(formTargetAmount),
        })
      }
      toastSuccess('Target updated successfully')
      setIsSidebarOpen(false)
      await loadTargetLists()
      await loadSummary()
    } catch (err) {
      toastError(err?.message || 'Failed to save target')
    } finally {
      setSaving(false)
    }
  }

  const getPrimaryLabel = () => (viewTab === VIEW_TAB.branch ? 'Branch' : viewTab === VIEW_TAB.zone ? 'Zone' : 'Employee')
  const getPrimaryValue = (row) => {
    if (viewTab === VIEW_TAB.branch) return row?.branchId?.name || row?.branchId?.branchcode || '-'
    if (viewTab === VIEW_TAB.zone) return row?.zoneId?.name || '-'
    return row?.employeeId?.name || '-'
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <strong>Target Analytics</strong>
              <CButton color="primary" onClick={openAddTargetSidebar}>Add Target</CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {loading ? (
              <div className="text-center py-5"><Loader message="Loading target analytics..." /></div>
            ) : (
              <>
                <CNav variant="tabs" className="mb-3">
                  {!isSalesRole && (
                    <CNavItem><CNavLink active={viewTab === VIEW_TAB.branch} onClick={() => setViewTab(VIEW_TAB.branch)}>Branch</CNavLink></CNavItem>
                  )}
                  <CNavItem><CNavLink active={viewTab === VIEW_TAB.zone} onClick={() => setViewTab(VIEW_TAB.zone)}>Zone</CNavLink></CNavItem>
                  <CNavItem><CNavLink active={viewTab === VIEW_TAB.employee} onClick={() => setViewTab(VIEW_TAB.employee)}>Employee</CNavLink></CNavItem>
                </CNav>

                <CRow className="mb-3 g-3 align-items-end">
                  {!isSalesRole && (
                    <CCol md={4}>
                      <CFormLabel className="small text-muted mb-1">Branch</CFormLabel>
                      <CFormSelect value={summaryBranchId} disabled={isHod} onChange={(e) => setSummaryBranchId(e.target.value)}>
                        <option value="">Select branch</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name || b.branchcode || b.id}</option>)}
                      </CFormSelect>
                    </CCol>
                  )}
                  {viewTab === VIEW_TAB.zone && (
                    <CCol md={4}>
                      <CFormLabel className="small text-muted mb-1">Zone</CFormLabel>
                      <CFormSelect value={summaryZoneId} disabled={isSalesRole} onChange={(e) => setSummaryZoneId(e.target.value)}>
                        <option value="">Select zone</option>
                        {zoneOptions.map((z) => <option key={z.id} value={z.id}>{z.name || z.id}</option>)}
                      </CFormSelect>
                    </CCol>
                  )}
                  {viewTab === VIEW_TAB.employee && (
                    <CCol md={4}>
                      <CFormLabel className="small text-muted mb-1">Employee</CFormLabel>
                      <CFormSelect value={summaryEmployeeId} disabled={isSalesRole} onChange={(e) => setSummaryEmployeeId(e.target.value)}>
                        <option value="">Select employee</option>
                        {employeeOptions.map((e) => <option key={e.id} value={e.id}>{e.name || e.email || e.id}</option>)}
                      </CFormSelect>
                    </CCol>
                  )}
                  <CCol md={3}>
                    <CFormLabel className="small text-muted mb-1">Period</CFormLabel>
                    <CFormSelect value={summaryPeriod} onChange={(e) => setSummaryPeriod(e.target.value)}>
                      {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CRow className="g-3 mb-4">
                  <CCol md={4}><CCard><CCardBody><div className="text-muted small">Target</div><div className="fs-5 fw-semibold">{formatAmount(summary.targetAmount)}</div></CCardBody></CCard></CCol>
                  <CCol md={4}><CCard><CCardBody><div className="text-muted small">Achieved</div><div className="fs-5 fw-semibold">{formatAmount(summary.achievedAmount)}</div></CCardBody></CCard></CCol>
                  <CCol md={4}><CCard><CCardBody><div className="text-muted small">Remaining</div><div className="fs-5 fw-semibold">{formatAmount(summary.remainingAmount)}</div></CCardBody></CCard></CCol>
                </CRow>
                <CCard className="mb-4"><CCardBody>
                  <div className="d-flex justify-content-between align-items-center mb-2"><div className="text-muted small">Target Achievement Progress</div><div className="fw-semibold">{Number(progressMeta.actualPercent || 0).toFixed(1)}%</div></div>
                  <CProgress height={14}><CProgressBar value={progressMeta.displayPercent} color={progressMeta.color} /></CProgress>
                </CCardBody></CCard>

                <CNav variant="tabs" className="mb-3">
                  <CNavItem><CNavLink active={tableTab === TABLE_TAB.active} onClick={() => setTableTab(TABLE_TAB.active)}>Active Targets</CNavLink></CNavItem>
                  <CNavItem><CNavLink active={tableTab === TABLE_TAB.history} onClick={() => setTableTab(TABLE_TAB.history)}>History Targets</CNavLink></CNavItem>
                </CNav>

                <CTable hover responsive bordered>
                  <CTableHead><CTableRow>
                    <CTableHeaderCell>{getPrimaryLabel()}</CTableHeaderCell>
                    <CTableHeaderCell>Period</CTableHeaderCell>
                    <CTableHeaderCell>From</CTableHeaderCell>
                    <CTableHeaderCell>To</CTableHeaderCell>
                    <CTableHeaderCell>Target</CTableHeaderCell>
                    {tableTab === TABLE_TAB.history && <CTableHeaderCell>Billing</CTableHeaderCell>}
                  </CTableRow></CTableHead>
                  <CTableBody>
                    {(tableTab === TABLE_TAB.active ? activeTargets : historyTargets).length ? (
                      (tableTab === TABLE_TAB.active ? activeTargets : historyTargets).map((row) => (
                        <CTableRow key={row._id}>
                          <CTableDataCell>{getPrimaryValue(row)}</CTableDataCell>
                          <CTableDataCell>{row.period || '-'}</CTableDataCell>
                          <CTableDataCell>{formatDate(row.dateFrom)}</CTableDataCell>
                          <CTableDataCell>{formatDate(row.dateTo)}</CTableDataCell>
                          <CTableDataCell>{formatAmount(row.targetAmount)}</CTableDataCell>
                          {tableTab === TABLE_TAB.history && <CTableDataCell>{formatAmount(row.actualBillingAmount)}</CTableDataCell>}
                        </CTableRow>
                      ))
                    ) : (
                      <CTableRow><CTableDataCell colSpan={tableTab === TABLE_TAB.history ? 6 : 5} className="text-center">No data found.</CTableDataCell></CTableRow>
                    )}
                  </CTableBody>
                </CTable>
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
      <div style={{ position: 'fixed', top: 0, right: isSidebarOpen ? 0 : -SIDEBAR_WIDTH, width: SIDEBAR_WIDTH, height: '100vh', background: '#fff', borderLeft: '1px solid #dee2e6', boxShadow: '0 0 16px rgba(0,0,0,0.08)', zIndex: 2999, transition: 'right 0.2s ease', padding: 12, display: 'flex', flexDirection: 'column' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Add {viewTab === VIEW_TAB.branch ? 'Branch' : viewTab === VIEW_TAB.zone ? 'Zone' : 'Employee'} Target</h6>
          <CButton color="light" size="sm" className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }} onClick={() => setIsSidebarOpen(false)}><CIcon icon={cilX} size="sm" /></CButton>
        </div>
        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">Branch</CFormLabel>
          <CFormSelect value={formBranchId} disabled={isHod || isSalesRole} onChange={(e) => setFormBranchId(e.target.value)}>
            <option value="">Select branch</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name || b.branchcode || b.id}</option>)}
          </CFormSelect>
        </div>
        {viewTab === VIEW_TAB.zone && (
          <div className="mb-3"><CFormLabel className="small text-muted mb-1">Zone</CFormLabel><CFormSelect value={formZoneId} disabled={isSalesRole} onChange={(e) => setFormZoneId(e.target.value)}><option value="">Select zone</option>{zoneOptions.map((z) => <option key={z.id} value={z.id}>{z.name || z.id}</option>)}</CFormSelect></div>
        )}
        {viewTab === VIEW_TAB.employee && (
          <div className="mb-3"><CFormLabel className="small text-muted mb-1">Employee</CFormLabel><CFormSelect value={formEmployeeId} disabled={isSalesRole} onChange={(e) => setFormEmployeeId(e.target.value)}><option value="">Select employee</option>{employeeOptions.map((e) => <option key={e.id} value={e.id}>{e.name || e.email || e.id}</option>)}</CFormSelect></div>
        )}
        <div className="mb-3"><CFormLabel className="small text-muted mb-1">Period</CFormLabel><CFormSelect value={formPeriod} onChange={(e) => setFormPeriod(e.target.value)}>{PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</CFormSelect></div>
        <div className="mb-3"><CFormLabel className="small text-muted mb-1">From</CFormLabel><CFormInput type="date" value={formDateFrom} max={formDateTo || undefined} onChange={(e) => setFormDateFrom(e.target.value)} /></div>
        <div className="mb-3"><CFormLabel className="small text-muted mb-1">To</CFormLabel><CFormInput type="date" value={formDateTo} min={formDateFrom || undefined} onChange={(e) => setFormDateTo(e.target.value)} /></div>
        <div className="mb-3"><CFormLabel className="small text-muted mb-1">Target Amount</CFormLabel><CFormInput type="number" min={0} value={formTargetAmount} onChange={(e) => setFormTargetAmount(e.target.value)} /></div>
        <div className="mt-auto">
          <CButton color="primary" onClick={onSave} disabled={saving} className="w-100">{saving ? <><CSpinner size="sm" className="me-2" />Saving...</> : 'Save Target'}</CButton>
        </div>
      </div>
    </CRow>
  )
}

export default TargetAnalytics
