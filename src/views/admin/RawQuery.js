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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CBadge,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import { EyeIcon } from '../../components'
import rawQueryService from '../../services/rawQueryService'
import industryService from '../../services/industryService'
import Filtered from '../../filtered/Filtered'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const RawQuery = () => {
  const navigate = useNavigate()
  const [queries, setQueries] = useState([])
  const [pagination, setPagination] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingQuery, setEditingQuery] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const [industries, setIndustries] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    industryId: '',
    description: '',
    priority: 'medium',
  })

  const handleOpenModal = (query = null) => {
    if (query) {
      setEditingQuery(query)
      const industryId = query.industry_id
        ? (typeof query.industry_id === 'object' ? query.industry_id._id || query.industry_id.id : query.industry_id)
        : ''
      setFormData({
        title: query.title || '',
        industryId: industryId || '',
        description: query.description || '',
        priority: query.priority || 'medium',
      })
    } else {
      setEditingQuery(null)
      setFormData({
        title: '',
        industryId: '',
        description: '',
        priority: 'medium',
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingQuery(null)
    setFormData({
      title: '',
      industryId: '',
      description: '',
      priority: 'medium',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      ...formData,
      industryId: formData.industryId || null,
    }
    if (!editingQuery) {
      return
    }
    try {
      await rawQueryService.update(editingQuery._id || editingQuery.id, data)
      toastSuccess('Raw query updated successfully')
      await fetchRawQueries()
      handleCloseModal()
    } catch (err) {
      toastError(err?.message || 'Failed to update raw query')
    }
  }

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id })
  }

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id
    setConfirmDelete({ visible: false, id: null })
    if (!id) return
    try {
      await rawQueryService.delete(id)
      toastSuccess('Raw query deleted successfully')
      await fetchRawQueries()
    } catch (err) {
      toastError(err?.message || 'Failed to delete raw query')
    }
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <CBadge color="danger">High</CBadge>
      case 'medium':
      case 'normal':
        return <CBadge color="secondary">Medium</CBadge>
      case 'low':
        return <CBadge color="info">Low</CBadge>
      default:
        return <CBadge color="secondary">{priority}</CBadge>
    }
  }

  const fetchRawQueries = async (options = {}) => {
    try {
      setLoading(true)
      setError('')
      const response = await withMinimumDelay(() =>
        rawQueryService.getAll({
          pageNumber,
          pageSize,
          search: searchTerm,
          ...options,
        })
      )
      const payload = response?.data || {}
      setQueries(payload.rawQueries || [])
      setPagination(payload.pagination || null)
    } catch (err) {
      toastError(err?.message || 'Failed to load raw queries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const response = await industryService.getAll({ pageSize: 100 })
        const payload = response?.data || response
        setIndustries(payload?.industries || [])
      } catch {
        setIndustries([])
      }
    }
    fetchIndustries()
  }, [])

  useEffect(() => {
    setPageNumber(1)
  }, [searchTerm])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRawQueries()
    }, 300)
    return () => clearTimeout(timer)
  }, [pageNumber, pageSize, searchTerm])

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Raw Queries</strong>
              <CButton color="primary" onClick={() => navigate('/raw-query/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Raw Query
              </CButton>
            </CCardHeader>

            <CCardBody>
              <Filtered
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
              {error && <div className="text-danger mb-2">{error}</div>}
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>SNo</CTableHeaderCell>
                    <CTableHeaderCell>Query No.</CTableHeaderCell>
                    <CTableHeaderCell>Title</CTableHeaderCell>
                    <CTableHeaderCell>Industry</CTableHeaderCell>
                    <CTableHeaderCell>Priority</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {loading ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7}>
                        <Loader message="Loading raw queries..." />
                      </CTableDataCell>
                    </CTableRow >
                  ) : (
                    <>
                  {queries && queries?.map((query, index) => (
                    <CTableRow key={query._id || query.id}
                    onClick={()=> navigate(`/raw-query/${query._id || query.id}`)}
                    style={{cursor:'pointer'}}
                    >
                      <CTableDataCell>{(pageNumber - 1) * pageSize + index + 1}</CTableDataCell>
                      <CTableDataCell>
                        <span className="badge bg-dark">{query.raw_query_number || query.rawQueryNumber || '-'}</span>
                      </CTableDataCell>
                      <CTableDataCell>
                        <strong>{query.title || '-'}</strong>
                      </CTableDataCell>
                      <CTableDataCell>
                        {query.industry_id && typeof query.industry_id === 'object'
                          ? query.industry_id.name || '-'
                          : query.company_info || query.companyInfo || '-'}
                      </CTableDataCell>
                      <CTableDataCell>{getPriorityBadge(query.priority)}</CTableDataCell>
                      <CTableDataCell>
                        {new Date(query.createdAt || query.created_at).toLocaleDateString()}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          color="info"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/raw-query/${query._id || query.id}`)}
                          title="View"
                        >
                          <EyeIcon />
                        </CButton>
                        <CButton
                          color="warning"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenModal(query)}}
                          title="Edit"
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(query._id || query.id)}}
                          title="Delete"
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {(!queries || queries.length === 0) && (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center">
                        No raw queries found. Click "Add Raw Query" to create one.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                    </>
                  )}
                </CTableBody>
              </CTable>
              {pagination && pagination.totalPages > 1 && (
                <CPagination className="mt-3" aria-label="Raw query pages">
                  <CPaginationItem
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </CPaginationItem>
                  {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
                    <CPaginationItem
                      key={page}
                      active={page === pagination.currentPage}
                      onClick={() => setPageNumber(page)}
                    >
                      {page}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPageNumber((prev) => prev + 1)}
                  >
                    Next
                  </CPaginationItem>
                </CPagination>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Add/Edit Modal */}
      <CModal visible={showModal} onClose={handleCloseModal} size="lg">
        <CModalHeader>
          <CModalTitle>{editingQuery ? 'Edit Raw Query' : 'Add New Raw Query'}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <CRow>
              <CCol md={12}>
                <div className="mb-3">
                  <CFormLabel htmlFor="title">Title</CFormLabel>
                  <CFormInput
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Short title for the raw query"
                  />
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={12}>
                <div className="mb-3">
                  <CFormLabel htmlFor="industryId">Industry</CFormLabel>
                  <CFormSelect
                    id="industryId"
                    value={formData.industryId}
                    onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
                  >
                    <option value="">Select industry</option>
                    {industries.map((industry) => (
                      <option key={industry._id || industry.id} value={industry._id || industry.id}>
                        {industry.name}
                        {industry.location ? ` (${industry.location})` : ''}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={12}>
                <div className="mb-3">
                  <CFormLabel htmlFor="priority">Priority</CFormLabel>
                  <CFormSelect
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </CFormSelect>
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={12}>
                <div className="mb-3">
                  <CFormLabel htmlFor="description">Description</CFormLabel>
                  <CFormTextarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseModal}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit">
              {editingQuery ? 'Update' : 'Create'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Raw Query?"
        message="Are you sure you want to delete this raw query? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  )
}

export default RawQuery
