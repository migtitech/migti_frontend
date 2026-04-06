import React, { useEffect, useState } from 'react'
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
  CPagination,
  CPaginationItem,
  CFormSelect,
  CFormInput,
  CFormLabel,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilLockLocked, cilLockUnlocked } from '@coreui/icons'
import { EyeIcon } from '../../components'
import queryService from '../../services/queryService'
import Filtered from '../../filtered/Filtered'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const FILTERS_LOCKED_KEY = 'migti_queries_list_filters_locked'
const FILTERS_STATUS_KEY = 'migti_queries_list_filters_status'
const FILTERS_DATE_FROM_KEY = 'migti_queries_list_filters_date_from'
const FILTERS_DATE_TO_KEY = 'migti_queries_list_filters_date_to'
/** Previous single-field lock (migrated on next save) */
const LEGACY_STATUS_LOCK_KEY = 'migti_queries_list_status_filter_locked'
const LEGACY_STATUS_VALUE_KEY = 'migti_queries_list_status_filter'

const readFiltersLocked = () => {
  try {
    if (localStorage.getItem(FILTERS_LOCKED_KEY) === '1') return true
    return localStorage.getItem(LEGACY_STATUS_LOCK_KEY) === '1'
  } catch {
    return false
  }
}

const readPersistedFilters = () => {
  if (!readFiltersLocked()) {
    return { status: '', dateFrom: '', dateTo: '' }
  }
  try {
    const status =
      localStorage.getItem(FILTERS_STATUS_KEY) ??
      localStorage.getItem(LEGACY_STATUS_VALUE_KEY) ??
      ''
    const dateFrom = localStorage.getItem(FILTERS_DATE_FROM_KEY) ?? ''
    let dateTo = localStorage.getItem(FILTERS_DATE_TO_KEY) ?? ''
    if (dateFrom && dateTo && dateTo < dateFrom) dateTo = ''
    return { status, dateFrom, dateTo }
  } catch {
    return { status: '', dateFrom: '', dateTo: '' }
  }
}

const clearPersistedFilters = () => {
  ;[
    FILTERS_LOCKED_KEY,
    LEGACY_STATUS_LOCK_KEY,
    FILTERS_STATUS_KEY,
    LEGACY_STATUS_VALUE_KEY,
    FILTERS_DATE_FROM_KEY,
    FILTERS_DATE_TO_KEY,
  ].forEach((k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  })
}

const persistLockedFilters = (status, from, to) => {
  try {
    localStorage.setItem(FILTERS_LOCKED_KEY, '1')
    localStorage.setItem(FILTERS_STATUS_KEY, status)
    localStorage.setItem(FILTERS_DATE_FROM_KEY, from)
    localStorage.setItem(FILTERS_DATE_TO_KEY, to)
    localStorage.removeItem(LEGACY_STATUS_LOCK_KEY)
    localStorage.removeItem(LEGACY_STATUS_VALUE_KEY)
  } catch {
    /* ignore */
  }
}

