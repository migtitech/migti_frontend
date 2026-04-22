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
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilSearch } from '@coreui/icons'
import { EyeIcon } from '../../components'
import industryBranchService from '../../services/industryBranchService'
import industryService from '../../services/industryService'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'
import usePermissions from '../../hooks/usePermissions'

const IndustryBranchList = () => {
  const navigate = useNavigate()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const [branches, setBranches] = useState([])
  const [industries, setIndustries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterIndustryId, setFilterIndustryId] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const fetchIndustries = async () => {
    try {
      const res = await industryService.getAll({ pageNumber: 1, pageSize: 500 })
      const data = res?.data ?? res
      const list = data?.industries ?? data?.data?.industries ?? []
      setIndustries(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Failed to fetch industries', err)
    }
  }

  const fetchBranches = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { pageNumber: page, pageSize: 10, search: searchTerm || undefined }
      if (filterIndustryId) params.industryId = filterIndustryId
      const res = await withMinimumDelay(() => industryBranchService.getAll(params))
      const data = res?.data?.data || res?.data || res
      setBranches(data?.branches || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      toastError(err?.message || 'Failed to fetch client branches')
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, filterIndustryId])

  useEffect(() => {
    fetchIndustries()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchBranches(), 300)
    return () => clearTimeout(timer)
  }, [fetchBranches])

  const handleDeleteClick = (id) => setConfirmDelete({ visible: true, id })
  const handleDeleteConfirm = async () => {
    const bid = confirmDelete.id
    setConfirmDelete({ visible: false, id: null })
    if (!bid) return
    try {
      await industryBranchService.delete(bid)
      toastSuccess('Client branch deleted successfully')
      fetchBranches()
    } catch (err) {
      toastError(err?.message || 'Failed to delete client branch')
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Client branches</strong>
            {canCreate('industry_branches') && (
              <CButton color="primary" onClick={() => navigate('/industry-branches/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add client branch
              </CButton>
            )}
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
                    placeholder="Search branches..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setPage(1)
                    }}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={6}>
                <CFormSelect
                  value={filterIndustryId}
                  onChange={(e) => {
                    setFilterIndustryId(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All clients</option>
                  {industries.map((ind) => (
                    <option key={ind._id} value={ind._id}>
                      {ind.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
            {loading ? (
              <Loader message="Loading client branches..." />
            ) : (
              <>
              <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Client</CTableHeaderCell>
                      <CTableHeaderCell>Branch Name</CTableHeaderCell>
                      <CTableHeaderCell>Location</CTableHeaderCell>
                      <CTableHeaderCell>GST</CTableHeaderCell>
                      <CTableHeaderCell>Address</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {branches.map((branch, index) => (
                      <CTableRow
                        key={branch._id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/industry-branches/' + branch._id)}
                      >
                        <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>
                        <CTableDataCell>
                          {typeof branch.industryId === 'object'
                            ? branch.industryId?.name || '-'
                            : '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <strong>{branch.name}</strong>
                        </CTableDataCell>
                        <CTableDataCell>{branch.location || '-'}</CTableDataCell>
                        <CTableDataCell>{branch.gst || '-'}</CTableDataCell>
                        <CTableDataCell>{branch.address || '-'}</CTableDataCell>
                        <CTableDataCell onClick={(e) => e.stopPropagation()}>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate('/industry-branches/' + branch._id)
                            }}
                            title="View"
                          >
                            <EyeIcon />
                          </CButton>
                          {canUpdate('industry_branches') && (
                            <CButton
                              color="warning"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate('/industry-branches/edit/' + branch._id)
                              }}
                              title="Edit"
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          )}
                          {canDelete('industry_branches') && (
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(branch._id)
                              }}
                              title="Delete"
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                    {branches.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={7} className="text-center">
                          No client branches found. Select a client and create a branch.
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
                {pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="small text-medium-emphasis">
                      Showing {((pagination?.currentPage ?? 1) - 1) * (pagination?.itemsPerPage ?? 10) + 1}
                      -{Math.min((pagination?.currentPage ?? 1) * (pagination?.itemsPerPage ?? 10), pagination?.totalItems ?? 0)} of {pagination?.totalItems ?? 0}
                    </div>
                    <CPagination className="mb-0">
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
                  </div>
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
        title="Delete client branch?"
        message="Are you sure you want to delete this client branch?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default IndustryBranchList
