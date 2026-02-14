import React, { useState } from "react"
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from "@coreui/react"

const PaymentAndDelivery = () => {
  const [formData, setFormData] = useState({
    deliveryLocation: "",
    contactName: "",
    contactPhone: "",
    expectedDate: "",
    priority: "Non-urgent",
  })

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <CCard className="mb-4 shadow-sm">
      <CCardHeader>
        <strong>3. Delivery & Payment</strong>
      </CCardHeader>

      <CCardBody>
        <CRow className="g-3">
          <CCol md={6}>
            <CFormLabel>Delivery Location</CFormLabel>
            <CFormInput
              value={formData.deliveryLocation}
              onChange={(e) =>
                handleChange("deliveryLocation", e.target.value)
              }
              placeholder="Enter delivery location"
            />
          </CCol>

          <CCol md={6}>
            <CFormLabel>Contact Person Name</CFormLabel>
            <CFormInput
              value={formData.contactName}
              onChange={(e) =>
                handleChange("contactName", e.target.value)
              }
              placeholder="Enter contact name"
            />
          </CCol>

          <CCol md={6}>
            <CFormLabel>Contact Person Phone</CFormLabel>
            <CFormInput
              value={formData.contactPhone}
              onChange={(e) =>
                handleChange("contactPhone", e.target.value)
              }
              placeholder="Enter phone number"
            />
          </CCol>

          <CCol md={6}>
            <CFormLabel>Expected Delivery Date</CFormLabel>
            <CFormInput
              type="date"
              value={formData.expectedDate}
              onChange={(e) =>
                handleChange("expectedDate", e.target.value)
              }
            />
          </CCol>

          <CCol md={6}>
            <CFormLabel>Priority</CFormLabel>
            <CFormSelect
              value={formData.priority}
              onChange={(e) =>
                handleChange("priority", e.target.value)
              }
            >
              <option value="Non-urgent">Non-urgent</option>
              <option value="Urgent">Urgent</option>
            </CFormSelect>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default PaymentAndDelivery
