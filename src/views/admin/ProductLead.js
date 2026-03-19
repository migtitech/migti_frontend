import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CPagination,
  CPaginationItem,
  CImage,
  CButton,
  CBadge,
} from '@coreui/react'
import queryNewProductService from '../../services/queryNewProductService'
import { getAssetsUrl } from '../../api/endpoints'
import Filtered from '../../filtered/Filtered'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError, toastSuccess } from '../../utils/toast'

const getImageUrl = (img) => {
  if (!img) return ''
  if (typeof img === 'object' && img?.path) return getAssetsUrl(img.path)
  return typeof img === 'string' ? img : ''
}

const ProductLead = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await withMinimumDelay(() =>
        queryNewProductService.list({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
        }),
      )
      const data = res?.data || res
      setProducts(data?.items || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      toastError(err?.message || 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, page])

  const pageSize = pagination?.itemsPerPage || 10
  const hsnCounts = products.reduce((acc, p) => {
    const normalized = (p?.hsnNumber || '').toString().trim().toLowerCase()
    if (!normalized) return acc
    acc[normalized] = (acc[normalized] || 0) + 1
    return acc
  }, {})

  const handleDeleteProduct = async (e, productId) => {
    e.stopPropagation()
    if (!productId) return
    const confirmed = window.confirm('Are you sure you want to delete this product lead?')
    if (!confirmed) return
    try {
      await queryNewProductService.delete(productId)
      toastSuccess('Product lead deleted successfully')
      fetchProducts()
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || 'Failed to delete product lead')
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Product Lead</strong>
            <span className="text-muted ms-2">Products from new query</span>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={4}>
                <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              </CCol>
            </CRow>

            {loading ? (
              <Loader message="Loading products..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Variants</CTableHeaderCell>
                      <CTableHeaderCell>Model Number</CTableHeaderCell>
                      <CTableHeaderCell>HSN</CTableHeaderCell>
                      <CTableHeaderCell>Unit</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 80 }}>Image</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 120 }}>Action</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {products.map((product, index) => {
                      const images = product?.images || []
                      const firstImageUrl = getImageUrl(images[0])
                      const normalizedHsn = (product?.hsnNumber || '').toString().trim().toLowerCase()
                      const isDuplicateHsn = !!normalizedHsn && (hsnCounts[normalizedHsn] || 0) > 1
                      return (
                        <CTableRow
                          key={product._id}
                          onClick={() => navigate(`/product-lead/${product._id}`)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isDuplicateHsn ? '#e9ecef' : undefined,
                          }}
                        >
                          <CTableDataCell>{(page - 1) * pageSize + index + 1}</CTableDataCell>
                          <CTableDataCell>
                            <strong>{product.name || '-'}</strong>
                          </CTableDataCell>
                          <CTableDataCell>
                            {Array.isArray(product.variants) && product.variants.length > 0
                              ? product.variants.join(', ')
                              : '-'}
                          </CTableDataCell>
                          <CTableDataCell>{product.modelNumber || '-'}</CTableDataCell>
                          <CTableDataCell>
                            {product.hsnNumber || '-'}
                            {isDuplicateHsn && (
                              <CBadge color="secondary" className="ms-2">
                                Duplicate
                              </CBadge>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>{product.unit || '-'}</CTableDataCell>
                          <CTableDataCell>
                            {firstImageUrl ? (
                              <CImage
                                src={firstImageUrl}
                                alt={product.name}
                                rounded
                                thumbnail
                                style={{ width: 56, height: 56, objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div
                                className="bg-light rounded d-flex align-items-center justify-content-center text-muted"
                                style={{ width: 56, height: 56 }}
                              >
                                <small>No image</small>
                              </div>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="danger"
                              size="sm"
                              onClick={(e) => handleDeleteProduct(e, product._id)}
                            >
                              Delete
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                    {products.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={8} className="text-center text-muted py-4">
                          {searchTerm
                            ? `No products found matching "${searchTerm}"`
                            : 'No products found in the new query product list.'}
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
                {pagination?.totalPages > 1 && (
                  <CPagination className="mt-3 justify-content-center" aria-label="Product Lead pages">
                    <CPaginationItem
                      disabled={!pagination.hasPrevPage}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </CPaginationItem>
                    {Array.from({ length: pagination.totalPages }, (_, i) => (
                      <CPaginationItem
                        key={i + 1}
                        active={page === i + 1}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </CPaginationItem>
                    ))}
                    <CPaginationItem
                      disabled={!pagination.hasNextPage}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </CPaginationItem>
                  </CPagination>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ProductLead
