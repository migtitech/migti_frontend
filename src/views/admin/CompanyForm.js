import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import companyService from '../../services/companyService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const companySchema = () => yup.object({
  name: yup.string().required('Company name is required').min(2).max(100),
  brandName: yup.string().required('Brand name is required').min(2).max(100),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  gst: yup
    .string()
    .optional()
    .transform((v) => (typeof v === 'string' ? v.trim().toUpperCase() : v || ''))
    .test(
      'gst',
      'Enter a valid 15-character GSTIN (e.g. 22AABCU9603R1ZX)',
      (v) => !v || v === '' || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)
    ),
  mobile: yup.string().optional().max(20),
  address: yup.string().optional().max(500),
  shippingAddress: yup.string().optional().max(500),
  billingAddress: yup.string().optional().max(500),
  website: yup
    .string()
    .optional()
    .nullable()
    .transform((v, o) => (o === '' ? '' : v))
    .test('url', 'Enter a valid URL', (v) => !v || v === '' || /^https?:\/\/.+/.test(v)),
  logoUrl: yup.string().optional().nullable(),
  logoDisplayUrl: yup.string().optional().nullable(),
  isActive: yup.boolean().optional().default(true),
})

const defaultValues = {
  name: '',
  brandName: '',
  email: '',
  gst: '',
  mobile: '',
  address: '',
  shippingAddress: '',
  billingAddress: '',
  website: '',
  logoUrl: '',
  logoDisplayUrl: '',
  isActive: true,
}

const COMPANY_FORM_DRAFT_KEY = 'company_form_draft'

const CompanyForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(companySchema()),
    defaultValues,
    mode: 'onBlur',
  })

  const logoUrl = watch('logoUrl')
  const logoDisplayUrl = watch('logoDisplayUrl')

  useEffect(() => {
    if (!isEdit) {
      // Load draft for new company form, if present
      try {
        const raw = localStorage.getItem(COMPANY_FORM_DRAFT_KEY)
        if (raw) {
          const stored = JSON.parse(raw)
          reset({ ...defaultValues, ...stored })
        } else {
          reset(defaultValues)
        }
      } catch {
        reset(defaultValues)
      }
      return
    }

    const fetchCompany = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => companyService.getById(id))
        const data = res?.data?.company || res?.data || res?.data?.data || {}
        reset({
          name: data.name || '',
          brandName: data.brandName || '',
          email: data.email || '',
          gst: data.gst || '',
          mobile: data.mobile || '',
          address: data.address || '',
          shippingAddress: data.shippingAddress || '',
          billingAddress: data.billingAddress || '',
          website: data.website || '',
          logoUrl: data.logoUrl || '',
          logoDisplayUrl: data.logoDisplayUrl || data.logoUrl || '',
          isActive: data.isActive !== false,
        })
      } catch (err) {
        toastError(err?.message || 'Failed to fetch company')
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [id, isEdit, reset])

  // Autosave draft for new company
  useEffect(() => {
    if (isEdit) return
    const subscription = watch((values) => {
      try {
        localStorage.setItem(COMPANY_FORM_DRAFT_KEY, JSON.stringify(values))
      } catch {
        // ignore storage errors
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, isEdit])

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toastError('Please select an image file (JPEG, PNG, GIF, WebP)')
      return
    }
    setLogoUploading(true)
    try {
      const res = await companyService.uploadLogo(file)
      const data = res?.data?.data || res?.data || {}
      const url = data?.url
      const displayUrl = data?.displayUrl || url
      if (url) {
        setValue('logoUrl', url, { shouldValidate: true })
        setValue('logoDisplayUrl', displayUrl || url, { shouldValidate: true })
        toastSuccess('Logo uploaded')
      } else {
        toastError('Upload failed')
      }
    } catch (err) {
      toastError(err?.message || 'Logo upload failed')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(COMPANY_FORM_DRAFT_KEY)
    } catch {
      // ignore
    }
    reset(defaultValues)
    toastSuccess('Saved company form data cleared')
  }

  const onSubmit = async (values) => {
    setSubmitting(true)
    setError('')
    try {
      const { logoDisplayUrl: _, ...rest } = values
      const payload = {
        ...rest,
        logoUrl: values.logoUrl || undefined,
        mobile: values.mobile || '',
        address: values.address || '',
        shippingAddress: values.shippingAddress || '',
        billingAddress: values.billingAddress || '',
        website: values.website || '',
        isActive: values.isActive !== false,
      }

      if (isEdit) {
        await companyService.update(id, payload)
        toastSuccess('Company updated successfully')
      } else {
        await companyService.create(payload)
        toastSuccess('Company created successfully')
      }
      if (!isEdit) {
        try {
          localStorage.removeItem(COMPANY_FORM_DRAFT_KEY)
        } catch {}
      }
      navigate('/companies')
    } catch (err) {
      toastError(err?.message || 'Failed to save company')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading company..." />
      </div>
    )
  }

  return (
    <CForm onSubmit={handleSubmit(onSubmit)}>
      <CRow className="mb-3">
        <CCol>
          <CButton color="light" onClick={() => navigate('/companies')} className="me-2">
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Companies
          </CButton>
        </CCol>
      </CRow>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError('')}>
          {error}
        </CAlert>
      )}

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>{isEdit ? 'Edit Company' : 'Add Company'}</strong>
          {!isEdit && (
            <CButton color="secondary" size="sm" variant="outline" onClick={handleClearDraft}>
              Clear saved data
            </CButton>
          )}
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Company Name *</CFormLabel>
                <CFormInput {...register('name')} />
                {errors.name && <div className="text-danger small">{errors.name.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Brand Name *</CFormLabel>
                <CFormInput {...register('brandName')} />
                {errors.brandName && <div className="text-danger small">{errors.brandName.message}</div>}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Email *</CFormLabel>
                <CFormInput type="email" {...register('email')} />
                {errors.email && <div className="text-danger small">{errors.email.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Mobile</CFormLabel>
                <CFormInput placeholder="e.g. 9876543210" {...register('mobile')} />
                {errors.mobile && <div className="text-danger small">{errors.mobile.message}</div>}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Website</CFormLabel>
                <CFormInput placeholder="https://example.com" {...register('website')} />
                {errors.website && <div className="text-danger small">{errors.website.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Status</CFormLabel>
                <div className="d-flex align-items-center pt-2">
                  <Controller
                    name="isActive"
                    control={control}
                    defaultValue={true}
                    render={({ field: { value, onChange, onBlur } }) => (
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="company-isActive"
                          checked={Boolean(value)}
                          onChange={(e) => onChange(e.target.checked)}
                          onBlur={onBlur}
                        />
                        <label className="form-check-label" htmlFor="company-isActive">
                          {value ? 'Active' : 'Inactive'}
                        </label>
                      </div>
                    )}
                  />
                </div>
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Address</CFormLabel>
                <CFormTextarea rows={2} {...register('address')} placeholder="Company address (optional)" />
                {errors.address && <div className="text-danger small">{errors.address.message}</div>}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Shipping Address</CFormLabel>
                <CFormTextarea rows={3} {...register('shippingAddress')} placeholder="Shipping address" />
                {errors.shippingAddress && <div className="text-danger small">{errors.shippingAddress.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Billing Address</CFormLabel>
                <CFormTextarea rows={3} {...register('billingAddress')} placeholder="Billing address" />
                {errors.billingAddress && <div className="text-danger small">{errors.billingAddress.message}</div>}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Company Logo</CFormLabel>
                <CFormInput
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleLogoChange}
                  disabled={logoUploading}
                />
                {logoUploading && <small className="text-muted">Uploading to S3...</small>}
                {(logoDisplayUrl || logoUrl) && (
                  <div className="mt-2">
                    <img src={logoDisplayUrl || logoUrl} alt="Logo" style={{ maxHeight: 80, maxWidth: 160, objectFit: 'contain' }} />
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>GST</CFormLabel>
                <CFormInput placeholder="e.g. 22AAAAA0000A1Z5" {...register('gst')} />
                {errors.gst && <div className="text-danger small">{errors.gst.message}</div>}
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardBody className="d-flex justify-content-end gap-2">
          <CButton color="secondary" onClick={() => navigate('/companies')}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? <CSpinner size="sm" /> : isEdit ? 'Update Company' : 'Create Company'}
          </CButton>
        </CCardBody>
      </CCard>
    </CForm>
  )
}

export default CompanyForm