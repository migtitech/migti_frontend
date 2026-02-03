import React, { useEffect, useMemo } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
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
          .matches(/^\d{5,20}$/, 'Phone must be 5-20 digits'),
        location: yup.string().required('Location is required').min(2).max(200),
        branchcode: yup.string().required('Branch code is required').min(1).max(50),
        gstNumber: yup.string().required('GST number is required').min(3).max(50),
        officeImages: yup.string().required('Office images is required').min(1).max(500),
        address: yup.string().required('Address is required').min(2).max(200),
        fullAddress: yup.string().required('Full address is required').min(5).max(500),
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
                <CFormLabel htmlFor="location">Location *</CFormLabel>
                <CFormInput id="location" {...register('location')} invalid={!!errors.location} required />
                {errors.location && <div className="text-danger small">{errors.location.message}</div>}
              </div>
            </CCol>
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
                <CFormLabel htmlFor="officeImages">Office Images *</CFormLabel>
                <CFormInput
                  id="officeImages"
                  {...register('officeImages')}
                  invalid={!!errors.officeImages}
                  required
                />
                {errors.officeImages && (
                  <div className="text-danger small">{errors.officeImages.message}</div>
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
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="fullAddress">Full Address *</CFormLabel>
                <CFormInput
                  id="fullAddress"
                  {...register('fullAddress')}
                  invalid={!!errors.fullAddress}
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
