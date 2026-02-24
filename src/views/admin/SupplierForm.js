import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
  CBadge,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import supplierService from '../../services/supplierService'
import categoryService from '../../services/categoryService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

// Indian GSTIN: 15 chars - 2 digit state + 5 letter + 4 digit + 1 letter (PAN) + 1 entity + Z + 1 checksum (empty allowed)
const GSTIN_REGEX = /^(|[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])$/

const supplierSchema = yup.object({
  name: yup.string().required('Name is required').min(2).max(100),
  shopname: yup.string().optional().max(200),
  address: yup.string().optional().max(500),
  shippingAddress: yup.string().optional().max(500),
  billingAddress: yup.string().optional().max(500),
  phone_1: yup
    .string()
    .optional()
    .matches(/^\d{10}$/, 'Phone must be exactly 10 digits')
    .nullable()
    .transform((value, original) => (original === '' ? null : value)),
  phone_2: yup
    .string()
    .optional()
    .matches(/^\d{10}$/, 'Phone must be exactly 10 digits')
    .nullable()
    .transform((value, original) => (original === '' ? null : value)),
  email: yup.string().email('Enter a valid email').optional().nullable().transform((v, o) => (o === '' ? null : v)),
  other_contact: yup.string().optional().max(200),
  label: yup.string().optional().max(100),
  shop_location: yup.string().optional().max(200),
  gst: yup
    .string()
    .optional()
    .transform((v) => (typeof v === 'string' ? v.trim().toUpperCase() : v || ''))
    .matches(GSTIN_REGEX, 'Enter a valid 15-character GSTIN (e.g. 22AABCU9603R1ZX)'),
  categories: yup.array().of(yup.string()).default([]),
  remark: yup.string().optional().max(500),
})

const defaultValues = {
  name: '',
  shopname: '',
  address: '',
  shippingAddress: '',
  billingAddress: '',
  phone_1: '',
  phone_2: '',
  email: '',
  other_contact: '',
  label: '',
  shop_location: '',
  gst: '',
  categories: [],
  remark: '',
}

const SupplierForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [catalogUploading, setCatalogUploading] = useState(false)
  const [catalogPreview, setCatalogPreview] = useState(null)
  const catalogInputRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(supplierSchema),
    defaultValues,
    mode: 'onBlur',
  })

  const selectedCategories = watch('categories') || []

  useEffect(() => {
    fetchCategories()
    if (isEdit) {
      fetchSupplier()
    } else {
      reset(defaultValues)
    }
  }, [id])

  const fetchCategories = async () => {
    try {
      const res = await categoryService.getAll({
        pageNumber: 1,
        pageSize: 100,
      })
      const data = res?.data || res
      setCategories(data?.categories || [])
    } catch (err) {
      console.error('Failed to fetch categories', err)
    }
  }

  const fetchSupplier = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await supplierService.getById(id)
      const data = res?.data || res
      reset({
        name: data?.name || '',
        shopname: data?.shopname || '',
        address: data?.address || '',
        shippingAddress: data?.shippingAddress || '',
        billingAddress: data?.billingAddress || '',
        phone_1: data?.phone_1 || '',
        phone_2: data?.phone_2 || '',
        email: data?.email || '',
        other_contact: data?.other_contact || '',
        label: data?.label || data?.labal || '',
        shop_location: data?.shop_location || '',
        gst: data?.gst || '',
        categories: (data?.categories || []).map((cat) =>
          typeof cat === 'string' ? cat : cat?._id,
        ),
        remark: data?.remark || '',
      })
      if (data?.catalog?.url) {
        setCatalogPreview(data.catalog)
      } else {
        setCatalogPreview(null)
      }
    } catch (err) {
      toastError(err?.message || 'Failed to fetch supplier')
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase()
    const list = term
      ? categories.filter((cat) => cat.name?.toLowerCase().includes(term))
      : categories
    return list.slice(0, 10)
  }, [categories, categorySearch])

  const selectedCategoryBadges = useMemo(() => {
    return selectedCategories.map((id) => {
      const match = categories.find((cat) => cat._id === id)
      return {
        id,
        name: match?.name || id,
      }
    })
  }, [selectedCategories, categories])

  const handleCatalogUpload = useCallback(
    async (e) => {
      const file = e?.target?.files?.[0]
      if (!file || !id) return
      setCatalogUploading(true)
      setError('')
      try {
        const res = await supplierService.uploadCatalog(id, file)
        const supplier = res?.data?.data || res?.data || res
        const cat = supplier?.catalog
        if (cat?.url) {
          setCatalogPreview({ url: cat.url, fileName: cat.fileName, uploadedAt: cat.uploadedAt })
        }
        toastSuccess('Catalog uploaded successfully')
      } catch (err) {
        toastError(err?.response?.data?.message || err?.message || 'Catalog upload failed')
      } finally {
        setCatalogUploading(false)
        if (catalogInputRef.current) catalogInputRef.current.value = ''
      }
    },
    [id],
  )

  const toggleCategory = (categoryId) => {
    const exists = selectedCategories.includes(categoryId)
    const next = exists
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId]
    setValue('categories', next, { shouldValidate: true })
  }

  const onSubmit = async (values) => {
    setSubmitting(true)
    setError('')
    try {
      if (isEdit) {
        const payload = {
          address: values.address || '',
          shippingAddress: values.shippingAddress || '',
          billingAddress: values.billingAddress || '',
          phone_1: values.phone_1 || '',
          phone_2: values.phone_2 || '',
          categories: values.categories || [],
          remark: values.remark || '',
        }
        await supplierService.update(id, payload)
        toastSuccess('Supplier updated successfully')
      } else {
        const payload = {
          ...values,
          categories: values.categories || [],
        }
        await supplierService.create(payload)
        toastSuccess('Supplier created successfully')
      }
      navigate('/suppliers')
    } catch (err) {
      toastError(err?.message || 'Failed to save supplier')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading supplier..." />
      </div>
    )
  }

  return (
    <CForm onSubmit={handleSubmit(onSubmit)}>
      <CRow className="mb-3">
        <CCol>
          <CButton color="light" onClick={() => navigate('/suppliers')} className="me-2">
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Suppliers
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
          <strong>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</strong>
          {isEdit && (
            <small className="text-muted d-block mt-1">
              Only address, shipping/billing address, mobile numbers, categories and remark can be updated.
            </small>
          )}
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Name *</CFormLabel>
                <CFormInput {...register('name')} readOnly={isEdit} disabled={isEdit} className={isEdit ? 'bg-light' : ''} />
                {errors.name && (
                  <div className="text-danger small mt-1">{errors.name.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Shop Name</CFormLabel>
                <CFormInput {...register('shopname')} readOnly={isEdit} disabled={isEdit} className={isEdit ? 'bg-light' : ''} />
                {errors.shopname && (
                  <div className="text-danger small mt-1">{errors.shopname.message}</div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Email</CFormLabel>
                <CFormInput type="email" {...register('email')} readOnly={isEdit} disabled={isEdit} className={isEdit ? 'bg-light' : ''} />
                {errors.email && (
                  <div className="text-danger small mt-1">{errors.email.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Phone 1</CFormLabel>
                <CFormInput {...register('phone_1')} placeholder="10 digits" />
                {errors.phone_1 && (
                  <div className="text-danger small mt-1">{errors.phone_1.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Phone 2</CFormLabel>
                <CFormInput {...register('phone_2')} placeholder="10 digits" />
                {errors.phone_2 && (
                  <div className="text-danger small mt-1">{errors.phone_2.message}</div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Other Contact</CFormLabel>
                <CFormInput {...register('other_contact')} readOnly={isEdit} disabled={isEdit} className={isEdit ? 'bg-light' : ''} />
                {errors.other_contact && (
                  <div className="text-danger small mt-1">{errors.other_contact.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Label</CFormLabel>
                <CFormInput {...register('label')} readOnly={isEdit} disabled={isEdit} className={isEdit ? 'bg-light' : ''} />
                {errors.label && (
                  <div className="text-danger small mt-1">{errors.label.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Shop Location</CFormLabel>
                <CFormInput {...register('shop_location')} readOnly={isEdit} disabled={isEdit} className={isEdit ? 'bg-light' : ''} />
                {errors.shop_location && (
                  <div className="text-danger small mt-1">{errors.shop_location.message}</div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>GST Number</CFormLabel>
                <CFormInput
                  placeholder="e.g. 22AABCU9603R1ZX"
                  maxLength={15}
                  {...register('gst')}
                  readOnly={isEdit}
                  disabled={isEdit}
                  className={isEdit ? 'bg-light' : ''}
                />
                {errors.gst && (
                  <div className="text-danger small mt-1">{errors.gst.message}</div>
                )}
                <small className="text-muted">15-character GSTIN (optional)</small>
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Categories</CFormLabel>
                <CFormInput
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                <div
                  className="border rounded p-2 mt-2"
                  style={{ maxHeight: 200, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem 1rem' }}
                >
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => {
                      const inputId = `cat-${cat._id}`
                      const checked = selectedCategories.includes(cat._id)
                      return (
                        <label
                          key={cat._id}
                          htmlFor={inputId}
                          className="form-check d-flex align-items-center gap-2 mb-0"
                          style={{ cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            id={inputId}
                            className="form-check-input"
                            checked={checked}
                            onChange={() => toggleCategory(cat._id)}
                          />
                          <span className="form-check-label">{cat.name}</span>
                        </label>
                      )
                    })
                  ) : (
                    <small className="text-muted" style={{ gridColumn: '1 / -1' }}>No categories found</small>
                  )}
                </div>
                {selectedCategoryBadges.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-2">
                    {selectedCategoryBadges.map((cat) => (
                      <CBadge color="info" key={cat.id}>
                        {cat.name}
                      </CBadge>
                    ))}
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

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Shipping Address</CFormLabel>
                <CFormTextarea rows={3} {...register('shippingAddress')} />
                {errors.shippingAddress && (
                  <div className="text-danger small mt-1">{errors.shippingAddress.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Billing Address</CFormLabel>
                <CFormTextarea rows={3} {...register('billingAddress')} />
                {errors.billingAddress && (
                  <div className="text-danger small mt-1">{errors.billingAddress.message}</div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Remark</CFormLabel>
                <CFormTextarea rows={2} {...register('remark')} />
                {errors.remark && (
                  <div className="text-danger small mt-1">{errors.remark.message}</div>
                )}
              </div>
            </CCol>
          </CRow>

          {isEdit && (
            <CRow>
              <CCol md={12}>
                <div className="mb-3">
                  <CFormLabel>Catalog (PDF, Excel, or Images)</CFormLabel>
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <input
                      ref={catalogInputRef}
                      type="file"
                      accept=".pdf,.xlsx,.xls,image/*"
                      onChange={handleCatalogUpload}
                      disabled={catalogUploading}
                      className="form-control"
                      style={{ maxWidth: 280 }}
                    />
                    {catalogUploading && <CSpinner size="sm" />}
                    {catalogPreview?.url && (
                      <div className="text-muted small">
                        <a href={catalogPreview.url} target="_blank" rel="noopener noreferrer">
                          {catalogPreview.fileName || 'View catalog'}
                        </a>
                        {catalogPreview.uploadedAt && (
                          <span className="ms-2">
                            uploaded {new Date(catalogPreview.uploadedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <small className="text-muted">Stored in S3. Supports PDF, Excel, or images.</small>
                </div>
              </CCol>
            </CRow>
          )}
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardBody className="d-flex justify-content-end gap-2">
          <CButton color="secondary" onClick={() => navigate('/suppliers')}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? <CSpinner size="sm" /> : isEdit ? 'Update Supplier' : 'Create Supplier'}
          </CButton>
        </CCardBody>
      </CCard>
    </CForm>
  )
}

export default SupplierForm
