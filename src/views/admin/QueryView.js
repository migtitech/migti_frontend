import React from 'react'
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
  CImage,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil } from '@coreui/icons'
import { useData } from '../../context/DataContext'

const QueryView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { queries } = useData()

  const query = queries?.find((q) => q.id === parseInt(id))

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <CBadge color="info">New</CBadge>
      case 'in_progress':
        return <CBadge color="warning">In Progress</CBadge>
      case 'quoted':
        return <CBadge color="primary">Quoted</CBadge>
      case 'closed':
        return <CBadge color="success">Closed</CBadge>
      case 'cancelled':
        return <CBadge color="danger">Cancelled</CBadge>
      default:
        return <CBadge color="secondary">{status}</CBadge>
    }
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <CBadge color="danger">High</CBadge>
      case 'normal':
        return <CBadge color="secondary">Normal</CBadge>
      case 'low':
        return <CBadge color="info">Low</CBadge>
      default:
        return <CBadge color="secondary">{priority}</CBadge>
    }
  }

  if (!query) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Query not found</h4>
          <CButton color="primary" onClick={() => navigate('/queries')}>
            Back to Queries
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/queries')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Queries
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Query Details</strong>
              <div className="d-flex gap-2">
                {getStatusBadge(query.status)}
                {getPriorityBadge(query.priority)}
              </div>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Customer Name:</strong>
                  <span>{query.customerName}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Customer Email:</strong>
                  <span>{query.customerEmail}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Customer Phone:</strong>
                  <span>{query.customerPhone || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Subject:</strong>
                  <span>{query.subject}</span>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Description:</strong>
                  <p className="mb-0 mt-2">{query.description || 'No description provided'}</p>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>{new Date(query.createdAt).toLocaleString()}</span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Attached Images</strong>
            </CCardHeader>
            <CCardBody>
              {query.images && query.images.length > 0 ? (
                <CRow>
                  {query.images.map((image, index) => (
                    <CCol key={index} xs={12} className="mb-3">
                      <CImage src={image} fluid className="rounded" />
                    </CCol>
                  ))}
                </CRow>
              ) : (
                <p className="text-muted text-center mb-0">No images attached</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default QueryView
