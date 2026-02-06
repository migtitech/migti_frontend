import React, { useMemo } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CBadge,
  CAlert,
  CAvatar,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilZoom } from '@coreui/icons'
import { Loader } from '../../../components'

const EmployeeTable = ({
  employees,
  branches,
  loading,
  error,
  onClearError,
  onView,
  onEdit,
  onDelete,
}) => {
  const branchById = useMemo(() => {
    const map = new Map()
    branches.forEach((branch) => {
      map.set(String(branch.id), branch)
    })
    return map
  }, [branches])

  const roleBadgeColor = (role) => {
    const colors = {
      hod: 'primary',
      sales: 'info',
      purchase: 'warning',
      finance: 'success',
      delivery: 'secondary',
    }
    return colors[role] || 'dark'
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Employee List</strong>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" className="mb-3" dismissible onClose={onClearError}>
                {error}
              </CAlert>
            )}
            {loading ? (
              <Loader message="Loading employees..." />
            ) : (
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>SNo</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Phone</CTableHeaderCell>
                    <CTableHeaderCell>Role</CTableHeaderCell>
                    <CTableHeaderCell>Branch</CTableHeaderCell>
                    <CTableHeaderCell>Designation</CTableHeaderCell>
                    <CTableHeaderCell>ID Number</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {employees.map((employee, index) => {
                    const branch = branchById.get(String(employee.branchId))
                    return (
                      <CTableRow key={employee.id}>
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex align-items-center">
                            <CAvatar color="primary" textColor="white" size="sm" className="me-2">
                              {employee.name?.charAt(0)?.toUpperCase() || 'E'}
                            </CAvatar>
                            <strong>{employee.name}</strong>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>{employee.email}</CTableDataCell>
                        <CTableDataCell>{employee.phone || '-'}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={roleBadgeColor(employee.role)}>
                            {employee.role || '-'}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{branch?.name || 'N/A'}</CTableDataCell>
                        <CTableDataCell>{employee.designation || '-'}</CTableDataCell>
                        <CTableDataCell>{employee.idnumber || '-'}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(employee.id)}
                            title="View"
                          >
                            <CIcon icon={cilZoom} />
                          </CButton>
                          <CButton
                            color="warning"
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(employee)}
                            title="Edit"
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(employee.id)}
                            title="Delete"
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                  {employees.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={9} className="text-center">
                        No employees found. Click "Add Employee" to create one.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default EmployeeTable
