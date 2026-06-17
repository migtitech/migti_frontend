import React from 'react'
import { CCol, CRow, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'

const EmployeeHeader = ({ onAdd, canCreate }) => (
  <CRow>
    <CCol xs={12}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Employees</h4>
        {canCreate('employees') && (
          <CButton color="primary" onClick={onAdd}>
            <CIcon icon={cilPlus} className="me-2" />
            Add Employee
          </CButton>
        )}
      </div>
    </CCol>
  </CRow>
)

export default EmployeeHeader
