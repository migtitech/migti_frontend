import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CBadge,
  CFormSelect,
  CFormInput,
  CFormLabel,
  CSpinner,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilCloudDownload, cilLockLocked, cilLockUnlocked } from '@coreui/icons'
import { EyeIcon } from '../../components'
import quotationService from '../../services/quotationService'
import Filtered from '../../filtered/Filtered'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError, toastSuccess } from '../../utils/toast'

const mapQuotation = (q) => (q ? { ...q, id: q._id ?? q.id } : null)

const Q_FILTERS_LOCKED_KEY = 'migti_quotations_list_filters_locked'
const Q_FILTERS_STATUS_KEY = 'migti_quotations_list_filters_status'
const Q_FILTERS_DATE_FROM_KEY = 'migti_quotations_list_filters_date_from'
const Q_FILTERS_DATE_TO_KEY = 'migti_quotations_list_filters_date_to'

const readQFiltersLocked = () => {
  try {
    return localStorage.getItem(Q_FILTERS_LOCKED_KEY) === '1'
  } catch {
    return false
  }
}

const readQPersistedFilters = () => {
  if (!readQFiltersLocked()) {
    return { status: '', dateFrom: '', dateTo: '' }
  }
  try {
    const status = localStorage.getItem(Q_FILTERS_STATUS_KEY) ?? ''
    const dateFrom = localStorage.getItem(Q_FILTERS_DATE_FROM_KEY) ?? ''
    let dateTo = localStorage.getItem(Q_FILTERS_DATE_TO_KEY) ?? ''
    if (dateFrom && dateTo && dateTo < dateFrom) dateTo = ''
    return { status, dateFrom, dateTo }
  } catch {
    return { status: '', dateFrom: '', dateTo: '' }
  }
}

const clearQPersistedFilters = () => {
  ;[Q_FILTERS_LOCKED_KEY, Q_FILTERS_STATUS_KEY, Q_FILTERS_DATE_FROM_KEY, Q_FILTERS_DATE_TO_KEY].forEach(
    (k) => {
      try {
        localStorage.removeItem(k)
      } catch {
        /* ignore */
      }
    },
  )
}

const persistQLockedFilters = (status, from, to) => {
  try {
    localStorage.setItem(Q_FILTERS_LOCKED_KEY, '1')
    localStorage.setItem(Q_FILTERS_STATUS_KEY, status)
    localStorage.setItem(Q_FILTERS_DATE_FROM_KEY, from)
    localStorage.setItem(Q_FILTERS_DATE_TO_KEY, to)
  } catch {
    /* ignore */
  }
}

const getQInitialFilterState = () => {
  const filtersLocked = readQFiltersLocked()
  const f = readQPersistedFilters()
  return {
    filtersLocked,
    statusFilter: f.status,
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
  }
}

const formatDateDdMmYyyy = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  return `${dd}/${mm}/${yyyy}`
}

const formatInrAmount = (value) =>
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Drafted' },
  { value: 'partial', label: 'Partially Fulfilled' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'hod_approved', label: 'HOD Approved' },
  { value: 'ready', label: 'Ready' },
  { value: 'sentToClient', label: 'Sent to Client' },
  { value: 'poReceived', label: 'PO Received' },
  { value: 'followup01', label: 'Follow-up 01' },
  { value: 'followup02', label: 'Follow-up 02' },
  { value: 'closed', label: 'Closed' },
]

