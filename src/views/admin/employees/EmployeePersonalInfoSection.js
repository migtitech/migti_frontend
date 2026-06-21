import React from "react";
import {
  CCol,
  CFormCheck,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CRow,
} from "@coreui/react";

const EmployeePersonalInfoSection = ({ register, errors, isEdit }) => (
  <>
    <div className="mb-3">
      <strong>Personal Information</strong>
    </div>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="name">Full Name *</CFormLabel>
          <CFormInput id="name" {...register("name")} invalid={!!errors.name} />
          <CFormFeedback invalid>{errors.name?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="email">Email *</CFormLabel>
          <CFormInput
            type="email"
            id="email"
            {...register("email")}
            invalid={!!errors.email}
          />
          <CFormFeedback invalid>{errors.email?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="phone">Phone *</CFormLabel>
          <CFormInput
            id="phone"
            inputMode="numeric"
            pattern="\d*"
            {...register("phone")}
            invalid={!!errors.phone}
          />
          <CFormFeedback invalid>{errors.phone?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="idnumber">
            ID Number ( Aaadhar / Pan / DL ) *
          </CFormLabel>
          <CFormInput
            id="idnumber"
            {...register("idnumber")}
            invalid={!!errors.idnumber}
          />
          <CFormFeedback invalid>{errors.idnumber?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="fatherName">Fathers Name</CFormLabel>
          <CFormInput
            id="fatherName"
            {...register("fatherName")}
            invalid={!!errors.fatherName}
          />
          <CFormFeedback invalid>{errors.fatherName?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="motherName">Mothers Name</CFormLabel>
          <CFormInput
            id="motherName"
            {...register("motherName")}
            invalid={!!errors.motherName}
          />
          <CFormFeedback invalid>{errors.motherName?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="pincode">Pincode</CFormLabel>
          <CFormInput
            id="pincode"
            inputMode="numeric"
            pattern="\d*"
            {...register("pincode")}
            invalid={!!errors.pincode}
          />
          <CFormFeedback invalid>{errors.pincode?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel className="d-block">Do you have a bike?</CFormLabel>
          <div className="d-flex gap-3">
            <CFormCheck
              type="radio"
              id="hasBikeYes"
              label="Yes"
              value="yes"
              {...register("hasBike")}
              invalid={!!errors.hasBike}
            />
            <CFormCheck
              type="radio"
              id="hasBikeNo"
              label="No"
              value="no"
              {...register("hasBike")}
              invalid={!!errors.hasBike}
            />
          </div>
          <CFormFeedback invalid>{errors.hasBike?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel className="d-block">
            Do you have a driving licence?
          </CFormLabel>
          <div className="d-flex gap-3">
            <CFormCheck
              type="radio"
              id="hasDrivingLicenseYes"
              label="Yes"
              value="yes"
              {...register("hasDrivingLicense")}
              invalid={!!errors.hasDrivingLicense}
            />
            <CFormCheck
              type="radio"
              id="hasDrivingLicenseNo"
              label="No"
              value="no"
              {...register("hasDrivingLicense")}
              invalid={!!errors.hasDrivingLicense}
            />
          </div>
          <CFormFeedback invalid>
            {errors.hasDrivingLicense?.message}
          </CFormFeedback>
        </div>
      </CCol>
    </CRow>
    <CRow>
      {!isEdit && (
        <CCol md={6}>
          <div className="mb-3">
            <CFormLabel htmlFor="password">Password *</CFormLabel>
            <CFormInput
              type="password"
              id="password"
              {...register("password")}
              invalid={!!errors.password}
            />
            <CFormFeedback invalid>{errors.password?.message}</CFormFeedback>
          </div>
        </CCol>
      )}
      <CCol md={isEdit ? 12 : 6}>
        <div className="mb-3">
          <CFormLabel htmlFor="address">Address *</CFormLabel>
          <CFormInput
            id="address"
            {...register("address")}
            invalid={!!errors.address}
          />
          <CFormFeedback invalid>{errors.address?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
  </>
);

export default EmployeePersonalInfoSection;
