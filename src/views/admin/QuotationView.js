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
  CTable,
  CTableBody,
  CTableHead,
  CTableHeaderCell,
  CTableDataCell,
  CTableRow,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CImage,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCloudDownload, cilEnvelopeClosed, cilX, cilArrowRight } from '@coreui/icons'
import { getAssetsUrl } from '../../api/endpoints'
import quotationService from '../../services/quotationService'
import { Loader } from '../../components'
import { toastError } from '../../utils/toast'

const QuotationView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quotation, setQuotation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    quotationService
      .getById(id)
      .then((res) => {
        if (cancelled) return
        const data = res?.data?.data ?? res?.data ?? res
        const q = data ? { ...data, id: data._id ?? data.id } : null
        setQuotation(q)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Failed to load quotation')
        toastError(err?.message || 'Failed to load quotation')
        setQuotation(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  const companyInfo = quotation?.companyInfo || null
  const products = Array.isArray(quotation?.products) ? quotation.products : []
  const queryId = quotation?.queryId?._id ?? quotation?.queryId

  const [expandedImages, setExpandedImages] = useState([])
  const [expandedImageIndex, setExpandedImageIndex] = useState(0)

  const getImageUrl = (img) => {
    if (!img) return ''
    if (typeof img === 'object' && img?.path) return getAssetsUrl(img.path)
    return typeof img === 'string' ? img : ''
  }

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

      {/* Image slider modal */}
      <CModal alignment="center" visible={expandedImages.length > 0} onClose={() => setExpandedImages([])} className="p-0">
        <CModalHeader className="border-0 pb-0 d-flex justify-content-between align-items-center">
          <CModalTitle className="mb-0">
            Image {expandedImages.length > 1 ? `${expandedImageIndex + 1} / ${expandedImages.length}` : ''}
          </CModalTitle>
          <CButton color="secondary" variant="ghost" size="sm" className="rounded-circle" onClick={() => setExpandedImages([])} aria-label="Close">
            <CIcon icon={cilX} size="lg" />
          </CButton>
        </CModalHeader>
        <CModalBody className="text-center p-3 position-relative">
          {expandedImages.length > 0 && (
            <>
              {expandedImages.length > 1 && (
                <>
                  <CButton
                    color="light"
                    variant="outline"
                    className="position-absolute top-50 translate-middle-y rounded-circle ms-2"
                    style={{ zIndex: 10, width: 48, height: 48, left: 0 }}
                    onClick={() => setExpandedImageIndex((idx) => (idx <= 0 ? expandedImages.length - 1 : idx - 1))}
                    aria-label="Previous"
                  >
                    <CIcon icon={cilArrowLeft} size="lg" />
                  </CButton>
                  <CButton
                    color="light"
                    variant="outline"
                    className="position-absolute top-50 translate-middle-y rounded-circle me-2"
                    style={{ zIndex: 10, width: 48, height: 48, right: 0 }}
                    onClick={() => setExpandedImageIndex((idx) => (idx >= expandedImages.length - 1 ? 0 : idx + 1))}
                    aria-label="Next"
                  >
                    <CIcon icon={cilArrowRight} size="lg" />
                  </CButton>
                </>
              )}
              <img
                src={expandedImages[expandedImageIndex]}
                alt={`Product ${expandedImageIndex + 1}`}
                className="img-fluid rounded"
                style={{ maxHeight: '80vh', objectFit: 'contain' }}
              />
            </>
          )}
        </CModalBody>
      </CModal>

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
              {companyInfo ? (
                <>
                  <h6 className="mb-3">Company Information</h6>
                  <CListGroup flush className="mb-4">
                    <CListGroupItem className="d-flex justify-content-between">
                      <strong>Company name</strong>
                      <span>{companyInfo.name || '-'}</span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <strong>Location</strong>
                      <span>{companyInfo.location || '-'}</span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <strong>Area</strong>
                      <span>{companyInfo.area || '-'}</span>
                    </CListGroupItem>
                    <CListGroupItem>
                      <strong>Purchase manager</strong>
                      <div className="mt-1">
                        {(companyInfo.purchase_manager_name || companyInfo.purchase_manager_phone) ? (
                          <>
                            {companyInfo.purchase_manager_name || '–'}
                            {companyInfo.purchase_manager_phone && ` • ${companyInfo.purchase_manager_phone}`}
                            {companyInfo.email && ` • ${companyInfo.email}`}
                          </>
                        ) : (
                          '–'
                        )}
                      </div>
                    </CListGroupItem>
                    <CListGroupItem>
                      <strong>Address</strong>
                      <div className="mt-1">{companyInfo.address || '-'}</div>
                    </CListGroupItem>
                  </CListGroup>
                </>
              ) : (
                <>
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
                </>
              )}

              {products.length > 0 && (
                <>
                  {!companyInfo && <hr />}
                  <h6 className="mb-3">Products</h6>
                  <CTable responsive hover>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>#</CTableHeaderCell>
                          <CTableHeaderCell>Product name</CTableHeaderCell>
                          <CTableHeaderCell>Description</CTableHeaderCell>
                          <CTableHeaderCell>Quantity</CTableHeaderCell>
                          <CTableHeaderCell>Unit</CTableHeaderCell>
                          <CTableHeaderCell>Quoted rate</CTableHeaderCell>
                          <CTableHeaderCell>Images</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                    <CTableBody>
                      {products.map((p, idx) => {
                        const productRef = typeof p.product_id === 'object' ? p.product_id : null
                        const images = productRef?.images || []
                        return (
                        <CTableRow key={idx}>
                          <CTableDataCell>{idx + 1}</CTableDataCell>
                          <CTableDataCell>{p.productName || '–'}</CTableDataCell>
                          <CTableDataCell className="small">
                            {productRef?.shortDescription || p.description || '—'}
                          </CTableDataCell>
                          <CTableDataCell>{p.quantity ?? '–'}</CTableDataCell>
                          <CTableDataCell>{p.unitName || p.unit || '–'}</CTableDataCell>
                          <CTableDataCell>{(p.rate ?? p.quoted_rate) != null ? `₹${Number(p.rate ?? p.quoted_rate).toLocaleString()}` : '–'}</CTableDataCell>
                          <CTableDataCell>
                            {images.length > 0 ? (
                              <div className="d-flex flex-wrap gap-1">
                                {images.slice(0, 2).map((img, i) => {
                                  const src = getImageUrl(img)
                                  return (
                                    <div
                                      key={img?._id || i}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => {
                                        const urls = images.map((im) => getImageUrl(im))
                                        setExpandedImages(urls)
                                        setExpandedImageIndex(i)
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const urls = images.map((im) => getImageUrl(im))
                                          setExpandedImages(urls)
                                          setExpandedImageIndex(i)
                                        }
                                      }}
                                      className="rounded border overflow-hidden"
                                      style={{ width: 48, height: 48, cursor: 'pointer' }}
                                    >
                                      <CImage src={src} width={48} height={48} className="object-fit-cover w-100 h-100" />
                                    </div>
                                  )
                                })}
                                {images.length > 2 && (
                                  <span className="small text-muted align-self-center">+{images.length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </CTableDataCell>
                        </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                </>
              )}

              <CRow className="mt-4">
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
                {queryId && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <strong>Related Query:</strong>
                    <CButton
                      color="link"
                      size="sm"
                      onClick={() => navigate(`/queries/${queryId}`)}
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
