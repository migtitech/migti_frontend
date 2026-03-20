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
  CFormInput,
  CFormLabel,
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
import { toastError, toastSuccess } from '../../utils/toast'
import AuthImage from '../../components/AuthImage/AuthImage'
import { getAssetsUrl } from '../../api/endpoints'
import documentService from '../../services/documentService'

const BranchView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [branch, setBranch] = useState(null)
  const [company, setCompany] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [error, setError] = useState('')

  const normalizeId = (item) => ({
    ...item,
    id: item?.id || item?._id,
  })

  const formatCreatedAt = (item) => {
    const dt = item?.createdAt ?? item?.created_at
    if (!dt) return '-'
    try {
      const d = new Date(dt)
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return '-'
    }
  }

  const getSignatureDisplay = (signature) => {
    if (!signature) return { id: '', path: '' }
    if (typeof signature === 'object') {
      const id = signature?._id || signature?.id || ''
      const rawPath = signature?.path || ''
      const path = rawPath ? (rawPath.startsWith('http') ? rawPath : getAssetsUrl(rawPath)) : ''
      return { id, path }
    }
    return { id: signature, path: '' }
  }

  const loadBranchDetails = async (branchId) => {
    const branchResponse = await withMinimumDelay(() => branchService.getById(branchId))
    const branchPayload =
      branchResponse?.data?.branch ||
      branchResponse?.data?.data?.branch ||
      branchResponse?.data?.data ||
      branchResponse?.data ||
      null
    const normalizedBranch = branchPayload ? normalizeId(branchPayload) : null
    setBranch(normalizedBranch)
    return normalizedBranch
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const normalizedBranch = await loadBranchDetails(id)

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

  const handleSignatureUpload = async (event) => {
    const file = event?.target?.files?.[0]
    if (!file || !branch?.id) return

    setUploadingSignature(true)
    try {
      const uploadRes = await documentService.uploadImages([file])
      const uploadedDocs = uploadRes?.data?.documents || []
      const uploadedId = uploadedDocs[0]?._id
      if (!uploadedId) {
        throw new Error('Signature upload failed, please try again.')
      }

      const updateRes = await branchService.update(branch.id, { signature: uploadedId })
      const updatedBranchPayload =
        updateRes?.data?.data ||
        updateRes?.data?.branch ||
        updateRes?.data ||
        null
      const normalizedUpdatedBranch = updatedBranchPayload ? normalizeId(updatedBranchPayload) : null
      setBranch((prev) => normalizedUpdatedBranch || { ...(prev || {}), signature: uploadedId })
      await loadBranchDetails(branch.id)
      toastSuccess('Signature uploaded successfully')
    } catch (err) {
      toastError(err?.message || 'Failed to upload signature')
    } finally {
      event.target.value = ''
      setUploadingSignature(false)
    }
  }

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
  const signature = getSignatureDisplay(branch.signature)

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
                  <strong>Branch Code:</strong>
                  <span>{branch.branchcode || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>GST Number:</strong>
                  <span>{branch.gstNumber || '-'}</span>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Address:</strong>
                  <p className="mb-0 mt-2">{branch.address || '-'}</p>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Full Address:</strong>
                  <p className="mb-0 mt-2">{branch.fullAddress || '-'}</p>
                </CListGroupItem>
                {branch.mapLocationUrl && (
                  <CListGroupItem className="d-flex justify-content-between align-items-center">
                    <strong>Map Location:</strong>
                    <CButton
                      color="link"
                      size="sm"
                      href={branch.mapLocationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on Map
                    </CButton>
                  </CListGroupItem>
                )}
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>{formatCreatedAt(branch)}</span>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Signature:</strong>
                  <div className="mt-2">
                    {signature.id || signature.path ? (
                      <AuthImage
                        documentId={signature.id || null}
                        fallbackUrl={signature.path}
                        alt="Branch signature"
                        style={{ maxHeight: 60, maxWidth: 180, objectFit: 'contain' }}
                      />
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <CFormLabel htmlFor="branchSignatureUpload" className="small mb-1">
                      Upload / Replace Signature
                    </CFormLabel>
                    <CFormInput
                      id="branchSignatureUpload"
                      type="file"
                      accept="image/*"
                      disabled={uploadingSignature}
                      onChange={handleSignatureUpload}
                    />
                    <div className="small text-muted mt-1">
                      You can upload any image format (max 10MB).
                    </div>
                  </div>
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
                        <br />
                        <small className="text-muted">Phone: {employee.phone || '-'}</small>
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
