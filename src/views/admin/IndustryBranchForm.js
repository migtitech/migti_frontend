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
import industryBranchService from '../../services/industryBranchService'
import industryService from '../../services/industryService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const schema = yup.object({
  industryId: yup.string().required('Please select an industry'),
  name: yup.string().required('Branch name is required').min(1).max(100),
  location: yup.string().optional().max(200),
  address: yup.string().optional().max(500),
})

const defaultValues = {
  industryId: '',
  name: '',
  location: '',
  address: '',
}

const IndustryBranchForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [industries, setIndustries] = useState([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
    mode: 'onBlur',
  })

  useEffect(() => {
    fetchIndustries()
    if (isEdit) {
      fetchBranch()
    } else {
      reset(defaultValues)
    }
  }, [id])

  const fetchIndustries = async () => {
    try {
      const res = await industryService.getAll({ pageNumber: 1, pageSize: 500 })
      const data = res?.data?.data || res?.data || res
      setIndustries(data?.industries || [])
    } catch (err) {
      console.error('Failed to fetch industries', err)
    }
  }

  const fetchBranch = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await withMinimumDelay(() => industryBranchService.getById(id))
      const data = res?.data?.data || res?.data || res
      const industryId =
        typeof data?.industryId === 'object' ? data?.industryId?._id : data?.industryId || ''
      reset({
        industryId: industryId || '',
        name: data?.name || '',
        location: data?.location || '',
        address: data?.address || '',
      })
    } catch (err) {
      toastError(err?.message || 'Failed to fetch industry branch')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values) => {
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        industryId: values.industryId || null,
        name: values.name?.trim() || '',
        location: values.location?.trim() || '',
        address: values.address?.trim() || '',
      }
      if (isEdit) {
        await industryBranchService.update(id, payload)
        toastSuccess('Industry branch updated successfully')
      } else {
        await industryBranchService.create(payload)
        toastSuccess('Industry branch created successfully')
      }
      navigate('/industry-branches')
    } catch (err) {
      toastError(err?.message || 'Failed to save industry branch')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading industry branch..." />
      </div>
    )
  }

  return (
    <CForm onSubmit={handleSubmit(onSubmit)}>
      <CRow className="mb-3">
        <CCol>
          <CButton color="light" onClick={() => navigate('/industry-branches')} className="me-2">
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Industry Branches
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
          <strong>{isEdit ? 'Edit Industry Branch' : 'Add Industry Branch'}</strong>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Industry *</CFormLabel>
                <CFormSelect {...register('industryId')} disabled={isEdit}>
                  <option value="">Select Industry</option>
                  {industries.map((ind) => (
                    <option key={ind._id} value={ind._id}>
                      {ind.name}
                    </option>
                  ))}
                </CFormSelect>
                {errors.industryId && (
                  <div className="text-danger small mt-1">{errors.industryId.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Branch Name *</CFormLabel>
                <CFormInput {...register('name')} placeholder="Branch name" />
                {errors.name && (
                  <div className="text-danger small mt-1">{errors.name.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Location</CFormLabel>
                <CFormInput {...register('location')} placeholder="Location" />
                {errors.location && (
                  <div className="text-danger small mt-1">{errors.location.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Address</CFormLabel>
                <CFormTextarea rows={3} {...register('address')} placeholder="Address" />
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
          <CButton color="secondary" onClick={() => navigate('/industry-branches')}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? (
              <CSpinner size="sm" />
            ) : isEdit ? (
              'Update Industry Branch'
            ) : (
              'Create Industry Branch'
            )}
          </CButton>
        </CCardBody>
      </CCard>
    </CForm>
  )
}

export default IndustryBranchForm
