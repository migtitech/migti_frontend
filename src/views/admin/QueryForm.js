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
  CFormSelect,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import { useData } from '../../context/DataContext'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'


const querySchema = (isEdit = false) =>
  yup.object({
    customerName: yup.string().required('Customer name is required'),
    customerEmail: yup.string().email('Invalid email').required('Email is required'),
    customerPhone: yup.string().optional(),
    subject: yup.string().required('Subject is required'),
    description: yup.string().optional(),
    images: yup.string().optional(),
    status: yup.string().required(),
    priority: yup.string().required(),
  })

const defaultValues = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  subject: '',
  description: '',
  images: '',
  status: 'new',
  priority: 'normal',
}

const QueryForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  console.log("query id",isEdit)
  console.log("query id",id)


  const { queries, addQuery, updateQuery } = useData()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(querySchema(isEdit)),
    defaultValues,
  })


  useEffect(() => {
    if (!isEdit) {
      reset(defaultValues)
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const query = await withMinimumDelay(
          () =>
            Promise.resolve(
              queries.find((q) => String(q._id || q.id) === String(id))
            ),
          2000
        )
        if (!query) throw new Error('Query not found')

        reset({
          customerName: query.customerName || '',
          customerEmail: query.customerEmail || '',
          customerPhone: query.customerPhone || '',
          subject: query.subject || '',
          description: query.description || '',
          images: query.images?.join(', ') || '',
          status: query.status || 'new',
          priority: query.priority || 'normal',
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const onSubmit = (values) => {
    setSubmitting(true)
    const payload = {
      ...values,
      images: values.images
        ? values.images.split(',').map((i) => i.trim()).filter(Boolean)
        : [],
    }

    if (isEdit) {
      updateQuery(id, payload)
    } else {
      addQuery(payload)
    }

    navigate('/queries')
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading query..." />
      </div>
    )
  }

  return (
    <CForm onSubmit={handleSubmit(onSubmit)}>
      <CRow className="mb-3">
        <CCol>
          <CButton color="light" onClick={() => navigate('/queries')}>
            <CIcon icon={cilArrowLeft} className="me-1" /> Back Queries
          </CButton>
        </CCol>
      </CRow>

      {error && <CAlert color="danger">{error}</CAlert>}

      <CCard className="mb-4">
        <CCardHeader>
          <strong>{isEdit ? 'Edit Query' : 'Add Query'}</strong>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <CFormInput label="Customer Name *" {...register('customerName')} />
              {errors.customerName && <div className="text-danger">{errors.customerName.message}</div>}
            </CCol>
            <CCol md={6}>
              <CFormInput label="Customer Email *" {...register('customerEmail')} />
              {errors.customerEmail && <div className="text-danger">{errors.customerEmail.message}</div>}
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol md={6}>
              <CFormInput label="Phone" {...register('customerPhone')} />
            </CCol>
            <CCol md={6}>
              <CFormInput label="Subject *" {...register('subject')} />
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol md={6}>
              <CFormSelect label="Status" {...register('status')}>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="quoted">Quoted</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormSelect label="Priority" {...register('priority')}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </CFormSelect>
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol>
              <CFormTextarea label="Description" rows={3} {...register('description')} />
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol>
              <CFormInput
                label="Image URLs "
                placeholder="https://example.com/1.jpg, https://example.com/2.jpg"
                {...register('images')}
              />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardBody className="d-flex justify-content-end gap-2">
          <CButton color="secondary" onClick={() => navigate('/queries')}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {isEdit ? 'Update Query' : 'Create Query'}
          </CButton>
        </CCardBody>
      </CCard>
    </CForm>
  )
}

export default QueryForm
