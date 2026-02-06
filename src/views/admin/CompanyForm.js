import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
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
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import companyService from '../../services/companyService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'

// ✅ Schema mirrors CompanyList fields (no extra logic added)
const companySchema = (isEdit = false) => yup.object({
  name: yup.string().required('Company name is required').min(2).max(100),
  brandName: yup.string().required('Brand name is required').min(2).max(100),
  email: yup.string().email('Enter a valid email').required('Email is required'),
//   password: yup.string().when('$isEdit', {
//     is: false,
//     then: (s) => s.required('Password is required').min(6),
//     otherwise: (s) => s.optional(),
//   }),
password: isEdit
      ? yup.string().optional()
      : yup.string().required('Password is required').min(6),

  logoUrl: yup.string().url('Enter a valid URL'),
})

const defaultValues = {
  name: '',
  brandName: '',
  email: '',
  password: '',
  logoUrl: '',
}

const CompanyForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  console.log("id", id)
console.log("edit id",isEdit)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(companySchema(isEdit)),
    defaultValues,
    mode: 'onBlur',
  })

  // 🔹 Fetch company when editing (same pattern as SupplierForm)
  useEffect(() => {
    if (!isEdit) {
      reset(defaultValues)
      return
    }

    const fetchCompany = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => companyService.getById(id), 2000)
        const data = res?.data?.company || res?.data || {}
        console.log("response", res)
        reset({
          name: data.name || '',
          brandName: data.brandName || '',
          email: data.email || '',
          password: '', // never prefill password
          logoUrl: data.logoUrl || '',
        })
        console.log("reset data", reset)
      } catch (err) {
        setError(err?.message || 'Failed to fetch company')
      } finally {
        setLoading(false)
      }
    }

    fetchCompany()
  }, [id])

  const onSubmit = async (values) => {
    setSubmitting(true)
    setError('')
    try {
      const payload = { ...values }
      if (isEdit && !payload.password) delete payload.password

      if (isEdit) {
        await companyService.update(id, payload)
      } else {
        await companyService.create(payload)
      }
      navigate('/companies')
    } catch (err) {
      setError(err?.message || 'Failed to save company')
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
        <CCardHeader>
          <strong>{isEdit ? 'Edit Company' : 'Add Company'}</strong>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <label className="form-label">Company Name *</label>
                <CFormInput {...register('name')} />
                {errors.name && <div className="text-danger small">{errors.name.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <label className="form-label">Brand Name *</label>
                <CFormInput {...register('brandName')} />
                {errors.brandName && <div className="text-danger small">{errors.brandName.message}</div>}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <label className="form-label">Email *</label>
                <CFormInput type="email" {...register('email')} />
                {errors.email && <div className="text-danger small">{errors.email.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <label className="form-label">
                  Password {!isEdit && '*'}
                </label>
                <CFormInput type="password" {...register('password')} />
                {errors.password && <div className="text-danger small">{errors.password.message}</div>}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <label className="form-label">Logo URL</label>
                <CFormInput placeholder="https://example.com/logo.png" {...register('logoUrl')} />
                {errors.logoUrl && <div className="text-danger small">{errors.logoUrl.message}</div>}
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