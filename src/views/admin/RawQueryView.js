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
import { cilArrowLeft } from '@coreui/icons'
import rawQueryService from '../../services/rawQueryService'

const RawQueryView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <CBadge color="danger">High</CBadge>
      case 'medium':
      case 'normal':
        return <CBadge color="secondary">Medium</CBadge>
      case 'low':
        return <CBadge color="info">Low</CBadge>
      default:
        return <CBadge color="secondary">{priority}</CBadge>
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await rawQueryService.getById(id)
        const payload =
          response?.data?.rawQuery ||
          response?.data?.data ||
          response?.data?.query ||
          response?.data ||
          null
        setQuery(payload)
      } catch (err) {
        setError(err?.message || 'Failed to load raw query')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">Loading...</CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error}</p>
          <CButton color="primary" onClick={() => navigate('/raw-query')}>
            Back to Raw Queries
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  if (!query) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Raw query not found</h4>
          <CButton color="primary" onClick={() => navigate('/raw-query')}>
            Back to Raw Queries
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  const files = Array.isArray(query.files) ? query.files : []
  const supplier = query.supplier_id && typeof query.supplier_id === 'object' ? query.supplier_id : null

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/raw-query')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Raw Queries
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Raw Query Details</strong>
              <div className="d-flex gap-2">
                {getPriorityBadge(query.priority)}
              </div>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Title:</strong>
                  <span>{query.title || '-'}</span>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Company Info:</strong>
                  <p className="mb-0 mt-2">{query.company_info || query.companyInfo || '-'}</p>
                </CListGroupItem>
                {supplier && (
                  <CListGroupItem>
                    <strong>Supplier Details:</strong>
                    <div className="mt-2">
                      <div className="fw-semibold">{supplier.name}</div>
                      {supplier.shopname && <div className="text-muted">{supplier.shopname}</div>}
                      <div className="text-muted small">
                        {[supplier.email, supplier.phone_1, supplier.phone_2, supplier.other_contact]
                          .filter(Boolean)
                          .join(' • ') || 'No contact details'}
                      </div>
                      {(supplier.label || supplier.shop_location) && (
                        <div className="text-muted small">
                          {[supplier.label, supplier.shop_location].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </div>
                  </CListGroupItem>
                )}
                <CListGroupItem>
                  <strong>Description:</strong>
                  <p className="mb-0 mt-2">{query.description || 'No description provided'}</p>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Voice Notes:</strong>
                  {files.length > 0 ? (
                    <div className="mt-2 d-flex flex-column gap-2">
                      {files.map((file, index) => (
                        <audio key={`${index}-${file}`} controls src={file} />
                      ))}
                    </div>
                  ) : (
                    <p className="mb-0 mt-2 text-muted">No voice notes attached.</p>
                  )}
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>{new Date(query.createdAt).toLocaleString()}</span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default RawQueryView
