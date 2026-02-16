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
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil, cilX } from '@coreui/icons'
import productService from '../../services/productService'
import { getAssetsUrl } from '../../api/endpoints'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const getImageUrl = (img) => {
  if (!img) return ''
  if (typeof img === 'object' && img?.path) return getAssetsUrl(img.path)
  return typeof img === 'string' ? img : ''
}

const ProductView = () => {
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
        <CCardBody>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/products')}>
            Back to Products
          </CButton>
        </CCardBody>
      </CAlert>
    )
  }

  if (!product) {
    return (
      <CAlert color="warning">
        Product not found.
        <CCardBody>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/products')}>
            Back to Products
          </CButton>
        </CCardBody>
      </CAlert>
    )
  }

  const keyValueRows = [
    { key: 'SKU', value: product.sku },
    ...(product.shortDescription ? [{ key: 'Short Description', value: product.shortDescription }] : []),
    { key: 'Category', value: product.category?.name || '-' },
    { key: 'Subcategory', value: product.subcategory?.name || '-' },
    { key: 'Brand', value: product.brand?.name || '-' },
    { key: 'Group', value: product.group?.name || '-' },
    { key: 'HSN Number', value: product.hsnNumber || '-', highlight: true },
    { key: 'Default Model Number', value: product.defaultModelNumber || '-' },
    { key: 'GST %', value: product.gstPercentage != null && product.gstPercentage !== '' ? `${product.gstPercentage}%` : '-', highlight: true },
    { key: 'Unit', value: product.unit || 'pcs' },
    ...(product.tags?.length > 0
      ? [
          {
            key: 'Tags',
            value: product.tags.map((tag, i) => (
              <CBadge key={i} color="info" className="me-1">
                {tag}
              </CBadge>
            )),
          },
        ]
      : []),
  ]

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex gap-2">
          <CButton color="secondary" variant="outline" onClick={() => navigate('/products')}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Products
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
            <CCardHeader className="d-flex align-items-center gap-2">
              <strong>{product.name}</strong>
              {getStatusBadge(product.status)}
            </CCardHeader>
            <CCardBody className="p-0">
              <CTable bordered hover responsive className="mb-0">
                <CTableBody>
                  {keyValueRows.map((row, idx) => (
                    <CTableRow
                      key={idx}
                      className={row.highlight ? 'table-warning' : ''}
                    >
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

          {/* Variant definitions */}
          {product.hasVariants && product.variants?.length > 0 && (
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Variant types</strong>
              </CCardHeader>
              <CCardBody className="p-0">
                <CTable bordered hover responsive className="mb-0">
                  <CTableBody>
                    {product.variants.map((variant, idx) => (
                      <CTableRow key={idx}>
                        <CTableHeaderCell
                          style={{ width: '35%', backgroundColor: '#f8f9fa', fontWeight: 600 }}
                        >
                          {variant.name}
                        </CTableHeaderCell>
                        <CTableDataCell>
                          {(variant.options || []).map((opt, i) => (
                            <CBadge key={i} color="primary" className="me-1">
                              {opt}
                            </CBadge>
                          ))}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          )}

          {/* Variant combinations – bordered table: Variant value | Images */}
          {product.hasVariants && product.variantCombinations?.length > 0 && (
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Variant combinations & images</strong>
              </CCardHeader>
              <CCardBody className="p-0">
                <CTable bordered hover responsive className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell style={{ backgroundColor: '#f8f9fa', fontWeight: 600 }}>
                        Variant
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ backgroundColor: '#fff3cd', fontWeight: 600 }}>
                        HSN Number
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ backgroundColor: '#fff3cd', fontWeight: 600 }}>
                        Model Number
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ backgroundColor: '#fff3cd', fontWeight: 600 }}>
                        GST %
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ backgroundColor: '#f8f9fa', fontWeight: 600 }}>
                        Images
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {product.variantCombinations.map((combo, cIdx) => (
                      <CTableRow key={combo.uniqueId || cIdx}>
                        <CTableDataCell className="align-middle">
                          <strong>
                            {combo.optionValues
                              ?.map((o) => `${o.variantName}: ${o.variantValue}`)
                              .join(' · ') || '—'}
                          </strong>
                        </CTableDataCell>
                        <CTableDataCell
                          className="align-middle"
                          style={{ backgroundColor: '#fff3cd', fontWeight: 600 }}
                        >
                          {combo.hsnNumber || product.hsnNumber || '—'}
                        </CTableDataCell>
                        <CTableDataCell
                          className="align-middle"
                          style={{ backgroundColor: '#fff3cd', fontWeight: 600 }}
                        >
                          {combo.modelNumber || product.defaultModelNumber || '—'}
                        </CTableDataCell>
                        <CTableDataCell
                          className="align-middle"
                          style={{ backgroundColor: '#fff3cd', fontWeight: 600 }}
                        >
                          {combo.gstPercentage != null && combo.gstPercentage !== ''
                            ? `${combo.gstPercentage}%`
                            : product.gstPercentage != null && product.gstPercentage !== ''
                              ? `${product.gstPercentage}%`
                              : '—'}
                        </CTableDataCell>
                        <CTableDataCell className="align-middle">
                          <div className="d-flex flex-wrap gap-2 align-items-center">
                            {(combo.images || []).length > 0 ? (
                              (combo.images || []).map((img, iIdx) => {
                                const src = getImageUrl(img)
                                return (
                                  <div
                                    key={img?._id || iIdx}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setExpandedImage(src)}
                                    onKeyDown={(e) => e.key === 'Enter' && setExpandedImage(src)}
                                    className="rounded border overflow-hidden"
                                    style={{
                                      width: 64,
                                      height: 64,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <CImage
                                      src={src}
                                      width={64}
                                      height={64}
                                      className="object-fit-cover w-100 h-100"
                                    />
                                  </div>
                                )
                              })
                            ) : (
                              <span className="text-muted">No images</span>
                            )}
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          )}

          {/* Physical Attributes */}
          {(product.weight > 0 ||
            (product.dimensions && (product.dimensions.width > 0 || product.dimensions.height > 0 || product.dimensions.length > 0))) && (
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Physical attributes</strong>
              </CCardHeader>
              <CCardBody className="p-0">
                <CTable bordered hover responsive className="mb-0">
                  <CTableBody>
                    {product.weight > 0 && (
                      <CTableRow>
                        <CTableHeaderCell
                          style={{ width: '35%', backgroundColor: '#f8f9fa', fontWeight: 600 }}
                        >
                          Weight
                        </CTableHeaderCell>
                        <CTableDataCell>
                          {product.weight} {product.weightUnit}
                        </CTableDataCell>
                      </CTableRow>
                    )}
                    {product.dimensions &&
                      (product.dimensions.length > 0 ||
                        product.dimensions.width > 0 ||
                        product.dimensions.height > 0) && (
                        <CTableRow>
                          <CTableHeaderCell
                            style={{ width: '35%', backgroundColor: '#f8f9fa', fontWeight: 600 }}
                          >
                            Dimensions
                          </CTableHeaderCell>
                          <CTableDataCell>
                            {product.dimensions.length} × {product.dimensions.width} ×{' '}
                            {product.dimensions.height} {product.dimensionUnit}
                          </CTableDataCell>
                        </CTableRow>
                      )}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          )}
        </CCol>

        {/* Main product images sidebar */}
        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Product images</strong>
            </CCardHeader>
            <CCardBody>
              {product.images?.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {product.images.map((img, index) => {
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

      {/* Image expand modal */}
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

export default ProductView
