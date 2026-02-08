import React, { useState, useEffect } from 'react'
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
  CAlert,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilChevronBottom, cilChevronRight, cilInfo } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import categoryService from '../../services/categoryService'
import Filtered from '../../filtered/Filtered'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const CategoryList = () => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [expandedCategories, setExpandedCategories] = useState({})
  const [subcategories, setSubcategories] = useState({})
  const [rootCategories, setRootCategories] = useState([])
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null, parentId: null })

  const fetchCategories = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await withMinimumDelay(() =>
        categoryService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
          parent: 'null',
        })
      )
      const data = res?.data || res
      setCategories(data?.categories || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      setError(err?.message || 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, page])

  const toggleExpand = async (categoryId) => {
    if (expandedCategories[categoryId]) {
      setExpandedCategories((prev) => ({ ...prev, [categoryId]: false }))
      return
    }
    try {
      const res = await categoryService.getAll({
        pageNumber: 1,
        pageSize: 100,
        parent: categoryId,
      })
      const data = res?.data || res
      setSubcategories((prev) => ({ ...prev, [categoryId]: data?.categories || [] }))
      setExpandedCategories((prev) => ({ ...prev, [categoryId]: true }))
    } catch (err) {
      console.error('Failed to fetch subcategories', err)
    }
  }

  const handleDeleteClick = (id, parentId = null) => {
    setConfirmDelete({ visible: true, id, parentId })
  }

  const handleDeleteConfirm = async () => {
    const { id, parentId } = confirmDelete
    setConfirmDelete({ visible: false, id: null, parentId: null })
    if (!id) return
    try {
      await categoryService.delete(id)
      toastSuccess('Category deleted successfully')
      fetchCategories()
      if (parentId) {
        const res = await categoryService.getAll({
          pageNumber: 1,
          pageSize: 100,
          parent: parentId,
        })
        const data = res?.data || res
        setSubcategories((prev) => ({ ...prev, [parentId]: data?.categories || [] }))
      }
    } catch (err) {
      toastError(err?.message || 'Failed to delete category')
    }
  }

  const getStatusBadge = (status) => {
    return status === 'active' ? (
      <CBadge color="success">Active</CBadge>
    ) : (
      <CBadge color="secondary">Inactive</CBadge>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Categories</strong>
            <CButton color="primary" onClick={() => navigate('/categories/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Category
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            {loading ? (
              <Loader message="Loading categories..." />
            ) : (
              <>
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: 40 }}></CTableHeaderCell>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Code</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Description</CTableHeaderCell>
                      <CTableHeaderCell>Sort Order</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {categories.map((cat, index) => (
                      <React.Fragment key={cat._id}>
                        <CTableRow>
                          <CTableDataCell>
                            <CButton
                              color="light"
                              size="sm"
                              onClick={() => toggleExpand(cat._id)}
                            >
                              <CIcon
                                icon={
                                  expandedCategories[cat._id]
                                    ? cilChevronBottom
                                    : cilChevronRight
                                }
                                size="sm"
                              />
                            </CButton>
                          </CTableDataCell>
                          <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>
                          <CTableDataCell>
                            <code>{cat.categoryCode || '—'}</code>
                          </CTableDataCell>
                          <CTableDataCell>
                            <strong>{cat.name}</strong>
                          </CTableDataCell>
                          <CTableDataCell>
                            {cat.description?.substring(0, 50) || '-'}
                          </CTableDataCell>
                          <CTableDataCell>{cat.sortOrder}</CTableDataCell>
                          <CTableDataCell>{getStatusBadge(cat.status)}</CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="info"
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/categories/${cat._id}`)}
                              title="View"
                            >
                              <CIcon icon={cilInfo} />
                            </CButton>
                            <CButton
                              color="success"
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/categories/new?parent=${cat._id}`)}
                              title="Add Subcategory"
                            >
                              <CIcon icon={cilPlus} />
                            </CButton>
                            <CButton
                              color="warning"
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/categories/edit/${cat._id}`)}
                              title="Edit"
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(cat._id)}
                              title="Delete"
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                        {expandedCategories[cat._id] &&
                          subcategories[cat._id]?.map((sub) => (
                            <CTableRow key={sub._id} className="table-light">
                              <CTableDataCell></CTableDataCell>
                              <CTableDataCell></CTableDataCell>
                              <CTableDataCell>
                                <code>{sub.categoryCode || '—'}</code>
                              </CTableDataCell>
                              <CTableDataCell className="ps-4">
                                &#8627; {sub.name}
                              </CTableDataCell>
                              <CTableDataCell>
                                {sub.description?.substring(0, 50) || '-'}
                              </CTableDataCell>
                              <CTableDataCell>{sub.sortOrder}</CTableDataCell>
                              <CTableDataCell>{getStatusBadge(sub.status)}</CTableDataCell>
                              <CTableDataCell>
                                <CButton
                                  color="info"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/categories/${sub._id}`)}
                                  title="View"
                                >
                                  <CIcon icon={cilInfo} />
                                </CButton>
                                <CButton
                                  color="warning"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/categories/edit/${sub._id}`)}
                                  title="Edit"
                                >
                                  <CIcon icon={cilPencil} />
                                </CButton>
                                <CButton
                                  color="danger"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(sub._id, cat._id)}
                                  title="Delete"
                                >
                                  <CIcon icon={cilTrash} />
                                </CButton>
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                      </React.Fragment>
                    ))}
                    {categories.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={8} className="text-center">
                          {searchTerm
                            ? `No categories found matching "${searchTerm}"`
                            : 'No categories found. Click "Add Category" to create one.'}
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
        onClose={() => setConfirmDelete({ visible: false, id: null, parentId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Category?"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default CategoryList
