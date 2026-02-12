import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CBadge,
  CAlert,
  CImage,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil } from '@coreui/icons'
import productService from '../../services/productService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'
import { getImageDisplayUrl } from '../../utils/imageUtils'

const ProductView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => productService.getById(id))
        const data = res?.data || res
        setProduct(data)
      } catch (err) {
        toastError(err?.message || 'Failed to fetch product')
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <CBadge color="success">Active</CBadge>
      case 'inactive':
        return <CBadge color="secondary">Inactive</CBadge>
      case 'draft':
        return <CBadge color="warning">Draft</CBadge>
      default:
        return <CBadge color="info">{status}</CBadge>
    }
  }

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading product..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CAlert color="danger">
        {error}
        <CButton color="link" onClick={() => navigate('/products')}>
          Back to Products
        </CButton>
      </CAlert>
    )
  }

  if (!product) {
    return (
      <CAlert color="warning">
        Product not found.
        <CButton color="link" onClick={() => navigate('/products')}>
          Back to Products
        </CButton>
      </CAlert>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex gap-2">
          <CButton color="light" onClick={() => navigate('/products')}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back
          </CButton>
          <CButton color="warning" onClick={() => navigate(`/products/edit/${id}`)}>
            <CIcon icon={cilPencil} className="me-1" />
            Edit
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>{product.name}</strong> {getStatusBadge(product.status)}
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem>
                  <strong>SKU:</strong> {product.sku}
                </CListGroupItem>
                {product.shortDescription && (
                  <CListGroupItem>
                    <strong>Short Description:</strong> {product.shortDescription}
                  </CListGroupItem>
                )}
                {product.description && (
                  <CListGroupItem>
                    <strong>Description:</strong> {product.description}
                  </CListGroupItem>
                )}
                <CListGroupItem>
                  <strong>Category:</strong> {product.category?.name || '-'}
                </CListGroupItem>
                {product.subcategory && (
                  <CListGroupItem>
                    <strong>Subcategory:</strong> {product.subcategory?.name || '-'}
                  </CListGroupItem>
                )}
                <CListGroupItem>
                  <strong>Brand:</strong> {product.brand?.name || '-'}
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Unit:</strong> {product.unit || 'pcs'}
                </CListGroupItem>
                {product.tags?.length > 0 && (
                  <CListGroupItem>
                    <strong>Tags:</strong>{' '}
                    {product.tags.map((tag, i) => (
                      <CBadge key={i} color="info" className="me-1">
                        {tag}
                      </CBadge>
                    ))}
                  </CListGroupItem>
                )}
              </CListGroup>
            </CCardBody>
          </CCard>

          {/* Pricing */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Pricing & Stock</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem>
                  <strong>Price:</strong> ₹{product.price?.toLocaleString()}
                </CListGroupItem>
                <CListGroupItem>
                  <strong>MRP:</strong> ₹{product.mrp?.toLocaleString() || '0'}
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Cost Price:</strong> ₹{product.costPrice?.toLocaleString() || '0'}
                </CListGroupItem>
                {!product.hasVariants && (
                  <CListGroupItem>
                    <strong>Quantity:</strong> {product.quantity}
                  </CListGroupItem>
                )}
              </CListGroup>
            </CCardBody>
          </CCard>

          {/* Variants */}
          {product.hasVariants && product.variants?.length > 0 && (
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Variants</strong>
              </CCardHeader>
              <CCardBody>
                <CListGroup flush>
                  {product.variants.map((variant, idx) => (
                    <CListGroupItem key={idx}>
                      <strong>{variant.name}:</strong>{' '}
                      {variant.options?.map((opt, optIdx) => (
                        <CBadge key={optIdx} color="primary" className="me-1">
                          {opt}
                        </CBadge>
                      ))}
                    </CListGroupItem>
                  ))}
                </CListGroup>
              </CCardBody>
            </CCard>
          )}

          {/* Physical Attributes */}
          {(product.weight > 0 ||
            product.dimensions?.length > 0 ||
            product.dimensions?.width > 0 ||
            product.dimensions?.height > 0) && (
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Physical Attributes</strong>
              </CCardHeader>
              <CCardBody>
                <CListGroup flush>
                  {product.weight > 0 && (
                    <CListGroupItem>
                      <strong>Weight:</strong> {product.weight} {product.weightUnit}
                    </CListGroupItem>
                  )}
                  {(product.dimensions?.length > 0 ||
                    product.dimensions?.width > 0 ||
                    product.dimensions?.height > 0) && (
                    <CListGroupItem>
                      <strong>Dimensions:</strong> {product.dimensions.length} x{' '}
                      {product.dimensions.width} x {product.dimensions.height}{' '}
                      {product.dimensionUnit}
                    </CListGroupItem>
                  )}
                </CListGroup>
              </CCardBody>
            </CCard>
          )}
        </CCol>

        {/* Images sidebar */}
        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Images</strong>
            </CCardHeader>
            <CCardBody>
              {product.images?.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {product.images.map((img, index) => (
                    <CImage
                      key={index}
                      src={getImageDisplayUrl(img)}
                      width={150}
                      height={150}
                      className="object-fit-cover rounded border"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted">No images uploaded</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default ProductView
