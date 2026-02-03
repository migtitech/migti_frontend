import React from 'react'
import { CButton, CCard, CCardBody, CSpinner } from '@coreui/react'

const EmployeeFormActions = ({ submitting, isEdit, onCancel }) => (
  <CCard className="mb-4">
    <CCardBody className="d-flex justify-content-end gap-2">
      <CButton color="secondary" onClick={onCancel}>
        Cancel
      </CButton>
      <CButton color="primary" type="submit" disabled={submitting}>
        {submitting ? <CSpinner size="sm" /> : isEdit ? 'Update Employee' : 'Create Employee'}
      </CButton>
    </CCardBody>
  </CCard>
)

export default EmployeeFormActions
