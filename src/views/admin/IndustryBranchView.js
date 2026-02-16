import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CAlert,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil } from '@coreui/icons'
import industryBranchService from '../../services/industryBranchService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const IndustryBranchView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [branch, setBranch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBranch = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => industryBranchService.getById(id))
        const data = res?.data?.data || res?.data || res
        setBranch(data)
      } catch (err) {
        toastError(err?.message || 'Failed to fetch industry branch')
      } finally {
        setLoading(false)
      }
    }
    fetchBranch()
  }, [id])

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading industry branch..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CAlert color="danger">
        {error}
        <CButton color="link" onClick={() => navigate('/industry-branches')}>
          Back to Industry Branches
        </CButton>
      </CAlert>
    )
  }

  if (!branch) {
    return (
      <CAlert color="warning">
        Industry branch not found.
        <CButton color="link" onClick={() => navigate('/industry-branches')}>
          Back to Industry Branches
        </CButton>
      </CAlert>
    )
  }

  const industryName =
    typeof branch.industryId === 'object' ? branch.industryId?.name : '-'

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex gap-2">
          <CButton color="light" onClick={() => navigate('/industry-branches')}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back
          </CButton>
          <CButton
            color="warning"
            onClick={() => navigate(`/industry-branches/edit/${id}`)}
          >
            <CIcon icon={cilPencil} className="me-1" />
            Edit
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>{branch.name}</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Industry:</strong>
                  <span>{industryName}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Location:</strong>
                  <span>{branch.location || '-'}</span>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Address:</strong>
                  <p className="mb-0 mt-2">
                    {branch.address || 'No address provided'}
                  </p>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>
                    {branch.createdAt
                      ? new Date(branch.createdAt).toLocaleDateString()
                      : '-'}
                  </span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default IndustryBranchView
