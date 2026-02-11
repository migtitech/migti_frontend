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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilZoom } from '@coreui/icons'
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
  const [pageNumber, setPageNumber] = useState(1)
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
  }, [searchDebounced])

  useEffect(() => {
    fetchQueries()
  }, [pageNumber, pageSize, searchDebounced])

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
              <Filtered
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />

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
                        <CTableHeaderCell>Location</CTableHeaderCell>
                        <CTableHeaderCell>Products</CTableHeaderCell>
                        <CTableHeaderCell>Delivery</CTableHeaderCell>
                        <CTableHeaderCell>Urgent</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {queries?.length > 0 ? (
                        queries.map((q, index) => (
                          <CTableRow key={q._id || q.id}
                          onClick={() => navigate(`/queries/${q._id || q.id}`)}>
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
                              {q.companyInfo?.email && (
                                <div className="text-muted small">{q.companyInfo.email}</div>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>{q.companyInfo?.location || q.delivery?.location || '-'}</CTableDataCell>
                            <CTableDataCell>
                              {q.products?.length
                                ? `${q.products.length} item(s)`
                                : '-'}
                            </CTableDataCell>
                            <CTableDataCell>
                              {q.delivery?.contactPersonName
                                ? `${q.delivery.contactPersonName}${q.delivery.contactPersonPhone ? ` • ${q.delivery.contactPersonPhone}` : ''}`
                                : '-'}
                            </CTableDataCell>
                            <CTableDataCell>
                              {q.delivery?.urgent ? (
                                <CBadge color="danger">Urgent</CBadge>
                              ) : (
                                <CBadge color="secondary">Non-urgent</CBadge>
                              )}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/queries/${q._id || q.id}`)}}
                                title="View"
                              >
                                <CIcon icon={cilZoom} />
                              </CButton>
                              <CButton
                                color="warning"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/queries/edit/${q._id || q.id}`)}}
                                title="Edit"
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                              <CButton
                                color="danger"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(q._id || q.id);
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
                      <CTableDataCell colSpan={10} className="text-center">
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
