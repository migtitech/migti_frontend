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
  CButton,
  CBadge,
  CAlert,
  CImage,
  CFormSelect,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilZoom } from '@coreui/icons'
import productService from '../../services/productService'
import categoryService from '../../services/categoryService'
import brandService from '../../services/brandService'
import Filtered from '../../filtered/Filtered'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const ProductList = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])

  const fetchProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        search: searchTerm,
      }
      if (filterCategory) params.category = filterCategory
      if (filterBrand) params.brand = filterBrand
      if (filterStatus) params.status = filterStatus

      const res = await withMinimumDelay(() => productService.getAll(params))
      const data = res?.data || res
      setProducts(data?.products || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      toastError(err?.message || 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const fetchFilterData = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        categoryService.getAll({ pageNumber: 1, pageSize: 100, parent: 'null' }),
        brandService.getAll({ pageNumber: 1, pageSize: 100 }),
      ])
      const catData = catRes?.data || catRes
      const brandData = brandRes?.data || brandRes
      setCategories(catData?.categories || [])
      setBrands(brandData?.brands || [])
    } catch (err) {
      console.error('Failed to fetch filter data', err)
    }
  }

  useEffect(() => {
    fetchFilterData()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, page, filterCategory, filterBrand, filterStatus])

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id })
  }

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id
    if (!id) return
    setConfirmDelete({ visible: false, id: null })
    try {
      await productService.delete(id)
      toastSuccess('Product deleted successfully')
      fetchProducts()
    } catch (err) {
      toastError(err?.message || 'Failed to delete product')
    }
  }

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

  const getTotalStock = (product) => {
    if (product.hasVariants && product.variantCombinations?.length > 0) {
      return product.variantCombinations.reduce((sum, vc) => sum + (vc.quantity || 0), 0)
    }
    return product.quantity || 0
  }

  const getDisplayPrice = (product) => {
    if (product.hasVariants && product.variantCombinations?.length > 0) {
      const prices = product.variantCombinations.map((vc) => vc.price)
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      if (min === max) return `₹${min.toLocaleString()}`
      return `₹${min.toLocaleString()} - ₹${max.toLocaleString()}`
    }
    return `₹${product.price?.toLocaleString() || '0'}`
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Products</strong>
            <CButton color="primary" onClick={() => navigate('/products/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Product
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}

            <CRow className="mb-3 align-items-end">
              <CCol md={4}>
                <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              </CCol>
              <CCol md={2}>
                <CFormSelect
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value)
                    setPage(1)
                  }}
                  size="sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormSelect
                  value={filterBrand}
                  onChange={(e) => {
                    setFilterBrand(e.target.value)
                    setPage(1)
                  }}
                  size="sm"
                >
                  <option value="">All Brands</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormSelect
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value)
                    setPage(1)
                  }}
                  size="sm"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </CFormSelect>
              </CCol>
            </CRow>

            {loading ? (
              <Loader message="Loading products..." />
            ) : (
              <>
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Image</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>SKU</CTableHeaderCell>
                      <CTableHeaderCell>Category</CTableHeaderCell>
                      <CTableHeaderCell>Brand</CTableHeaderCell>
                      <CTableHeaderCell>Price</CTableHeaderCell>
                      <CTableHeaderCell>Stock</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {products.map((product, index) => (
                      <CTableRow key={product._id}
                      onClick={()=>navigate(`/products/${product._id}`)}
                      style={{cursor:'pointer'}}
                      >
                        <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>
                        <CTableDataCell>
                          {product.images?.length > 0 ? (
                            <CImage
                              src={product.images[0]}
                              width={50}
                              height={50}
                              className="object-fit-cover rounded"
                            />
                          ) : (
                            <div
                              className="bg-light d-flex align-items-center justify-content-center rounded"
                              style={{ width: 50, height: 50 }}
                            >
                              <small className="text-muted">N/A</small>
                            </div>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <strong>{product.name}</strong>
                          {product.hasVariants && (
                            <div>
                              <small className="text-muted">
                                {product.variantCombinations?.length || 0} variants
                              </small>
                            </div>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>{product.sku}</CTableDataCell>
                        <CTableDataCell>{product.category?.name || '-'}</CTableDataCell>
                        <CTableDataCell>{product.brand?.name || '-'}</CTableDataCell>
                        <CTableDataCell>{getDisplayPrice(product)}</CTableDataCell>
                        <CTableDataCell>{getTotalStock(product)}</CTableDataCell>
                        <CTableDataCell>{getStatusBadge(product.status)}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/products/${product._id}`)}
                            title="View"
                          >
                            <CIcon icon={cilZoom} />
                          </CButton>
                          <CButton
                            color="warning"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/products/edit/${product._id}`)}}
                            title="Edit"
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(product._id)}}
                            title="Delete"
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                    {products.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={10} className="text-center">
                          {searchTerm
                            ? `No products found matching "${searchTerm}"`
                            : 'No products found. Click "Add Product" to create one.'}
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
                {pagination.totalPages > 1 && (
                  <CPagination className="justify-content-center">
                    <CPaginationItem
                      disabled={!pagination.hasPrevPage}
                      onClick={() => setPage(page - 1)}
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
                      onClick={() => setPage(page + 1)}
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

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Product?"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default ProductList
