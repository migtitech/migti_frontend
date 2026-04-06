import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CNav,
  CNavItem,
  CNavLink,
  CPagination,
  CPaginationItem,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilX } from '@coreui/icons'
import poBillingService from '../../services/poBillingService'
import industryService from '../../services/industryService'
import employeeService from '../../services/employeeService'
import useBranchContext from '../../hooks/useBranchContext'
import { Loader } from '../../components'
import { toastError, toastSuccess } from '../../utils/toast'

const TAB_KEYS = { po: 'po', billing: 'billing' }
const PERIOD_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const getPeriodRange = (period) => {
  if (!period || period === 'all') return { from: '', to: '' }
  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start = new Date(todayEnd)
  if (period === 'weekly') start.setDate(todayEnd.getDate() - 6)
  if (period === 'monthly') start = new Date(todayEnd.getFullYear(), todayEnd.getMonth(), 1)
  const toInputDate = (d) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  return { from: toInputDate(start), to: toInputDate(todayEnd) }
}

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const formatDate = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yy} ${hh}:${min}`
}

const formatDateParts = (value) => {
  const formatted = formatDate(value)
  if (formatted === '-') return { date: '-', time: '' }
  const [date, time] = formatted.split(' ')
  return { date: date || '-', time: time || '' }
}

const getTodayInputDate = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const unwrapResponse = (response) => {
  if (response?.data && typeof response.data === 'object') return response.data
  return response || {}
}

const PurchaseOrderSidebar = () => {
  const drawerWidth = 420
  const { branchId } = useBranchContext()
  const [loadingInit, setLoadingInit] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState(TAB_KEYS.po)
  const [period, setPeriod] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tabPages, setTabPages] = useState({ [TAB_KEYS.po]: 1, [TAB_KEYS.billing]: 1 })
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  })
  const [metrics, setMetrics] = useState({
    totalPoCount: 0,
    totalBillingCount: 0,
    poAmount: 0,
    billingAmount: 0,
  })

  const [companies, setCompanies] = useState([])
  const [salespeople, setSalespeople] = useState([])
  const [industrySearchText, setIndustrySearchText] = useState('')

  const [poModal, setPoModal] = useState(false)
  const [billingModal, setBillingModal] = useState(false)
  const [poForm, setPoForm] = useState({
    companyId: '',
    salespersonId: '',
    amount: '',
    entryDate: getTodayInputDate(),
    remark: '',
  })
  const [billingForm, setBillingForm] = useState({
    companyId: '',
    salespersonId: '',
    amount: '',
    entryDate: getTodayInputDate(),
    remark: '',
  })
  const latestAnalyticsRequestRef = useRef(0)

  const pageSize = 10
  const activePage = tabPages[activeTab] || 1
  const currentPage = activePage
  const safePage = pagination.currentPage || currentPage
  const totalPages = pagination.totalPages || 1
  const companiesList = useMemo(() => companies, [companies])
  const visibleCompanies = useMemo(() => {
    const q = industrySearchText.trim().toLowerCase()
    const filtered = !q
      ? companiesList
      : companiesList.filter((c) => String(c?.name || '').toLowerCase().includes(q))
    return filtered.slice(0, 50)
  }, [companiesList, industrySearchText])
  const salespeopleList = useMemo(() => salespeople, [salespeople])

  useEffect(() => {
    const load = async () => {
      setLoadingInit(true)
      try {
        const [industriesRes, employeesRes] = await Promise.all([
          industryService.getAll({ pageNumber: 1, pageSize: 100 }),
          employeeService.getAll({
            pageNumber: 1,
            pageSize: 100,
            rolePrefix: 'sales',
            branchId: branchId || undefined,
          }),
        ])
        const industriesPayload = unwrapResponse(industriesRes)
        const employeesPayload = unwrapResponse(employeesRes)
        const companiesData = industriesPayload?.data?.industries || industriesPayload?.industries || []
        const employeesData = employeesPayload?.data?.employees || employeesPayload?.employees || []
        setCompanies((companiesData || []).map((c) => ({ ...c, id: c._id || c.id })))
        setSalespeople(
          (employeesData || [])
            .filter((e) => String(e?.role || '').toLowerCase().includes('sales'))
            .map((e) => ({ ...e, id: e._id || e.id })),
        )
      } catch (err) {
        toastError(err?.message || 'Failed to load form options')
      } finally {
        setLoadingInit(false)
      }
    }
    load()
  }, [branchId])

  useEffect(() => {
    const nextRange = getPeriodRange(period)
    setDateFrom(nextRange.from)
    setDateTo(nextRange.to)
    setTabPages({ [TAB_KEYS.po]: 1, [TAB_KEYS.billing]: 1 })
  }, [period])

  useEffect(() => {
    setTabPages((prev) => ({ ...prev, [activeTab]: 1 }))
  }, [dateFrom, dateTo, activeTab])

  const loadAnalytics = async () => {
    const requestId = latestAnalyticsRequestRef.current + 1
    latestAnalyticsRequestRef.current = requestId
    setLoadingData(true)
    try {
      const res = await poBillingService.getAnalytics({
        period,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        tab: activeTab,
        pageNumber: activePage,
        pageSize,
      })

      const payload = unwrapResponse(res)
            console.log("payload==================>>>>>", payload)

      const data = payload || {}
      if (requestId !== latestAnalyticsRequestRef.current) return
      setMetrics(data.metrics || {})
      setRows(data?.table?.rows || [])
      setPagination(
        data?.table?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: pageSize,
        },
      )
    } catch (err) {
      if (requestId !== latestAnalyticsRequestRef.current) return
      setRows([])
      toastError(err?.message || 'Failed to load data')
    } finally {
      if (requestId !== latestAnalyticsRequestRef.current) return
      setLoadingData(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [activeTab, period, dateFrom, dateTo, activePage])

  const onCreatePo = async () => {
    const amountValue = Number(poForm.amount)
    if (!poForm.companyId || !poForm.salespersonId || !amountValue || amountValue <= 0) {
      toastError('Company, salesperson and amount are required')
      return
    }
    try {
      await poBillingService.createPo({
        companyId: poForm.companyId,
        salespersonId: poForm.salespersonId,
        amount: amountValue,
        entryDate: poForm.entryDate || undefined,
        remark: poForm.remark,
        branchId: branchId || undefined,
      })
      toastSuccess('PO added successfully')
      setPoModal(false)
      setPoForm({
        companyId: '',
        salespersonId: '',
        amount: '',
        entryDate: getTodayInputDate(),
        remark: '',
      })
      loadAnalytics()
    } catch (err) {
      toastError(err?.message || 'Failed to add PO')
    }
  }

  const onCreateBilling = async () => {
    const amountValue = Number(billingForm.amount)
    if (!billingForm.companyId || !billingForm.salespersonId || !amountValue || amountValue <= 0) {
      toastError('Company, salesperson and amount are required')
      return
    }
    try {
      await poBillingService.createBilling({
        companyId: billingForm.companyId,
        salespersonId: billingForm.salespersonId,
        amount: amountValue,
        entryDate: billingForm.entryDate || undefined,
        remark: billingForm.remark,
        branchId: branchId || undefined,
      })
      toastSuccess('Billing added successfully')
      setBillingModal(false)
      setBillingForm({
        companyId: '',
        salespersonId: '',
        amount: '',
        entryDate: getTodayInputDate(),
        remark: '',
      })
      loadAnalytics()
    } catch (err) {
      toastError(err?.message || 'Failed to add billing')
    }
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Purchase Order</strong>
            <div className="d-flex gap-2">
              <CButton
                color="primary"
                onClick={() => {
                  setBillingModal(false)
                  setPoModal(true)
                }}
              >
                Add PO
              </CButton>
              <CButton
                color="success"
                onClick={() => {
                  setPoModal(false)
                  setBillingModal(true)
                }}
              >
                Add Billing
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3 g-3 align-items-end">
              <CCol md={4}>
                <CFormLabel className="small text-muted mb-1">Period</CFormLabel>
                <CFormSelect value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel className="small text-muted mb-1">From</CFormLabel>
                <CFormInput
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="small text-muted mb-1">To</CFormLabel>
                <CFormInput
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </CCol>
            </CRow>

            {loadingInit || loadingData ? (
              <div className="text-center py-5">
                <Loader message="Loading purchase analytics..." />
              </div>
            ) : (
              <>
                <CRow className="g-3 mb-4">
                  {[
                    { label: 'Total PO Count', value: metrics.totalPoCount || 0 },
                    { label: 'Total Billing Count', value: metrics.totalBillingCount || 0 },
                    { label: 'PO Amount', value: formatAmount(metrics.poAmount || 0) },
                    { label: 'Billing Amount', value: formatAmount(metrics.billingAmount || 0) },
                  ].map((item) => (
                    <CCol md={3} sm={6} xs={12} key={item.label}>
                      <CCard>
                        <CCardBody>
                          <div className="text-muted small">{item.label}</div>
                          <div className="fs-5 fw-semibold">{item.value}</div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  ))}
                </CRow>

                <CNav variant="tabs" className="mb-3">
                  <CNavItem>
                    <CNavLink active={activeTab === TAB_KEYS.po} onClick={() => setActiveTab(TAB_KEYS.po)}>
                      PO
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === TAB_KEYS.billing}
                      onClick={() => setActiveTab(TAB_KEYS.billing)}
                    >
                      Billing
                    </CNavLink>
                  </CNavItem>
                </CNav>

                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Company</CTableHeaderCell>
                      <CTableHeaderCell>Salesperson</CTableHeaderCell>
                      <CTableHeaderCell>Amount</CTableHeaderCell>
                      <CTableHeaderCell>Date</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {rows.length > 0 ? (
                      rows.map((item, index) => {
                        const dateInfo = formatDateParts(item.entryDate)
                        return (
                        <CTableRow key={item._id || `${index}`}>
                          <CTableDataCell>{(safePage - 1) * pageSize + index + 1}</CTableDataCell>
                          <CTableDataCell>{item.companyName || '-'}</CTableDataCell>
                          <CTableDataCell>{item.salespersonName || '-'}</CTableDataCell>
                          <CTableDataCell>{formatAmount(item.amount)}</CTableDataCell>
                          <CTableDataCell>
                            <div>{dateInfo.date}</div>
                            {dateInfo.time ? (
                              <div className="text-muted small">{dateInfo.time}</div>
                            ) : null}
                          </CTableDataCell>
                        </CTableRow>
                        )
                      })
                    ) : (
                      <CTableRow>
                          <CTableDataCell colSpan={5} className="text-center">
                          No {activeTab} data found for selected filters.
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>

                {totalPages > 1 && (
                  <CPagination className="mt-3 justify-content-center">
                    <CPaginationItem
                      disabled={safePage <= 1}
                      onClick={() =>
                        setTabPages((prev) => ({ ...prev, [activeTab]: Math.max(1, safePage - 1) }))
                      }
                    >
                      Previous
                    </CPaginationItem>
                    <CPaginationItem active>
                      {safePage} / {totalPages}
                    </CPaginationItem>
                    <CPaginationItem
                      disabled={safePage >= totalPages}
                      onClick={() =>
                        setTabPages((prev) => ({
                          ...prev,
                          [activeTab]: Math.min(totalPages, safePage + 1),
                        }))
                      }
                    >
                      Next
                    </CPaginationItem>
                  </CPagination>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
        </CCol>
      </CRow>

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: poModal ? 0 : -drawerWidth,
          width: drawerWidth,
          height: '100vh',
          background: '#fff',
          borderLeft: '1px solid #dee2e6',
          boxShadow: '0 0 16px rgba(0,0,0,0.08)',
          zIndex: 2999,
          transition: 'right 0.2s ease',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Add PO</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26 }}
            onClick={() => setPoModal(false)}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Amount</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                value={poForm.amount}
                onChange={(e) => setPoForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Search client</CFormLabel>
              <CFormInput
                placeholder="Type to search clients"
                value={industrySearchText}
                onChange={(e) => setIndustrySearchText(e.target.value)}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Company (Client)</CFormLabel>
              <CFormSelect
                value={poForm.companyId}
                onChange={(e) => setPoForm((p) => ({ ...p, companyId: e.target.value }))}
              >
                <option value="">Select company</option>
                {visibleCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}
                  </option>
                ))}
              </CFormSelect>
              <div className="small text-muted mt-1">
                Showing {visibleCompanies.length} of {companiesList.length} clients
              </div>
            </CCol>
            <CCol md={12}>
              <CFormLabel>Salesperson</CFormLabel>
              <CFormSelect
                value={poForm.salespersonId}
                onChange={(e) => setPoForm((p) => ({ ...p, salespersonId: e.target.value }))}
              >
                <option value="">Select salesperson</option>
                {salespeopleList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={12}>
              <CFormLabel>Date</CFormLabel>
              <CFormInput
                type="date"
                value={poForm.entryDate}
                onChange={(e) => setPoForm((p) => ({ ...p, entryDate: e.target.value }))}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Remark</CFormLabel>
              <CFormTextarea
                rows={4}
                placeholder="Write remark..."
                value={poForm.remark}
                onChange={(e) => setPoForm((p) => ({ ...p, remark: e.target.value }))}
              />
            </CCol>
          </CRow>
        </div>
        <div className="d-flex justify-content-end gap-2 pt-3">
          <CButton color="secondary" onClick={() => setPoModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={onCreatePo}>
            Save
          </CButton>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: billingModal ? 0 : -drawerWidth,
          width: drawerWidth,
          height: '100vh',
          background: '#fff',
          borderLeft: '1px solid #dee2e6',
          boxShadow: '0 0 16px rgba(0,0,0,0.08)',
          zIndex: 2999,
          transition: 'right 0.2s ease',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Add Billing</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26 }}
            onClick={() => setBillingModal(false)}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Amount</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                value={billingForm.amount}
                onChange={(e) => setBillingForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Search client</CFormLabel>
              <CFormInput
                placeholder="Type to search clients"
                value={industrySearchText}
                onChange={(e) => setIndustrySearchText(e.target.value)}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Company (Client)</CFormLabel>
              <CFormSelect
                value={billingForm.companyId}
                onChange={(e) => setBillingForm((p) => ({ ...p, companyId: e.target.value }))}
              >
                <option value="">Select company</option>
                {visibleCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}
                  </option>
                ))}
              </CFormSelect>
              <div className="small text-muted mt-1">
                Showing {visibleCompanies.length} of {companiesList.length} clients
              </div>
            </CCol>
            <CCol md={12}>
              <CFormLabel>Salesperson</CFormLabel>
              <CFormSelect
                value={billingForm.salespersonId}
                onChange={(e) => setBillingForm((p) => ({ ...p, salespersonId: e.target.value }))}
              >
                <option value="">Select salesperson</option>
                {salespeopleList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={12}>
              <CFormLabel>Date</CFormLabel>
              <CFormInput
                type="date"
                value={billingForm.entryDate}
                onChange={(e) => setBillingForm((p) => ({ ...p, entryDate: e.target.value }))}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Remark</CFormLabel>
              <CFormTextarea
                rows={4}
                placeholder="Write remark..."
                value={billingForm.remark}
                onChange={(e) => setBillingForm((p) => ({ ...p, remark: e.target.value }))}
              />
            </CCol>
          </CRow>
        </div>
        <div className="d-flex justify-content-end gap-2 pt-3">
          <CButton color="secondary" onClick={() => setBillingModal(false)}>
            Cancel
          </CButton>
          <CButton color="success" onClick={onCreateBilling}>
            Save
          </CButton>
        </div>
      </div>
    </>
  )
}

export default PurchaseOrderSidebar
