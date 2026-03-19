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
import { phoneRequired, gstinRequired, stringRequired, stringOptional, urlOptional, MSG } from '../../../utils/validation'
import AuthImage from '../../../components/AuthImage/AuthImage'
import { getAssetsUrl } from '../../../api/endpoints'

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
        name: stringRequired(2, 100).label('Branch name'),
        companyId: yup.string().required('Company is required'),
        email: yup.string().trim().email(MSG.email).required('Email is required'),
        phone: phoneRequired().label('Phone'),
        branchcode: yup.string().trim().required('Branch code is required').min(1, MSG.minLength(1)).max(50, MSG.maxLength(50)),
        gstNumber: gstinRequired().label('GST number'),
        address: stringRequired(2, 200).label('Address'),
        fullAddress: stringRequired(5, 500).label('Full address'),
        location: stringOptional(200),
        mapLocationUrl: urlOptional(500),
      }),
    []
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  const selectedSignature = watch('signatureFile')
  const selectedFileName =
    selectedSignature && selectedSignature.length > 0 ? selectedSignature[0]?.name || '' : ''
  const existingSignature = editingBranch?.signature
  const existingSignatureId =
    typeof existingSignature === 'object' ? existingSignature?._id || existingSignature?.id : existingSignature
  const existingSignaturePath =
    typeof existingSignature === 'object' && existingSignature?.path
      ? (existingSignature.path.startsWith('http') ? existingSignature.path : getAssetsUrl(existingSignature.path))
      : ''

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
                <CFormLabel htmlFor="signatureFile">Authorised Signature</CFormLabel>
                <CFormInput
                  id="signatureFile"
                  type="file"
                  accept="image/*"
                  {...register('signatureFile')}
                />
                <div className="small text-muted mt-1">
                  Upload PNG/JPG signature image (stored in S3 and saved as document id).
                </div>
                {selectedFileName ? (
                  <div className="small mt-1">Selected: {selectedFileName}</div>
                ) : null}
                {!selectedFileName && existingSignatureId ? (
                  <div className="mt-2">
                    <AuthImage
                      documentId={existingSignatureId}
                      fallbackUrl={existingSignaturePath}
                      alt="Current branch signature"
                      style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain' }}
                    />
                  </div>
                ) : null}
              </div>
            </CCol>
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
