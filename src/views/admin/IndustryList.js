import React, { useEffect, useState, useCallback } from 'react'
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
  CAlert,
  CPagination,
  CPaginationItem,
  CFormInput,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilZoom, cilSearch } from '@coreui/icons'
import industryService from '../../services/industryService'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const IndustryList = () => {
  const navigate = useNavigate()
  const [industries, setIndustries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const fetchIndustries = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await withMinimumDelay(() =>
        industryService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm || undefined,
        }),
      )
      const data = res?.data || res
      setIndustries(data?.industries || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      toastError(err?.message || 'Failed to fetch industries')
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIndustries()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchIndustries])

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id })
  }

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id
    setConfirmDelete({ visible: false, id: null })
    if (!id) return
    try {
      await industryService.delete(id)
      toastSuccess('Industry deleted successfully')
      fetchIndustries()
    } catch (err) {
      toastError(err?.message || 'Failed to delete industry')
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Industries</strong>
            <CButton color="primary" onClick={() => navigate('/industries/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Industry
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}
            <CRow className="mb-3 align-items-end">
              <CCol md={6}>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilSearch} />
                  </CInputGroupText>
                  <CFormInput
                    type="text"
                    placeholder="Search industries..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setPage(1)
                    }}
                  />
                </CInputGroup>
              </CCol>
            </CRow>
            {loading ? (
              <Loader message="Loading industries..." />
            ) : (
              <>
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Industry Name</CTableHeaderCell>
                      <CTableHeaderCell>Area</CTableHeaderCell>
                      <CTableHeaderCell>Location</CTableHeaderCell>
                      <CTableHeaderCell>Address</CTableHeaderCell>
                      <CTableHeaderCell>Purchase Manager</CTableHeaderCell>
                      <CTableHeaderCell>Phone</CTableHeaderCell>
                      <CTableHeaderCell>Email</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {industries.map((industry, index) => (
                      <CTableRow key={industry._id}
                        onClick={() => navigate(`/industries/${industry._id}`)} 
                        style={{ cursor: 'pointer' }}
                      >
                        <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <strong>{industry.name}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          {typeof industry.area === 'object'
                            ? industry.area?.name || '-'
                            : industry.area || '-'}
                        </CTableDataCell>
                        <CTableDataCell>{industry.location || '-'}</CTableDataCell>
                        <CTableDataCell>{industry.address || '-'}</CTableDataCell>
                        <CTableDataCell>{industry.purchase_manager_name || '-'}</CTableDataCell>
                        <CTableDataCell>{industry.purchase_manager_phone || '-'}</CTableDataCell>
                        <CTableDataCell>{industry.email || '-'}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/industries/${industry._id}`)}
                            title="View"
                          >
                            <CIcon icon={cilZoom} />
                          </CButton>
                          <CButton
                            color="warning"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/industries/edit/${industry._id}`)}}
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
                              handleDeleteClick(industry._id)}}
                            title="Delete"
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                    {industries.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={9} className="text-center">
                          {searchTerm
                            ? 'No industries match the current search.'
                            : 'No industries found. Click "Add Industry" to create one.'}
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
                {pagination.totalPages > 1 && (
                  <CPagination className="justify-content-center">
                    <CPaginationItem
                      disabled={!pagination.hasPrevPage}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </CPaginationItem>
                    {Array.from({ length: pagination.totalPages }, (_, i) => (
                      <CPaginationItem
                        key={i + 1}
                        active={page === i + 1}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </CPaginationItem>
                    ))}
                    <CPaginationItem
                      disabled={!pagination.hasNextPage}
                      onClick={() => setPage(page + 1)}
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

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Industry?"
        message="Are you sure you want to delete this industry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default IndustryList
