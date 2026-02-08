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
import { useNavigate, useParams } from 'react-router-dom'
import brandService from '../../services/brandService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const BrandForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo: '',
    website: '',
    status: 'active',
  })

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 🔹 FETCH BRAND WHEN EDITING (this was missing)
  useEffect(() => {
    if (!isEdit) return

    const fetchBrand = async () => {
      setLoading(true)
      try {
        const res = await withMinimumDelay(() => brandService.getById(id))
        const brand = res?.data || res

        setFormData({
          name: brand.name || '',
          description: brand.description || '',
          logo: brand.logo || '',
          website: brand.website || '',
          status: brand.status || 'active',
        })
      } catch (err) {
        toastError('Failed to load brand details')
      } finally {
        setLoading(false)
      }
    }

    fetchBrand()
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // 🔹 CREATE vs UPDATE
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (isEdit) {
        await brandService.update(id, formData)
        toastSuccess('Brand updated successfully')
      } else {
        await brandService.create(formData)
        toastSuccess('Brand created successfully')
      }
      navigate('/brands')
    } catch (err) {
      toastError(err?.message || 'Failed to save brand')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader message="Loading brand..." />
      </div>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <strong>{isEdit ? 'Edit Brand' : 'Add Brand'}</strong>
          </CCardHeader>

          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              {/* Row 1: Brand Name + Website */}
              <CRow className="mb-3">
                <CCol md={6} className="mb-3 mb-md-0">
                  <CFormLabel>Brand Name *</CFormLabel>
                  <CFormInput
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Website</CFormLabel>
                  <CFormInput
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                  />
                </CCol>
              </CRow>

              {/* Row 2: Logo URL + Status */}
              <CRow className="mb-3">
                <CCol md={6} className="mb-3 mb-md-0">
                  <CFormLabel>Logo URL</CFormLabel>
                  <CFormInput
                    name="logo"
                    value={formData.logo}
                    onChange={handleChange}
                    placeholder="https://example.com/logo.png"
                  />
                </CCol>
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
                  placeholder="Enter brand description..."
                />
              </div>

              {/* Row 4: Actions - button aligned right */}
              <div className="d-flex justify-content-end gap-2 pt-2">
                <CButton color="secondary" variant="outline" onClick={() => navigate('/brands')}>
                  Cancel
                </CButton>
                <CButton color="primary" type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : isEdit ? (
                    'Update Brand'
                  ) : (
                    'Create Brand'
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

export default BrandForm
