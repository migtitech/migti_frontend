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
  CSpinner,
  CAlert,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilChevronBottom, cilChevronRight } from '@coreui/icons'
import categoryService from '../../services/categoryService'
import Filtered from '../../filtered/Filtered'

const CategoryList = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [subcategories, setSubcategories] = useState({})
  const [rootCategories, setRootCategories] = useState([])

  const initialFormData = {
    name: '',
    description: '',
    parent: '',
    status: 'active',
    sortOrder: 0,
  }
  const [formData, setFormData] = useState(initialFormData)

  const fetchCategories = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await categoryService.getAll({
        pageNumber: page,
        pageSize: 10,
        search: searchTerm,
        parent: 'null',
      })
      const data = res?.data || res
      setCategories(data?.categories || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      setError(err?.message || 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllRootCategories = async () => {
    try {
      const res = await categoryService.getAll({
        pageNumber: 1,
        pageSize: 100,
        parent: 'null',
      })
      const data = res?.data || res
      setRootCategories(data?.categories || [])
    } catch (err) {
      console.error('Failed to fetch root categories', err)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, page])

  useEffect(() => {
    fetchAllRootCategories()
  }, [])

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

  const handleOpenModal = (category = null, parentId = '') => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name || '',
        description: category.description || '',
        parent: category.parent?._id || category.parent || '',
        status: category.status || 'active',
        sortOrder: category.sortOrder || 0,
      })
    } else {
      setEditingCategory(null)
      setFormData({ ...initialFormData, parent: parentId })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCategory(null)
    setFormData(initialFormData)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        ...formData,
        sortOrder: parseInt(formData.sortOrder) || 0,
        parent: formData.parent || null,
      }
      if (editingCategory) {
        await categoryService.update(editingCategory._id, payload)
      } else {
        await categoryService.create(payload)
      }
      handleCloseModal()
      fetchCategories()
      fetchAllRootCategories()
      // Refresh subcategories if adding a subcategory
      if (formData.parent) {
        const res = await categoryService.getAll({
          pageNumber: 1,
          pageSize: 100,
          parent: formData.parent,
        })
        const data = res?.data || res
        setSubcategories((prev) => ({ ...prev, [formData.parent]: data?.categories || [] }))
      }
    } catch (err) {
      setError(err?.message || 'Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, parentId = null) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return
    try {
      await categoryService.delete(id)
      fetchCategories()
      fetchAllRootCategories()
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
      setError(err?.message || 'Failed to delete category')
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
            <CButton color="primary" onClick={() => handleOpenModal()}>
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
              <div className="text-center p-4">
                <CSpinner />
              </div>
            ) : (
              <>
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: 40 }}></CTableHeaderCell>
                      <CTableHeaderCell>S No</CTableHeaderCell>
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
                            <strong>{cat.name}</strong>
                          </CTableDataCell>
                          <CTableDataCell>
                            {cat.description?.substring(0, 50) || '-'}
                          </CTableDataCell>
                          <CTableDataCell>{cat.sortOrder}</CTableDataCell>
                          <CTableDataCell>{getStatusBadge(cat.status)}</CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="success"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(null, cat._id)}
                              title="Add Subcategory"
                            >
                              <CIcon icon={cilPlus} />
                            </CButton>
                            <CButton
                              color="warning"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(cat)}
                              title="Edit"
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(cat._id)}
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
                                  color="warning"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenModal(sub)}
                                  title="Edit"
                                >
                                  <CIcon icon={cilPencil} />
                                </CButton>
                                <CButton
                                  color="danger"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(sub._id, cat._id)}
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
                        <CTableDataCell colSpan={7} className="text-center">
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

      <CModal visible={showModal} onClose={handleCloseModal} size="lg">
        <CModalHeader>
          <CModalTitle>
            {editingCategory
              ? 'Edit Category'
              : formData.parent
                ? 'Add Subcategory'
                : 'Add Category'}
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="name">Name *</CFormLabel>
                  <CFormInput
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="parent">Parent Category</CFormLabel>
                  <CFormSelect
                    id="parent"
                    value={formData.parent}
                    onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                  >
                    <option value="">None (Root Category)</option>
                    {rootCategories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
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
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="status">Status</CFormLabel>
                  <CFormSelect
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="sortOrder">Sort Order</CFormLabel>
                  <CFormInput
                    type="number"
                    id="sortOrder"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: e.target.value })
                    }
                  />
                </div>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseModal}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting ? <CSpinner size="sm" /> : editingCategory ? 'Update' : 'Create'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default CategoryList
