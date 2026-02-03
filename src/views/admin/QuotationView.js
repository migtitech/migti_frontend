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
  CTable,
  CTableBody,
  CTableHead,
  CTableHeaderCell,
  CTableDataCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCloudDownload, cilEnvelopeClosed } from '@coreui/icons'
import { useData } from '../../context/DataContext'

const QuotationView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { quotations } = useData()

  const quotation = quotations?.find((q) => q.id === parseInt(id))

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <CBadge color="secondary">Draft</CBadge>
      case 'sent':
        return <CBadge color="info">Sent</CBadge>
      case 'accepted':
        return <CBadge color="success">Accepted</CBadge>
      case 'rejected':
        return <CBadge color="danger">Rejected</CBadge>
      case 'expired':
        return <CBadge color="warning">Expired</CBadge>
      default:
        return <CBadge color="secondary">{status}</CBadge>
    }
  }

  if (!quotation) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Quotation not found</h4>
          <CButton color="primary" onClick={() => navigate('/quotations')}>
            Back to Quotations
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex justify-content-between align-items-center">
          <CButton color="secondary" variant="outline" onClick={() => navigate('/quotations')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Quotations
          </CButton>
          <div className="d-flex gap-2">
            <CButton color="success">
              <CIcon icon={cilCloudDownload} className="me-2" />
              Download PDF
            </CButton>
            <CButton color="info">
              <CIcon icon={cilEnvelopeClosed} className="me-2" />
              Send to Customer
            </CButton>
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Quotation #QT-{String(quotation.id).padStart(4, '0')}</strong>
              </div>
              {getStatusBadge(quotation.status)}
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-4">
                <CCol md={6}>
                  <h6 className="text-muted">Customer Details</h6>
                  <p className="mb-1"><strong>{quotation.customerName}</strong></p>
                  <p className="mb-1">{quotation.customerEmail}</p>
                </CCol>
                <CCol md={6} className="text-md-end">
                  <h6 className="text-muted">Quotation Details</h6>
                  <p className="mb-1">Date: {new Date(quotation.createdAt).toLocaleDateString()}</p>
                  <p className="mb-1">Valid Until: {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'N/A'}</p>
                </CCol>
              </CRow>

              <hr />

              <h6 className="mb-3">Items/Description</h6>
              <div className="bg-light p-3 rounded mb-4">
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{quotation.items || 'No items specified'}</pre>
              </div>

              <CRow>
                <CCol md={6}></CCol>
                <CCol md={6}>
                  <CTable borderless small>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell><strong>Total Amount:</strong></CTableDataCell>
                        <CTableDataCell className="text-end">
                          <strong>₹{quotation.totalAmount?.toLocaleString() || '0'}</strong>
                        </CTableDataCell>
                      </CTableRow>
                    </CTableBody>
                  </CTable>
                </CCol>
              </CRow>

              {quotation.notes && (
                <>
                  <hr />
                  <h6>Notes</h6>
                  <p className="text-muted">{quotation.notes}</p>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Quotation Info</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Status:</strong>
                  {getStatusBadge(quotation.status)}
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created:</strong>
                  <span>{new Date(quotation.createdAt).toLocaleDateString()}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Valid Until:</strong>
                  <span>{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'N/A'}</span>
                </CListGroupItem>
                {quotation.queryId && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <strong>Related Query:</strong>
                    <CButton
                      color="link"
                      size="sm"
                      onClick={() => navigate(`/queries/${quotation.queryId}`)}
                    >
                      View Query
                    </CButton>
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

export default QuotationView
