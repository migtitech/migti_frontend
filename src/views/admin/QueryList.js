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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import { EyeIcon } from '../../components'
import queryService from '../../services/queryService'
import Filtered from '../../filtered/Filtered'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const QueryList = () => {
  const navigate = useNavigate()
  const [queries, setQueries] = useState([])
  const [pagination, setPagination] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pageNumber, setPageNumber] = useState(1)

  const STATUS_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'closed', label: 'Closed' },
    { value: 'convertedToQuotation', label: 'Completed' },
    { value: 'followup01pending', label: 'Follow-up 1' },
    { value: 'followup02pending', label: 'Follow-up 2' },
    { value: 'followup03pending', label: 'Follow-up 3' },
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
  }, [searchDebounced, statusFilter])

  useEffect(() => {
    fetchQueries()
  }, [pageNumber, pageSize, searchDebounced, statusFilter])

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
              <CRow className="mb-3 g-2">
                <CCol md={4}>
                  <Filtered
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                  />
                </CCol>
                <CCol md={4}>
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
                  <CTable hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Query code</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Company</CTableHeaderCell>
                        <CTableHeaderCell>Products</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {queries?.length > 0 ? (
                        queries.map((q, index) => (
                          <CTableRow key={q._id || q.id}>
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
                                    ? (q.companyInfo.purchaseManagers || []).map((m) => m.name || m.phone).filter(Boolean).join(', ')
                                    : `${q.companyInfo?.purchase_manager_name || ''}${q.companyInfo?.purchase_manager_phone ? ` • ${q.companyInfo.purchase_manager_phone}` : ''}`}
                                </div>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              {q.products?.length
                                ? `${q.products.length} item(s)`
                                : '-'}
                            </CTableDataCell>
                            <CTableDataCell>
                              {q.createdAt
                                ? new Date(q.createdAt).toLocaleDateString()
                                : '-'}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CButton
                                color="info"
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/queries/${q._id || q.id}`)}
                                title="View"
                              >
                                <EyeIcon />
                              </CButton>
                              <CButton
                                color="warning"
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/queries/edit/${q._id || q.id}`)}
                                title="Edit"
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                              <CButton
                                color="danger"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(q._id || q.id)}
                                title="Delete"
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      ) : (
                    <CTableRow>
                      <CTableDataCell colSpan={9} className="text-center">
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
