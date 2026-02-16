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
import CIcon from '@coreui/icons-react'
import { cilReload } from '@coreui/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import categoryService from '../../services/categoryService'
import groupService from '../../services/groupService'
import { Loader, SearchableDropdown } from '../../components'
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
    group: '',
    parent: '',
    status: 'active',
    categoryCode: '',
  })

  const [groups, setGroups] = useState([])
  const [rootCategories, setRootCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [groupsRefreshing, setGroupsRefreshing] = useState(false)

  const fetchGroups = async () => {
    try {
      const res = await groupService.getAll({
        pageNumber: 1,
        pageSize: 100,
      })
      const data = res?.data || res
      setGroups(data?.groups || [])
    } catch (err) {
      console.error('Failed to fetch groups', err)
    }
  }

  const refreshGroups = async () => {
    setGroupsRefreshing(true)
    try {
      await fetchGroups()
      toastSuccess('Groups refreshed')
    } catch (err) {
      toastError(err?.message || 'Failed to refresh groups')
    } finally {
      setGroupsRefreshing(false)
    }
  }

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
    fetchGroups()
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
          group: category.group?._id || category.group || '',
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
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const { categoryCode, ...rest } = formData
      const payload = {
        ...rest,
        group: formData.group || null,
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

              {/* Row 0.5: Group (select first before category) */}
              <CRow className="mb-3">
                <CCol md={6}>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <CFormLabel className="mb-0">Group</CFormLabel>
                    <CButton
                      color="secondary"
                      variant="ghost"
                      size="sm"
                      onClick={refreshGroups}
                      disabled={groupsRefreshing}
                      title="Refresh groups list"
                      aria-label="Refresh groups"
                    >
                      {groupsRefreshing ? (
                        <CSpinner size="sm" />
                      ) : (
                        <CIcon icon={cilReload} />
                      )}
                    </CButton>
                  </div>
                  <SearchableDropdown
                    options={groups}
                    value={formData.group}
                    onChange={(val) => setFormData((prev) => ({ ...prev, group: val || '' }))}
                    placeholder="Select Group (optional)"
                    maxDisplayCount={5}
                    getOptionLabel={(grp) => `${grp.name || ''}${grp.code ? ` (${grp.code})` : ''}`}
                    getOptionValue={(grp) => grp._id}
                  />
                  <small className="text-muted">Search and select a group. Best 5 matches shown. Click the refresh icon to reload groups.</small>
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

              {/* Row 2: Status */}
              <CRow className="mb-3">
                <CCol md={6}>
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
