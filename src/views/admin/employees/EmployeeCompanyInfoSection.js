import React from "react";
import {
  CCol,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from "@coreui/react";

const EmployeeCompanyInfoSection = ({
  register,
  errors,
  roleOptions,
  branches,
  zones = [],
  selectedZoneIds = [],
  onZoneIdsChange,
  subZones = [],
  designationOptions = [],
  lockBranch = false,
}) => (
  <>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="companyEmail">Company Email</CFormLabel>
          <CFormInput
            type="email"
            id="companyEmail"
            {...register("companyEmail")}
            invalid={!!errors.companyEmail}
          />
          <CFormFeedback invalid>{errors.companyEmail?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="companyPhone">Company Phone</CFormLabel>
          <CFormInput
            id="companyPhone"
            inputMode="numeric"
            pattern="\d*"
            {...register("companyPhone")}
            invalid={!!errors.companyPhone}
          />
          <CFormFeedback invalid>{errors.companyPhone?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="role">Role *</CFormLabel>
          <CFormSelect id="role" {...register("role")} invalid={!!errors.role}>
            <option value="">Select Role</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </CFormSelect>
          <CFormFeedback invalid>{errors.role?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="branchId">Branch *</CFormLabel>
          <CFormSelect
            id="branchId"
            {...register("branchId")}
            invalid={!!errors.branchId}
            disabled={lockBranch}
          >
            <option value="">Select Branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </CFormSelect>
          <CFormFeedback invalid>{errors.branchId?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="designation">Designation *</CFormLabel>
          <CFormSelect
            id="designation"
            {...register("designation")}
            invalid={!!errors.designation}
          >
            <option value="">Select Designation</option>
            {designationOptions.map((designation) => (
              <option key={designation} value={designation}>
                {designation}
              </option>
            ))}
          </CFormSelect>
          <CFormFeedback invalid>{errors.designation?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={3}>
        <div className="mb-3">
          <CFormLabel htmlFor="salaryType">Salary Type *</CFormLabel>
          <CFormSelect
            id="salaryType"
            {...register("salaryType")}
            invalid={!!errors.salaryType}
          >
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
          </CFormSelect>
          <CFormFeedback invalid>{errors.salaryType?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={3}>
        <div className="mb-3">
          <CFormLabel htmlFor="salary">Salary *</CFormLabel>
          <CFormInput
            type="number"
            id="salary"
            min="0"
            step="0.01"
            {...register("salary")}
            invalid={!!errors.salary}
          />
          <CFormFeedback invalid>{errors.salary?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="zoneIds">Zones</CFormLabel>
          <CFormSelect
            id="zoneIds"
            multiple
            value={selectedZoneIds}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions || [])
                .map((opt) => opt.value)
                .filter(Boolean);
              onZoneIdsChange(values);
            }}
            invalid={!!errors.zoneIds}
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </CFormSelect>
          <CFormFeedback invalid>{errors.zoneIds?.message}</CFormFeedback>
        </div>
      </CCol>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="subZoneId">Sub-zone</CFormLabel>
          <CFormSelect
            id="subZoneId"
            {...register("subZoneId")}
            invalid={!!errors.subZoneId}
            disabled={selectedZoneIds.length !== 1 || !subZones.length}
          >
            <option value="">
              {selectedZoneIds.length !== 1
                ? "Select exactly one zone to choose sub-zone"
                : subZones.length
                  ? "Select sub-zone (optional)"
                  : "No sub-zones for this zone"}
            </option>
            {subZones.map((sz) => {
              const sid = sz._id || sz.id;
              return (
                <option key={sid} value={sid}>
                  {sz.subZoneCode ? `${sz.subZoneCode} — ` : ""}
                  {sz.name}
                </option>
              );
            })}
          </CFormSelect>
          <CFormFeedback invalid>{errors.subZoneId?.message}</CFormFeedback>
        </div>
      </CCol>
    </CRow>
  </>
);

export default EmployeeCompanyInfoSection;
