import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CNav,
  CNavItem,
  CNavLink,
  CProgress,
  CProgressBar,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilX } from '@coreui/icons'
import branchService from '../../services/branchService'
import targetAnalyticsService from '../../services/targetAnalyticsService'
import { Loader } from '../../components'
import { toastError, toastSuccess } from '../../utils/toast'

const PERIOD_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const SIDEBAR_WIDTH = 380
const TAB_KEYS = {
  active: 'active',
  history: 'history',
}

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

const getPeriodRange = (period) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start = new Date(today)
  let end = new Date(today)
  if (period === 'weekly') {
    start.setDate(today.getDate() - 6)
  } else {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
    // User requested monthly target till 30th of current month.
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    end = new Date(today.getFullYear(), today.getMonth(), Math.min(30, lastDay))
  }
  const toInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { from: toInput(start), to: toInput(end) }
}

const formatDate = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString()
}

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value))

const getProgressMeta = (targetAmount, achievedAmount) => {
  const target = Number(targetAmount || 0)
  const achieved = Number(achievedAmount || 0)
  if (target <= 0) {
    return {
      actualPercent: 0,
      displayPercent: 0,
      color: 'danger',
      shadeClass: 'bg-danger',
    }
  }

  const actualPercent = (achieved / target) * 100
  const displayPercent = clamp(actualPercent)

  if (actualPercent < 50) {
    return {
      actualPercent,
      displayPercent,
      color: 'danger',
      shadeClass: actualPercent < 25 ? 'bg-danger' : 'bg-danger-subtle',
    }
  }
  if (actualPercent < 80) {
    return {
      actualPercent,
      displayPercent,
      color: 'warning',
      shadeClass: actualPercent < 65 ? 'bg-warning-subtle' : 'bg-warning',
    }
  }
  return {
    actualPercent,
    displayPercent,
    color: 'success',
    shadeClass: actualPercent < 100 ? 'bg-success-subtle' : 'bg-success',
  }
}

