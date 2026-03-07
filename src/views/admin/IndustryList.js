import React, { useEffect, useState, useCallback, useMemo } from 'react'
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
import industryService from '../../services/industryService'
import branchService from '../../services/branchService'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'
import usePermissions from '../../hooks/usePermissions'
import useBranchContext from '../../hooks/useBranchContext'

const IndustryList = () => {
  const navigate = useNavigate()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const { branchId: userBranchId, canSelectBranch } = useBranchContext()
  const [industries, setIndustries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [branchDefaultApplied, setBranchDefaultApplied] = useState(false)
  const [branches, setBranches] = useState([])
  const [pagination, setPagination] = useState({})
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  useEffect(() => {
    let cancelled = false
    const loadBranches = async () => {
      try {
        const response = await branchService.getAll({ pageNumber: 1, pageSize: 100 })
        if (cancelled) return
        const list = response?.data?.branches ?? response?.data?.data?.branches ?? response?.branches ?? (Array.isArray(response?.data) ? response.data : [])
        const arr = Array.isArray(list) ? list : []
        setBranches(arr.map((b) => ({ ...b, id: b.id || b._id })))
      } catch {
        if (!cancelled) setBranches([])
      }
    }
    loadBranches()
    return () => { cancelled = true }
  }, [])

  // Branch isolation: default to user's branch so list shows only that branch's data
  useEffect(() => {
    if (branchDefaultApplied || !userBranchId || branches.length === 0) return
    const id = String(userBranchId)
    if (branches.some((b) => String(b.id || b._id) === id)) {
      setBranchFilter(id)
      setBranchDefaultApplied(true)
    }
  }, [userBranchId, branches, branchDefaultApplied])

  const fetchIndustries = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        search: searchTerm || undefined,
        category: categoryFilter || undefined,
      }
      // Branch isolation: filter by selected branch or user's branch so only that branch's data shows
      const effectiveBranchId = branchFilter || userBranchId
      if (effectiveBranchId) params.branchId = effectiveBranchId
      const res = await withMinimumDelay(() => industryService.getAll(params))
      const data = res?.data || res
      setIndustries(data?.industries || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      toastError(err?.message || 'Failed to fetch industries')
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, categoryFilter, branchFilter, userBranchId])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIndustries()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchIndustries])

  const branchById = useMemo(() => {
    const map = new Map()
    branches.forEach((b) => {
      const id = b.id || b._id
      if (id) map.set(String(id), b.name || b.branchcode || id)
    })
    return map
  }, [branches])

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
            {canCreate('industries') && (
              <CButton color="primary" onClick={() => navigate('/industries/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Industry
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
                    placeholder="Search industries..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setPage(1)
                    }}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={2}>
                <CFormLabel className="small text-muted">Branch</CFormLabel>
                <CFormSelect
                  value={branchFilter}
                  onChange={(e) => {
                    setBranchFilter(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Branch filter"
                >
                  <option value="">All branches</option>
                  {branches.map((b) => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.name || b.branchcode || b.id}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormSelect
                  label="Category"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="">All Categories</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </CFormSelect>
              </CCol>
            </CRow>
            {loading ? (
              <Loader message="Loading industries..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Industry Name</CTableHeaderCell>
                      <CTableHeaderCell>Branch</CTableHeaderCell>
                      <CTableHeaderCell>Category</CTableHeaderCell>
                      <CTableHeaderCell>GST No</CTableHeaderCell>
                      <CTableHeaderCell>Area</CTableHeaderCell>
                      <CTableHeaderCell>Location</CTableHeaderCell>
                      <CTableHeaderCell>Address</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {industries.map((industry, index) => (
                      <CTableRow
                        key={industry._id}
                        onClick={() => navigate(`/industries/${industry._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <strong>{industry.name}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          {typeof industry.branchId === 'object' && industry.branchId?.name
                            ? industry.branchId.name
                            : industry.branchId
                              ? branchById.get(String(industry.branchId)) || industry.branchId
                              : '-'}
                        </CTableDataCell>
                        <CTableDataCell>{industry.category || '-'}</CTableDataCell>
                        <CTableDataCell>{industry.gstNumber || '-'}</CTableDataCell>
                        <CTableDataCell>
                          {typeof industry.area === 'object'
                            ? industry.area?.name || '-'
                            : industry.area || '-'}
                        </CTableDataCell>
                        <CTableDataCell>{industry.location || '-'}</CTableDataCell>
                        <CTableDataCell>{industry.address || '-'}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/industries/${industry._id}`)
                            }}
                            title="View"
                          >
                            <EyeIcon />
                          </CButton>
                          {canUpdate('industries') && (
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
                          )}
                          {canDelete('industries') && (
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
                          )}
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
