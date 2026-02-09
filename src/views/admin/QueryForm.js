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
  CListGroup,
  CListGroupItem,
  CSpinner,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPlus, cilTrash } from '@coreui/icons'
import queryService from '../../services/queryService'
import industryService from '../../services/industryService'
import productService from '../../services/productService'
import areaService from '../../services/areaService'
import { useAuth } from '../../context/AuthContext'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const INITIAL_COMPANY = {
  name: '',
  area: '',
  location: '',
  address: '',
  purchase_manager_name: '',
  purchase_manager_phone: '',
  email: '',
}

const INITIAL_DELIVERY = {
  location: '',
  contactPersonName: '',
  contactPersonPhone: '',
  expectedDateByCompany: '',
  urgent: false,
}

const INITIAL_VARIANT = { variantName: '', quantity: 1 }

const INITIAL_PRODUCT = {
  productName: '',
  quantity: 1,
  unit: '',
  variants: [],
  remark: '',
  product_id: null,
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

  // Products – repeatable sections with product type search
  const [products, setProducts] = useState([{ ...INITIAL_PRODUCT }])
  const [productSearchByIndex, setProductSearchByIndex] = useState({})
  const [productDropdownByIndex, setProductDropdownByIndex] = useState({})
  const [productSearchResultsByIndex, setProductSearchResultsByIndex] = useState({})
  const [productSearchLoadingByIndex, setProductSearchLoadingByIndex] = useState({})
  const lastProductCardRef = useRef(null)

  // Delivery
  const [delivery, setDelivery] = useState(INITIAL_DELIVERY)

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
        purchase_manager_name: data?.purchase_manager_name || '',
        purchase_manager_phone: data?.purchase_manager_phone || '',
        email: data?.email || '',
      })
    } catch {
      setCompanyInfo({
        name: industry?.name || '',
        area: getAreaId(industry?.area) || '',
        location: industry?.location || '',
        address: industry?.address || '',
        purchase_manager_name: industry?.purchase_manager_name || '',
        purchase_manager_phone: industry?.purchase_manager_phone || '',
        email: industry?.email || '',
      })
    }
  }

  const handleClearIndustry = () => {
    setIndustryId(null)
    setIndustrySearch('')
    setCompanyInfo(INITIAL_COMPANY)
  }

  // Product search – top 5 by index
  const fetchProductSearch = useCallback(async (index, term) => {
    if (!term?.trim()) {
      setProductSearchResultsByIndex((prev) => ({ ...prev, [index]: [] }))
      return
    }
    setProductSearchLoadingByIndex((prev) => ({ ...prev, [index]: true }))
    try {
      const res = await productService.getAll({ search: term.trim(), pageSize: 5 })
      const data = res?.data || res
      setProductSearchResultsByIndex((prev) => ({ ...prev, [index]: data?.products || [] }))
    } catch {
      setProductSearchResultsByIndex((prev) => ({ ...prev, [index]: [] }))
    } finally {
      setProductSearchLoadingByIndex((prev) => ({ ...prev, [index]: false }))
    }
  }, [])

  useEffect(() => {
    const timers = {}
    Object.keys(productSearchByIndex).forEach((key) => {
      const val = productSearchByIndex[key]
      const idx = Number(key)
      if (val?.trim()) {
        timers[key] = setTimeout(() => fetchProductSearch(idx, val), 300)
      } else {
        setProductSearchResultsByIndex((prev) => ({ ...prev, [idx]: [] }))
      }
    })
    return () => Object.values(timers).forEach(clearTimeout)
  }, [productSearchByIndex, fetchProductSearch])

  const handleSelectProduct = (index, product) => {
    const pid = product._id || product.id
    setProducts((prev) => {
      const next = [...prev]
      const existingVariants = next[index].variants?.length ? next[index].variants : []
      next[index] = {
        ...next[index],
        productName: product?.name || '',
        variants: product?.hasVariants && product?.variants?.length
          ? product.variants.map((v) => ({ variantName: v.name || '', quantity: 1 }))
          : existingVariants,
        product_id: pid,
      }
      return next
    })
    setProductSearchByIndex((prev) => ({ ...prev, [index]: '' }))
    setProductDropdownByIndex((prev) => ({ ...prev, [index]: false }))
    setProductSearchResultsByIndex((prev) => ({ ...prev, [index]: [] }))
  }

  const prevProductsLengthRef = useRef(products.length)

  const addProduct = () => {
    setProducts((prev) => [...prev, { ...INITIAL_PRODUCT }])
  }

  useEffect(() => {
    if (products.length > prevProductsLengthRef.current) {
      prevProductsLengthRef.current = products.length
      setTimeout(() => {
        lastProductCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } else {
      prevProductsLengthRef.current = products.length
    }
  }, [products.length])

  const removeProduct = (index) => {
    if (products.length <= 1) return
    setProducts((prev) => prev.filter((_, i) => i !== index))
    setProductSearchByIndex((prev => {
      const next = { ...prev }
      delete next[index]
      return next
    }))
    setProductDropdownByIndex((prev => {
      const next = { ...prev }
      delete next[index]
      return next
    }))
    setProductSearchResultsByIndex((prev => {
      const next = { ...prev }
      delete next[index]
      return next
    }))
  }

  const updateProduct = (index, field, value) => {
    setProducts((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addVariant = (productIndex) => {
    setProducts((prev) => {
      const next = [...prev]
      next[productIndex] = {
        ...next[productIndex],
        variants: [...(next[productIndex].variants || []), { ...INITIAL_VARIANT }],
      }
      return next
    })
  }

  const removeVariant = (productIndex, variantIndex) => {
    setProducts((prev) => {
      const next = [...prev]
      const v = next[productIndex].variants || []
      next[productIndex] = {
        ...next[productIndex],
        variants: v.filter((_, i) => i !== variantIndex),
      }
      return next
    })
  }

  const updateVariant = (productIndex, variantIndex, field, value) => {
    setProducts((prev) => {
      const next = [...prev]
      const variants = [...(next[productIndex].variants || [])]
      variants[variantIndex] = { ...variants[variantIndex], [field]: value }
      next[productIndex] = { ...next[productIndex], variants }
      return next
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
        setCompanyInfo({
          name: ci.name || '',
          area: getAreaId(ci.area) || ci.area || '',
          location: ci.location || '',
          address: ci.address || '',
          purchase_manager_name: ci.purchase_manager_name || '',
          purchase_manager_phone: ci.purchase_manager_phone || '',
          email: ci.email || '',
        })
        setIndustryId(q.industry_id?._id || q.industry_id || null)
        setIndustrySearch(q.industry_id?.name || (ci.name || ''))

        const prods = q.products?.length ? q.products.map((p) => ({
          productName: p.productName || '',
          quantity: p.quantity ?? 1,
          unit: p.unit || '',
          variants: (p.variants || []).map((v) => ({
            variantName: v.variantName || '',
            quantity: v.quantity ?? 1,
          })),
          remark: p.remark || '',
          product_id: p.product_id?._id || p.product_id || null,
        })) : [{ ...INITIAL_PRODUCT }]
        setProducts(prods)

        const del = q.delivery || {}
        setDelivery({
          location: del.location || '',
          contactPersonName: del.contactPersonName || '',
          contactPersonPhone: del.contactPersonPhone || '',
          expectedDateByCompany: del.expectedDateByCompany
            ? (typeof del.expectedDateByCompany === 'string'
                ? del.expectedDateByCompany.slice(0, 10)
                : new Date(del.expectedDateByCompany).toISOString().slice(0, 10))
            : '',
          urgent: Boolean(del.urgent),
        })
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
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        companyInfo: {
          ...companyInfo,
          area: companyInfo.area || null,
        },
        industry_id: industryId || null,
        products: products.map((p) => ({
          productName: p.productName?.trim() || '',
          quantity: Number(p.quantity) ?? 1,
          unit: (p.unit && String(p.unit).trim()) || '',
          variants: (p.variants || []).map((v) => ({
            variantName: (v.variantName && String(v.variantName).trim()) || '',
            quantity: Number(v.quantity) ?? 1,
          })).filter((v) => v.variantName),
          remark: p.remark?.trim() || '',
          product_id: p.product_id || null,
        })).filter((p) => p.productName),
        delivery: {
          ...delivery,
          expectedDateByCompany: delivery.expectedDateByCompany
            ? new Date(delivery.expectedDateByCompany).toISOString()
            : null,
        },
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
                          {(ind.location || ind.email) && (
                            <div className="text-muted small">
                              {[ind.location, ind.email].filter(Boolean).join(' • ')}
                            </div>
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
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Email</CFormLabel>
                  <CFormInput
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, email: e.target.value }))}
                    placeholder="Email"
                  />
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Purchase manager name</CFormLabel>
                  <CFormInput
                    value={companyInfo.purchase_manager_name}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, purchase_manager_name: e.target.value }))}
                    placeholder="Name"
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Purchase manager phone</CFormLabel>
                  <CFormInput
                    value={companyInfo.purchase_manager_phone}
                    onChange={(e) => setCompanyInfo((c) => ({ ...c, purchase_manager_phone: e.target.value }))}
                    placeholder="Phone"
                  />
                </div>
              </CCol>
            </CRow>
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

        {/* 2. Products */}
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>2. Products</strong>
            <CButton color="primary" size="sm" type="button" onClick={addProduct}>
              <CIcon icon={cilPlus} className="me-1" />
              Add product
            </CButton>
          </CCardHeader>
          <CCardBody>
            {products.map((prod, index) => (
              <div
                key={index}
                ref={index === products.length - 1 ? lastProductCardRef : null}
                className="mb-4"
              >
              <CCard>
                <CCardHeader className="d-flex justify-content-between align-items-center py-2">
                  <strong>Product {index + 1}</strong>
                  {products.length > 1 && (
                    <CButton
                      color="danger"
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => removeProduct(index)}
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  )}
                </CCardHeader>
                <CCardBody>
                  <div className="mb-3 position-relative">
                    <CFormLabel>Type / Name (search – best 5 matches)</CFormLabel>
                    <CFormInput
                      type="text"
                      value={productSearchByIndex[index] ?? ''}
                      onChange={(e) => setProductSearchByIndex((p) => ({ ...p, [index]: e.target.value }))}
                      onFocus={() => setProductDropdownByIndex((p) => ({ ...p, [index]: true }))}
                      onBlur={() => setTimeout(() => setProductDropdownByIndex((p) => ({ ...p, [index]: false })), 200)}
                      placeholder="Search product type or name"
                      autoComplete="off"
                    />
                    {productDropdownByIndex[index] && (productSearchResultsByIndex[index]?.length > 0 || productSearchLoadingByIndex[index]) && (
                      <div
                        className="position-absolute w-100 bg-white border rounded mt-1 shadow-sm"
                        style={{ zIndex: 10, maxHeight: 220, overflowY: 'auto' }}
                      >
                        <CListGroup flush>
                          {productSearchLoadingByIndex[index] && (
                            <CListGroupItem className="text-muted">Searching...</CListGroupItem>
                          )}
                          {!productSearchLoadingByIndex[index] &&
                            (productSearchResultsByIndex[index] || []).map((pr) => (
                              <CListGroupItem
                                key={pr._id || pr.id}
                                component="button"
                                type="button"
                                className="text-start"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  handleSelectProduct(index, pr)
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
                  <CRow>
                    <CCol md={6}>
                      <div className="mb-3">
                        <CFormLabel>Product name</CFormLabel>
                        <CFormInput
                          value={prod.productName}
                          onChange={(e) => updateProduct(index, 'productName', e.target.value)}
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
                          value={prod.quantity}
                          onChange={(e) => updateProduct(index, 'quantity', Number(e.target.value) ?? 0)}
                          placeholder="0"
                        />
                      </div>
                    </CCol>
                    <CCol md={2}>
                      <div className="mb-3">
                        <CFormLabel>Unit</CFormLabel>
                        <CFormInput
                          value={prod.unit || ''}
                          onChange={(e) => updateProduct(index, 'unit', e.target.value)}
                          placeholder="pcs, kg, etc."
                        />
                      </div>
                    </CCol>
                  </CRow>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <CFormLabel className="mb-0">Variants (name + quantity)</CFormLabel>
                      <CButton color="primary" size="sm" type="button" onClick={() => addVariant(index)}>
                        <CIcon icon={cilPlus} className="me-1" />
                        Add variant
                      </CButton>
                    </div>
                    {(prod.variants || []).length > 0 ? (
                      (prod.variants || []).map((v, vIdx) => (
                        <CRow key={vIdx} className="mb-2 align-items-end">
                          <CCol md={5}>
                            <CFormInput
                              value={v.variantName || ''}
                              onChange={(e) => updateVariant(index, vIdx, 'variantName', e.target.value)}
                              placeholder="Variant name"
                            />
                          </CCol>
                          <CCol md={3}>
                            <CFormInput
                              type="number"
                              min={0}
                              value={v.quantity ?? ''}
                              onChange={(e) => updateVariant(index, vIdx, 'quantity', Number(e.target.value) ?? 0)}
                              placeholder="Qty"
                            />
                          </CCol>
                          <CCol md={2}>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => removeVariant(index, vIdx)}
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
                      value={prod.remark}
                      onChange={(e) => updateProduct(index, 'remark', e.target.value)}
                      placeholder="Remark"
                    />
                  </div>
                </CCardBody>
              </CCard>
              </div>
            ))}
          </CCardBody>
        </CCard>

        {/* 3. Delivery & Payment */}
        <CCard className="mb-4">
          <CCardHeader><strong>3. Delivery & Payment</strong></CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Location</CFormLabel>
                  <CFormInput
                    value={delivery.location}
                    onChange={(e) => setDelivery((d) => ({ ...d, location: e.target.value }))}
                    placeholder="Delivery location"
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Contact person name</CFormLabel>
                  <CFormInput
                    value={delivery.contactPersonName}
                    onChange={(e) => setDelivery((d) => ({ ...d, contactPersonName: e.target.value }))}
                    placeholder="Name"
                  />
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Contact person phone</CFormLabel>
                  <CFormInput
                    value={delivery.contactPersonPhone}
                    onChange={(e) => setDelivery((d) => ({ ...d, contactPersonPhone: e.target.value }))}
                    placeholder="Phone"
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Expected date by company</CFormLabel>
                  <CFormInput
                    type="date"
                    value={delivery.expectedDateByCompany}
                    onChange={(e) => setDelivery((d) => ({ ...d, expectedDateByCompany: e.target.value }))}
                  />
                </div>
              </CCol>
            </CRow>
            <div className="mb-3">
              <CFormLabel>Urgent / Non-urgent</CFormLabel>
              <CFormSelect
                value={delivery.urgent ? 'urgent' : 'non-urgent'}
                onChange={(e) => setDelivery((d) => ({ ...d, urgent: e.target.value === 'urgent' }))}
              >
                <option value="non-urgent">Non-urgent</option>
                <option value="urgent">Urgent</option>
              </CFormSelect>
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
    </>
  )
}

export default QueryForm
