import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CAlert,
  CImage,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHeaderCell,
  CTableRow,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilX } from '@coreui/icons'
import queryNewProductService from '../../services/queryNewProductService'
import { getAssetsUrl } from '../../api/endpoints'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const getImageUrl = (img) => {
  if (!img) return ''
  if (typeof img === 'object' && img?.path) return getAssetsUrl(img.path)
  return typeof img === 'string' ? img : ''
}

const ProductLeadView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedImage, setExpandedImage] = useState(null)

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => queryNewProductService.getById(id))
        const data = res?.data?.data ?? res?.data ?? res
        setProduct(data)
      } catch (err) {
        setError(err?.message || 'Failed to fetch product')
        toastError(err?.message || 'Failed to fetch product')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchProduct()
  }, [id])

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading product..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error || !product) {
    return (
      <>
        <CAlert color="danger" className="mb-3">
          {error || 'Product not found.'}
        </CAlert>
        <CButton color="secondary" variant="outline" onClick={() => navigate('/product-lead')}>
          <CIcon icon={cilArrowLeft} className="me-1" />
          Back to Product Lead
        </CButton>
      </>
    )
  }

  const detailRows = [
    { key: 'Name', value: product.name, highlight: true },
    { key: 'Unique ID', value: product.uniqueId || '-' },
    { key: 'Model Number', value: product.modelNumber || '-' },
    { key: 'HSN Number', value: product.hsnNumber || '-', highlight: true },
    { key: 'Unit', value: product.unit || '-' },
    {
      key: 'Created At',
      value: product.createdAt ? new Date(product.createdAt).toLocaleString() : '-',
    },
  ]

  const variants = Array.isArray(product.variants) ? product.variants : []
  const images = product?.images || []

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/product-lead')}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Product Lead
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>{product.name}</strong>
              {product.uniqueId && (
                <CBadge color="info" className="ms-2">
                  {product.uniqueId}
                </CBadge>
              )}
            </CCardHeader>
            <CCardBody className="p-0">
              <CTable bordered hover responsive className="mb-0">
                <CTableBody>
                  {detailRows.map((row, idx) => (
                    <CTableRow key={idx} className={row.highlight ? 'table-warning' : ''}>
                      <CTableHeaderCell
                        style={{
                          width: '35%',
                          backgroundColor: row.highlight ? '#fff3cd' : '#f8f9fa',
                          fontWeight: 600,
                        }}
                        className="text-nowrap"
                      >
                        {row.key}
                      </CTableHeaderCell>
                      <CTableDataCell
                        style={row.highlight ? { backgroundColor: '#fff3cd', fontWeight: 600 } : {}}
                      >
                        {row.value}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>

          {variants.length > 0 && (
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Variants</strong>
              </CCardHeader>
              <CCardBody>
                <div className="d-flex flex-wrap gap-2">
                  {variants.map((v, i) => (
                    <CBadge key={i} color="primary" className="fs-6 py-2 px-3">
                      {v}
                    </CBadge>
                  ))}
                </div>
              </CCardBody>
            </CCard>
          )}
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Images</strong>
              {images.length > 0 && (
                <CBadge color="secondary" className="ms-2">
                  {images.length} photo{images.length !== 1 ? 's' : ''}
                </CBadge>
              )}
            </CCardHeader>
            <CCardBody>
              {images.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {images.map((img, index) => {
                    const src = getImageUrl(img)
                    return (
                      <div
                        key={img?._id || index}
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedImage(src)}
                        onKeyDown={(e) => e.key === 'Enter' && setExpandedImage(src)}
                        className="rounded border overflow-hidden"
                        style={{ width: 120, height: 120, cursor: 'pointer' }}
                      >
                        <CImage
                          src={src}
                          width={120}
                          height={120}
                          className="object-fit-cover w-100 h-100"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted mb-0">No images uploaded</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal
        alignment="center"
        visible={!!expandedImage}
        onClose={() => setExpandedImage(null)}
        className="p-0"
      >
        <CModalHeader className="border-0 pb-0">
          <CModalTitle>Image</CModalTitle>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            className="rounded-circle"
            onClick={() => setExpandedImage(null)}
            aria-label="Close"
          >
            <CIcon icon={cilX} size="lg" />
          </CButton>
        </CModalHeader>
        <CModalBody className="text-center p-3">
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Expanded"
              className="img-fluid rounded"
              style={{ maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </CModalBody>
      </CModal>
    </>
  )
}

export default ProductLeadView
