import React, { useEffect, useMemo, useState } from 'react'
import {
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
import branchService from '../../services/branchService'
import branchAnalyticsService from '../../services/branchAnalyticsService'
import { Loader } from '../../components'
import { toastError } from '../../utils/toast'

const TAB_KEYS = {
  queries: 'queries',
  quotations: 'quotations',
  po: 'po',
  billing: 'billing',
}

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

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
  if (!period || period === 'all') return { from: '', to: '' }
  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start = new Date(todayEnd)

  if (period === 'daily') {
    start = new Date(todayEnd)
  } else if (period === 'weekly') {
    start.setDate(todayEnd.getDate() - 6)
  } else if (period === 'monthly') {
    start = new Date(todayEnd.getFullYear(), todayEnd.getMonth(), 1)
  } else if (period === 'yearly') {
    start = new Date(todayEnd.getFullYear(), 0, 1)
  }

  const toInputDate = (d) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  return { from: toInputDate(start), to: toInputDate(todayEnd) }
}

const formatDate = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString()
}

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const BranchAnalytics = () => {
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [branches, setBranches] = useState([])
  const [metrics, setMetrics] = useState({
    totalQueries: 0,
    totalQuotation: 0,
    quotedAmount: 0,
    totalPo: 0,
    poAmount: 0,
    totalBilling: 0,
    billingAmount: 0,
  })
  const [tableRows, setTableRows] = useState([])
  const [tablePagination, setTablePagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  })

  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [period, setPeriod] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [activeTab, setActiveTab] = useState(TAB_KEYS.queries)
  const [tabPages, setTabPages] = useState({
    [TAB_KEYS.queries]: 1,
    [TAB_KEYS.quotations]: 1,
    [TAB_KEYS.po]: 1,
    [TAB_KEYS.billing]: 1,
  })
  const pageSize = 10

  useEffect(() => {
    const load = async () => {
      setLoadingFilters(true)
      try {
        const branchesRes = await branchService.getAll({ pageNumber: 1, pageSize: 100 })
        const branchList = extractListFromResponse(branchesRes, ['branches']).map((b) => ({
          ...b,
          id: b._id || b.id,
        }))

        setBranches(branchList)
      } catch (err) {
        toastError(err?.message || 'Failed to load branch analytics data')
      } finally {
        setLoadingFilters(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    const nextRange = getPeriodRange(period)
    setDateFrom(nextRange.from)
    setDateTo(nextRange.to)
  }, [period])

  const branchesForCompany = useMemo(() => branches, [branches])

  useEffect(() => {
    if (!selectedBranchId) return
    const exists = branchesForCompany.some((b) => String(b.id) === String(selectedBranchId))
    if (!exists) setSelectedBranchId('')
  }, [branchesForCompany, selectedBranchId])

  const currentRows = tableRows || []
  const currentPage = tabPages[activeTab] || 1
  const totalPages = tablePagination?.totalPages || 1
  const safePage = tablePagination?.currentPage || currentPage

  useEffect(() => {
    setTabPages({
      [TAB_KEYS.queries]: 1,
      [TAB_KEYS.quotations]: 1,
      [TAB_KEYS.po]: 1,
      [TAB_KEYS.billing]: 1,
    })
  }, [selectedBranchId, period, dateFrom, dateTo])

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoadingData(true)
      try {
        const response = await branchAnalyticsService.getData({
          branchId: selectedBranchId || undefined,
          period: period || 'all',
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          tab: activeTab,
          pageNumber: tabPages[activeTab] || 1,
          pageSize,
        })
        const data = response?.data?.data || response?.data || {}
        setMetrics(data?.metrics || {})
        setTableRows(data?.table?.rows || [])
        setTablePagination(
          data?.table?.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: pageSize,
          },
        )
      } catch (err) {
        setTableRows([])
        setTablePagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: pageSize,
        })
        toastError(err?.message || 'Failed to load analytics data')
      } finally {
        setLoadingData(false)
      }
    }

    loadAnalytics()
  }, [selectedBranchId, period, dateFrom, dateTo, activeTab, tabPages, pageSize])

  const setPageForActiveTab = (nextPage) => {
    setTabPages((prev) => ({ ...prev, [activeTab]: nextPage }))
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Branch Analytics</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3 g-3 align-items-end">
              <CCol md={4}>
                <CFormLabel className="small text-muted mb-1">Branch</CFormLabel>
                <CFormSelect
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                >
                  <option value="">All branches</option>
                  {branchesForCompany.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name || branch.branchcode || branch.id}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={3}>
                <CFormLabel className="small text-muted mb-1">Period</CFormLabel>
                <CFormSelect value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={2}>
                <CFormLabel className="small text-muted mb-1">From</CFormLabel>
                <CFormInput
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </CCol>

              <CCol md={3}>
                <CFormLabel className="small text-muted mb-1">To</CFormLabel>
                <CFormInput
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </CCol>
            </CRow>

            {loadingFilters || loadingData ? (
              <div className="text-center py-5">
                <Loader message="Loading analytics..." />
              </div>
            ) : (
              <>
                <CRow className="g-3 mb-4">
                  {[
                    { label: 'Total Queries', value: metrics.totalQueries || 0 },
                    { label: 'Total Quotation', value: metrics.totalQuotation || 0 },
                    { label: 'Quoted Amount', value: formatAmount(metrics.quotedAmount || 0) },
                    { label: 'Total PO', value: metrics.totalPo || 0 },
                    { label: 'PO Amount', value: formatAmount(metrics.poAmount || 0) },
                    { label: 'Total Billing', value: metrics.totalBilling || 0 },
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
                    <CNavLink
                      active={activeTab === TAB_KEYS.queries}
                      onClick={() => setActiveTab(TAB_KEYS.queries)}
                    >
                      Queries
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === TAB_KEYS.quotations}
                      onClick={() => setActiveTab(TAB_KEYS.quotations)}
                    >
                      Quotations
                    </CNavLink>
                  </CNavItem>
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

                {activeTab === TAB_KEYS.queries && (
                  <CTable hover responsive bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Query Code</CTableHeaderCell>
                        <CTableHeaderCell>Company</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {currentRows.length > 0 ? (
                        currentRows.map((item, index) => (
                          <CTableRow key={item._id || item.id || `${index}`}>
                            <CTableDataCell>{(safePage - 1) * pageSize + index + 1}</CTableDataCell>
                            <CTableDataCell>{item.queryCode || '-'}</CTableDataCell>
                            <CTableDataCell>{item.companyInfo?.name || '-'}</CTableDataCell>
                            <CTableDataCell>{item.status || '-'}</CTableDataCell>
                            <CTableDataCell>{formatDate(item.createdAt)}</CTableDataCell>
                          </CTableRow>
                        ))
                      ) : (
                        <CTableRow>
                          <CTableDataCell colSpan={5} className="text-center">
                            No query data found for selected filters.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                )}

                {activeTab === TAB_KEYS.quotations && (
                  <CTable hover responsive bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Quotation No.</CTableHeaderCell>
                        <CTableHeaderCell>Company</CTableHeaderCell>
                        <CTableHeaderCell>Total Amount</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {currentRows.length > 0 ? (
                        currentRows.map((item, index) => (
                          <CTableRow key={item._id || item.id || `${index}`}>
                            <CTableDataCell>{(safePage - 1) * pageSize + index + 1}</CTableDataCell>
                            <CTableDataCell>{item.quotationCode || '-'}</CTableDataCell>
                            <CTableDataCell>{item.companyInfo?.name || '-'}</CTableDataCell>
                            <CTableDataCell>{formatAmount(item.totalAmount)}</CTableDataCell>
                            <CTableDataCell>{item.status || '-'}</CTableDataCell>
                            <CTableDataCell>{formatDate(item.createdAt)}</CTableDataCell>
                          </CTableRow>
                        ))
                      ) : (
                        <CTableRow>
                          <CTableDataCell colSpan={6} className="text-center">
                            No quotation data found for selected filters.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                )}

                {activeTab === TAB_KEYS.po && (
                  <CTable hover responsive bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Company</CTableHeaderCell>
                        <CTableHeaderCell>Sales Person</CTableHeaderCell>
                        <CTableHeaderCell>Amount</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {currentRows.length > 0 ? (
                        currentRows.map((item, index) => (
                          <CTableRow key={item._id || `${index}`}>
                            <CTableDataCell>{(safePage - 1) * pageSize + index + 1}</CTableDataCell>
                            <CTableDataCell>{item.companyName || '-'}</CTableDataCell>
                            <CTableDataCell>{item.salespersonName || '-'}</CTableDataCell>
                            <CTableDataCell>{formatAmount(item.amount)}</CTableDataCell>
                            <CTableDataCell>{formatDate(item.entryDate)}</CTableDataCell>
                          </CTableRow>
                        ))
                      ) : (
                        <CTableRow>
                          <CTableDataCell colSpan={5} className="text-center">
                            No PO data found for selected filters.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                )}

                {activeTab === TAB_KEYS.billing && (
                  <CTable hover responsive bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Company</CTableHeaderCell>
                        <CTableHeaderCell>Sales Person</CTableHeaderCell>
                        <CTableHeaderCell>Amount</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {currentRows.length > 0 ? (
                        currentRows.map((item, index) => (
                          <CTableRow key={item._id || `${index}`}>
                            <CTableDataCell>{(safePage - 1) * pageSize + index + 1}</CTableDataCell>
                            <CTableDataCell>{item.companyName || '-'}</CTableDataCell>
                            <CTableDataCell>{item.salespersonName || '-'}</CTableDataCell>
                            <CTableDataCell>{formatAmount(item.amount)}</CTableDataCell>
                            <CTableDataCell>{formatDate(item.entryDate)}</CTableDataCell>
                          </CTableRow>
                        ))
                      ) : (
                        <CTableRow>
                          <CTableDataCell colSpan={5} className="text-center">
                            No billing data found for selected filters.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                )}

                {totalPages > 1 && (
                  <CPagination className="mt-3 justify-content-center">
                    <CPaginationItem
                      disabled={safePage <= 1}
                      onClick={() => setPageForActiveTab(Math.max(1, safePage - 1))}
                    >
                      Previous
                    </CPaginationItem>
                    <CPaginationItem active>
                      {safePage} / {totalPages}
                    </CPaginationItem>
                    <CPaginationItem
                      disabled={safePage >= totalPages}
                      onClick={() => setPageForActiveTab(Math.min(totalPages, safePage + 1))}
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
  )
}

export default BranchAnalytics
