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
  CFormTextarea,
  CFormSelect,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import { useData } from '../../context/DataContext'


const quotationSchema = yup.object({
  customerName: yup.string().required('Customer name is required'),
  customerEmail: yup.string().email('Invalid email').required('Email is required'),
  items: yup.string().required('Items / description is required'),
  totalAmount: yup
    .number()
    .typeError('Total amount must be a number')
    .positive()
    .required('Total amount is required'),
  validUntil: yup.date().nullable(),
  status: yup.string().required(),
  notes: yup.string().nullable(),
  queryId: yup.string().nullable(),
})

const defaultValues = {
  queryId: '',
  customerName: '',
  customerEmail: '',
  items: '',
  totalAmount: '',
  validUntil: '',
  notes: '',
  status: 'draft',
}

const QuotationForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { quotations, addQuotation, updateQuotation, queries } = useData()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(quotationSchema),
    defaultValues,
  })

 
  useEffect(() => {
    if (!isEdit) return

    const quotation = quotations?.find((q) => q.id === Number(id))
    if (!quotation) return

    setLoading(true)
    reset({
      queryId: quotation.queryId || '',
      customerName: quotation.customerName || '',
      customerEmail: quotation.customerEmail || '',
      items: quotation.items || '',
      totalAmount: quotation.totalAmount || '',
      validUntil: quotation.validUntil
        ? quotation.validUntil.split('T')[0]
        : '',
      notes: quotation.notes || '',
      status: quotation.status || 'draft',
    })
    setLoading(false)
  }, [id, isEdit, quotations, reset])


  const onSubmit = (values) => {
    try {
      const payload = {
        ...values,
        queryId: values.queryId ? Number(values.queryId) : null,
        totalAmount: Number(values.totalAmount),
        validUntil: values.validUntil
          ? new Date(values.validUntil).toISOString()
          : null,
      }

      if (isEdit) {
        updateQuotation(Number(id), payload)
      } else {
        addQuotation(payload)
      }

      navigate('/quotations')
    } catch (err) {
      setError('Failed to save quotation')
    }
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <CSpinner />
      </div>
    )
  }

  return (
    <CForm onSubmit={handleSubmit(onSubmit)}>
      <CRow className="mb-3">
        <CCol>
          <CButton color="light" onClick={() => navigate('/quotations')}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Quotations
          </CButton>
        </CCol>
      </CRow>

      {error && <CAlert color="danger">{error}</CAlert>}

      <CCard className="mb-4">
        <CCardHeader>
          <strong>{isEdit ? 'Edit Quotation' : 'Add Quotation'}</strong>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <CFormLabel>Related Query</CFormLabel>
              <CFormSelect {...register('queryId')}>
                <option value="">Select Query (Optional)</option>
                {queries?.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.subject} - {q.customerName}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel>Status</CFormLabel>
              <CFormSelect {...register('status')}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </CFormSelect>
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol md={6}>
              <CFormLabel>Customer Name *</CFormLabel>
              <CFormInput {...register('customerName')} />
              {errors.customerName && (
                <div className="text-danger small">{errors.customerName.message}</div>
              )}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Customer Email *</CFormLabel>
              <CFormInput type="email" {...register('customerEmail')} />
              {errors.customerEmail && (
                <div className="text-danger small">{errors.customerEmail.message}</div>
              )}
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol md={6}>
              <CFormLabel>Total Amount *</CFormLabel>
              <CFormInput type="number" {...register('totalAmount')} />
              {errors.totalAmount && (
                <div className="text-danger small">{errors.totalAmount.message}</div>
              )}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Valid Until</CFormLabel>
              <CFormInput type="date" {...register('validUntil')} />
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol md={12}>
              <CFormLabel>Items / Description *</CFormLabel>
              <CFormTextarea rows={4} {...register('items')} />
              {errors.items && (
                <div className="text-danger small">{errors.items.message}</div>
              )}
            </CCol>
          </CRow>

          <CRow className="mt-3">
            <CCol md={12}>
              <CFormLabel>Notes</CFormLabel>
              <CFormTextarea rows={2} {...register('notes')} />
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardBody className="d-flex justify-content-end gap-2">
          <CButton color="secondary" onClick={() => navigate('/quotations')}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit">
            {isEdit ? 'Update Quotation' : 'Create Quotation'}
          </CButton>
        </CCardBody>
      </CCard>
    </CForm>
  )
}

export default QuotationForm