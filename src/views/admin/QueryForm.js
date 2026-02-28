import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CFormCheck,
  CListGroup,
  CListGroupItem,
  CSpinner,
  CAlert,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPlus, cilTrash, cilPencil, cilSearch } from '@coreui/icons'
import queryService from '../../services/queryService'
import industryService from '../../services/industryService'
import productService from '../../services/productService'
import areaService from '../../services/areaService'
import { useAuth } from '../../context/AuthContext'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'
import FindProductModal from './FindProductModal'

const INITIAL_COMPANY = {
  name: '',
  area: '',
  location: '',
  address: '',
  purchaseManagers: [],
}

const mapPurchaseManagers = (list) =>
  (list || []).map((pm) => ({
    name: pm?.name || '',
    phone: pm?.phone || '',
    email: pm?.email || '',
  }))

const INITIAL_VARIANT = { variantName: '' }

const INITIAL_PRODUCT = {
  productName: '',
  quantity: 1,
  unit: '',
  hsnNumber: '',
  modelNumber: '',
  gstPercentage: null,
  variants: [],
  remark: '',
  product_id: null,
}

const getVariantComboDisplay = (combo) => {
  const parts = (combo?.optionValues || []).map((o) => o?.variantValue || '').filter(Boolean)
  return parts.join(', ')
}

const getVariantOptions = (product) => {
  const list = []
  ;(product?.variants || []).forEach((v) => {
    const name = v?.name || ''
    ;(v?.options || []).forEach((opt) => {
      if (opt) list.push({ key: `${name}::${opt}`, label: `${name}: ${opt}` })
    })
  })
  return list
}

const QueryForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Company section – industry search & snapshot (stored in query, editable)
  const [industrySearch, setIndustrySearch] = useState('')
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false)
  const [industrySearchResults, setIndustrySearchResults] = useState([])
  const [industrySearchLoading, setIndustrySearchLoading] = useState(false)
  const [industryId, setIndustryId] = useState(null)
  const [companyInfo, setCompanyInfo] = useState(INITIAL_COMPANY)
  const [areas, setAreas] = useState([])
  const companyDropdownRef = useRef(null)

  // Products – form for add/edit one, then table of all added
  const [products, setProducts] = useState([])
  const [formProduct, setFormProduct] = useState({ ...INITIAL_PRODUCT })
  const [editingProductIndex, setEditingProductIndex] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [productDropdownOpen, setProductDropdownOpen] = useState(false)
  const [productSearchResults, setProductSearchResults] = useState([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)
  const [showFindProductModal, setShowFindProductModal] = useState(false)

  // Selected product for variant import (from inline search)
  const [selectedProductForImport, setSelectedProductForImport] = useState(null)
  const [selectedVariantComboIds, setSelectedVariantComboIds] = useState(new Set())
  const [selectedVariantOptionKeys, setSelectedVariantOptionKeys] = useState(new Set())
  const [variantSearch, setVariantSearch] = useState('')

  const getAreaId = (area) => (typeof area === 'object' ? area?._id : area) || ''

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await areaService.getAll({ pageSize: 100 })
        const data = res?.data || res
        setAreas(data?.areas || [])
      } catch {
        setAreas([])
      }
    }
    fetchAreas()
  }, [])

  // Industry search – top 5 matches
  const fetchIndustrySearch = useCallback(async (term) => {
    if (!term?.trim()) {
      setIndustrySearchResults([])
      return
    }
    setIndustrySearchLoading(true)
    try {
      const res = await industryService.getAll({ search: term.trim(), pageSize: 5 })
      const data = res?.data || res
      setIndustrySearchResults(data?.industries || [])
    } catch {
      setIndustrySearchResults([])
    } finally {
      setIndustrySearchLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchIndustrySearch(industrySearch), 300)
    return () => clearTimeout(t)
  }, [industrySearch, fetchIndustrySearch])

  const handleSelectIndustry = async (industry) => {
    const indId = industry._id || industry.id
    setIndustryId(indId)
    setIndustrySearch((industry.name || '') + (industry.location ? ` (${industry.location})` : ''))
    setIndustryDropdownOpen(false)
    try {
      const res = await industryService.getById(indId)
      const data = res?.data || res
      const areaVal = data?.area
      setCompanyInfo({
        name: data?.name || '',
        area: getAreaId(areaVal) || '',
        location: data?.location || '',
        address: data?.address || '',
        purchaseManagers: mapPurchaseManagers(data?.purchaseManagers),
      })
    } catch {
      setCompanyInfo({
        name: industry?.name || '',
        area: getAreaId(industry?.area) || '',
        location: industry?.location || '',
        address: industry?.address || '',
        purchaseManagers: mapPurchaseManagers(industry?.purchaseManagers),
      })
    }
  }

  const handleClearIndustry = () => {
    setIndustryId(null)
    setIndustrySearch('')
    setCompanyInfo(INITIAL_COMPANY)
  }

  // Product search – single form
  const fetchProductSearch = useCallback(async (term) => {
    if (!term?.trim()) {
      setProductSearchResults([])
      return
    }
    setProductSearchLoading(true)
    try {
      const res = await productService.getAll({ search: term.trim(), pageSize: 5 })
      const data = res?.data || res
      setProductSearchResults(data?.products || [])
    } catch {
      setProductSearchResults([])
    } finally {
      setProductSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchProductSearch(productSearch), 300)
    return () => clearTimeout(t)
  }, [productSearch, fetchProductSearch])

  const handleSelectProduct = async (product) => {
    const id = product?._id || product?.id
    let fullProduct = product
    if (id) {
      try {
        const res = await productService.getById(id)
        const data = res?.data || res
        fullProduct = data?.data || data?.product || data || product
      } catch {
        fullProduct = product
      }
    }
    setSelectedProductForImport(fullProduct)
    setSelectedVariantComboIds(new Set())
    setSelectedVariantOptionKeys(new Set())
    setVariantSearch('')
    setProductSearch('')
    setProductDropdownOpen(false)
    setProductSearchResults([])
  }

  const toggleVariantCombo = (comboUniqueId) => {
    setSelectedVariantComboIds((prev) => {
      const next = new Set(prev)
      if (next.has(comboUniqueId)) next.delete(comboUniqueId)
      else next.add(comboUniqueId)
      return next
    })
  }

  const toggleVariantOption = (optionKey) => {
    setSelectedVariantOptionKeys((prev) => {
      const next = new Set(prev)
      if (next.has(optionKey)) next.delete(optionKey)
      else next.add(optionKey)
      return next
    })
  }

  const toggleAllVariantCombos = (combos) => {
    const uids = (combos || []).map((c) => c.uniqueId || c._id).filter(Boolean)
    if (!uids.length) return
    setSelectedVariantComboIds((prev) => {
      const allSelected = uids.every((uid) => prev.has(uid))
      if (allSelected) return new Set()
      return new Set(uids)
    })
  }

  const toggleAllVariantOptions = (options) => {
    const keys = (options || []).map((o) => o.key).filter(Boolean)
    if (!keys.length) return
    setSelectedVariantOptionKeys((prev) => {
      const allSelected = keys.every((k) => prev.has(k))
      if (allSelected) return new Set()
      return new Set(keys)
    })
  }

  const clearSelectedProductForImport = () => {
    setSelectedProductForImport(null)
    setSelectedVariantComboIds(new Set())
    setSelectedVariantOptionKeys(new Set())
    setVariantSearch('')
  }

  const handleImportSelectedVariants = () => {
    const p = selectedProductForImport
    if (!p) return
    const pid = p._id || p.id
    const productName = p?.name || ''
    const unit = (p?.unit && String(p.unit).trim()) || 'pcs'

    const newProducts = []

    const hasCombos = p?.hasVariants && (p?.variantCombinations?.length > 0)
    const variantOpts = getVariantOptions(p)
    const hasVariantOpts = variantOpts.length > 0

    if (hasCombos) {
      const combos = p.variantCombinations || []
      const comboIds = selectedVariantComboIds
      const selectedCombos = combos.filter((c) => comboIds.has(c.uniqueId || c._id))

      if (selectedCombos.length > 0) {
        selectedCombos.forEach((c) => {
          newProducts.push({
            productName,
            quantity: Number(c?.quantity) ?? 1,
            unit,
            hsnNumber: c?.hsnNumber || p?.hsnNumber || '',
            modelNumber: c?.modelNumber || p?.defaultModelNumber || '',
            variants: [{ variantName: getVariantComboDisplay(c) }],
            remark: '',
            product_id: pid,
          })
        })
      } else {
        // No combo selected – import base product without variants
        newProducts.push({
          productName,
          quantity: 1,
          unit,
          hsnNumber: p?.hsnNumber || '',
          modelNumber: p?.defaultModelNumber || '',
          variants: [],
          remark: '',
          product_id: pid,
        })
      }
    } else if (hasVariantOpts) {
      const optionKeys = selectedVariantOptionKeys
      const selectedOptions = variantOpts.filter((o) => optionKeys.has(o.key))

      if (selectedOptions.length > 0) {
        selectedOptions.forEach((o) => {
          newProducts.push({
            productName,
            quantity: 1,
            unit,
            hsnNumber: p?.hsnNumber || '',
            modelNumber: p?.defaultModelNumber || '',
            variants: [{ variantName: o.label }],
            remark: '',
            product_id: pid,
          })
        })
      } else {
        // No option selected – import base product without variants
        newProducts.push({
          productName,
          quantity: 1,
          unit,
          hsnNumber: p?.hsnNumber || '',
          modelNumber: p?.defaultModelNumber || '',
          variants: [],
          remark: '',
          product_id: pid,
        })
      }
    } else {
      // Product has no variants – import base product
      newProducts.push({
        productName,
        quantity: 1,
        unit,
        hsnNumber: p?.hsnNumber || '',
        modelNumber: p?.defaultModelNumber || '',
        variants: [],
        remark: '',
        product_id: pid,
      })
    }

    handleImportProducts(newProducts)
    toastSuccess('Product section filled. Review and click Save to add.')
    clearSelectedProductForImport()
  }

  const clearProductForm = () => {
    setFormProduct({ ...INITIAL_PRODUCT })
    setEditingProductIndex(null)
    setProductSearch('')
    setProductDropdownOpen(false)
    setProductSearchResults([])
  }

  const handleImportProducts = (importedProducts) => {
    if (!importedProducts?.length) return
    const first = importedProducts[0]
    setFormProduct({
      productName: first.productName || '',
      quantity: first.quantity ?? 1,
      unit: (first.unit && String(first.unit).trim()) || '',
      hsnNumber: first.hsnNumber || '',
      modelNumber: first.modelNumber || '',
      gstPercentage: first.gstPercentage ?? null,
      variants: (first.variants || []).map((v) => ({
        variantName: v.variantName || '',
      })),
      remark: first.remark || '',
      product_id: first.product_id || null,
    })
    setEditingProductIndex(null)
    setProductSearch('')
    setProductDropdownOpen(false)
    setProductSearchResults([])
  }

  const saveProduct = () => {
    if (!formProduct.productName?.trim()) {
      toastError('Product name is required')
      return
    }
    setProducts((prev) => [...prev, { ...formProduct }])
    clearProductForm()
    toastSuccess('Product added to list')
  }

  const updateProductInList = () => {
    if (editingProductIndex == null || !formProduct.productName?.trim()) {
      if (!formProduct.productName?.trim()) toastError('Product name is required')
      return
    }
    setProducts((prev) => {
      const next = [...prev]
      next[editingProductIndex] = { ...formProduct }
      return next
    })
    clearProductForm()
    toastSuccess('Product updated')
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
      variants: (p.variants || []).map((v) => ({
        variantName: v.variantName || '',
      })),
      remark: p.remark || '',
      product_id: p.product_id || null,
    })
    setEditingProductIndex(index)
    setProductSearch('')
    setProductDropdownOpen(false)
  }

  const deleteProductFromTable = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index))
    if (editingProductIndex === index) {
      clearProductForm()
    } else if (editingProductIndex != null && editingProductIndex > index) {
      setEditingProductIndex((prev) => prev - 1)
    }
    toastSuccess('Product removed from list')
  }

  const updateFormProduct = (field, value) => {
    setFormProduct((prev) => ({ ...prev, [field]: value }))
  }

  const addVariant = () => {
    setFormProduct((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), { ...INITIAL_VARIANT }],
    }))
  }

  const removeVariant = (variantIndex) => {
    setFormProduct((prev) => {
      const v = prev.variants || []
      return { ...prev, variants: v.filter((_, i) => i !== variantIndex) }
    })
  }

  const updateVariant = (variantIndex, field, value) => {
    setFormProduct((prev) => {
      const variants = [...(prev.variants || [])]
      variants[variantIndex] = { ...variants[variantIndex], [field]: value }
      return { ...prev, variants }
    })
  }

  // Load for edit
  useEffect(() => {
    if (!isEdit) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => queryService.getById(id))
        const data = res?.data || res
        const q = data?.data ?? data
        if (!q) throw new Error('Query not found')

        const ci = q.companyInfo || {}
        let managers = (ci.purchaseManagers || []).map((m) => ({
          name: m?.name || '',
          phone: m?.phone || '',
          email: m?.email || '',
        }))
        if (managers.length === 0 && (ci.purchase_manager_name || ci.purchase_manager_phone)) {
          managers = [{ name: ci.purchase_manager_name || '', phone: ci.purchase_manager_phone || '', email: ci.email || '' }]
        }
        setCompanyInfo({
          name: ci.name || '',
          area: getAreaId(ci.area) || ci.area || '',
          location: ci.location || '',
          address: ci.address || '',
          purchaseManagers: managers,
        })
        setIndustryId(q.industry_id?._id || q.industry_id || null)
        setIndustrySearch(q.industry_id?.name || (ci.name || ''))

        const prods = q.products?.length
          ? q.products.map((p) => ({
              productName: p.productName || '',
              quantity: p.quantity ?? 1,
              unit: p.unit || '',
              hsnNumber: p.hsnNumber || '',
              modelNumber: p.modelNumber || '',
              gstPercentage: p.gstPercentage ?? null,
              variants: (p.variants || []).map((v) => ({
                variantName: v.variantName || '',
              })),
              remark: p.remark || '',
              product_id: p.product_id?._id || p.product_id || null,
            }))
          : []
        setProducts(prods)
      } catch (err) {
        toastError(err?.message || 'Failed to load query')
        setError(err?.message || 'Failed to load query')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit])

  const getCreatedBy = () => {
    try {
      const stored = localStorage.getItem('migticrm_user')
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed?._id || parsed?.id
      }
    } catch {}
    return user?._id || user?.id
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!companyInfo?.name?.trim()) {
      toastError('Company / Industry name is required')
      return
    }
    const managers = companyInfo?.purchaseManagers || []
    for (const m of managers) {
      const pm = (m?.phone || '').trim()
      if (pm && !/^\d{10}$/.test(pm)) {
        toastError(`Purchase manager "${m?.name || 'Unknown'}" phone must be exactly 10 digits`)
        return
      }
    }
    const validProducts = products.filter((p) => (p.productName || '').trim())
    if (validProducts.length === 0) {
      toastError('Add at least one product using the form above and click Save')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        companyInfo: {
          ...companyInfo,
          area: companyInfo.area || null,
          purchaseManagers: (companyInfo.purchaseManagers || []).map((m) => ({
            name: (m?.name || '').trim(),
            phone: (m?.phone || '').trim(),
            email: (m?.email || '').trim(),
          })).filter((m) => m.name || m.phone),
        },
        industry_id: industryId || null,
        products: products
          .map((p) => ({
            productName: p.productName?.trim() || '',
            quantity: Number(p.quantity) ?? 1,
            unit: (p.unit && String(p.unit).trim()) || '',
            hsnNumber: (p.hsnNumber && String(p.hsnNumber).trim()) || '',
            modelNumber: (p.modelNumber && String(p.modelNumber).trim()) || '',
            gstPercentage: typeof p.gstPercentage === 'number' ? p.gstPercentage : null,
            variants: (p.variants || [])
              .map((v) => ({
                variantName: (v.variantName && String(v.variantName).trim()) || '',
              }))
              .filter((v) => v.variantName),
            remark: p.remark?.trim() || '',
            product_id: p.product_id || null,
          }))
          .filter((p) => p.productName),
        created_by: isEdit ? undefined : getCreatedBy(),
      }
      if (isEdit) {
        await queryService.update(id, payload)
        toastSuccess('Query updated successfully')
      } else {
        await queryService.create(payload)
        toastSuccess('Query created successfully')
      }
      navigate('/queries')
    } catch (err) {
      toastError(err?.message || 'Failed to save query')
      setError(err?.message || 'Failed to save query')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading query..." />
      </div>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="light" onClick={() => navigate('/queries')} className="me-2">
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Queries
          </CButton>
        </CCol>
      </CRow>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError('')}>
          {error}
        </CAlert>
      )}

      <CForm onSubmit={handleSubmit}>
        {/* 1. Company Information */}
        <CCard className="mb-4">
          <CCardHeader><strong>1. Company Information</strong></CCardHeader>
          <CCardBody>
            <div className="mb-3 position-relative" ref={companyDropdownRef}>
              <CFormLabel>Industry / Company name (search & select)</CFormLabel>
              <CFormInput
                type="text"
                value={industrySearch}
                onChange={(e) => setIndustrySearch(e.target.value)}
                onFocus={() => setIndustryDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIndustryDropdownOpen(false), 200)}
                placeholder="Type to see best 5 matches..."
                autoComplete="off"
              />
              {industryId && (
                <div className="mt-2">
                  <CButton color="link" size="sm" type="button" onClick={handleClearIndustry}>
                    Clear selection
                  </CButton>
                </div>
              )}
              {industryDropdownOpen && (
                <div
                  className="position-absolute w-100 bg-white border rounded mt-1 shadow-sm"
                  style={{ zIndex: 10, maxHeight: 280, overflowY: 'auto' }}
                >
                  <CListGroup flush>
                    {industrySearchLoading && (
                      <CListGroupItem className="text-muted">Searching...</CListGroupItem>
                    )}
                    {!industrySearchLoading && industrySearchResults.length === 0 && industrySearch.trim() && (
                      <CListGroupItem className="text-muted">No matches. Enter details manually below.</CListGroupItem>
                    )}
                    {!industrySearchLoading &&
                      industrySearchResults.map((ind) => (
                        <CListGroupItem
                          key={ind._id || ind.id}
                          component="button"
                          type="button"
                          className="text-start"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleSelectIndustry(ind)
                          }}
                        >
                          <div className="fw-semibold">{ind.name}</div>
                          {ind.location && (
                              <div className="text-muted small">{ind.location}</div>
                            )}
                        </CListGroupItem>
                      ))}
                  </CListGroup>
                </div>
              )}
            </div>

            <CFormLabel className="mt-3">Editable company details (stored in query only)</CFormLabel>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Company name</CFormLabel>
                  <CFormInput
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Company / Industry name"
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Area</CFormLabel>
                  <CFormSelect
                    value={companyInfo.area}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, area: e.target.value }))}
                  >
                    <option value="">Select area</option>
                    {areas.map((a) => (
                      <option key={a._id || a.id} value={a._id || a.id}>
                        {a.name}
                        {a.city ? ` - ${a.city}` : ''}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Location</CFormLabel>
                  <CFormInput
                    value={companyInfo.location}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, location: e.target.value }))}
                    placeholder="Location"
                  />
                </div>
              </CCol>
            </CRow>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <CFormLabel className="mb-0">Purchase managers</CFormLabel>
                <CButton
                  color="primary"
                  size="sm"
                  type="button"
                  onClick={() =>
                    setCompanyInfo((c) => ({
                      ...c,
                      purchaseManagers: [...(c.purchaseManagers || []), { name: '', phone: '', email: '' }],
                    }))
                  }
                >
                  <CIcon icon={cilPlus} className="me-1" />
                  Add purchase manager
                </CButton>
              </div>
              {(companyInfo.purchaseManagers || []).length > 0 ? (
                <div className="border rounded p-2">
                  {(companyInfo.purchaseManagers || []).map((m, idx) => (
                    <CRow key={idx} className="align-items-end mb-2 g-2">
                      <CCol md={3}>
                        <CFormInput
                          value={m.name || ''}
                          onChange={(e) =>
                            setCompanyInfo((c) => {
                              const next = [...(c.purchaseManagers || [])]
                              next[idx] = { ...next[idx], name: e.target.value }
                              return { ...c, purchaseManagers: next }
                            })
                          }
                          placeholder="Name"
                        />
                      </CCol>
                      <CCol md={3}>
                        <CFormInput
                          value={m.phone || ''}
                          onChange={(e) =>
                            setCompanyInfo((c) => {
                              const next = [...(c.purchaseManagers || [])]
                              next[idx] = { ...next[idx], phone: e.target.value }
                              return { ...c, purchaseManagers: next }
                            })
                          }
                          placeholder="Phone"
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormInput
                          type="email"
                          value={m.email || ''}
                          onChange={(e) =>
                            setCompanyInfo((c) => {
                              const next = [...(c.purchaseManagers || [])]
                              next[idx] = { ...next[idx], email: e.target.value }
                              return { ...c, purchaseManagers: next }
                            })
                          }
                          placeholder="Email"
                        />
                      </CCol>
                      <CCol md={2}>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() =>
                            setCompanyInfo((c) => ({
                              ...c,
                              purchaseManagers: (c.purchaseManagers || []).filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CCol>
                    </CRow>
                  ))}
                </div>
              ) : (
                <p className="text-muted small mb-0">Click &quot;Add purchase manager&quot; to add contact(s). Or select an industry to load from.</p>
              )}
            </div>
            <CRow>
              <CCol xs={12}>
                <div className="mb-3">
                  <CFormLabel>Address</CFormLabel>
                  <CFormTextarea
                    rows={2}
                    value={companyInfo.address}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, address: e.target.value }))}
                    placeholder="Address"
                  />
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {/* 2. Products – add/edit form + table */}
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>2. Products</strong>
            <CButton color="primary" size="sm" onClick={() => setShowFindProductModal(true)}>
              <CIcon icon={cilSearch} className="me-1" />
              Find Product
            </CButton>
          </CCardHeader>
          <CCardBody>
            <CCard className="mb-4">
              <CCardHeader className="py-2">
                <strong>{editingProductIndex != null ? 'Edit product' : 'Add product'}</strong>
              </CCardHeader>
              <CCardBody>
                <div className="mb-4 p-3 bg-light rounded border">
                  <CFormLabel className="fw-semibold d-block mb-2">
                    Search & import from products
                  </CFormLabel>
                  <div className="mb-3 position-relative">
                    <CFormInput
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onFocus={() => setProductDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setProductDropdownOpen(false), 200)}
                      placeholder="Type / name (best 5 matches)"
                      autoComplete="off"
                    />
                    {productDropdownOpen && (productSearchResults?.length > 0 || productSearchLoading) && (
                      <div
                        className="position-absolute w-100 bg-white border rounded mt-1 shadow-sm"
                        style={{ zIndex: 10, maxHeight: 220, overflowY: 'auto' }}
                      >
                        <CListGroup flush>
                          {productSearchLoading && (
                            <CListGroupItem className="text-muted">Searching...</CListGroupItem>
                          )}
                          {!productSearchLoading &&
                            productSearchResults.map((pr) => (
                              <CListGroupItem
                                key={pr._id || pr.id}
                                component="button"
                                type="button"
                                className="text-start"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  handleSelectProduct(pr)
                                }}
                              >
                                <div className="fw-semibold">{pr.name}</div>
                                {pr.sku && <div className="text-muted small">SKU: {pr.sku}</div>}
                              </CListGroupItem>
                            ))}
                        </CListGroup>
                      </div>
                    )}
                  </div>

                  {selectedProductForImport && (
                    <div className="mt-2 p-3 bg-white rounded border">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>Selected: {selectedProductForImport?.name || '–'}</strong>
                        <div className="d-flex gap-2 align-items-center">
                          <CButton color="secondary" size="sm" variant="ghost" onClick={clearSelectedProductForImport}>
                            Clear
                          </CButton>
                          <CButton color="primary" size="sm" onClick={handleImportSelectedVariants}>
                            Import
                          </CButton>
                        </div>
                      </div>
                      <div className="mb-2">
                        <CFormLabel className="mb-1 small">Search variants (local filter)</CFormLabel>
                        <CFormInput
                          size="sm"
                          type="text"
                          value={variantSearch}
                          onChange={(e) => setVariantSearch(e.target.value)}
                          placeholder="Type to filter variant combinations..."
                        />
                      </div>
                    {(() => {
                      const p = selectedProductForImport
                      const hasCombos = p?.hasVariants && (p?.variantCombinations?.length > 0)
                      const combos = p?.variantCombinations || []
                      const variantOpts = getVariantOptions(p)
                      const hasVariantOpts = variantOpts.length > 0

                      const search = (variantSearch || '').trim().toLowerCase()
                      const filteredCombos = hasCombos
                        ? combos.filter((c) =>
                            !search ||
                            getVariantComboDisplay(c).toLowerCase().includes(search),
                          )
                        : []
                      const filteredVariantOpts = hasVariantOpts
                        ? variantOpts.filter((o) =>
                            !search ||
                            (o.label || '').toLowerCase().includes(search),
                          )
                        : []

                      if (hasCombos) {
                        const comboSet = selectedVariantComboIds
                        const allComboIds = filteredCombos.map((c) => c.uniqueId || c._id).filter(Boolean)
                        const allSelected = allComboIds.length > 0 && allComboIds.every((uid) => comboSet.has(uid))
                        return (
                          <>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <CFormLabel className="mb-0">Select variant combination(s) to import</CFormLabel>
                              <CFormCheck
                                type="checkbox"
                                label="Select all"
                                checked={allSelected}
                                onChange={() => toggleAllVariantCombos(combos)}
                              />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem 1rem' }}>
                              {filteredCombos.map((c) => {
                                const uid = c.uniqueId || c._id
                                const checked = comboSet.has(uid)
                                const inputId = `combo-${uid}`
                                return (
                                  <label
                                    key={uid}
                                    htmlFor={inputId}
                                    className="form-check d-flex align-items-center gap-2 mb-0"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <input
                                      type="checkbox"
                                      id={inputId}
                                      className="form-check-input"
                                      checked={checked}
                                      onChange={() => toggleVariantCombo(uid)}
                                    />
                                    <span className="form-check-label">{getVariantComboDisplay(c)}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </>
                        )
                      }
                      if (hasVariantOpts) {
                        const optionSet = selectedVariantOptionKeys
                        const allKeys = filteredVariantOpts.map((o) => o.key)
                        const allSelected = allKeys.length > 0 && allKeys.every((k) => optionSet.has(k))
                        return (
                          <>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <CFormLabel className="mb-0">Select variant(s) to import</CFormLabel>
                              <CFormCheck
                                type="checkbox"
                                label="Select all"
                                checked={allSelected}
                                onChange={() => toggleAllVariantOptions(variantOpts)}
                              />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem 1rem' }}>
                              {filteredVariantOpts.map((o) => {
                                const checked = optionSet.has(o.key)
                                const inputId = `opt-${o.key}`
                                return (
                                  <label
                                    key={o.key}
                                    htmlFor={inputId}
                                    className="form-check d-flex align-items-center gap-2 mb-0"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <input
                                      type="checkbox"
                                      id={inputId}
                                      className="form-check-input"
                                      checked={checked}
                                      onChange={() => toggleVariantOption(o.key)}
                                    />
                                    <span className="form-check-label">{o.label}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </>
                        )
                      }
                      return (
                        <p className="mb-0 text-muted small">
                          This product has no variants. Click Import to add it as one product.
                        </p>
                      )
                    })()}
                    </div>
                  )}
                </div>

                <CRow>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>Product name</CFormLabel>
                      <CFormInput
                        value={formProduct.productName}
                        onChange={(e) => updateFormProduct('productName', e.target.value)}
                        placeholder="Product name"
                      />
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="mb-3">
                      <CFormLabel>Quantity (number)</CFormLabel>
                      <CFormInput
                        type="number"
                        min={0}
                        value={formProduct.quantity}
                        onChange={(e) => updateFormProduct('quantity', Number(e.target.value) ?? 0)}
                        placeholder="0"
                      />
                    </div>
                  </CCol>
                  <CCol md={2}>
                    <div className="mb-3">
                      <CFormLabel>Unit</CFormLabel>
                      <CFormInput
                        value={formProduct.unit || ''}
                        onChange={(e) => updateFormProduct('unit', e.target.value)}
                        placeholder="pcs, kg, etc."
                      />
                    </div>
                  </CCol>
                </CRow>
                <CRow>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>HSN Number (optional)</CFormLabel>
                      <CFormInput
                        value={formProduct.hsnNumber || ''}
                        onChange={(e) => updateFormProduct('hsnNumber', e.target.value)}
                        placeholder="HSN Number"
                      />
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>Model Number (optional)</CFormLabel>
                      <CFormInput
                        value={formProduct.modelNumber || ''}
                        onChange={(e) => updateFormProduct('modelNumber', e.target.value)}
                        placeholder="Model Number"
                      />
                    </div>
                  </CCol>
                </CRow>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <CFormLabel className="mb-0">Variants</CFormLabel>
                    <CButton color="primary" size="sm" type="button" onClick={addVariant}>
                      <CIcon icon={cilPlus} className="me-1" />
                      Add variant
                    </CButton>
                  </div>
                  {(formProduct.variants || []).length > 0 ? (
                    (formProduct.variants || []).map((v, vIdx) => (
                      <CRow key={vIdx} className="mb-2 align-items-end">
                        <CCol md={8}>
                          <CFormInput
                            value={v.variantName || ''}
                            onChange={(e) => updateVariant(vIdx, 'variantName', e.target.value)}
                            placeholder="Variant name"
                          />
                        </CCol>
                        <CCol md={2}>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => removeVariant(vIdx)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CCol>
                      </CRow>
                    ))
                  ) : (
                    <p className="text-muted small mb-0">No variants. Click &quot;Add variant&quot; to add.</p>
                  )}
                </div>
                <div className="mb-3">
                  <CFormLabel>Remark</CFormLabel>
                  <CFormTextarea
                    rows={2}
                    value={formProduct.remark}
                    onChange={(e) => updateFormProduct('remark', e.target.value)}
                    placeholder="Remark"
                  />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  {editingProductIndex != null ? (
                    <CButton color="primary" type="button" onClick={updateProductInList}>
                      Update
                    </CButton>
                  ) : (
                    <CButton color="primary" type="button" onClick={saveProduct}>
                      Save
                    </CButton>
                  )}
                  {editingProductIndex != null && (
                    <CButton color="secondary" type="button" onClick={clearProductForm}>
                      Cancel
                    </CButton>
                  )}
                </div>
              </CCardBody>
            </CCard>

            <div className="mt-3">
              <strong className="d-block mb-2">Added products</strong>
              {products.length === 0 ? (
                <p className="text-muted small mb-0">No products added yet. Fill the form above and click Save to add.</p>
              ) : (
                <CTable responsive hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Product name</CTableHeaderCell>
                      <CTableHeaderCell>Quantity</CTableHeaderCell>
                      <CTableHeaderCell>Unit</CTableHeaderCell>
                      <CTableHeaderCell>Variants</CTableHeaderCell>
                      <CTableHeaderCell>HSN Number</CTableHeaderCell>
                      <CTableHeaderCell>GST %</CTableHeaderCell>
                      <CTableHeaderCell>Remark</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {products.map((p, index) => (
                      <CTableRow key={index}>
                        <CTableDataCell>{p.productName || '–'}</CTableDataCell>
                        <CTableDataCell>{p.quantity ?? '–'}</CTableDataCell>
                        <CTableDataCell>{p.unit || '–'}</CTableDataCell>
                        <CTableDataCell>
                          {(p.variants || []).length > 0
                            ? (p.variants || []).map((v, i) => v.variantName || '–').join(', ')
                            : '–'}
                        </CTableDataCell>
                        <CTableDataCell className="small">{p.hsnNumber || '–'}</CTableDataCell>
                        <CTableDataCell className="small">
                          {typeof p.gstPercentage === 'number' ? `${p.gstPercentage}%` : '–'}
                        </CTableDataCell>
                        <CTableDataCell>
                          {(p.remark || '').slice(0, 40)}
                          {(p.remark || '').length > 40 ? '…' : ''}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CButton
                            color="primary"
                            variant="ghost"
                            size="sm"
                            className="me-1"
                            onClick={() => editProductFromTable(index)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteProductFromTable(index)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </div>
          </CCardBody>
        </CCard>

        <CCard className="mb-4">
          <CCardBody className="d-flex justify-content-end gap-2">
            <CButton color="secondary" type="button" onClick={() => navigate('/queries')}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting && <CSpinner size="sm" className="me-2" />}
              {isEdit ? 'Update Query' : 'Create Query'}
            </CButton>
          </CCardBody>
        </CCard>
      </CForm>

      <FindProductModal
        visible={showFindProductModal}
        onClose={() => setShowFindProductModal(false)}
        onImport={handleImportProducts}
      />
    </>
  )
}

export default QueryForm