const QuotationList = () => {
  const navigate = useNavigate()
  const [qFilterInit] = useState(() => getQInitialFilterState())
  const [quotations, setQuotations] = useState([])
  const [pagination, setPagination] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState(qFilterInit.statusFilter)
  const [filtersLocked, setFiltersLocked] = useState(qFilterInit.filtersLocked)
  const [dateFrom, setDateFrom] = useState(qFilterInit.dateFrom)
  const [dateTo, setDateTo] = useState(qFilterInit.dateTo)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [exportingPdfId, setExportingPdfId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, quotation: null })
  const [deletingId, setDeletingId] = useState(null)
  const latestFetchIdRef = useRef(0)

  const handleDownloadPdf = async (e, quotation) => {
    e?.stopPropagation()
    if (!quotation?.id || quotation.status !== 'hod_approved') return
    setExportingPdfId(quotation.id)
    try {
      const response = await quotationService.exportPdf(quotation.id)
      const blob = response?.data
      if (!blob || !(blob instanceof Blob)) {
        toastError('Invalid PDF response')
        return
      }
      const contentType = response?.headers?.['content-type'] || blob.type || ''
      if (blob.size < 100 || contentType.includes('json')) {
        const text = await blob.text()
        const err = text
          ? (() => {
              try {
                const j = JSON.parse(text)
                return j?.message || j?.error?.detail || text
              } catch {
                return text
              }
            })()
          : 'Invalid PDF response'
        toastError(err)
        return
      }
      const pdfBlob = new Blob([blob], { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${quotation.quotationCode || quotation.id}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toastSuccess('PDF downloaded')
    } catch (err) {
      toastError(err?.message || 'Failed to export PDF')
    } finally {
      setExportingPdfId(null)
    }
  }

  const handleDeleteQuotationConfirm = async () => {
    const q = confirmDelete.quotation
    const qid = q?.id || q?._id
    if (!qid) {
      setConfirmDelete({ visible: false, quotation: null })
      return
    }
    setDeletingId(qid)
    try {
      await quotationService.delete(qid)
      toastSuccess('Quotation deleted successfully')
      setConfirmDelete({ visible: false, quotation: null })
      fetchQuotations()
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || 'Failed to delete quotation')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    setPageNumber(1)
  }, [searchDebounced, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    if (!filtersLocked) return
    persistQLockedFilters(statusFilter, dateFrom, dateTo)
  }, [statusFilter, dateFrom, dateTo, filtersLocked])

  useEffect(() => {
    if (!dateFrom) return
    setDateTo((prev) => {
      if (prev && prev < dateFrom) return ''
      return prev
    })
  }, [dateFrom])

  const toggleFiltersLock = () => {
    if (filtersLocked) {
      setFiltersLocked(false)
      clearQPersistedFilters()
      return
    }
    setFiltersLocked(true)
    persistQLockedFilters(statusFilter, dateFrom, dateTo)
  }

  const fetchQuotations = async () => {
    const fetchId = Date.now()
    latestFetchIdRef.current = fetchId
    setLoading(true)
    try {
      const res = await withMinimumDelay(() =>
        quotationService.getAll({
          pageNumber,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: statusFilter || undefined,
          dateFrom: dateFrom.trim() || undefined,
          dateTo: dateTo.trim() || undefined,
        }),
      )
      const data = res?.data || res
      const result = data?.data ?? data
      if (latestFetchIdRef.current !== fetchId) return
      const list = (result?.quotations || []).map(mapQuotation)
      setQuotations(list)
      setPagination(result?.pagination || null)
      const serverPage = result?.pagination?.currentPage
      const serverTotalPages = result?.pagination?.totalPages
      if (
        Number.isInteger(serverPage)
        && Number.isInteger(serverTotalPages)
        && serverTotalPages > 0
        && serverPage > serverTotalPages
      ) {
        setPageNumber(serverTotalPages)
      }
    } catch (err) {
      if (latestFetchIdRef.current !== fetchId) return
      toastError(err?.message || 'Failed to load quotations')
      setQuotations([])
      setPagination(null)
    } finally {
      if (latestFetchIdRef.current === fetchId) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchQuotations()
  }, [pageNumber, pageSize, searchDebounced, statusFilter, dateFrom, dateTo])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <CBadge color="secondary">Draft</CBadge>
      case 'partial':
        return <CBadge color="warning">Partially Fulfilled</CBadge>
      case 'fulfilled':
        return <CBadge color="info">Fulfilled</CBadge>
      case 'hod_approved':
        return <CBadge color="success">HOD Approved</CBadge>
      case 'sent':
      case 'sentToClient':
        return <CBadge color="info">Sent</CBadge>
      case 'accepted':
        return <CBadge color="success">Accepted</CBadge>
      case 'rejected':
        return <CBadge color="danger">Rejected</CBadge>
      case 'expired':
        return <CBadge color="warning">Expired</CBadge>
      default:
        return <CBadge color="secondary">{status || 'Draft'}</CBadge>
    }
  }

  const filteredQuotations = quotations
  const totalPages = pagination?.totalPages ?? 1
  const currentPage = pagination?.currentPage ?? pageNumber
  const totalItems = pagination?.totalItems ?? filteredQuotations.length
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <CRow style={{ zoom: '0.8' }}>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Quotations</strong>
            <div className="d-flex gap-2">
              <CButton color="primary" onClick={() => navigate('/quotations/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Quotation
              </CButton>
            </div>
          </CCardHeader>

            <CCardBody>
            <CRow className="mb-3 g-2 align-items-end">
              <CCol xs={12} sm={6} md={6} lg={3}>
                <CFormLabel className="mb-1 small text-body-secondary">Search</CFormLabel>
                <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              </CCol>
              <CCol xs={12} sm={6} md={3} lg={2}>
                <CFormLabel className="mb-1 small text-body-secondary">From date</CFormLabel>
                <CFormInput
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </CCol>
              <CCol xs={12} sm={6} md={3} lg={2}>
                <CFormLabel className="mb-1 small text-body-secondary">To date</CFormLabel>
                <CFormInput
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </CCol>
              <CCol xs={12} sm={6} md={6} lg={3} className="d-flex flex-wrap align-items-end gap-2">
                <div className="flex-grow-1" style={{ minWidth: 140 }}>
                  <CFormLabel className="mb-1 small text-body-secondary">Status</CFormLabel>
                  <CFormSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-100"
                    aria-label="Filter by status"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value || 'all'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
                <CButton
                  type="button"
                  color={filtersLocked ? 'warning' : 'secondary'}
                  variant="outline"
                  className="mb-0"
                  title={
                    filtersLocked
                      ? 'Unlock filters (status and date range will not persist when you leave this page)'
                      : 'Lock filters (status and from/to dates stay when you return to Quotations)'
                  }
                  onClick={toggleFiltersLock}
                >
                  <CIcon icon={filtersLocked ? cilLockLocked : cilLockUnlocked} />
                </CButton>
              </CCol>
              <CCol xs={12} sm={6} md={6} lg={2}>
                <CFormLabel className="mb-1 small text-body-secondary">Rows per page</CFormLabel>
                <CFormSelect
                  value={pageSize}
                  onChange={(e) => {
                    const next = Number(e.target.value) || 10
                    setPageSize(next)
                    setPageNumber(1)
                  }}
                  aria-label="Rows per page"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </CFormSelect>
              </CCol>
            </CRow>
            {loading && <Loader />}
            <CTable hover responsive bordered>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>S No</CTableHeaderCell>
                  <CTableHeaderCell>Quotation No.</CTableHeaderCell>
                  <CTableHeaderCell>Company</CTableHeaderCell>
                  <CTableHeaderCell>Products / Items</CTableHeaderCell>
                  <CTableHeaderCell>Total Amount</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {filteredQuotations && filteredQuotations.length > 0 ? (
                  filteredQuotations.map((quotation, index) => {
                    const isHodApproved = quotation.status === 'hod_approved'
                    const rowBg = isHodApproved ? { backgroundColor: '#d4edda' } : {}
                    return (
                    <CTableRow
                      key={quotation.id}
                      onClick={() => navigate(`/quotations/${quotation.id}`)}
                      style={{ cursor: 'pointer', ...rowBg }}
                    >
                      <CTableDataCell style={rowBg}>
                        {(currentPage - 1) * pageSize + index + 1}
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        <strong>{quotation.quotationCode || `QT-${String(quotation.id).slice(-6)}`}</strong>
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        <strong>{quotation.companyInfo?.name || quotation.customerName || '-'}</strong>
                        {(quotation.companyInfo?.email || quotation.customerEmail) && (
                          <>
                            <br />
                            <small className="text-muted">
                              {quotation.companyInfo?.email || quotation.customerEmail}
                            </small>
                          </>
                        )}
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        <small>
                          {Array.isArray(quotation.products) && quotation.products.length > 0
                            ? `${quotation.products.length} product(s)`
                            : (quotation.items?.substring(0, 50) || '')}
                          {quotation.items && quotation.items.length > 50 && !quotation.products?.length ? '...' : ''}
                        </small>
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        ₹{formatInrAmount(quotation.totalAmount)}
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        {getStatusBadge(quotation.status)}
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        {quotation.createdAt ? formatDateDdMmYyyy(quotation.createdAt) : '-'}
                      </CTableDataCell>
                      <CTableDataCell style={rowBg} onClick={(e) => e.stopPropagation()}>
                        <CButton
                          color="info"
                          variant="ghost"
                          size="sm"
                          title="View"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/quotations/${quotation.id}`)
                          }}
                        >
                          <EyeIcon />
                        </CButton>

                        <CButton
                          color="success"
                          variant="ghost"
                          size="sm"
                          title={isHodApproved ? 'Download PDF' : 'Available after HOD approval'}
                          disabled={!isHodApproved || exportingPdfId === quotation.id}
                          onClick={(e) => handleDownloadPdf(e, quotation)}
                        >
                          {exportingPdfId === quotation.id ? (
                            <CSpinner size="sm" />
                          ) : (
                            <CIcon icon={cilCloudDownload} />
                          )}
                        </CButton>

                        <CButton
                          color="warning"
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/quotations/edit/${quotation.id}`)
                          }}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                    )
                  })
                ) : (
                  <CTableRow>
                    <CTableDataCell colSpan={8} className="text-center">
                      {!loading && (quotations?.length === 0
                        ? 'No quotations available.'
                        : 'No quotations match your search.')}
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
            {totalPages > 1 && (
              <>
                <div className="small text-body-secondary text-center mt-2">
                  Showing {startItem}-{endItem} of {totalItems}
                </div>
                <CPagination className="mt-2 justify-content-center">
                <CPaginationItem
                  disabled={loading || currentPage <= 1}
                  onClick={() => setPageNumber(1)}
                >
                  First
                </CPaginationItem>
                <CPaginationItem
                  disabled={loading || currentPage <= 1}
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                >
                  Previous
                </CPaginationItem>
                <CPaginationItem active>
                  {currentPage} / {totalPages}
                </CPaginationItem>
                <CPaginationItem
                  disabled={loading || currentPage >= totalPages}
                  onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </CPaginationItem>
                <CPaginationItem
                  disabled={loading || currentPage >= totalPages}
                  onClick={() => setPageNumber(totalPages)}
                >
                  Last
                </CPaginationItem>
              </CPagination>
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => !deletingId && setConfirmDelete({ visible: false, quotation: null })}
        onConfirm={handleDeleteQuotationConfirm}
        title="Delete quotation?"
        message={
          confirmDelete.quotation?.quotationCode
            ? `Permanently remove quotation ${confirmDelete.quotation.quotationCode}? This cannot be undone.`
            : 'Permanently remove this quotation? This cannot be undone.'
        }
        confirmText={deletingId ? 'Deleting…' : 'Delete'}
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default QuotationList
