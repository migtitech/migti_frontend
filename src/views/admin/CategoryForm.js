import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CAlert,
  CSpinner,
} from '@coreui/react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import categoryService from '../../services/categoryService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const CategoryForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const parentFromQuery = searchParams.get('parent') || ''
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent: '',
    status: 'active',
    sortOrder: 0,
    categoryCode: '',
  })

  const [rootCategories, setRootCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchRootCategories = async () => {
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
    fetchRootCategories()
  }, [])

  useEffect(() => {
    if (!isEdit) {
      setFormData((prev) => ({ ...prev, parent: parentFromQuery }))
      return
    }

    const fetchCategory = async () => {
      setLoading(true)
      try {
        const res = await withMinimumDelay(() => categoryService.getById(id))
        const category = res?.data || res

        setFormData({
          name: category.name || '',
          description: category.description || '',
          parent: category.parent?._id || category.parent || '',
          status: category.status || 'active',
          sortOrder: category.sortOrder ?? 0,
          categoryCode: category.categoryCode || '',
        })
      } catch (err) {
        setError('Failed to load category details')
      } finally {
        setLoading(false)
      }
    }

    fetchCategory()
  }, [id, isEdit, parentFromQuery])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'sortOrder' ? (value === '' ? 0 : parseInt(value, 10)) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const { categoryCode, ...rest } = formData
      const payload = {
        ...rest,
        sortOrder: parseInt(formData.sortOrder, 10) || 0,
        parent: formData.parent || null,
      }
      if (isEdit) {
        await categoryService.update(id, payload)
        toastSuccess('Category updated successfully')
      } else {
        await categoryService.create(payload)
        toastSuccess('Category created successfully')
      }
      navigate('/categories')
    } catch (err) {
      toastError(err?.message || 'Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader message="Loading category..." />
      </div>
    )
  }

  const title = isEdit
    ? 'Edit Category'
    : parentFromQuery
      ? 'Add Subcategory'
      : 'Add Category'

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <strong>{title}</strong>
          </CCardHeader>

          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              {/* Row 0: Category Code (read-only, auto-generated) */}
              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Category Code</CFormLabel>
                  <CFormInput
                    name="categoryCode"
                    value={formData.categoryCode || ''}
                    placeholder={
                      isEdit
                        ? (formData.categoryCode ? '' : '—')
                        : formData.parent
                          ? 'Auto-generated (e.g. MIG01SUB01)'
                          : 'Auto-generated (e.g. MIG01)'
                    }
                    readOnly
                    disabled
                    className="bg-light"
                  />
                  {!isEdit && (
                    <small className="text-muted">
                      {formData.parent
                        ? 'Subcategory code will be e.g. MIG01SUB01, MIG01SUB02...'
                        : 'Root category code will be e.g. MIG01, MIG02...'}
                    </small>
                  )}
                </CCol>
              </CRow>

              {/* Row 1: Name + Parent Category */}
              <CRow className="mb-3">
                <CCol md={6} className="mb-3 mb-md-0">
                  <CFormLabel>Name *</CFormLabel>
                  <CFormInput
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Parent Category</CFormLabel>
                  <CFormSelect
                    name="parent"
                    value={formData.parent}
                    onChange={handleChange}
                  >
                    <option value="">None (Root Category)</option>
                    {rootCategories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>

              {/* Row 2: Status + Sort Order */}
              <CRow className="mb-3">
                <CCol md={6} className="mb-3 mb-md-0">
                  <CFormLabel>Status</CFormLabel>
                  <CFormSelect
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </CFormSelect>
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Sort Order</CFormLabel>
                  <CFormInput
                    type="number"
                    name="sortOrder"
                    value={formData.sortOrder}
                    onChange={handleChange}
                    min={0}
                  />
                </CCol>
              </CRow>

              {/* Row 3: Description (full width) */}
              <div className="mb-4">
                <CFormLabel>Description</CFormLabel>
                <CFormTextarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter category description..."
                />
              </div>

              {/* Row 4: Actions */}
              <div className="d-flex justify-content-end gap-2 pt-2">
                <CButton color="secondary" variant="outline" onClick={() => navigate('/categories')}>
                  Cancel
                </CButton>
                <CButton color="primary" type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : isEdit ? (
                    'Update Category'
                  ) : (
                    'Create Category'
                  )}
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default CategoryForm