const TargetAnalytics = () => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(TAB_KEYS.active)
  const [summaryBranchId, setSummaryBranchId] = useState('')
  const [summaryPeriod, setSummaryPeriod] = useState('weekly')
  const [summary, setSummary] = useState({
    targetAmount: 0,
    achievedAmount: 0,
    remainingAmount: 0,
  })
  const [branches, setBranches] = useState([])
  const [history, setHistory] = useState([])
  const [activeTargets, setActiveTargets] = useState([])

  const [formBranchId, setFormBranchId] = useState('')
  const [formPeriod, setFormPeriod] = useState('weekly')
  const [formDateFrom, setFormDateFrom] = useState('')
  const [formDateTo, setFormDateTo] = useState('')
  const [formTargetAmount, setFormTargetAmount] = useState('')

  useEffect(() => {
    const nextRange = getPeriodRange(formPeriod)
    setFormDateFrom(nextRange.from)
    setFormDateTo(nextRange.to)
  }, [formPeriod])

  const load = async () => {
    setLoading(true)
    try {
      const [branchesRes, analyticsRes] = await Promise.all([
        branchService.getAll({ pageNumber: 1, pageSize: 100 }),
        targetAnalyticsService.getData(),
      ])

      const branchList = extractListFromResponse(branchesRes, ['branches']).map((b) => ({
        ...b,
        id: b._id || b.id,
      }))
      setBranches(branchList)

      const data = analyticsRes?.data?.data || analyticsRes?.data || {}
      const active = data?.activeTargets || []
      setActiveTargets(active)
      setHistory(data?.history || [])
    } catch (err) {
      toastError(err?.message || 'Failed to load target analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const branchesForSelect = useMemo(() => branches, [branches])
  const progressMeta = useMemo(
    () => getProgressMeta(summary.targetAmount, summary.achievedAmount),
    [summary.targetAmount, summary.achievedAmount]
  )

  useEffect(() => {
    if (branchesForSelect.length && !summaryBranchId) {
      setSummaryBranchId(String(branchesForSelect[0]?.id || ''))
    }
  }, [branchesForSelect, summaryBranchId])

  useEffect(() => {
    const loadSummary = async () => {
      if (!summaryBranchId) return
      try {
        const response = await targetAnalyticsService.getSummary({
          branchId: summaryBranchId,
          period: summaryPeriod,
        })
        const data = response?.data?.data || response?.data || {}
        setSummary({
          targetAmount: Number(data?.targetAmount || 0),
          achievedAmount: Number(data?.achievedAmount || 0),
          remainingAmount: Number(data?.remainingAmount || 0),
        })
      } catch (_err) {
        setSummary({
          targetAmount: 0,
          achievedAmount: 0,
          remainingAmount: 0,
        })
      }
    }
    loadSummary()
  }, [summaryBranchId, summaryPeriod])

  const prefillTargetAmount = ({
    branchId = formBranchId,
    period = formPeriod,
    dateFrom = formDateFrom,
    dateTo = formDateTo,
  } = {}) => {
    if (!branchId) {
      setFormTargetAmount('')
      return
    }
    const sameBranchAndPeriod = activeTargets.filter(
      (item) =>
        String(item?.branchId?._id || item?.branchId) === String(branchId) &&
        item.period === period
    )

    const exactMatch = sameBranchAndPeriod.find(
      (item) =>
        String(item.dateFrom || '').slice(0, 10) === dateFrom &&
        String(item.dateTo || '').slice(0, 10) === dateTo
    )

    const overlapMatch = sameBranchAndPeriod.find((item) => {
      const itemFrom = String(item.dateFrom || '').slice(0, 10)
      const itemTo = String(item.dateTo || '').slice(0, 10)
      return itemFrom <= dateTo && itemTo >= dateFrom
    })

    const bestMatch = exactMatch || overlapMatch || sameBranchAndPeriod[0] || null
    setFormTargetAmount(bestMatch ? String(bestMatch.targetAmount || 0) : '')
  }

  useEffect(() => {
    prefillTargetAmount()
  }, [formBranchId, formPeriod, formDateFrom, formDateTo, activeTargets])

  const openAddTargetSidebar = () => {
    setIsSidebarOpen(true)
    const nextRange = getPeriodRange('weekly')
    setFormPeriod('weekly')
    setFormDateFrom(nextRange.from)
    setFormDateTo(nextRange.to)
    setFormTargetAmount('')
  }

  const onSave = async () => {
    if (!formBranchId) {
      toastError('Please select a branch')
      return
    }
    if (!formDateFrom || !formDateTo) {
      toastError('Please select from and to dates')
      return
    }
    if (formTargetAmount === '' || Number(formTargetAmount) < 0) {
      toastError('Please enter a valid target amount')
      return
    }

    setSaving(true)
    try {
      await targetAnalyticsService.upsertTarget({
        branchId: formBranchId,
        period: formPeriod,
        dateFrom: formDateFrom,
        dateTo: formDateTo,
        targetAmount: Number(formTargetAmount),
      })
      toastSuccess('Target updated successfully')
      if (String(formBranchId) === String(summaryBranchId) && formPeriod === summaryPeriod) {
        const nextTarget = Number(formTargetAmount) || 0
        setSummary((prev) => ({
          ...prev,
          targetAmount: nextTarget,
          remainingAmount: Math.max(0, nextTarget - Number(prev.achievedAmount || 0)),
        }))
      }
      await load()
      setIsSidebarOpen(false)
    } catch (err) {
      toastError(err?.message || 'Failed to update target')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <strong>Target Analytics</strong>
              <CButton color="primary" onClick={openAddTargetSidebar}>
                Add Target
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {loading ? (
              <div className="text-center py-5">
                <Loader message="Loading target analytics..." />
              </div>
            ) : (
              <>
                <CRow className="mb-3 g-3 align-items-end">
                  <CCol md={4}>
                    <CFormLabel className="small text-muted mb-1">Branch</CFormLabel>
                    <CFormSelect
                      value={summaryBranchId}
                      onChange={(e) => setSummaryBranchId(e.target.value)}
                    >
                      <option value="">Select branch</option>
                      {branchesForSelect.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name || branch.branchcode || branch.id}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel className="small text-muted mb-1">Period</CFormLabel>
                    <CFormSelect
                      value={summaryPeriod}
                      onChange={(e) => setSummaryPeriod(e.target.value)}
                    >
                      {PERIOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CRow className="g-3 mb-4">
                  <CCol md={4}>
                    <CCard>
                      <CCardBody>
                        <div className="text-muted small">Target</div>
                        <div className="fs-5 fw-semibold">{formatAmount(summary.targetAmount)}</div>
                        <div className="small text-muted">Created target for selected branch and period</div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                  <CCol md={4}>
                    <CCard>
                      <CCardBody>
                        <div className="text-muted small">Achieved</div>
                        <div className="fs-5 fw-semibold">{formatAmount(summary.achievedAmount)}</div>
                        <div className="small text-muted">Billing total from entries table</div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                  <CCol md={4}>
                    <CCard>
                      <CCardBody>
                        <div className="text-muted small">Remaining</div>
                        <div className="fs-5 fw-semibold">{formatAmount(summary.remainingAmount)}</div>
                        <div className="small text-muted">Target minus achieved</div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>

                <CCard className="mb-4">
                  <CCardBody>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="text-muted small">Target Achievement Progress</div>
                      <div className="fw-semibold">
                        {Number(progressMeta.actualPercent || 0).toFixed(1)}%
                      </div>
                    </div>
                    <CProgress height={14}>
                      <CProgressBar
                        value={progressMeta.displayPercent}
                        color={progressMeta.color}
                        className={progressMeta.shadeClass}
                      />
                    </CProgress>
                  </CCardBody>
                </CCard>

                <CNav variant="tabs" className="mb-3">
                  <CNavItem>
                    <CNavLink
                      active={activeTab === TAB_KEYS.active}
                      onClick={() => setActiveTab(TAB_KEYS.active)}
                    >
                      Active Targets
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === TAB_KEYS.history}
                      onClick={() => setActiveTab(TAB_KEYS.history)}
                    >
                      History Targets
                    </CNavLink>
                  </CNavItem>
                </CNav>

                {activeTab === TAB_KEYS.active && (
                  <CTable hover responsive bordered className="mb-4">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Branch</CTableHeaderCell>
                        <CTableHeaderCell>Period</CTableHeaderCell>
                        <CTableHeaderCell>From</CTableHeaderCell>
                        <CTableHeaderCell>To</CTableHeaderCell>
                        <CTableHeaderCell>Target</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {activeTargets.length ? (
                        activeTargets.map((item) => (
                          <CTableRow key={item._id}>
                            <CTableDataCell>{item?.branchId?.name || item?.branchId?.branchcode || '-'}</CTableDataCell>
                            <CTableDataCell>{item.period || '-'}</CTableDataCell>
                            <CTableDataCell>{formatDate(item.dateFrom)}</CTableDataCell>
                            <CTableDataCell>{formatDate(item.dateTo)}</CTableDataCell>
                            <CTableDataCell>{formatAmount(item.targetAmount)}</CTableDataCell>
                          </CTableRow>
                        ))
                      ) : (
                        <CTableRow>
                          <CTableDataCell colSpan={5} className="text-center">
                            No active targets found.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                )}

                {activeTab === TAB_KEYS.history && (
                  <CTable hover responsive bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Branch</CTableHeaderCell>
                        <CTableHeaderCell>Period</CTableHeaderCell>
                        <CTableHeaderCell>From</CTableHeaderCell>
                        <CTableHeaderCell>To</CTableHeaderCell>
                        <CTableHeaderCell>Target</CTableHeaderCell>
                        <CTableHeaderCell>Billing</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {history.length ? (
                        history.map((item) => (
                          <CTableRow key={item._id}>
                            <CTableDataCell>{item?.branchId?.name || item?.branchId?.branchcode || '-'}</CTableDataCell>
                            <CTableDataCell>{item.period || '-'}</CTableDataCell>
                            <CTableDataCell>{formatDate(item.dateFrom)}</CTableDataCell>
                            <CTableDataCell>{formatDate(item.dateTo)}</CTableDataCell>
                            <CTableDataCell>{formatAmount(item.targetAmount)}</CTableDataCell>
                            <CTableDataCell>{formatAmount(item.actualBillingAmount)}</CTableDataCell>
                          </CTableRow>
                        ))
                      ) : (
                        <CTableRow>
                          <CTableDataCell colSpan={6} className="text-center">
                            No target history found.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isSidebarOpen ? 0 : -SIDEBAR_WIDTH,
          width: SIDEBAR_WIDTH,
          height: '100vh',
          background: '#fff',
          borderLeft: '1px solid #dee2e6',
          boxShadow: '0 0 16px rgba(0,0,0,0.08)',
          zIndex: 2999,
          transition: 'right 0.2s ease',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Add Target</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26 }}
            onClick={() => setIsSidebarOpen(false)}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">Branch</CFormLabel>
          <CFormSelect value={formBranchId} onChange={(e) => setFormBranchId(e.target.value)}>
            <option value="">Select branch</option>
            {branchesForSelect.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name || branch.branchcode || branch.id}
              </option>
            ))}
          </CFormSelect>
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">Period</CFormLabel>
          <CFormSelect value={formPeriod} onChange={(e) => setFormPeriod(e.target.value)}>
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </CFormSelect>
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">From</CFormLabel>
          <CFormInput
            type="date"
            value={formDateFrom}
            max={formDateTo || undefined}
            onChange={(e) => setFormDateFrom(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">To</CFormLabel>
          <CFormInput
            type="date"
            value={formDateTo}
            min={formDateFrom || undefined}
            onChange={(e) => setFormDateTo(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">Target Amount</CFormLabel>
          <CFormInput
            type="number"
            min={0}
            value={formTargetAmount}
            onChange={(e) => setFormTargetAmount(e.target.value)}
            placeholder="Enter target amount"
          />
        </div>

        <div className="mt-auto">
          <CButton color="primary" onClick={onSave} disabled={saving} className="w-100">
            {saving ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              'Save Target'
            )}
          </CButton>
        </div>
      </div>
    </CRow>
  )
}

export default TargetAnalytics
