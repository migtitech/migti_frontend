import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CListGroup,
  CListGroupItem,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CImage,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPlus, cilTrash, cilPencil, cilX, cilArrowRight } from '@coreui/icons'
import queryService from '../../services/queryService'
import queryNewProductService from '../../services/queryNewProductService'
import documentService from '../../services/documentService'
import { getAssetsUrl } from '../../api/endpoints'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'
import FindProductModal from './FindProductModal'

const INITIAL_PRODUCT = {
  productName: '',
  quantity: 1,
  unit: '',
  hsnNumber: '',
  modelNumber: '',
  gstPercentage: null,
  variants: [],
  remark: '',
  description: '',
  product_id: null,
  productCode: '',
  isNewProduct: true,
  images: [],
}

const formatVariants = (variants) => {
  if (!variants?.length) return '—'
  return variants.map((v) => v.variantName || v || '—').filter(Boolean).join(', ') || '—'
}

const QuotationGenerate = () => {
  const { queryId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryFromState = location.state?.query || null
  const forceNewQuotation = !!location.state?.forceNewQuotation

  const [query, setQuery] = useState(queryFromState)
  const [loading, setLoading] = useState(!queryFromState)
  const [remark, setRemark] = useState('')
  const [products, setProducts] = useState([])
  const [formProduct, setFormProduct] = useState({ ...INITIAL_PRODUCT })
  const [editingProductIndex, setEditingProductIndex] = useState(null)
  const [showFindProductModal, setShowFindProductModal] = useState(false)
  const [productImageFiles, setProductImageFiles] = useState([])
  const [productImagePreviews, setProductImagePreviews] = useState([])
  const [addingProduct, setAddingProduct] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedImages, setExpandedImages] = useState([])
  const [expandedImageIndex, setExpandedImageIndex] = useState(0)

  const getImageUrl = (img) => {
    if (!img) return ''
    if (typeof img === 'string') return img.startsWith('http') ? img : getAssetsUrl(img)
    if (typeof img === 'object' && img?.path) return img.path.startsWith('http') ? img.path : getAssetsUrl(img.path)
    if (typeof img === 'object' && img?.url) return img.url
    return ''
  }

  useEffect(() => {
    const load = async () => {
      if (!queryId) return
      if (queryFromState) {
        setProducts((queryFromState.products || []).map((p) => ({ ...p })))
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const res = await withMinimumDelay(() => queryService.getById(queryId))
        const data = res?.data || res
        const q = data?.data ?? data
        setQuery(q)
        setProducts((q?.products || []).map((p) => ({ ...p })))
      } catch (err) {
        toastError(err?.message || 'Failed to load query')
        navigate('/queries')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [queryId, queryFromState, navigate])

  const updateFormProduct = (field, value) => {
    setFormProduct((prev) => ({ ...prev, [field]: value }))
  }

  const clearProductForm = () => {
    setFormProduct({ ...INITIAL_PRODUCT })
    setEditingProductIndex(null)
    setProductImageFiles([])
    setProductImagePreviews([])
  }

  const saveProduct = async () => {
    if (!formProduct.productName?.trim()) {
      toastError('Product name is required')
      return
    }
    if (!formProduct.quantity || Number(formProduct.quantity) <= 0) {
      toastError('Quantity must be greater than 0')
      return
    }
    setAddingProduct(true)
    try {
      let uploadedDocs = []
      if (productImageFiles.length > 0) {
        const res = await documentService.uploadImages(productImageFiles)
        const payload = res?.data || res
        const docs = payload?.data?.documents || payload?.documents || []
        uploadedDocs = docs.map((d) => ({ _id: d._id || d.id, path: d.path || d.url || '' }))
      }
      if (formProduct.isNewProduct && !formProduct.productCode) {
        const newPayload = {
          name: (formProduct.productName || '').trim(),
          unit: (formProduct.unit || '').trim(),
          hsnNumber: (formProduct.hsnNumber || '').trim(),
          modelNumber: (formProduct.modelNumber || '').trim(),
          variants: (formProduct.variants || []).map((v) => (v.variantName || '').trim()).filter(Boolean),
          images: uploadedDocs.map((d) => d._id),
        }
        if (newPayload.name) await queryNewProductService.create(newPayload)
      }
      const productToSave = {
        ...formProduct,
        quantity: Number(formProduct.quantity) ?? 1,
        images: uploadedDocs.length ? uploadedDocs : formProduct.images || [],
      }
      if (editingProductIndex != null) {
        setProducts((prev) => {
          const next = [...prev]
          next[editingProductIndex] = productToSave
          return next
        })
        toastSuccess('Product updated')
      } else {
        setProducts((prev) => [...prev, productToSave])
        toastSuccess('Product added')
      }
      clearProductForm()
    } catch (err) {
      toastError(err?.message || 'Failed to add product')
    } finally {
      setAddingProduct(false)
    }
  }

  const editProductFromTable = (index) => {
    const p = products[index]
    setFormProduct({
      productName: p.productName || '',
      quantity: p.quantity ?? 1,
      unit: p.unit || '',
      hsnNumber: p.hsnNumber || '',
      modelNumber: p.modelNumber || '',
      gstPercentage: p.gstPercentage ?? null,
      variants: (p.variants || []).map((v) => ({ variantName: v.variantName || v || '' })),
      remark: p.remark || '',
      description: p.description || '',
      product_id: p.product_id || null,
      productCode: p.productCode || '',
      isNewProduct: p.isNewProduct ?? !p.product_id,
      images: p.images || [],
    })
    setEditingProductIndex(index)
  }

  const deleteProductFromTable = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index))
    if (editingProductIndex === index) clearProductForm()
    else if (editingProductIndex != null && editingProductIndex > index) {
      setEditingProductIndex((prev) => prev - 1)
    }
    toastSuccess('Product removed')
  }

  const handleImportFromFindProduct = (importedProducts) => {
    const mapped = (importedProducts || []).map((p) => ({
      productName: p.productName || p.name || '',
      quantity: p.quantity ?? 1,
      unit: p.unit || '',
      hsnNumber: p.hsnNumber || '',
      modelNumber: p.modelNumber || '',
      gstPercentage: p.gstPercentage ?? null,
      variants: (p.variants || []).map((v) => ({ variantName: v.variantName || v || '' })),
      remark: p.remark || '',
      description: p.description || p.shortDescription || '',
      product_id: p.product_id || p._id || null,
      productCode: p.productCode || '',
      isNewProduct: false,
      images: (p.images || []).map((img) => (typeof img === 'object' && img?._id ? img : img)).filter(Boolean),
    }))
    setProducts((prev) => [...prev, ...mapped])
    setShowFindProductModal(false)
    toastSuccess(`${mapped.length} product(s) added`)
  }

  const handleSubmit = async () => {
    if (!query?.queryCode) {
      toastError('Query code is missing')
      return
    }
    if (products.length === 0) {
      toastError('Add at least one product')
      return
    }
    setSubmitting(true)
    try {
      const productsPayload = products.map((p) => {
        const pid = p.product_id
        const productId = !pid ? null : typeof pid === 'object' && pid._id ? String(pid._id) : String(pid)
        return {
          productName: p.productName || '',
          quantity: Number(p.quantity) ?? 1,
          unit: p.unit || '',
          hsnNumber: p.hsnNumber || '',
          modelNumber: p.modelNumber || '',
          gstPercentage: typeof p.gstPercentage === 'number' ? p.gstPercentage : null,
          variants: (p.variants || []).map((v) => ({ variantName: v.variantName || v || '' })),
          remark: p.remark || '',
          description: p.description || '',
          product_id: productId,
          images: (p.images || []).map((img) => (typeof img === 'object' && img?._id ? img._id : img)).filter(Boolean),
        }
      })
      const res = await queryService.convertToQuotation(query.queryCode, {
        remark,
        products: productsPayload,
        forceNewQuotation,
      })
      const bundle = res?.data ?? res
      const quotation = bundle?.quotation
      const updatedQuery = bundle?.query
      const qMongoId = updatedQuery?._id ?? updatedQuery?.id ?? queryId
      const quotationId = quotation?._id ?? quotation?.id
      const quotationCode = quotation?.quotationCode ?? ''
      if (qMongoId && quotationId) {
        try {
          await queryService.syncQuotationOnQuery({
            queryId: String(qMongoId),
            quotationId: String(quotationId),
            quotationCode,
          })
        } catch (syncErr) {
          console.error('syncQuotationOnQuery failed', syncErr)
        }
      }
      toastSuccess('Quotation created successfully')
      if (quotation?._id || quotation?.id) {
        navigate(`/quotations/${quotation._id || quotation.id}`)
      } else {
        navigate('/quotations')
      }
    } catch (err) {
      toastError(err?.message || 'Failed to create quotation')
    } finally {
      setSubmitting(false)
    }
  }

  const ci = query?.companyInfo || {}
  const prods = products

  if (loading) return <Loader />

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <CButton color="light" variant="ghost" onClick={() => navigate(`/queries/${queryId}`)}>
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back to Query
            </CButton>
            <h4 className="mb-0">Generate Quotation from Query</h4>
          </div>
        </CCol>
      </CRow>

      {/* 1. Company Information - Read only */}
      <CCard className="mb-4">
        <CCardHeader><strong>1. Company Information</strong> <span className="text-muted fw-normal">(Read only)</span></CCardHeader>
        <CCardBody>
          <CListGroup flush>
            <CListGroupItem className="d-flex justify-content-between"><strong>Company name</strong><span>{ci.name || '-'}</span></CListGroupItem>
            <CListGroupItem className="d-flex justify-content-between"><strong>Location</strong><span>{ci.location || '-'}</span></CListGroupItem>
            <CListGroupItem><strong>Purchase managers</strong><div className="mt-1">{(ci.purchaseManagers || []).length > 0 ? (ci.purchaseManagers || []).map((m, i) => <div key={i}>{m.name || '–'}{m.phone ? ` • ${m.phone}` : ''}{m.email ? ` • ${m.email}` : ''}</div>) : (ci.purchase_manager_name || ci.purchase_manager_phone) ? `${ci.purchase_manager_name || '–'} • ${ci.purchase_manager_phone || ''}` : '–'}</div></CListGroupItem>
            <CListGroupItem><strong>Address</strong><div className="mt-1">{ci.address || '-'}</div></CListGroupItem>
          </CListGroup>
        </CCardBody>
      </CCard>

      {/* 2. Remark - Editable */}
      <CCard className="mb-4">
        <CCardHeader><strong>2. Remark</strong></CCardHeader>
        <CCardBody>
          <CFormLabel>Remark (optional)</CFormLabel>
          <CFormTextarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={3}
            placeholder="Add any remark for this quotation"
          />
        </CCardBody>
      </CCard>

      {/* 3. Add product + Products table */}
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>3. Products</strong>
          <CButton color="primary" size="sm" onClick={() => setShowFindProductModal(true)}>
            <CIcon icon={cilPlus} className="me-1" />
            Add from Catalog
          </CButton>
        </CCardHeader>
        <CCardBody>
          {/* Add/Edit product form - top */}
          <CCard className="mb-4">
            <CCardHeader><strong>{editingProductIndex != null ? 'Edit Product' : 'Add New Product'}</strong></CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel>Product name *</CFormLabel>
                  <CFormInput value={formProduct.productName} onChange={(e) => updateFormProduct('productName', e.target.value)} placeholder="Product name" />
                </CCol>
                <CCol md={2}>
                  <CFormLabel>Quantity *</CFormLabel>
                  <CFormInput type="number" min={1} value={formProduct.quantity} onChange={(e) => updateFormProduct('quantity', e.target.value)} placeholder="1" />
                </CCol>
                <CCol md={2}>
                  <CFormLabel>Unit</CFormLabel>
                  <CFormInput value={formProduct.unit} onChange={(e) => updateFormProduct('unit', e.target.value)} placeholder="pcs" />
                </CCol>
                <CCol md={2}>
                  <CFormLabel>HSN</CFormLabel>
                  <CFormInput value={formProduct.hsnNumber} onChange={(e) => updateFormProduct('hsnNumber', e.target.value)} placeholder="HSN" />
                </CCol>
                <CCol md={2}>
                  <CFormLabel>GST %</CFormLabel>
                  <CFormInput type="number" min={0} max={100} value={formProduct.gstPercentage ?? ''} onChange={(e) => updateFormProduct('gstPercentage', e.target.value ? Number(e.target.value) : null)} placeholder="%" />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Remark</CFormLabel>
                  <CFormInput value={formProduct.remark} onChange={(e) => updateFormProduct('remark', e.target.value)} placeholder="Remark" />
                </CCol>
                <CCol md={12}>
                  <CFormLabel>Product description</CFormLabel>
                  <CFormTextarea
                    rows={2}
                    value={formProduct.description}
                    onChange={(e) => updateFormProduct('description', e.target.value)}
                    placeholder="Product description (e.g. from catalog)"
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Images (optional)</CFormLabel>
                  <CFormInput
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      if (!files.length) return
                      setProductImageFiles((prev) => [...prev, ...files])
                      setProductImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
                    }}
                  />
                  {productImagePreviews.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {productImagePreviews.map((src, idx) => (
                        <CImage key={idx} src={src} alt="" width={48} height={48} className="border rounded" style={{ objectFit: 'cover' }} />
                      ))}
                    </div>
                  )}
                </CCol>
                <CCol xs={12}>
                  <CButton color="primary" onClick={saveProduct} disabled={addingProduct}>
                    {addingProduct ? <><CSpinner size="sm" className="me-2" />Saving...</> : (editingProductIndex != null ? 'Update Product' : 'Add Product')}
                  </CButton>
                  {editingProductIndex != null && <CButton color="secondary" className="ms-2" onClick={clearProductForm}>Cancel</CButton>}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          {/* Products table - bottom */}
          {prods.length > 0 ? (
            <CTable responsive hover bordered>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell style={{ width: 60 }}>#</CTableHeaderCell>
                  <CTableHeaderCell>Product name</CTableHeaderCell>
                  <CTableHeaderCell>Description</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 100 }}>Quantity</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 80 }}>Unit</CTableHeaderCell>
                  <CTableHeaderCell>Variants</CTableHeaderCell>
                  <CTableHeaderCell>HSN</CTableHeaderCell>
                  <CTableHeaderCell>GST %</CTableHeaderCell>
                  <CTableHeaderCell>Remark</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 120 }}>Images</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 100 }}>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {prods.map((p, index) => {
                  const productRef = typeof p.product_id === 'object' ? p.product_id : null
                  const snapshotImages = Array.isArray(p.images) ? p.images : []
                  const productRefImages = Array.isArray(productRef?.images) ? productRef.images : []
                  const allImages = (snapshotImages.length ? snapshotImages : productRefImages) || []
                  const imageUrls = allImages.map((img) => getImageUrl(img)).filter((src) => !!src)
                  return (
                    <CTableRow key={index}>
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>{p.productName || '—'}</CTableDataCell>
                      <CTableDataCell className="small">{p.description || productRef?.shortDescription || '—'}</CTableDataCell>
                      <CTableDataCell>{p.quantity != null ? p.quantity : '—'}</CTableDataCell>
                      <CTableDataCell>{p.unit || '—'}</CTableDataCell>
                      <CTableDataCell className="small">{formatVariants(p.variants)}</CTableDataCell>
                      <CTableDataCell className="small">{productRef?.hsnNumber || p.hsnNumber || '—'}</CTableDataCell>
                      <CTableDataCell className="small">{productRef?.gstPercentage != null ? `${productRef.gstPercentage}%` : (p.gstPercentage != null ? `${p.gstPercentage}%` : '—')}</CTableDataCell>
                      <CTableDataCell className="small">{p.remark || '—'}</CTableDataCell>
                      <CTableDataCell>
                        {imageUrls.length > 0 ? (
                          <div
                            role="button"
                            tabIndex={0}
                            className="d-inline-flex align-items-center gap-1 flex-wrap"
                            style={{ cursor: 'pointer', maxWidth: 140 }}
                            onClick={() => { setExpandedImages(imageUrls); setExpandedImageIndex(0) }}
                            onKeyDown={(e) => e.key === 'Enter' && (setExpandedImages(imageUrls), setExpandedImageIndex(0))}
                            aria-label="View images"
                          >
                            {imageUrls.slice(0, 2).map((src, i) => (
                              <div key={i} className="rounded overflow-hidden border flex-shrink-0" style={{ width: 40, height: 40 }}>
                                <CImage src={src} alt="" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                              </div>
                            ))}
                            {imageUrls.length > 2 && (
                              <div className="d-flex align-items-center justify-content-center rounded border bg-light flex-shrink-0 text-primary small fw-bold" style={{ width: 40, height: 40, fontSize: '0.75rem' }}>
                                +{imageUrls.length - 2}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton color="primary" variant="ghost" size="sm" onClick={() => editProductFromTable(index)}><CIcon icon={cilPencil} /></CButton>
                        <CButton color="danger" variant="ghost" size="sm" onClick={() => deleteProductFromTable(index)}><CIcon icon={cilTrash} /></CButton>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          ) : (
            <p className="text-muted mb-0">No products. Add from catalog or use the form above.</p>
          )}
        </CCardBody>
      </CCard>

      {/* Submit */}
      <CRow>
        <CCol xs={12} className="d-flex justify-content-end gap-2">
          <CButton color="light" variant="outline" onClick={() => navigate(`/queries/${queryId}`)}>Cancel</CButton>
          <CButton color="success" onClick={handleSubmit} disabled={submitting || products.length === 0}>
            {submitting ? <><CSpinner size="sm" className="me-2" />Creating...</> : 'Create Quotation'}
          </CButton>
        </CCol>
      </CRow>

      <FindProductModal
        visible={showFindProductModal}
        onClose={() => setShowFindProductModal(false)}
        onImport={handleImportFromFindProduct}
      />

      <CModal alignment="center" visible={expandedImages.length > 0} onClose={() => setExpandedImages([])} className="p-0">
        <CModalHeader className="border-0 pb-0 d-flex justify-content-between align-items-center">
          <CModalTitle className="mb-0">Image {expandedImages.length > 1 ? `${expandedImageIndex + 1} / ${expandedImages.length}` : ''}</CModalTitle>
          <CButton color="secondary" variant="ghost" size="sm" className="rounded-circle" onClick={() => setExpandedImages([])}><CIcon icon={cilX} size="lg" /></CButton>
        </CModalHeader>
        <CModalBody className="text-center p-3 position-relative">
          {expandedImages.length > 0 && (
            <>
              {expandedImages.length > 1 && (
                <>
                  <CButton color="light" variant="outline" className="position-absolute top-50 translate-middle-y rounded-circle ms-2" style={{ zIndex: 10, width: 48, height: 48, left: 0 }} onClick={() => setExpandedImageIndex((i) => (i <= 0 ? expandedImages.length - 1 : i - 1))}><CIcon icon={cilArrowLeft} size="lg" /></CButton>
                  <CButton color="light" variant="outline" className="position-absolute top-50 translate-middle-y rounded-circle me-2" style={{ zIndex: 10, width: 48, height: 48, right: 0 }} onClick={() => setExpandedImageIndex((i) => (i >= expandedImages.length - 1 ? 0 : i + 1))}><CIcon icon={cilArrowRight} size="lg" /></CButton>
                </>
              )}
              <img src={expandedImages[expandedImageIndex]} alt="" className="img-fluid rounded" style={{ maxHeight: '80vh', objectFit: 'contain' }} />
            </>
          )}
        </CModalBody>
      </CModal>
    </>
  )
}

export default QuotationGenerate
