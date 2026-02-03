import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CBadge,
  CListGroup,
  CListGroupItem,
  CAvatar,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil } from '@coreui/icons'
import employeeService from '../../services/employeeService'
import branchService from '../../services/branchService'

const EmployeeView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(null)
  const [branch, setBranch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const ROLES = {
    hod: 'HOD',
    sales: 'Sales',
    purchase: 'Purchase',
    finance: 'Finance',
    delivery: 'Delivery',
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <CBadge color="success">Active</CBadge>
      case 'inactive':
        return <CBadge color="secondary">Inactive</CBadge>
      case 'on_leave':
        return <CBadge color="warning">On Leave</CBadge>
      case 'terminated':
        return <CBadge color="danger">Terminated</CBadge>
      default:
        return <CBadge color="info">{status}</CBadge>
    }
  }

  const getRoleBadge = (role) => {
    const colors = {
      hod: 'primary',
      sales: 'info',
      purchase: 'warning',
      finance: 'success',
      delivery: 'secondary',
    }
    return <CBadge color={colors[role] || 'secondary'}>{ROLES[role] || role}</CBadge>
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await employeeService.getById(id)
        const employeePayload =
          response?.data?.employee ||
          response?.data?.data ||
          response?.data ||
          null
        const normalizedEmployee = employeePayload
          ? { ...employeePayload, id: employeePayload?.id || employeePayload?._id }
          : null
        setEmployee(normalizedEmployee)

        if (normalizedEmployee?.branchId) {
          const branchResponse = await branchService.getById(normalizedEmployee.branchId)
          const branchPayload =
            branchResponse?.data?.branch ||
            branchResponse?.data?.data ||
            branchResponse?.data ||
            null
          const normalizedBranch = branchPayload
            ? { ...branchPayload, id: branchPayload?.id || branchPayload?._id }
            : null
          setBranch(normalizedBranch)
        } else {
          setBranch(null)
        }
      } catch (err) {
        setError(err?.message || 'Failed to load employee')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error}</p>
          <CButton color="primary" onClick={() => navigate('/employees')}>
            Back to Employees
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  if (!employee) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Employee not found</h4>
          <CButton color="primary" onClick={() => navigate('/employees')}>
            Back to Employees
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/employees')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Employees
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={4}>
          <CCard className="mb-4">
            <CCardBody className="text-center">
              <CAvatar color="primary" textColor="white" size="xl" className="mb-3">
                {employee.name?.charAt(0)?.toUpperCase() || 'E'}
              </CAvatar>
              <h4>{employee.name}</h4>
              <p className="text-muted mb-2">{employee.designation || 'No designation'}</p>
              <div className="mb-3">
                {getRoleBadge(employee.role)}
                <span className="mx-2"></span>
                {getStatusBadge(employee.status)}
              </div>
              <p className="text-muted small">{employee.email}</p>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Employee Details</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Full Name:</strong>
                  <span>{employee.name}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Email:</strong>
                  <span>{employee.email}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Phone:</strong>
                  <span>{employee.phone || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Role:</strong>
                  {getRoleBadge(employee.role)}
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Branch:</strong>
                  <span>{branch?.name || 'N/A'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Department:</strong>
                  <span>{employee.department || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Designation:</strong>
                  <span>{employee.designation || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Joining Date:</strong>
                  <span>
                    {employee.joiningDate
                      ? new Date(employee.joiningDate).toLocaleDateString()
                      : '-'}
                  </span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Status:</strong>
                  {getStatusBadge(employee.status)}
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>{employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : '-'}</span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default EmployeeView
