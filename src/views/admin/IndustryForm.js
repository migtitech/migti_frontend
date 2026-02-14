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
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import industryService from '../../services/industryService'
import areaService from '../../services/areaService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const industrySchema = yup.object({
  name: yup.string().required('Industry name is required').min(2).max(100),
  area: yup.string().optional().nullable(),
  location: yup.string().optional().max(200),
  address: yup.string().optional().max(500),
  purchase_manager_name: yup.string().optional().max(100),
  purchase_manager_phone: yup
    .string()
    .optional()
    .matches(/^\d{5,20}$/, 'Phone must be 5-20 digits')
    .nullable()
    .transform((value, original) => (original === '' ? null : value)),
  email: yup
    .string()
    .email('Enter a valid email')
    .optional()
    .nullable()
    .transform((v, o) => (o === '' ? null : v)),
})

const defaultValues = {
  name: '',
  area: '',
  location: '',
  address: '',
  purchase_manager_name: '',
  purchase_manager_phone: '',
  email: '',
}

const IndustryForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [areas, setAreas] = useState([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(industrySchema),
    defaultValues,
    mode: 'onBlur',
  })

  useEffect(() => {
    fetchAreas()
    if (isEdit) {
      fetchIndustry()
    } else {
      reset(defaultValues)
    }
  }, [id])

  const fetchAreas = async () => {
    try {
      const res = await areaService.getAll({ pageSize: 100 })
      const data = res?.data || res
      // console.log("areas", data)
      setAreas(data?.areas.filter(a => a.areaType === "market") || [])
      // setAreas(data?.areas || [])
    } catch (err) {
      console.error('Failed to fetch zones', err)
    }
  }

  const fetchIndustry = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await withMinimumDelay(() => industryService.getById(id))
      const data = res?.data || res
      reset({
        name: data?.name || '',
        area: typeof data?.area === 'object' ? data?.area?._id || '' : data?.area || '',
        location: data?.location || '',
        address: data?.address || '',
        purchase_manager_name: data?.purchase_manager_name || '',
        purchase_manager_phone: data?.purchase_manager_phone || '',
        email: data?.email || '',
      })
    } catch (err) {
      toastError(err?.message || 'Failed to fetch industry')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values) => {
    setSubmitting(true)
    setError('')
    try {
      const payload = { ...values, area: values.area || null }
      if (isEdit) {
        await industryService.update(id, payload)
        toastSuccess('Industry updated successfully')
      } else {
        await industryService.create(payload)
        toastSuccess('Industry created successfully')
      }
      navigate('/industries')
    } catch (err) {
      toastError(err?.message || 'Failed to save industry')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading industry..." />
      </div>
    )
  }

  return (
    <CForm onSubmit={handleSubmit(onSubmit)}>
      <CRow className="mb-3">
        <CCol>
          <CButton color="light" onClick={() => navigate('/industries')} className="me-2">
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Industries
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
          <strong>{isEdit ? 'Edit Industry' : 'Add Industry'}</strong>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Industry Name *</CFormLabel>
                <CFormInput {...register('name')} />
                {errors.name && (
                  <div className="text-danger small mt-1">{errors.name.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Email</CFormLabel>
                <CFormInput type="email" {...register('email')} />
                {errors.email && (
                  <div className="text-danger small mt-1">{errors.email.message}</div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Zone</CFormLabel>
                <CFormSelect {...register('area')}>
                  <option value="">Select Zone</option>
                  {areas.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} {a.city ? `- ${a.city}` : ''}
                    </option>
                  ))}
                </CFormSelect>
                {errors.area && (
                  <div className="text-danger small mt-1">{errors.area.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Location</CFormLabel>
                <CFormInput {...register('location')} />
                {errors.location && (
                  <div className="text-danger small mt-1">{errors.location.message}</div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Purchase Manager Name</CFormLabel>
                <CFormInput {...register('purchase_manager_name')} />
                {errors.purchase_manager_name && (
                  <div className="text-danger small mt-1">
                    {errors.purchase_manager_name.message}
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Purchase Manager Phone</CFormLabel>
                <CFormInput {...register('purchase_manager_phone')} />
                {errors.purchase_manager_phone && (
                  <div className="text-danger small mt-1">
                    {errors.purchase_manager_phone.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Address</CFormLabel>
                <CFormTextarea rows={3} {...register('address')} />
                {errors.address && (
                  <div className="text-danger small mt-1">{errors.address.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardBody className="d-flex justify-content-end gap-2">
          <CButton color="secondary" onClick={() => navigate('/industries')}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? (
              <CSpinner size="sm" />
            ) : isEdit ? (
              'Update Industry'
            ) : (
              'Create Industry'
            )}
          </CButton>
        </CCardBody>
      </CCard>
    </CForm>
  )
}

export default IndustryForm
