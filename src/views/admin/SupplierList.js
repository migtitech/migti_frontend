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
  CFormSelect,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilSearch } from '@coreui/icons'
import { EyeIcon } from '../../components'
import supplierService from '../../services/supplierService'
import categoryService from '../../services/categoryService'
import areaService from '../../services/areaService'
import branchService from '../../services/branchService'
import { Loader, ConfirmDialog, SearchableDropdown } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'
import usePermissions from '../../hooks/usePermissions'
import useBranchContext from '../../hooks/useBranchContext'

const SupplierList = () => {
  const navigate = useNavigate()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const { branchId: userBranchId, canSelectBranch } = useBranchContext()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubcategory, setFilterSubcategory] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [branchFilterId, setBranchFilterId] = useState('')
  const [branchDefaultApplied, setBranchDefaultApplied] = useState(false)
  const [companyBranches, setCompanyBranches] = useState([])
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [areas, setAreas] = useState([])

  useEffect(() => {
    let cancelled = false
    const loadBranches = async () => {
      try {
        const response = await branchService.getAll({ pageNumber: 1, pageSize: 100 })
        if (cancelled) return
        const list = response?.data?.branches ?? response?.data?.data?.branches ?? response?.branches ?? (Array.isArray(response?.data) ? response.data : [])
        const arr = Array.isArray(list) ? list : []
        setCompanyBranches(arr.map((b) => ({ ...b, id: b.id || b._id })))
      } catch {
        if (!cancelled) setCompanyBranches([])
      }
    }
    loadBranches()
    return () => { cancelled = true }
  }, [])

  // Branch isolation: default to user's branch so list shows only that branch's data
  useEffect(() => {
    if (branchDefaultApplied || !userBranchId || companyBranches.length === 0) return
    const id = String(userBranchId)
    if (companyBranches.some((b) => String(b.id || b._id) === id)) {
      setBranchFilterId(id)
      setBranchDefaultApplied(true)
    }
  }, [userBranchId, companyBranches, branchDefaultApplied])

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        search: searchTerm || undefined,
      }
      if (filterSubcategory) {
        params.subcategory = filterSubcategory
      } else if (filterCategory) {
        params.category = filterCategory
      }
      if (filterArea) {
        const areaObj = areas.find((a) => (a._id || a.id) === filterArea)
        if (areaObj?.name) params.area = areaObj.name
      }
      // Branch isolation: filter by selected branch or user's branch so only that branch's data shows
      const effectiveBranchId = branchFilterId || userBranchId
      if (effectiveBranchId) params.branchId = effectiveBranchId
      const res = await withMinimumDelay(() => supplierService.getAll(params))
      const data = res?.data || res
      setSuppliers(data?.suppliers || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      toastError(err?.message || 'Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, filterCategory, filterSubcategory, filterArea, areas, branchFilterId, userBranchId])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchSuppliers])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await categoryService.getAll({ parent: '', pageSize: 100 })
        const data = res?.data || res
        if (!cancelled) setCategories(data?.categories || [])
      } catch {
        if (!cancelled) setCategories([])
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await areaService.getAll({ pageSize: 100 })
        const data = res?.data || res
        if (!cancelled) setAreas(data?.areas || [])
      } catch {
        if (!cancelled) setAreas([])
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!filterCategory) {
      setSubcategories([])
      setFilterSubcategory('')
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const res = await categoryService.getAll({ parent: filterCategory, pageSize: 100 })
        const data = res?.data || res
        if (!cancelled) setSubcategories(data?.categories || [])
        if (!cancelled) setFilterSubcategory('')
      } catch {
        if (!cancelled) setSubcategories([])
      }
    }
    load()
    return () => { cancelled = true }
  }, [filterCategory])

  const handleFilterCategoryChange = (val) => {
    setFilterCategory(val || '')
    setPage(1)
  }

  const handleFilterSubcategoryChange = (val) => {
    setFilterSubcategory(val || '')
    setPage(1)
  }

  const handleFilterAreaChange = (val) => {
    setFilterArea(val || '')
    setPage(1)
  }

  const branchById = useMemo(() => {
    const map = new Map()
    companyBranches.forEach((b) => {
      const id = b.id || b._id
      if (id) map.set(String(id), b.name || b.branchcode || id)
    })
    return map
  }, [companyBranches])

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id })
  }

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id
    setConfirmDelete({ visible: false, id: null })
    if (!id) return
    try {
      await supplierService.delete(id)
      toastSuccess('Supplier deleted successfully')
      fetchSuppliers()
    } catch (err) {
      toastError(err?.message || 'Failed to delete supplier')
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Suppliers</strong>
            {canCreate('suppliers') && (
              <CButton color="primary" onClick={() => navigate('/suppliers/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Supplier
              </CButton>
            )}
          </CCardHeader>
          <CCardBody style={{ overflow: 'visible' }}>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}
            <CRow className="mb-3 g-2 align-items-end suppliers-filter-row" style={{ position: 'relative', zIndex: 10, overflow: 'visible' }}>
              <CCol xs={12} sm={6} md={4} lg={4} style={{ overflow: 'visible', minWidth: 0 }}>
                <label className="form-label small text-body-secondary mb-1">Search</label>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilSearch} />
                  </CInputGroupText>
                  <CFormInput
                    type="text"
                    placeholder="Search ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CInputGroup>
              </CCol>
              <CCol xs={12} sm={6} md={2} lg={2}>
                <label className="form-label small text-body-secondary mb-1">Branch</label>
                <CFormSelect
                  value={branchFilterId}
                  onChange={(e) => {
                    setBranchFilterId(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Branch filter"
                  className="w-100"
                >
                  <option value="">All branches</option>
                  {companyBranches.map((b) => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.name || b.branchcode || b.id}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} sm={6} md={2} lg={2} style={{ overflow: 'visible' }}>
                <SearchableDropdown
                  label="Category"
                  options={categories}
                  value={filterCategory}
                  onChange={handleFilterCategoryChange}
                  placeholder="Select category"
                  maxDisplayCount={5}
                  getOptionLabel={(opt) => opt?.name ?? ''}
                  getOptionValue={(opt) => opt?._id ?? opt?.id ?? ''}
                />
              </CCol>
              <CCol xs={12} sm={6} md={2} lg={2} style={{ overflow: 'visible' }}>
                <SearchableDropdown
                  label="Subcategory"
                  options={subcategories}
                  value={filterSubcategory}
                  onChange={handleFilterSubcategoryChange}
                  placeholder="Select subcategory"
                  maxDisplayCount={5}
                  getOptionLabel={(opt) => opt?.name ?? ''}
                  getOptionValue={(opt) => opt?._id ?? opt?.id ?? ''}
                  disabled={!filterCategory}
                />
              </CCol>
              <CCol xs={12} sm={6} md={2} lg={2} style={{ overflow: 'visible' }}>
                <SearchableDropdown
                  label="Zone"
                  options={areas}
                  value={filterArea}
                  onChange={handleFilterAreaChange}
                  placeholder="Select zone"
                  maxDisplayCount={5}
                  getOptionLabel={(opt) => opt?.name ?? ''}
                  getOptionValue={(opt) => opt?._id ?? opt?.id ?? ''}
                />
              </CCol>
            </CRow>
            {loading ? (
              <Loader message="Loading suppliers..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>SNo</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Branch</CTableHeaderCell>
                      <CTableHeaderCell>Shop Name</CTableHeaderCell>
                      <CTableHeaderCell>Phone 1</CTableHeaderCell>
                      <CTableHeaderCell>Email</CTableHeaderCell>
                      <CTableHeaderCell>Other Contact</CTableHeaderCell>
                      <CTableHeaderCell>Label</CTableHeaderCell>
                      <CTableHeaderCell>GST</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {suppliers.map((supplier, index) => (
                      <CTableRow
                        key={supplier._id}
                        onClick={() => navigate(`/suppliers/${supplier._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <strong>{supplier.name}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          {typeof supplier.branchId === 'object' && supplier.branchId?.name
                            ? supplier.branchId.name
                            : supplier.branchId
                              ? branchById.get(String(supplier.branchId)) || supplier.branchId
                              : '-'}
                        </CTableDataCell>
                        <CTableDataCell>{supplier.shopname || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.phone_1 || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.email || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.other_contact || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.label || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.gst || '-'}</CTableDataCell>
                        <CTableDataCell onClick={(e) => e.stopPropagation()}>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/suppliers/${supplier._id}`)
                            }}
                            title="View"
                          >
                            <EyeIcon />
                          </CButton>
                          {canUpdate('suppliers') && (
                            <CButton
                              color="warning"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/suppliers/edit/${supplier._id}`)
                              }}
                              title="Edit"
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          )}
                          {canDelete('suppliers') && (
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(supplier._id)
                              }}
                              title="Delete"
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                    {suppliers.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={10} className="text-center">
                          {searchTerm || filterCategory || filterSubcategory || filterArea
                            ? 'No suppliers match the current search or filters.'
                            : 'No suppliers found. Click "Add Supplier" to create one.'}
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
        title="Delete Supplier?"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default SupplierList