const getInitialFilterState = () => {
  const filtersLocked = readFiltersLocked()
  const f = readPersistedFilters()
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

const QueryList = () => {
  const navigate = useNavigate()
  const [filterInit] = useState(() => getInitialFilterState())
  const [queries, setQueries] = useState([])
  const [pagination, setPagination] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(filterInit.statusFilter)
  const [filtersLocked, setFiltersLocked] = useState(filterInit.filtersLocked)
  const [dateFrom, setDateFrom] = useState(filterInit.dateFrom)
  const [dateTo, setDateTo] = useState(filterInit.dateTo)
  const [pageNumber, setPageNumber] = useState(1)

  const STATUS_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'drafted', label: 'Drafted' },
    { value: 'convertedToQuotation', label: 'Converted to Quotation' },
    { value: 'closed', label: 'Closed' },
  ]
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const fetchQueries = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await withMinimumDelay(() =>
        queryService.getAll({
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
      setQueries(result?.queries || [])
      setPagination(result?.pagination || null)
    } catch (err) {
      toastError(err?.message || 'Failed to load queries')
      setError(err?.message || 'Failed to load queries')
      setQueries([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  const [searchDebounced, setSearchDebounced] = useState(searchTerm)
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    setPageNumber(1)
  }, [searchDebounced, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    if (!filtersLocked) return
    persistLockedFilters(statusFilter, dateFrom, dateTo)
  }, [statusFilter, dateFrom, dateTo, filtersLocked])

  useEffect(() => {
    fetchQueries()
  }, [pageNumber, pageSize, searchDebounced, statusFilter, dateFrom, dateTo])

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
      clearPersistedFilters()
      return
    }
    setFiltersLocked(true)
    persistLockedFilters(statusFilter, dateFrom, dateTo)
  }

  const handleDeleteClick = (queryId) => {
    setConfirmDelete({ visible: true, id: queryId })
  }

  const handleDeleteConfirm = async () => {
    const queryId = confirmDelete.id
    setConfirmDelete({ visible: false, id: null })
    if (queryId == null) return
    try {
      await queryService.delete(queryId)
      toastSuccess('Query deleted successfully')
      fetchQueries()
    } catch (err) {
      toastError(err?.message || 'Failed to delete query')
    }
  }

  const pag = pagination
  const totalPages = pag?.totalPages ?? 1
  const currentPage = pag?.currentPage ?? 1

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Queries</strong>
              <CButton color="primary" onClick={() => navigate('/queries/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Query
              </CButton>
            </CCardHeader>

            <CCardBody>
              <CRow className="mb-3 g-2 align-items-end">
                <CCol md={3}>
                  <Filtered
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="mb-1 small text-muted">From date</CFormLabel>
                  <CFormInput
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="mb-1 small text-muted">To date</CFormLabel>
                  <CFormInput
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </CCol>
                <CCol md={3} className="d-flex flex-wrap align-items-end gap-2">
                  <div className="flex-grow-1" style={{ minWidth: 140 }}>
                    <CFormLabel className="mb-1 small text-muted">Status</CFormLabel>
                    <CFormSelect
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
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
                        : 'Lock filters (status and from/to dates stay when you return to Queries)'
                    }
                    onClick={toggleFiltersLock}
                  >
                    <CIcon icon={filtersLocked ? cilLockLocked : cilLockUnlocked} />
                  </CButton>
                </CCol>
              </CRow>

              {error && (
                <div className="text-danger small mb-2">{error}</div>
              )}

              {loading ? (
                <div className="text-center p-5">
                  <Loader message="Loading queries..." />
                </div>
              ) : (
                <>
                  <CTable hover responsive bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Query code</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Company</CTableHeaderCell>
                        <CTableHeaderCell>Products</CTableHeaderCell>
                        <CTableHeaderCell>Quotation no.</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {queries?.length > 0 ? (
                        queries.map((q, index) => (
                          <CTableRow
                            key={q._id || q.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/queries/${q._id || q.id}`)}
                          >
                            <CTableDataCell>{(currentPage - 1) * pageSize + index + 1}</CTableDataCell>
                            <CTableDataCell>
                              <strong>{q.queryCode || '—'}</strong>
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={q.status === 'closed' ? 'secondary' : q.status === 'convertedToQuotation' ? 'success' : q.status === 'progress' ? 'primary' : q.status && q.status.startsWith('followup') ? 'warning' : 'info'}>
                                {q.status || 'pending'}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              <strong>{q.companyInfo?.name || '-'}</strong>
                              {(q.companyInfo?.purchaseManagers?.length > 0
                                ? (q.companyInfo.purchaseManagers || []).map((m) => m.name || m.phone).filter(Boolean).join(', ')
                                : q.companyInfo?.purchase_manager_name || q.companyInfo?.purchase_manager_phone
                              ) && (
                                  <div className="text-muted small">
                                    {q.companyInfo?.purchaseManagers?.length > 0
                                      ? q.companyInfo.purchaseManagers.map((pm, index) => (
                                        <div key={index}>
                                          {pm.name} {pm.phone ? `(${pm.phone})` : ""}
                                        </div>
                                      ))
                                      : "-"}
                                  </div>
                                )}
                            </CTableDataCell>
                            <CTableDataCell>
                              {q.products?.length
                                ? `${q.products.length} item(s)`
                                : '-'}
                            </CTableDataCell>
                            <CTableDataCell className="small">
                              {Array.isArray(q.convertedQuotations) && q.convertedQuotations.length > 0 ? (
                                q.convertedQuotations.map((ref) => {
                                  const qid = ref.quotationId?._id ?? ref.quotationId
                                  const code = ref.quotationCode || qid || '—'
                                  return (
                                    <div key={String(qid)}>
                                      <span
                                        role="link"
                                        tabIndex={0}
                                        className="text-primary text-decoration-underline"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (qid) navigate(`/quotations/${qid}`)
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            if (qid) navigate(`/quotations/${qid}`)
                                          }
                                        }}
                                      >
                                        {code}
                                      </span>
                                    </div>
                                  )
                                })
                              ) : (
                                '—'
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              {q.createdAt ? (
                                <>
                                  {formatDateDdMmYyyy(q.createdAt)}
                                  <div className="text-muted small">
                                    {new Date(q.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                    })}
                                  </div>
                                </>
                              ) : (
                                '-'
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CButton
                                color="info"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/queries/${q._id || q.id}`)
                                }}
                                title="View"
                              >
                                <EyeIcon />
                              </CButton>
                              {q.status !== 'closed' && (
                                <CButton
                                  color="warning"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/queries/edit/${q._id || q.id}`)
                                  }}
                                  title="Edit"
                                >
                                  <CIcon icon={cilPencil} />
                                </CButton>
                              )}
                              <CButton
                                color="danger"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteClick(q._id || q.id)
                                }}
                                title="Delete"
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      ) : (
                        <CTableRow>
                          <CTableDataCell colSpan={8} className="text-center">
                            No queries found.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>

                  {totalPages > 1 && (
                    <CPagination className="mt-3 justify-content-center">
                      <CPaginationItem
                        disabled={currentPage <= 1}
                        onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </CPaginationItem>
                      <CPaginationItem active>
                        {currentPage} / {totalPages}
                      </CPaginationItem>
                      <CPaginationItem
                        disabled={currentPage >= totalPages}
                        onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
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

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Query?"
        message="Are you sure you want to delete this query? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  )
}

export default QueryList
