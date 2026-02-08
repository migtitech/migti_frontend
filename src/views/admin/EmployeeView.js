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
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil, cilHome, cilPeople, cilContact, cilCreditCard, cilDevices } from '@coreui/icons'
import employeeService from '../../services/employeeService'
import branchService from '../../services/branchService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const empty = (v) => v === undefined || v === null || v === ''
const show = (v) => (empty(v) ? '-' : String(v).trim() || '-')

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

  const getStatusBadge = (isActive) => {
    if (isActive === false) return <CBadge color="secondary">Inactive</CBadge>
    return <CBadge color="success">Active</CBadge>
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

  const InfoRow = ({ label, value, badge }) => (
    <CListGroupItem className="d-flex justify-content-between align-items-center">
      <strong>{label}</strong>
      {badge ? value : <span>{show(value)}</span>}
    </CListGroupItem>
  )

  const AssetSection = ({ title, data }) => {
    if (!data || !data.enabled) return null
    const fields = [
      { key: 'model', label: 'Model' },
      { key: 'modelNumber', label: 'Model Number' },
      { key: 'companyName', label: 'Company Name' },
      { key: 'vehicleNumber', label: 'Vehicle Number' },
      { key: 'number', label: 'Number' },
      { key: 'imeiNumber', label: 'IMEI Number' },
      { key: 'phoneType', label: 'Phone Type' },
      { key: 'configurationRam', label: 'RAM' },
      { key: 'configurationRom', label: 'ROM' },
      { key: 'storageType', label: 'Storage Type' },
      { key: 'providedDate', label: 'Provided Date' },
    ]
    return (
      <CCard className="mb-3">
        <CCardHeader className="py-2">
          <strong>{title}</strong>
          <CBadge color="success" className="ms-2">Assigned</CBadge>
        </CCardHeader>
        <CCardBody className="py-2">
          <CListGroup flush>
            {fields.map(({ key, label }) => (
              <CListGroupItem key={key} className="d-flex justify-content-between py-1">
                <strong>{label}:</strong>
                <span>{show(data[key])}</span>
              </CListGroupItem>
            ))}
          </CListGroup>
        </CCardBody>
      </CCard>
    )
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await withMinimumDelay(() => employeeService.getById(id))
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
        toastError(err?.message || 'Failed to load employee')
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
          <Loader message="Loading employee..." />
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

  const e = employee
  const bank = e.bankDetails || {}
  const assets = e.assets || {}

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex justify-content-between align-items-center">
          <CButton color="secondary" variant="outline" onClick={() => navigate('/employees')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Employees
          </CButton>
          <CButton color="primary" onClick={() => navigate(`/employees/edit/${e.id}`)}>
            <CIcon icon={cilPencil} className="me-2" />
            Edit Employee
          </CButton>
        </CCol>
      </CRow>

      {/* Profile header */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="align-items-center">
            <CCol xs="auto">
              <CAvatar color="primary" textColor="white" size="xl" className="mb-2 mb-md-0">
                {e.name?.charAt(0)?.toUpperCase() || 'E'}
              </CAvatar>
            </CCol>
            <CCol>
              <h4 className="mb-1">{show(e.name)}</h4>
              <p className="text-muted mb-2">{show(e.designation)}</p>
              <div className="d-flex flex-wrap gap-2">
                {getRoleBadge(e.role)}
                {getStatusBadge(e.isActive)}
                {e.uniqueId && (
                  <CBadge color="light" className="text-dark">ID: {show(e.uniqueId)}</CBadge>
                )}
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CRow>
        {/* Personal Information */}
        <CCol lg={6} className="mb-4">
          <CCard className="h-100">
            <CCardHeader>
              <CIcon icon={cilPeople} className="me-2" />
              <strong>Personal Information</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <InfoRow label="Full Name" value={e.name} />
                <InfoRow label="Father's Name" value={e.fatherName} />
                <InfoRow label="Mother's Name" value={e.motherName} />
                <InfoRow label="Address" value={e.address} />
                <InfoRow label="Pincode" value={e.pincode} />
                <InfoRow label="Has Bike" value={e.hasBike === 'yes' ? 'Yes' : e.hasBike === 'no' ? 'No' : show(e.hasBike)} />
                <InfoRow label="Has Driving License" value={e.hasDrivingLicense === 'yes' ? 'Yes' : e.hasDrivingLicense === 'no' ? 'No' : show(e.hasDrivingLicense)} />
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Contact Information */}
        <CCol lg={6} className="mb-4">
          <CCard className="h-100">
            <CCardHeader>
              <CIcon icon={cilContact} className="me-2" />
              <strong>Contact Information</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <InfoRow label="Personal Email" value={e.email} />
                <InfoRow label="Personal Phone" value={e.phone} />
                <InfoRow label="Company Email" value={e.companyEmail} />
                <InfoRow label="Company Phone" value={e.companyPhone} />
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        {/* Company / Work Details */}
        <CCol lg={6} className="mb-4">
          <CCard className="h-100">
            <CCardHeader>
              <CIcon icon={cilHome} className="me-2" />
              <strong>Company & Work Details</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <strong>Role</strong>
                  {getRoleBadge(e.role)}
                </CListGroupItem>
                <InfoRow label="Designation" value={e.designation} />
                <InfoRow label="ID Number" value={e.idnumber} />
                <InfoRow label="Branch" value={branch?.name} />
                <InfoRow label="Salary Type" value={e.salaryType} />
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <strong>Salary</strong>
                  <span>{empty(e.salary) ? '-' : `₹ ${Number(e.salary).toLocaleString()}`}</span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Bank Details */}
        <CCol lg={6} className="mb-4">
          <CCard className="h-100">
            <CCardHeader>
              <CIcon icon={cilCreditCard} className="me-2" />
              <strong>Bank Details</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <InfoRow label="Bank Name" value={bank.bankName} />
                <InfoRow label="Account Holder Name" value={bank.accountHolderName} />
                <InfoRow label="Account Number" value={bank.accountNumber} />
                <InfoRow label="IFSC Code" value={bank.ifscCode} />
                <InfoRow label="UPI Details" value={bank.upiDetails} />
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Assets */}
      <CCard className="mb-4">
        <CCardHeader>
          <CIcon icon={cilDevices} className="me-2" />
          <strong>Assets</strong>
        </CCardHeader>
        <CCardBody>
          {(assets.bike?.enabled || assets.laptop?.enabled || assets.mobile?.enabled || assets.simCard?.enabled) ? (
            <CRow>
              <CCol md={6} lg={3}>
                <AssetSection title="Bike" data={assets.bike} />
              </CCol>
              <CCol md={6} lg={3}>
                <AssetSection title="Laptop" data={assets.laptop} />
              </CCol>
              <CCol md={6} lg={3}>
                <AssetSection title="Mobile" data={assets.mobile} />
              </CCol>
              <CCol md={6} lg={3}>
                <AssetSection title="Sim Card" data={assets.simCard} />
              </CCol>
            </CRow>
          ) : (
            <p className="text-muted mb-0">No assets assigned.</p>
          )}
        </CCardBody>
      </CCard>

      {/* Meta / System Info */}
      <CCard>
        <CCardHeader>
          <strong>System Information</strong>
        </CCardHeader>
        <CCardBody>
          <CTable responsive size="sm" borderless>
            <CTableBody>
              <CTableRow>
                <CTableHeaderCell className="text-muted" style={{ width: '180px' }}>Employee ID</CTableHeaderCell>
                <CTableDataCell>{show(e.id)}</CTableDataCell>
              </CTableRow>
              <CTableRow>
                <CTableHeaderCell className="text-muted">Unique ID</CTableHeaderCell>
                <CTableDataCell>{show(e.uniqueId)}</CTableDataCell>
              </CTableRow>
              <CTableRow>
                <CTableHeaderCell className="text-muted">Status</CTableHeaderCell>
                <CTableDataCell>{getStatusBadge(e.isActive)}</CTableDataCell>
              </CTableRow>
              {e.createdAt && (
                <CTableRow>
                  <CTableHeaderCell className="text-muted">Created</CTableHeaderCell>
                  <CTableDataCell>{new Date(e.createdAt).toLocaleString()}</CTableDataCell>
                </CTableRow>
              )}
              {e.updatedAt && (
                <CTableRow>
                  <CTableHeaderCell className="text-muted">Last Updated</CTableHeaderCell>
                  <CTableDataCell>{new Date(e.updatedAt).toLocaleString()}</CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </>
  )
}

export default EmployeeView
