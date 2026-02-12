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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import { useData } from '../../context/DataContext'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'


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

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        await withMinimumDelay(() => Promise.resolve())
        const quotation = quotations?.find((q) => q.id === Number(id))
        if (!quotation) return

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
      } finally {
        setLoading(false)
      }
    }
    load()
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
        toastSuccess('Quotation updated successfully')
      } else {
        addQuotation(payload)
        toastSuccess('Quotation created successfully')
      }

      navigate('/quotations')
    } catch (err) {
      toastError('Failed to save quotation')
    }
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading quotation..." />
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

     <CCard className="mb-4">
  <CCardHeader>
    <strong>2. Products</strong>
  </CCardHeader>

  <CCardBody>

    {/* Product Form */}
    <CCard className="mb-4 shadow-sm">
      <CCardHeader className="py-2">
        <strong>Add Product</strong>
      </CCardHeader>

      <CCardBody>

        {/* Search */}
        <div className="mb-4">
          <CFormLabel className="fw-semibold">
            Type / Name (Search)
          </CFormLabel>
          <CFormInput
            type="text"
            placeholder="Search product type or name"
          />
        </div>

        {/* Basic Fields */}
        <CRow className="g-3">
          <CCol md={6}>
            <CFormLabel className="fw-semibold">
              Product Name
            </CFormLabel>
            <CFormInput placeholder="Enter product name" />
          </CCol>

          <CCol md={3}>
            <CFormLabel className="fw-semibold">
              Quantity
            </CFormLabel>
            <CFormInput type="number" placeholder="0" />
          </CCol>

          <CCol md={3}>
            <CFormLabel className="fw-semibold">
              Unit
            </CFormLabel>
            <CFormInput placeholder="pcs, kg, etc." />
          </CCol>
        </CRow>

        {/* Variants Section */}
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <CFormLabel className="fw-semibold mb-0">
              Variants
            </CFormLabel>
            <CButton color="primary" size="sm">
              + Add Variant
            </CButton>
          </div>

          {/* Static Variant Row */}
          <CRow className="g-2 mb-2">
            <CCol md={6}>
              <CFormInput placeholder="Variant name" />
            </CCol>

            <CCol md={4}>
              <CFormInput type="number" placeholder="Quantity" />
            </CCol>

            <CCol md={2}>
              <CButton color="danger" variant="ghost" size="sm">
                Remove
              </CButton>
            </CCol>
          </CRow>
        </div>

        {/* Remark */}
        <div className="mt-4">
          <CFormLabel className="fw-semibold">
            Remark
          </CFormLabel>
          <CFormTextarea
            rows={2}
            placeholder="Enter remark"
          />
        </div>

        {/* Buttons */}
        <div className="d-flex gap-2 mt-4">
          <CButton color="primary">
            Save
          </CButton>
          <CButton color="secondary">
            Cancel
          </CButton>
        </div>

      </CCardBody>
    </CCard>


  </CCardBody>
</CCard>

<CCard className="mb-4 shadow-sm">
  <CCardHeader>
    <strong>3. Delivery & Payment</strong>
  </CCardHeader>

  <CCardBody>

    <CRow className="g-3">

      <CCol md={6}>
        <CFormLabel className="fw-semibold">
          Delivery Location
        </CFormLabel>
        <CFormInput
          placeholder="Enter delivery location"
        />
      </CCol>

      <CCol md={6}>
        <CFormLabel className="fw-semibold">
          Contact Person Name
        </CFormLabel>
        <CFormInput
          placeholder="Enter contact name"
        />
      </CCol>

      <CCol md={6}>
        <CFormLabel className="fw-semibold">
          Contact Person Phone
        </CFormLabel>
        <CFormInput
          placeholder="Enter phone number"
        />
      </CCol>

      <CCol md={6}>
        <CFormLabel className="fw-semibold">
          Expected Delivery Date
        </CFormLabel>
        <CFormInput
          type="date"
        />
      </CCol>

      <CCol md={6}>
        <CFormLabel className="fw-semibold">
          Priority
        </CFormLabel>
        <CFormSelect>
          <option>Non-urgent</option>
          <option>Urgent</option>
        </CFormSelect>
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