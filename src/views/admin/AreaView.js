import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CListGroup,
  CListGroupItem,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil } from '@coreui/icons'
import areaService from '../../services/areaService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const AreaView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [area, setArea] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => areaService.getById(id))
        const data = res?.data?.data || res?.data || res
        setArea(data)
      } catch (err) {
        setError(err?.message || 'Failed to load area')
        toastError(err?.message || 'Failed to load area')
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
          <Loader message="Loading area..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error || !area) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error || 'Area not found'}</p>
          <CButton color="primary" onClick={() => navigate('/areas')}>
            Back to Areas
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  const areaTypeLabel = area.areaType === 'market' ? 'Market' : 'Industry'

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/areas')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Areas
          </CButton>
        </CCol>
        <CCol className="text-end">
          <CButton color="primary" onClick={() => navigate(`/areas/edit/${id}`)}>
            <CIcon icon={cilPencil} className="me-2" />
            Edit Area
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12} md={6}>
          <CCard>
            <CCardHeader>
              <strong>Area Details</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Name</span>
                  <strong>{area.name}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">City</span>
                  <span>{area.city}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Area Type</span>
                  <CBadge color={area.areaType === 'market' ? 'info' : 'secondary'}>
                    {areaTypeLabel}
                  </CBadge>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Company</span>
                  <span>{area.companyId?.name ?? '—'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Branch</span>
                  <span>{area.branchId?.name ?? '—'}</span>
                </CListGroupItem>
                {area.branchId?.location && (
                  <CListGroupItem className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Branch Location</span>
                    <span>{area.branchId.location}</span>
                  </CListGroupItem>
                )}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default AreaView
