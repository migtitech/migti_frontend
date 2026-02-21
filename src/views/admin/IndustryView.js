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
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil } from '@coreui/icons'
import industryService from '../../services/industryService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const IndustryView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [industry, setIndustry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchIndustry = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => industryService.getById(id))
        const data = res?.data || res
        setIndustry(data)
      } catch (err) {
        toastError(err?.message || 'Failed to fetch industry')
      } finally {
        setLoading(false)
      }
    }
    fetchIndustry()
  }, [id])

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading industry..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CAlert color="danger">
        {error}
        <CButton color="secondary" variant="outline" onClick={() => navigate('/industries')}>
          Back to Industries
        </CButton>
      </CAlert>
    )
  }

  if (!industry) {
    return (
      <CAlert color="warning">
        Industry not found.
        <CButton color="secondary" variant="outline" onClick={() => navigate('/industries')}>
          Back to Industries
        </CButton>
      </CAlert>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex gap-2">
          <CCardBody>
            <CButton color="secondary" variant="outline" onClick={() => navigate('/industries')}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Industries
          </CButton>
          </CCardBody>
          <CButton color="warning" onClick={() => navigate(`/industries/edit/${id}`)}>
            <CIcon icon={cilPencil} className="me-1" />
            Edit
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>{industry.name}</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Area:</strong>
                  <span>
                    {typeof industry.area === 'object'
                      ? industry.area?.name || '-'
                      : industry.area || '-'}
                  </span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Location:</strong>
                  <span>{industry.location || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>GST Number:</strong>
                  <span>{industry.gstNumber || '-'}</span>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Purchase Managers:</strong>
                  {(industry.purchaseManagers || []).length > 0 ? (
                    <CTable hover responsive className="mt-2 mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>S No</CTableHeaderCell>
                          <CTableHeaderCell>Name</CTableHeaderCell>
                          <CTableHeaderCell>Phone</CTableHeaderCell>
                          <CTableHeaderCell>Email</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {industry.purchaseManagers.map((pm, idx) => (
                          <CTableRow key={pm._id || pm.name || idx}>
                            <CTableDataCell>{idx + 1}</CTableDataCell>
                            <CTableDataCell>{pm.name || '-'}</CTableDataCell>
                            <CTableDataCell>{pm.phone || '-'}</CTableDataCell>
                            <CTableDataCell>{pm.email || '-'}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  ) : industry.purchase_manager_name ? (
                    <CTable hover responsive className="mt-2 mb-0">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>S No</CTableHeaderCell>
                          <CTableHeaderCell>Name</CTableHeaderCell>
                          <CTableHeaderCell>Phone</CTableHeaderCell>
                          <CTableHeaderCell>Email</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        <CTableRow>
                          <CTableDataCell>1</CTableDataCell>
                          <CTableDataCell>{industry.purchase_manager_name}</CTableDataCell>
                          <CTableDataCell>{industry.purchase_manager_phone || '-'}</CTableDataCell>
                          <CTableDataCell>{industry.email || '-'}</CTableDataCell>
                        </CTableRow>
                      </CTableBody>
                    </CTable>
                  ) : (
                    <span className="d-block mt-2">-</span>
                  )}
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Address:</strong>
                  <p className="mb-0 mt-2">{industry.address || 'No address provided'}</p>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>{new Date(industry.createdAt).toLocaleDateString()}</span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default IndustryView
