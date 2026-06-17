import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { cilArrowLeft, cilPlus, cilTrash } from '@coreui/icons'
import industryService from '../../services/industryService'
import areaService from '../../services/areaService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const purchaseManagerSchema = yup.object({
  name: yup.string().required('Name is required').max(100),
  phone: yup
    .string()
    .optional()
    .matches(/^\d{10}$/, 'Phone must be exactly 10 digits')
    .nullable()
    .transform((v, o) => (o === '' ? '' : v)),
  email: yup
    .string()
    .email('Enter a valid email')
    .optional()
    .nullable()
    .transform((v, o) => (o === '' ? '' : v)),
})

const industrySchema = yup.object({
  name: yup.string().required('Industry name is required').min(2).max(100),
  area: yup.string().optional().nullable(),
  location: yup.string().optional().max(200),
  address: yup.string().optional().max(500),
  gstNumber: yup
    .string()
    .optional()
    .nullable()
    .transform((v, o) => (o === '' ? null : v))
    .test('gst', 'GST number must be exactly 15 digits', (v) => v == null || v === '' || /^\d{15}$/.test(v)),
  purchase_manager_name: yup.string().optional().max(100),
  purchase_manager_phone: yup
    .string()
    .optional()
    .matches(/^\d{10}$/, 'Phone must be exactly 10 digits')
    .nullable()
    .transform((value, original) => (original === '' ? null : value)),
  email: yup
    .string()
    .email('Enter a valid email')
    .optional()
    .nullable()
    .transform((v, o) => (o === '' ? null : v)),
  purchaseManagers: yup.array().of(purchaseManagerSchema).optional().default([]),
})

const defaultValues = {
  name: '',
  area: '',
  location: '',
  address: '',
  gstNumber: '',
  purchase_manager_name: '',
  purchase_manager_phone: '',
  email: '',
  purchaseManagers: [],
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
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(industrySchema),
    defaultValues,
    mode: 'onBlur',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'purchaseManagers',
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
      setAreas(data?.areas || [])
    } catch (err) {
      console.error('Failed to fetch areas', err)
    }
  }

  const fetchIndustry = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await withMinimumDelay(() => industryService.getById(id))
      const data = res?.data || res
      const purchaseManagers = (data?.purchaseManagers || []).map((pm) => ({
        name: pm.name || '',
        phone: pm.phone || '',
        email: pm.email || '',
      }))
      reset({
        name: data?.name || '',
        area: typeof data?.area === 'object' ? data?.area?._id || '' : data?.area || '',
        location: data?.location || '',
        address: data?.address || '',
        gstNumber: data?.gstNumber || '',
        purchase_manager_name: data?.purchase_manager_name || '',
        purchase_manager_phone: data?.purchase_manager_phone || '',
        email: data?.email || '',
        purchaseManagers: purchaseManagers.length ? purchaseManagers : [],
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
      const payload = {
        ...values,
        area: values.area || null,
        gstNumber: values.gstNumber || '',
        purchaseManagers: (values.purchaseManagers || []).filter(
          (pm) => (pm.name || '').trim(),
        ).map((pm) => ({
          name: (pm.name || '').trim(),
          phone: (pm.phone || '').trim(),
          email: (pm.email || '').trim(),
        })),
      }
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
                <CFormLabel>GST Number</CFormLabel>
                <CFormInput {...register('gstNumber')} placeholder="e.g. 27AABCU9603R1ZM" />
                {errors.gstNumber && (
                  <div className="text-danger small mt-1">{errors.gstNumber.message}</div>
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
            <CCol md={12}>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <CFormLabel className="mb-0">Purchase Managers</CFormLabel>
                  <CButton
                    type="button"
                    color="primary"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: '', phone: '', email: '' })}
                  >
                    <CIcon icon={cilPlus} className="me-1" />
                    Add Purchase Manager
                  </CButton>
                </div>
                {fields.length === 0 ? (
                  <p className="text-muted small mb-0">
                    No purchase managers added. Click &quot;Add Purchase Manager&quot; to add.
                  </p>
                ) : (
                  fields.map((field, index) => (
                    <CCard key={field.id} className="mb-2">
                      <CCardBody className="py-2 px-3">
                        <CRow className="g-2 align-items-end">
                          <CCol md={4}>
                            <CFormLabel className="small">Name *</CFormLabel>
                            <CFormInput
                              {...register(`purchaseManagers.${index}.name`)}
                              placeholder="Name"
                            />
                            {errors.purchaseManagers?.[index]?.name && (
                              <div className="text-danger small">
                                {errors.purchaseManagers[index].name.message}
                              </div>
                            )}
                          </CCol>
                          <CCol md={3}>
                            <CFormLabel className="small">Phone</CFormLabel>
                            <CFormInput
                              {...register(`purchaseManagers.${index}.phone`)}
                              placeholder="Phone"
                            />
                            {errors.purchaseManagers?.[index]?.phone && (
                              <div className="text-danger small">
                                {errors.purchaseManagers[index].phone.message}
                              </div>
                            )}
                          </CCol>
                          <CCol md={4}>
                            <CFormLabel className="small">Email</CFormLabel>
                            <CFormInput
                              type="email"
                              {...register(`purchaseManagers.${index}.email`)}
                              placeholder="Email"
                            />
                            {errors.purchaseManagers?.[index]?.email && (
                              <div className="text-danger small">
                                {errors.purchaseManagers[index].email.message}
                              </div>
                            )}
                          </CCol>
                          <CCol md={1}>
                            <CButton
                              type="button"
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              title="Remove"
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CCol>
                        </CRow>
                      </CCardBody>
                    </CCard>
                  ))
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
