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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPeople } from '@coreui/icons'
import branchService from '../../services/branchService'
import companyService from '../../services/companyService'
import employeeService from '../../services/employeeService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const BranchView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [branch, setBranch] = useState(null)
  const [company, setCompany] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const normalizeId = (item) => ({
    ...item,
    id: item?.id || item?._id,
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const branchResponse = await withMinimumDelay(() => branchService.getById(id))
        const branchPayload =
          branchResponse?.data?.branch ||
          branchResponse?.data?.data ||
          branchResponse?.data ||
          null
        const normalizedBranch = branchPayload ? normalizeId(branchPayload) : null
        setBranch(normalizedBranch)

        if (normalizedBranch?.companyId) {
          const companyResponse = await companyService.getById(
            normalizedBranch.companyId
          )
          const companyPayload =
            companyResponse?.data?.company ||
            companyResponse?.data?.data ||
            companyResponse?.data ||
            null
          setCompany(companyPayload ? normalizeId(companyPayload) : null)
        } else {
          setCompany(null)
        }

        const employeesResponse = await employeeService.getAll({ branchId: id })
        const list = employeesResponse?.data?.employees || employeesResponse?.data || []
        const normalizedEmployees = Array.isArray(list) ? list.map(normalizeId) : []
        const filteredEmployees = normalizedEmployees.filter(
          (employee) => String(employee.branchId) === String(normalizedBranch?.id || id)
        )
        setEmployees(filteredEmployees)
      } catch (err) {
        toastError(err?.message || 'Failed to load branch')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading branch..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error}</p>
          <CButton color="primary" onClick={() => navigate('/branches')}>
            Back to Branches
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  if (!branch) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Branch not found</h4>
          <CButton color="primary" onClick={() => navigate('/branches')}>
            Back to Branches
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/branches')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Branches
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Branch Details</strong>
              <CBadge color="success">Active</CBadge>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Branch Name:</strong>
                  <span>{branch.name || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Company:</strong>
                  <span>{company?.name || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Email:</strong>
                  <span>{branch.email || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Phone:</strong>
                  <span>{branch.phone || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Location:</strong>
                  <span>{branch.location || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Branch Code:</strong>
                  <span>{branch.branchcode || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>GST Number:</strong>
                  <span>{branch.gstNumber || '-'}</span>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Address:</strong>
                  <p className="mb-0 mt-2">{branch.address || branch.fullAddress || '-'}</p>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>{branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : '-'}</span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Employees ({employees.length})</strong>
              <CButton
                color="primary"
                size="sm"
                variant="ghost"
                onClick={() => navigate('/employees')}
                title="View Employees"
              >
                <CIcon icon={cilPeople} className="me-1" />
                View
              </CButton>
            </CCardHeader>
            <CCardBody>
              {employees.length > 0 ? (
                <CListGroup>
                  {employees.map((employee) => (
                    <CListGroupItem
                      key={employee.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <strong>{employee.name || 'Employee'}</strong>
                        <br />
                        <small className="text-muted">{employee.designation || employee.role || ''}</small>
                      </div>
                      <CBadge color="info">{employee.email || '-'}</CBadge>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              ) : (
                <p className="text-muted text-center mb-0">No employees yet</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default BranchView
