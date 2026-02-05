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
import { cilArrowLeft, cilPencil, cilLocationPin } from '@coreui/icons'
import companyService from '../../services/companyService'
import branchService from '../../services/branchService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'

const CompanyView = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [company, setCompany] = useState(null)
  const [branches, setBranches] = useState([])
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
        const [companyResponse, branchesResponse] = await withMinimumDelay(
          () =>
            Promise.all([
              companyService.getById(id),
              branchService.getAll({ companyId: id }),
            ]),
          2000
        )

        const companyPayload =
          companyResponse?.data?.company ||
          companyResponse?.data?.data ||
          companyResponse?.data ||
          null
        const normalizedCompany = companyPayload ? normalizeId(companyPayload) : null
        setCompany(normalizedCompany)

        const list = branchesResponse?.data?.branches || branchesResponse?.data || []
        const normalizedBranches = Array.isArray(list) ? list.map(normalizeId) : []
        const filteredBranches = normalizedBranches.filter(
          (branch) => String(branch.companyId) === String(id)
        )
        setBranches(filteredBranches)
      } catch (err) {
        setError(err?.message || 'Failed to load company')
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
          <Loader message="Loading company..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error}</p>
          <CButton color="primary" onClick={() => navigate('/companies')}>
            Back to Companies
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  if (!company) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Company not found</h4>
          <CButton color="primary" onClick={() => navigate('/companies')}>
            Back to Companies
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/companies')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Companies
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Company Details</strong>
              <CButton color="warning" size="sm" onClick={() => navigate(`/companies/${id}/edit`)}>
                <CIcon icon={cilPencil} className="me-2" />
                Edit
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Company Name:</strong>
                  <span>{company.name}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Email:</strong>
                  <span>{company.email}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Phone:</strong>
                  <span>{company.phone || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Location:</strong>
                  <span>{company.location}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>GST Number:</strong>
                  <span>{company.gst || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Website:</strong>
                  <span>{company.website || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Address:</strong>
                  <span>{company.address || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Status:</strong>
                  <CBadge color="success">Active</CBadge>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>{company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '-'}</span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Branches ({branches.length})</strong>
              <CButton
                color="primary"
                size="sm"
                onClick={() => navigate(`/companies/${id}/branches`)}
              >
                <CIcon icon={cilLocationPin} className="me-2" />
                Manage
              </CButton>
            </CCardHeader>
            <CCardBody>
              {branches.length > 0 ? (
                <CListGroup>
                  {branches.map((branch) => (
                    <CListGroupItem
                      key={branch.id}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <strong>{branch.name}</strong>
                        <br />
                        <small className="text-muted">{branch.location}</small>
                      </div>
                      <CBadge color="info">{branch.email}</CBadge>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              ) : (
                <p className="text-muted text-center mb-0">No branches yet</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default CompanyView
