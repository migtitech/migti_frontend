<<<<<<< Updated upstream
import React, { useEffect, useMemo } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const BranchFormModal = ({
  visible,
  onClose,
  onSubmit,
  submitting,
  companies,
  editingBranch,
  defaultValues,
}) => {
  const schema = useMemo(
    () =>
      yup.object({
        name: yup.string().required('Branch name is required').min(2).max(100),
        companyId: yup.string().required('Company is required'),
        email: yup.string().email('Enter a valid email').required('Email is required'),
        phone: yup
          .string()
          .required('Phone is required')
          .matches(/^\d{10}$/, 'Phone must be exactly 10 digits'),
        branchcode: yup.string().required('Branch code is required').min(1).max(50),
        gstNumber: yup
          .string()
          .required('GST number is required')
          .transform((v) => (typeof v === 'string' ? v.trim().toUpperCase() : v || ''))
          .matches(
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
            'Enter a valid 15-character GSTIN (e.g. 22AABCU9603R1ZX)'
          ),
        address: yup.string().required('Address is required').min(2).max(200),
        fullAddress: yup.string().required('Full address is required').min(5).max(500),
        mapLocationUrl: yup
          .string()
          .optional()
          .transform((v) => (v === '' ? undefined : v))
          .url('Enter a valid URL')
          .max(500),
      }),
    []
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit(onSubmit)}>
        <CModalBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="companyId">Company *</CFormLabel>
                <CFormSelect id="companyId" {...register('companyId')} invalid={!!errors.companyId} required>
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </CFormSelect>
                {errors.companyId && <div className="text-danger small">{errors.companyId.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="name">Branch Name *</CFormLabel>
                <CFormInput id="name" {...register('name')} invalid={!!errors.name} required />
                {errors.name && <div className="text-danger small">{errors.name.message}</div>}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="email">Email *</CFormLabel>
                <CFormInput
                  type="email"
                  id="email"
                  {...register('email')}
                  invalid={!!errors.email}
                  required
                />
                {errors.email && <div className="text-danger small">{errors.email.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="phone">Phone *</CFormLabel>
                <CFormInput
                  id="phone"
                  inputMode="numeric"
                  pattern="\d*"
                  {...register('phone')}
                  invalid={!!errors.phone}
                  required
                />
                {errors.phone && <div className="text-danger small">{errors.phone.message}</div>}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="branchcode">Branch Code *</CFormLabel>
                <CFormInput
                  id="branchcode"
                  {...register('branchcode')}
                  invalid={!!errors.branchcode}
                  required
                />
                {errors.branchcode && <div className="text-danger small">{errors.branchcode.message}</div>}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="gstNumber">GST Number *</CFormLabel>
                <CFormInput
                  id="gstNumber"
                  {...register('gstNumber')}
                  invalid={!!errors.gstNumber}
                  required
                />
                {errors.gstNumber && <div className="text-danger small">{errors.gstNumber.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="mapLocationUrl">Map Location URL</CFormLabel>
                <CFormInput
                  id="mapLocationUrl"
                  type="url"
                  {...register('mapLocationUrl')}
                  invalid={!!errors.mapLocationUrl}
                  placeholder="https://maps.google.com/..."
                />
                {errors.mapLocationUrl && (
                  <div className="text-danger small">{errors.mapLocationUrl.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="address">Address *</CFormLabel>
                <CFormInput id="address" {...register('address')} invalid={!!errors.address} required />
                {errors.address && <div className="text-danger small">{errors.address.message}</div>}
              </div>
            </CCol>
            <CCol md={6} />
          </CRow>
          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel htmlFor="fullAddress">Full Address *</CFormLabel>
                <CFormTextarea
                  id="fullAddress"
                  rows={3}
                  {...register('fullAddress')}
                  invalid={!!errors.fullAddress}
                  placeholder="Enter complete address..."
                  required
                />
                {errors.fullAddress && (
                  <div className="text-danger small">{errors.fullAddress.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={onClose}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : editingBranch ? 'Update' : 'Create'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

export default BranchFormModal
=======
import React, { useEffect, useMemo } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const BranchFormModal = ({
  visible,
  onClose,
  onSubmit,
  submitting,
  companies,
  editingBranch,
  defaultValues,
}) => {
  const schema = useMemo(
    () =>
      yup.object({
        name: yup.string().required('Branch name is required').min(2).max(100),
        companyId: yup.string().required('Company is required'),
        email: yup.string().email('Enter a valid email').required('Email is required'),
        phone: yup
          .string()
          .required('Phone is required')
          .matches(/^\d{10}$/, 'Phone must be exactly 10 digits'),
        branchcode: yup.string().required('Branch code is required').min(1).max(50),
        gstNumber: yup
          .string()
          .required('GST number is required')
          .matches(/^\d{15}$/, 'GST number must be exactly 15 digits'),
        address: yup.string().required('Address is required').min(2).max(200),
        fullAddress: yup.string().required('Full address is required').min(5).max(500),
        mapLocationUrl: yup
          .string()
          .optional()
          .transform((v) => (v === '' ? undefined : v))
          .url('Enter a valid URL')
          .max(500),
      }),
    []
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit(onSubmit)}>
        <CModalBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="companyId">Company *</CFormLabel>
                <CFormSelect id="companyId" {...register('companyId')} invalid={!!errors.companyId} required>
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </CFormSelect>
                {errors.companyId && <div className="text-danger small">{errors.companyId.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="name">Branch Name *</CFormLabel>
                <CFormInput id="name" {...register('name')} invalid={!!errors.name} required />
                {errors.name && <div className="text-danger small">{errors.name.message}</div>}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="email">Email *</CFormLabel>
                <CFormInput
                  type="email"
                  id="email"
                  {...register('email')}
                  invalid={!!errors.email}
                  required
                />
                {errors.email && <div className="text-danger small">{errors.email.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="phone">Phone *</CFormLabel>
                <CFormInput
                  id="phone"
                  inputMode="numeric"
                  pattern="\d*"
                  {...register('phone')}
                  invalid={!!errors.phone}
                  required
                />
                {errors.phone && <div className="text-danger small">{errors.phone.message}</div>}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="branchcode">Branch Code *</CFormLabel>
                <CFormInput
                  id="branchcode"
                  {...register('branchcode')}
                  invalid={!!errors.branchcode}
                  required
                />
                {errors.branchcode && <div className="text-danger small">{errors.branchcode.message}</div>}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="gstNumber">GST Number *</CFormLabel>
                <CFormInput
                  id="gstNumber"
                  {...register('gstNumber')}
                  invalid={!!errors.gstNumber}
                  required
                />
                {errors.gstNumber && <div className="text-danger small">{errors.gstNumber.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="mapLocationUrl">Map Location URL</CFormLabel>
                <CFormInput
                  id="mapLocationUrl"
                  type="url"
                  {...register('mapLocationUrl')}
                  invalid={!!errors.mapLocationUrl}
                  placeholder="https://maps.google.com/..."
                />
                {errors.mapLocationUrl && (
                  <div className="text-danger small">{errors.mapLocationUrl.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="address">Address *</CFormLabel>
                <CFormInput id="address" {...register('address')} invalid={!!errors.address} required />
                {errors.address && <div className="text-danger small">{errors.address.message}</div>}
              </div>
            </CCol>
            <CCol md={6} />
          </CRow>
          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel htmlFor="fullAddress">Full Address *</CFormLabel>
                <CFormTextarea
                  id="fullAddress"
                  rows={3}
                  {...register('fullAddress')}
                  invalid={!!errors.fullAddress}
                  placeholder="Enter complete address..."
                  required
                />
                {errors.fullAddress && (
                  <div className="text-danger small">{errors.fullAddress.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={onClose}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : editingBranch ? 'Update' : 'Create'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

export default BranchFormModal
>>>>>>> Stashed changes
