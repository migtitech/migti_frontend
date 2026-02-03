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
  CSpinner,
  CAlert,
} from '@coreui/react'
import { useNavigate, useParams } from 'react-router-dom'
import brandService from '../../services/brandService'

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
        const res = await brandService.getById(id)
        const brand = res?.data || res

        setFormData({
          name: brand.name || '',
          description: brand.description || '',
          logo: brand.logo || '',
          website: brand.website || '',
          status: brand.status || 'active',
        })
      } catch (err) {
        setError('Failed to load brand details')
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
      } else {
        await brandService.create(formData)
      }
      navigate('/brands')
    } catch (err) {
      setError(err?.message || 'Failed to save brand')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner />
      </div>
    )
  }

  return (
    <CRow className="justify-content-center">
      <CCol md={8} lg={6}>
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
              <div className="mb-3">
                <CFormLabel>Brand Name *</CFormLabel>
                <CFormInput
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <CFormLabel>Website</CFormLabel>
                <CFormInput
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
              </div>

              <div className="mb-3">
                <CFormLabel>Logo URL</CFormLabel>
                <CFormInput
                  name="logo"
                  value={formData.logo}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="mb-3">
                <CFormLabel>Status</CFormLabel>
                <CFormSelect
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </CFormSelect>
              </div>

              <div className="mb-3">
                <CFormLabel>Description</CFormLabel>
                <CFormTextarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <CButton color="secondary" onClick={() => navigate('/brands')}>
                  Cancel
                </CButton>
                <CButton color="primary" type="submit" disabled={submitting}>
                  {submitting ? (
                    <CSpinner size="sm" />
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
