import React from 'react'
import {
  CCol,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CRow,
} from '@coreui/react'

const EmployeeAccountDetailsSection = ({ register, errors }) => (
  <>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="accountNumber">Account Number</CFormLabel>
          <CFormInput
            id="accountNumber"
            inputMode="numeric"
            pattern="\d*"
            {...register('bankDetails.accountNumber')}
            invalid={!!errors.bankDetails?.accountNumber}
          />
          <CFormFeedback invalid>{errors.bankDetails?.accountNumber?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="ifscCode">IFSC Code</CFormLabel>
          <CFormInput
            id="ifscCode"
            {...register('bankDetails.ifscCode')}
            invalid={!!errors.bankDetails?.ifscCode}
          />
          <CFormFeedback invalid>{errors.bankDetails?.ifscCode?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="bankName">Bank Name</CFormLabel>
          <CFormInput
            id="bankName"
            {...register('bankDetails.bankName')}
            invalid={!!errors.bankDetails?.bankName}
          />
          <CFormFeedback invalid>{errors.bankDetails?.bankName?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="accountHolderName">Account Holder Name</CFormLabel>
          <CFormInput
            id="accountHolderName"
            {...register('bankDetails.accountHolderName')}
            invalid={!!errors.bankDetails?.accountHolderName}
          />
          <CFormFeedback invalid>{errors.bankDetails?.accountHolderName?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="upiDetails">UPI Details (Optional)</CFormLabel>
          <CFormInput
            id="upiDetails"
            {...register('bankDetails.upiDetails')}
            invalid={!!errors.bankDetails?.upiDetails}
          />
          <CFormFeedback invalid>{errors.bankDetails?.upiDetails?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
  </>
)

export default EmployeeAccountDetailsSection
