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
  CProgress,
  CProgressBar,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CImage,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPlus, cilTrash, cilPencil, cilSearch, cilCheckCircle, cilX } from '@coreui/icons'
import queryService from '../../services/queryService'
import industryService from '../../services/industryService'
import productService from '../../services/productService'
import areaService from '../../services/areaService'
import subZoneService from '../../services/subZoneService'
import queryNewProductService from '../../services/queryNewProductService'
import documentService from '../../services/documentService'
import { useAuth } from '../../context/AuthContext'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'
import { getAssetsUrl, getAssetsBaseUrl, DOCUMENTS } from '../../api/endpoints'
import FindProductModal from './FindProductModal'

const INITIAL_COMPANY = {
  name: '',
  area: '',
  subZoneId: '',
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
  quantity: '',
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

const STEPS = [
  { id: 1, label: 'Company Information' },
  { id: 2, label: 'Products' },
  { id: 3, label: 'Preview' },
]

const DRAFT_STORAGE_KEY = 'migticrm_query_draft'
const MAX_PRODUCT_IMAGES = 3

const QueryForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(1)

  // Company section – industry search & snapshot (stored in query, editable)
  const [industrySearch, setIndustrySearch] = useState('')
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false)
  const [industrySearchResults, setIndustrySearchResults] = useState([])
  const [industrySearchLoading, setIndustrySearchLoading] = useState(false)
  const [industryId, setIndustryId] = useState(null)
  const [companyInfo, setCompanyInfo] = useState(INITIAL_COMPANY)
  const [areas, setAreas] = useState([])
  const [querySubZones, setQuerySubZones] = useState([])
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

  const quantityInputRef = useRef(null)
  const [imagesModal, setImagesModal] = useState({ visible: false, images: [] })
  const [productImageFiles, setProductImageFiles] = useState([])
  const [productImagePreviews, setProductImagePreviews] = useState([])
  const [addingProductToQuery, setAddingProductToQuery] = useState(false)

  const getAreaId = (area) => (typeof area === 'object' ? area?._id : area) || ''

  const getSubZoneId = (sz) => (typeof sz === 'object' ? sz?._id : sz) || ''

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const aid = companyInfo.area
      if (!aid) {
        setQuerySubZones([])
        return
      }
      try {
        const res = await subZoneService.listByZone(aid)
        const data = res?.data?.data || res?.data || res
        const list = data?.subZones || []
        if (!cancelled) setQuerySubZones(list || [])
      } catch {
        if (!cancelled) setQuerySubZones([])
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [companyInfo.area])

  const goToStep = (step) => {
    if (step < 1 || step > STEPS.length) return
    setCurrentStep(step)
  }

  // Load draft from localStorage for new query (not edit)
  useEffect(() => {
    if (isEdit) return
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft.companyInfo) setCompanyInfo(draft.companyInfo)
      if (draft.industryId) setIndustryId(draft.industryId)
      if (typeof draft.currentStep === 'number') setCurrentStep(draft.currentStep)
      if (typeof draft.industrySearch === 'string') setIndustrySearch(draft.industrySearch)
      if (Array.isArray(draft.products)) setProducts(draft.products)
    } catch {
      // ignore corrupt draft
    }
  }, [isEdit])

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

  // Auto-save draft to localStorage whenever relevant state changes (for new query only)
  useEffect(() => {
    if (isEdit) return
    try {
      const draft = {
        companyInfo,
        industryId,
        industrySearch,
        products,
        currentStep,
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // ignore storage errors
    }
  }, [companyInfo, industryId, industrySearch, products, currentStep, isEdit])

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
        subZoneId: getSubZoneId(data?.subZoneId) || '',
        location: data?.location || '',
        address: data?.address || '',
        purchaseManagers: mapPurchaseManagers(data?.purchaseManagers),
      })
    } catch {
      setCompanyInfo({
        name: industry?.name || '',
        area: getAreaId(industry?.area) || '',
        subZoneId: getSubZoneId(industry?.subZoneId) || '',
        location: industry?.location || '',
        address: industry?.address || '',
        purchaseManagers: mapPurchaseManagers(industry?.purchaseManagers),
      })
    }
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }, 200)
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
    const baseProductCode = p.productCode || ''
    const productName = p?.name || ''
    const unit = (p?.unit && String(p.unit).trim()) || 'pcs'
    const baseImages = (p.images || []).map((img) => {
      if (typeof img === 'object' && img?._id) return img._id
      if (typeof img === 'string' && /^[a-fA-F0-9]{24}$/.test(img)) return img
      return null
    }).filter(Boolean)

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
            description: p?.shortDescription || '',
            product_id: pid,
            productCode: baseProductCode,
            isNewProduct: false,
            images: baseImages,
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
          description: p?.shortDescription || '',
          product_id: pid,
          productCode: baseProductCode,
          isNewProduct: false,
          images: baseImages,
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
            description: p?.shortDescription || '',
            product_id: pid,
            productCode: baseProductCode,
            isNewProduct: false,
            images: baseImages,
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
          description: p?.shortDescription || '',
          product_id: pid,
          productCode: baseProductCode,
          isNewProduct: false,
          images: baseImages,
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
        description: p?.shortDescription || '',
        product_id: pid,
        productCode: baseProductCode,
        isNewProduct: false,
        images: baseImages,
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
    productImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url)
      } catch {}
    })
    setProductImagePreviews([])
    setProductImageFiles([])
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
      description: first.description || '',
      product_id: first.product_id || null,
      productCode: first.productCode || '',
      isNewProduct: false,
      images: first.images || [],
    })
    setEditingProductIndex(null)
    setProductSearch('')
    setProductDropdownOpen(false)
    setProductSearchResults([])
    setTimeout(() => {
      if (quantityInputRef.current) {
        quantityInputRef.current.focus()
      }
    }, 0)
  }

  const saveProduct = async () => {
    if (!formProduct.productName?.trim()) {
      toastError('Product name is required')
      return
    }
    if (
      formProduct.quantity === '' ||
      formProduct.quantity === null ||
      Number.isNaN(Number(formProduct.quantity))
    ) {
      toastError('Quantity is required')
      return
    }

    setAddingProductToQuery(true)
    try {
      let uploadedDocs = []
      if (productImageFiles.length > 0) {
        try {
          const res = await documentService.uploadImages(productImageFiles)
          const payload = res?.data || res
          const docs = payload?.data?.documents || payload?.documents || []
          uploadedDocs = docs.map((d) => ({
            _id: d._id || d.id,
            path: d.path || d.url || '',
          }))
        } catch (err) {
          toastError(err?.message || 'Failed to upload images')
          return
        }
      }

      if (formProduct.isNewProduct && !formProduct.productCode) {
        try {
          const newPayload = {
            name: (formProduct.productName || '').trim(),
            unit: (formProduct.unit || '').trim(),
            hsnNumber: (formProduct.hsnNumber || '').trim(),
            modelNumber: (formProduct.modelNumber || '').trim(),
            variants: (formProduct.variants || [])
              .map((v) => (v.variantName || '').trim())
              .filter(Boolean),
            images: uploadedDocs.map((d) => d._id),
          }
          if (newPayload.name) {
            await queryNewProductService.create(newPayload)
          }
        } catch (err) {
          toastError(err?.message || 'Failed to save new product')
          return
        }
      }

      const mergedImages = ((formProduct.images || []).concat(uploadedDocs)).slice(0, MAX_PRODUCT_IMAGES)
      const cleanedVariants = (formProduct.variants || [])
        .map((v) => ({ variantName: (v?.variantName || '').trim() }))
        .filter((v) => v.variantName)

      const productsToAdd =
        cleanedVariants.length > 0
          ? cleanedVariants.map((variant) => ({
              ...formProduct,
              variants: [{ ...variant }],
              images: mergedImages,
            }))
          : [
              {
                ...formProduct,
                images: mergedImages,
              },
            ]

      setProducts((prev) => [...prev, ...productsToAdd])
      clearProductForm()
      toastSuccess(
        productsToAdd.length > 1
          ? `${productsToAdd.length} products added to list (one per variant)`
          : 'Product added to list',
      )
    } finally {
      setAddingProductToQuery(false)
    }
  }

  const updateProductInList = async () => {
    if (editingProductIndex == null || !formProduct.productName?.trim()) {
      if (!formProduct.productName?.trim()) toastError('Product name is required')
      return
    }
    if (
      formProduct.quantity === '' ||
      formProduct.quantity === null ||
      Number.isNaN(Number(formProduct.quantity))
    ) {
      toastError('Quantity is required')
      return
    }
    let uploadedDocs = []
    if (productImageFiles.length > 0) {
      try {
        const res = await documentService.uploadImages(productImageFiles)
        const payload = res?.data || res
        const docs = payload?.data?.documents || payload?.documents || []
        uploadedDocs = docs.map((d) => ({
          _id: d._id || d.id,
          path: d.path || d.url || '',
        }))
      } catch (err) {
        toastError(err?.message || 'Failed to upload images')
      }
    }

    const updatedProduct = {
      ...formProduct,
      images: (formProduct.images || []).concat(uploadedDocs).slice(0, MAX_PRODUCT_IMAGES),
    }

    setProducts((prev) => {
      const next = [...prev]
      next[editingProductIndex] = updatedProduct
      return next
    })
    clearProductForm()
    toastSuccess('Product updated')
  }

  const editProductFromTable = (index) => {
    const p = products[index]
    productImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url)
      } catch {}
    })
    setProductImagePreviews([])
    setProductImageFiles([])
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
      description: p.description || '',
      product_id: p.product_id || null,
      productCode: p.productCode || '',
      isNewProduct: p.isNewProduct ?? !p.productCode,
      images: p.images || [],
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

  const removeSelectedUploadImage = (index) => {
    setProductImageFiles((prev) => prev.filter((_, i) => i !== index))
    setProductImagePreviews((prev) => {
      const urlToRemove = prev[index]
      if (urlToRemove) {
        try {
          URL.revokeObjectURL(urlToRemove)
        } catch {
          // ignore revoke errors
        }
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const removeExistingProductImage = (index) => {
    setFormProduct((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }))
  }

  const getImageDisplayUrl = (img) => {
    if (!img) return ''
    if (typeof img === 'string') {
      if (/^[a-fA-F0-9]{24}$/.test(img)) return `${getAssetsBaseUrl()}${DOCUMENTS.SERVE(img)}`
      return getAssetsUrl(img)
    }
    if (img.path || img.url) return getAssetsUrl(img.path || img.url)
    if (img._id && /^[a-fA-F0-9]{24}$/.test(String(img._id))) {
      return `${getAssetsBaseUrl()}${DOCUMENTS.SERVE(String(img._id))}`
    }
    return ''
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
        if (q.status === 'closed') {
          toastError('This query is closed and cannot be edited')
          navigate(`/queries/${id}`)
          return
        }

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
          subZoneId: (ci.subZoneId && String(ci.subZoneId).trim()) || '',
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
              description: p.description || '',
              product_id: p.product_id?._id || p.product_id || null,
              productCode: p.productCode || '',
              isNewProduct: p.isNewProduct ?? !p.productCode,
              images: Array.isArray(p.images) ? p.images : [],
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
  }, [id, isEdit, navigate])

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

  const handleNextFromCompany = () => {
    if (!companyInfo?.name?.trim()) {
      toastError('Company / Client name is required')
      return
    }
    if ((companyInfo.name || '').length > 100) {
      toastError('Company name must be at most 100 characters')
      return
    }
    const managers = companyInfo?.purchaseManagers || []
    for (const m of managers) {
      if ((m?.name || '').length > 100) {
        toastError('Purchase manager name must be at most 100 characters')
        return
      }
      const pm = (m?.phone || '').trim()
      if (pm && !/^\d{10}$/.test(pm)) {
        toastError(`Purchase manager "${m?.name || 'Unknown'}" phone must be exactly 10 digits`)
        return
      }
    }
    if ((companyInfo.address || '').length > 500) {
      toastError('Address must be at most 500 characters')
      return
    }
    goToStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNextFromProducts = () => {
    const validProducts = products.filter((p) => (p.productName || '').trim())
    if (validProducts.length === 0) {
      toastError('Add at least one product using the form above and click Save')
      return
    }
    goToStep(3)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openImagesModal = (product) => {
    const urls = (product?.images || [])
      .map((img) => (typeof img === 'string' ? img : img?.path || ''))
      .filter(Boolean)
    if (!urls.length) return
    setImagesModal({ visible: true, images: urls })
  }

  const renderProductImagesCell = (p) => {
    const imgs = Array.isArray(p?.images) ? p.images : []
    if (imgs.length === 0) return '–'
    const displayUrl = (img) =>
      getAssetsUrl(typeof img === 'string' ? img : img?.path || '')
    return (
      <div
        role="button"
        tabIndex={0}
        className="d-inline-flex align-items-center gap-1 flex-wrap"
        style={{ cursor: 'pointer', maxWidth: 140 }}
        onClick={() => openImagesModal(p)}
        onKeyDown={(e) => e.key === 'Enter' && openImagesModal(p)}
        aria-label={`View ${imgs.length} image(s)`}
      >
        {imgs.slice(0, 2).map((img, idx) => (
          <div
            key={idx}
            className="rounded overflow-hidden border flex-shrink-0"
            style={{ width: 36, height: 36 }}
          >
            <CImage
              src={displayUrl(img)}
              alt=""
              className="w-100 h-100"
              style={{ objectFit: 'cover' }}
            />
          </div>
        ))}
        {imgs.length > 2 && (
          <div
            className="d-flex align-items-center justify-content-center rounded border bg-light flex-shrink-0 text-primary small fw-bold"
            style={{ width: 36, height: 36, fontSize: '0.75rem' }}
          >
            +{imgs.length - 2}
          </div>
        )}
      </div>
    )
  }

  const getAreaLabel = () => {
    const areaId = companyInfo.area
    if (!areaId) return ''
    const match = areas.find((a) => (a._id || a.id) === areaId)
    if (!match) return ''
    return `${match.name}${match.city ? ` - ${match.city}` : ''}`
  }

  const getSubZoneLabel = () => {
    const sid = companyInfo.subZoneId
    if (!sid) return ''
    const match = querySubZones.find((s) => String(s._id || s.id) === String(sid))
    if (!match) return sid
    return `${match.subZoneCode ? `${match.subZoneCode} — ` : ''}${match.name || ''}`
  }

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return 'completed'
    if (stepId === currentStep) return 'active'
    return 'upcoming'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!companyInfo?.name?.trim()) {
      toastError('Company / Client name is required')
      return
    }
    if ((companyInfo.name || '').length > 100) {
      toastError('Company name must be at most 100 characters')
      return
    }
    const managers = companyInfo?.purchaseManagers || []
    for (const m of managers) {
      if ((m?.name || '').length > 100) {
        toastError('Purchase manager name must be at most 100 characters')
        return
      }
      const pm = (m?.phone || '').trim()
      if (pm && !/^\d{10}$/.test(pm)) {
        toastError(`Purchase manager "${m?.name || 'Unknown'}" phone must be exactly 10 digits`)
        return
      }
    }
    if ((companyInfo.address || '').length > 500) {
      toastError('Address must be at most 500 characters')
      return
    }
    const validProducts = products.filter((p) => (p.productName || '').trim())
    if (validProducts.length === 0) {
      toastError('Add at least one product using the form above and click Save')
      return
    }
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      const qty = Number(p.quantity)
      if (Number.isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
        toastError(`Product "${(p.productName || '').trim() || i + 1}": quantity must be a whole number 0 or more`)
        return
      }
      const gst = p.gstPercentage
      if (gst != null && (typeof gst !== 'number' || gst < 0 || gst > 100)) {
        toastError(`Product "${(p.productName || '').trim() || i + 1}": GST % must be between 0 and 100`)
        return
      }
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        companyInfo: {
          ...companyInfo,
          area: companyInfo.area || '',
          subZoneId: companyInfo.subZoneId || '',
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
            description: p.description?.trim() || '',
            product_id: p.product_id || null,
            images: (p.images || []).map((img) => {
              if (typeof img === 'object' && img?._id) return img._id
              if (typeof img === 'string' && /^[a-fA-F0-9]{24}$/.test(img)) return img
              return null
            }).filter(Boolean),
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
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
      } catch {}
      navigate('/queries')
    } catch (err) {
      toastError(err?.message || 'Failed to save query')
      setError(err?.message || 'Failed to save query')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {}
    navigate('/queries')
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

      <div
        className="mb-4 sticky-top"
        style={{ top: 0, zIndex: 1040, backgroundColor: '#f8f9fa' }}
      >
        <CCard>
          <CCardBody>
            <div className="d-flex justify-content-between align-items-center mb-3">
              {STEPS.map((step) => {
                const status = getStepStatus(step.id)
                const isCompleted = status === 'completed'
                const isActive = status === 'active'
                const isProductsStep = step.id === 2
                return (
                  <div key={step.id} className="text-center flex-fill">
                    <div
                      className={`d-inline-flex align-items-center justify-content-center rounded-circle border ${
                        isCompleted
                          ? 'bg-success text-white border-success'
                          : isActive
                          ? 'bg-primary text-white border-primary'
                          : 'bg-light text-muted border-secondary'
                      }`}
                      style={{ width: 36, height: 36 }}
                    >
                      {isCompleted ? <CIcon icon={cilCheckCircle} /> : step.id}
                    </div>
                    <div className="mt-2 small fw-semibold d-flex justify-content-center align-items-center gap-1">
                      <span>{step.label}</span>
                      {isProductsStep && (
                        <CBadge color="primary" className="ms-1">
                          {products.length}
                        </CBadge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <CProgress thin color="primary">
              <CProgressBar value={((currentStep - 1) / (STEPS.length - 1 || 1)) * 100} />
            </CProgress>
          </CCardBody>
        </CCard>
      </div>

      <CForm onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <>
            {/* 1. Company Information */}
            <CCard className="mb-4">
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>1. Company Information</strong>
                {!isEdit && (
                  <CButton
                    color="secondary"
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem(DRAFT_STORAGE_KEY)
                      } catch {
                        // ignore
                      }
                      setCompanyInfo({ ...INITIAL_COMPANY })
                      setIndustryId(null)
                      setIndustrySearch('')
                      setProducts([])
                      setCurrentStep(1)
                      toastSuccess('Saved query form data cleared')
                    }}
                  >
                    Clear saved data
                  </CButton>
                )}
              </CCardHeader>
              <CCardBody>
                <div className="mb-3 position-relative" ref={companyDropdownRef}>
                  <CFormLabel>Client / Company name (search & select)</CFormLabel>
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
                        {!industrySearchLoading &&
                          industrySearchResults.length === 0 &&
                          industrySearch.trim() && (
                            <CListGroupItem className="text-muted">
                              No matches. Enter details manually below.
                            </CListGroupItem>
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

                <CFormLabel className="mt-3">
                  Editable company details (stored in query only)
                </CFormLabel>
                <CRow>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>Company name (max 100 characters)</CFormLabel>
                      <CFormInput
                        value={companyInfo.name}
                        onChange={(e) =>
                          setCompanyInfo((c) => ({ ...c, name: e.target.value.slice(0, 100) }))
                        }
                        placeholder="Company / Client name"
                        maxLength={100}
                      />
                      <div className="form-text text-muted small">
                        {(companyInfo.name || '').length}/100
                      </div>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>Zone</CFormLabel>
                      <CFormSelect
                        value={companyInfo.area}
                        onChange={(e) =>
                          setCompanyInfo((c) => ({
                            ...c,
                            area: e.target.value,
                            subZoneId: '',
                          }))
                        }
                      >
                        <option value="">Select zone</option>
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
                      <CFormLabel>Sub-zone</CFormLabel>
                      <CFormSelect
                        value={companyInfo.subZoneId || ''}
                        onChange={(e) =>
                          setCompanyInfo((c) => ({ ...c, subZoneId: e.target.value }))
                        }
                        disabled={!companyInfo.area || querySubZones.length === 0}
                      >
                        <option value="">
                          {!companyInfo.area
                            ? 'Select a zone first'
                            : querySubZones.length === 0
                              ? 'No sub-zones (optional)'
                              : 'Optional'}
                        </option>
                        {querySubZones.map((sz) => {
                          const sid = sz._id || sz.id
                          return (
                            <option key={sid} value={sid}>
                              {(sz.subZoneCode ? `${sz.subZoneCode} — ` : '') + (sz.name || '')}
                            </option>
                          )
                        })}
                      </CFormSelect>
                    </div>
                  </CCol>
                </CRow>
                <CRow>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>Location URL</CFormLabel>
                      <CFormInput
                        value={companyInfo.location}
                        onChange={(e) =>
                          setCompanyInfo((c) => ({ ...c, location: e.target.value }))
                        }
                        placeholder="Location URL"
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
                          purchaseManagers: [
                            ...(c.purchaseManagers || []),
                            { name: '', phone: '', email: '' },
                          ],
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
                                  next[idx] = { ...next[idx], name: e.target.value.slice(0, 100) }
                                  return { ...c, purchaseManagers: next }
                                })
                              }
                              placeholder="Name (max 100)"
                              maxLength={100}
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
                                  purchaseManagers: (c.purchaseManagers || []).filter(
                                    (_, i) => i !== idx,
                                  ),
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
                    <p className="text-muted small mb-0">
                      Click &quot;Add purchase manager&quot; to add contact(s). Or select an
                      industry to load from.
                    </p>
                  )}
                </div>
                <CRow>
                  <CCol xs={12}>
                    <div className="mb-3">
                      <CFormLabel>Address (max 500 characters)</CFormLabel>
                      <CFormTextarea
                        rows={2}
                        value={companyInfo.address}
                        onChange={(e) =>
                          setCompanyInfo((c) => ({ ...c, address: e.target.value.slice(0, 500) }))
                        }
                        placeholder="Address"
                        maxLength={500}
                      />
                      <div className="form-text text-muted small">
                        {(companyInfo.address || '').length}/500
                      </div>
                    </div>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
            <div className="d-flex justify-content-end mb-4">
              <CButton color="warning" type="button" onClick={handleNextFromCompany}>
                Next: Products
              </CButton>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
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
                <CCard className="mb-4 position-relative">
                  {addingProductToQuery && (
                    <div
                      className="position-absolute top-0 start-0 end-0 bottom-0 rounded d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                      style={{ zIndex: 10 }}
                      aria-hidden="true"
                    />
                  )}
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
                        {productDropdownOpen &&
                          (productSearchResults?.length > 0 || productSearchLoading) && (
                            <div
                              className="position-absolute w-100 bg-white border rounded mt-1 shadow-sm"
                              style={{ zIndex: 10, maxHeight: 220, overflowY: 'auto' }}
                            >
                              <CListGroup flush>
                                {productSearchLoading && (
                                  <CListGroupItem className="text-muted">
                                    Searching...
                                  </CListGroupItem>
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
                                      {pr.sku && (
                                        <div className="text-muted small">SKU: {pr.sku}</div>
                                      )}
                                      {pr.shortDescription && (
                                        <div className="text-muted small mt-1">
                                          {pr.shortDescription}
                                        </div>
                                      )}
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
                              <CButton
                                color="secondary"
                                size="sm"
                                variant="ghost"
                                onClick={clearSelectedProductForImport}
                              >
                                Clear
                              </CButton>
                              <CButton
                                color="primary"
                                size="sm"
                                onClick={handleImportSelectedVariants}
                              >
                                Import
                              </CButton>
                            </div>
                          </div>
                          <div className="mb-2">
                            <CFormLabel className="mb-1 small">
                              Search variants (local filter)
                            </CFormLabel>
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
                            const hasCombos =
                              p?.hasVariants && (p?.variantCombinations?.length > 0)
                            const combos = p?.variantCombinations || []
                            const variantOpts = getVariantOptions(p)
                            const hasVariantOpts = variantOpts.length > 0

                            const search = (variantSearch || '').trim().toLowerCase()
                            const filteredCombos = hasCombos
                              ? combos.filter(
                                  (c) =>
                                    !search ||
                                    getVariantComboDisplay(c)
                                      .toLowerCase()
                                      .includes(search),
                                )
                              : []
                            const filteredVariantOpts = hasVariantOpts
                              ? variantOpts.filter(
                                  (o) =>
                                    !search ||
                                    (o.label || '').toLowerCase().includes(search),
                                )
                              : []

                            if (hasCombos) {
                              const comboSet = selectedVariantComboIds
                              const allComboIds = filteredCombos
                                .map((c) => c.uniqueId || c._id)
                                .filter(Boolean)
                              const allSelected =
                                allComboIds.length > 0 &&
                                allComboIds.every((uid) => comboSet.has(uid))
                              return (
                                <>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <CFormLabel className="mb-0">
                                      Select variant combination(s) to import
                                    </CFormLabel>
                                    <CFormCheck
                                      type="checkbox"
                                      label="Select all"
                                      checked={allSelected}
                                      onChange={() => toggleAllVariantCombos(combos)}
                                    />
                                  </div>
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(3, 1fr)',
                                      gap: '0.35rem 1rem',
                                    }}
                                  >
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
                                          <span className="form-check-label">
                                            {getVariantComboDisplay(c)}
                                          </span>
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
                              const allSelected =
                                allKeys.length > 0 &&
                                allKeys.every((k) => optionSet.has(k))
                              return (
                                <>
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <CFormLabel className="mb-0">
                                      Select variant(s) to import
                                    </CFormLabel>
                                    <CFormCheck
                                      type="checkbox"
                                      label="Select all"
                                      checked={allSelected}
                                      onChange={() => toggleAllVariantOptions(variantOpts)}
                                    />
                                  </div>
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(3, 1fr)',
                                      gap: '0.35rem 1rem',
                                    }}
                                  >
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
                                          <span className="form-check-label">
                                            {o.label}
                                          </span>
                                        </label>
                                      )
                                    })}
                                  </div>
                                </>
                              )
                            }
                            return (
                              <p className="mb-0 text-muted small">
                                This product has no variants. Click Import to add it as one
                                product.
                              </p>
                            )
                          })()}
                        </div>
                      )}
                    </div>

                    <CRow>
                      <CCol md={4}>
                        <div className="mb-3">
                          <CFormLabel>Product name</CFormLabel>
                          <CFormInput
                            value={formProduct.productName}
                            onChange={(e) => updateFormProduct('productName', e.target.value)}
                            placeholder="Product name"
                          />
                        </div>
                      </CCol>
                      <CCol md={3}>
                        <div className="mb-3">
                          <CFormLabel>Quantity (number)</CFormLabel>
                          <CFormInput
                            type="number"
                            min={0}
                            value={formProduct.quantity}
                            onChange={(e) => updateFormProduct('quantity', e.target.value)}
                            placeholder="Quantity"
                            required
                            ref={quantityInputRef}
                          />
                        </div>
                      </CCol>
                      <CCol md={3}>
                        <div className="mb-3">
                          <CFormLabel>Unit</CFormLabel>
                          <CFormInput
                            value={formProduct.unit || ''}
                            onChange={(e) => updateFormProduct('unit', e.target.value)}
                            placeholder="pcs, kg, etc."
                          />
                        </div>
                      </CCol>
                      <CCol md={2}>
                        <div className="mb-3">
                          <CFormLabel>New product</CFormLabel>
                          <div
                            className="d-inline-flex align-items-center"
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                              updateFormProduct('isNewProduct', !formProduct.isNewProduct)
                            }
                          >
                            <CFormCheck
                              id="new-product-check"
                              checked={!!formProduct.isNewProduct}
                              onChange={(e) =>
                                updateFormProduct('isNewProduct', e.target.checked)
                              }
                              label="Mark as new"
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </CCol>
                    </CRow>
                    {formProduct.productCode && (
                      <CRow className="mb-2">
                        <CCol md={4}>
                          <div className="mb-3">
                            <CFormLabel>Product code</CFormLabel>
                            <CFormInput
                              value={formProduct.productCode}
                              disabled
                              readOnly
                            />
                          </div>
                        </CCol>
                      </CRow>
                    )}
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
                                onChange={(e) =>
                                  updateVariant(vIdx, 'variantName', e.target.value)
                                }
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
                        <p className="text-muted small mb-0">
                          No variants. Click &quot;Add variant&quot; to add.
                        </p>
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
                    <div className="mb-3">
                      <CFormLabel>Product description</CFormLabel>
                      <CFormTextarea
                        rows={2}
                        value={formProduct.description}
                        onChange={(e) => updateFormProduct('description', e.target.value)}
                        placeholder="Product description (e.g. from catalog)"
                      />
                    </div>
                    <div className="mb-3">
                      <CFormLabel>Images (optional)</CFormLabel>
                      <CFormInput
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          if (!files.length) return
                          const existingCount = Array.isArray(formProduct.images)
                            ? formProduct.images.length
                            : 0
                          const remainingSlots =
                            MAX_PRODUCT_IMAGES - existingCount - productImageFiles.length

                          if (remainingSlots <= 0) {
                            toastError(`Only ${MAX_PRODUCT_IMAGES} images allowed per product`)
                            e.target.value = ''
                            return
                          }

                          const acceptedFiles = files.slice(0, remainingSlots)
                          if (acceptedFiles.length < files.length) {
                            toastError(
                              `Only ${MAX_PRODUCT_IMAGES} images allowed. Extra images were ignored.`,
                            )
                          }

                          setProductImageFiles((prev) => [...prev, ...acceptedFiles])
                          const previews = acceptedFiles.map((file) => URL.createObjectURL(file))
                          setProductImagePreviews((prev) => [...prev, ...previews])
                          e.target.value = ''
                        }}
                      />
                      {Array.isArray(formProduct.images) && formProduct.images.length > 0 && (
                        <div className="mt-2">
                          <div className="small text-muted mb-1">Existing images</div>
                          <div className="d-flex flex-wrap gap-2">
                            {formProduct.images.map((img, idx) => {
                              const imageUrl = getImageDisplayUrl(img)
                              if (!imageUrl) return null
                              return (
                                <div
                                  key={`existing-${idx}`}
                                  className="position-relative border rounded overflow-hidden"
                                  style={{ width: 64, height: 64 }}
                                >
                                  <CImage
                                    src={imageUrl}
                                    alt={`Existing ${idx + 1}`}
                                    width={64}
                                    height={64}
                                    className="w-100 h-100"
                                    style={{ objectFit: 'cover' }}
                                  />
                                  <CButton
                                    color="danger"
                                    size="sm"
                                    shape="rounded-pill"
                                    className="position-absolute d-flex align-items-center justify-content-center p-0"
                                    style={{ top: 2, right: 2, width: 18, height: 18, minWidth: 18 }}
                                    onClick={() => removeExistingProductImage(idx)}
                                    title="Remove existing image"
                                    type="button"
                                  >
                                    <CIcon icon={cilX} size="sm" />
                                  </CButton>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {productImagePreviews.length > 0 && (
                        <div className="mt-2">
                          <div className="small text-muted mb-1">New uploads</div>
                          <div className="d-flex flex-wrap gap-2">
                            {productImagePreviews.map((src, idx) => (
                              <div
                                key={idx}
                                className="position-relative border rounded overflow-hidden"
                                style={{ width: 64, height: 64 }}
                              >
                                <CImage
                                  src={src}
                                  alt={`Preview ${idx + 1}`}
                                  width={64}
                                  height={64}
                                  className="w-100 h-100"
                                  style={{ objectFit: 'cover' }}
                                />
                                <CButton
                                  color="danger"
                                  size="sm"
                                  shape="rounded-pill"
                                  className="position-absolute d-flex align-items-center justify-content-center p-0"
                                  style={{ top: 2, right: 2, width: 18, height: 18, minWidth: 18 }}
                                  onClick={() => removeSelectedUploadImage(idx)}
                                  title="Remove image"
                                  type="button"
                                >
                                  <CIcon icon={cilX} size="sm" />
                                </CButton>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="form-text">
                        {Math.min(
                          MAX_PRODUCT_IMAGES,
                          (formProduct.images || []).length + productImageFiles.length,
                        )}
                        /{MAX_PRODUCT_IMAGES} images selected
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      {editingProductIndex != null ? (
                        <CButton color="primary" type="button" onClick={updateProductInList} disabled={addingProductToQuery}>
                          Update
                        </CButton>
                      ) : (
                        <CButton color="primary" type="button" onClick={saveProduct} disabled={addingProductToQuery}>
                          {addingProductToQuery ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Adding...
                            </>
                          ) : (
                            'Add Product to Query'
                          )}
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
                    <p className="text-muted small mb-0">
                      No products added yet. Fill the form above and click Save to add.
                    </p>
                  ) : (
                    <CTable responsive hover bordered>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>S.No.</CTableHeaderCell>
                          <CTableHeaderCell>Product name</CTableHeaderCell>
                          <CTableHeaderCell>Quantity</CTableHeaderCell>
                          <CTableHeaderCell>Unit</CTableHeaderCell>
                          <CTableHeaderCell>Variants</CTableHeaderCell>
                          <CTableHeaderCell>HSN Number</CTableHeaderCell>
                          <CTableHeaderCell>GST %</CTableHeaderCell>
                          <CTableHeaderCell>Description</CTableHeaderCell>
                          <CTableHeaderCell>Remark</CTableHeaderCell>
                          <CTableHeaderCell>Images</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {products.map((p, index) => (
                          <CTableRow key={index}>
                            <CTableDataCell>{index + 1}</CTableDataCell>
                            <CTableDataCell>{p.productName || '–'}</CTableDataCell>
                            <CTableDataCell>{p.quantity ?? '–'}</CTableDataCell>
                            <CTableDataCell>{p.unit || '–'}</CTableDataCell>
                            <CTableDataCell>
                              {(p.variants || []).length > 0
                                ? (p.variants || [])
                                    .map((v) => v.variantName || '–')
                                    .join(', ')
                                : '–'}
                            </CTableDataCell>
                            <CTableDataCell className="small">
                              {p.hsnNumber || '–'}
                            </CTableDataCell>
                            <CTableDataCell className="small">
                              {typeof p.gstPercentage === 'number'
                                ? `${p.gstPercentage}%`
                                : '–'}
                            </CTableDataCell>
                            <CTableDataCell>
                              {(p.description || '').slice(0, 40)}
                              {(p.description || '').length > 40 ? '…' : ''}
                            </CTableDataCell>
                            <CTableDataCell>
                              {(p.remark || '').slice(0, 40)}
                              {(p.remark || '').length > 40 ? '…' : ''}
                            </CTableDataCell>
                            <CTableDataCell>
                              {renderProductImagesCell(p)}
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

            <div className="d-flex justify-content-between mb-4">
              <CButton color="secondary" type="button" onClick={() => goToStep(1)}>
                Back to Company
              </CButton>
              <CButton color="warning" type="button" onClick={handleNextFromProducts}>
                Next: Preview
              </CButton>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            {/* 3. Preview */}
            <CCard className="mb-4">
              <CCardHeader>
                <strong>3. Preview</strong>
              </CCardHeader>
              <CCardBody>
                <CAlert color="info" className="mb-4">
                  Review the company information and products. This screen is read-only. Use
                  the Back buttons to edit before saving the query.
                </CAlert>

                <h6 className="mb-3">Company Information</h6>
                <CCard className="mb-3">
                  <CCardBody>
                    <CRow className="mb-3">
                      <CCol md={6}>
                        <div className="mb-2">
                          <strong>Client / Company</strong>
                          <div>{industrySearch || companyInfo.name || '–'}</div>
                        </div>
                      </CCol>
                      <CCol md={6}>
                        <div className="mb-2">
                          <strong>Zone</strong>
                          <div>{getAreaLabel() || '–'}</div>
                        </div>
                      </CCol>
                    </CRow>
                    <CRow className="mb-3">
                      <CCol md={6}>
                        <div className="mb-2">
                          <strong>Sub-zone</strong>
                          <div>{getSubZoneLabel() || '–'}</div>
                        </div>
                      </CCol>
                    </CRow>
                    <CRow>
                      <CCol md={6}>
                        <div className="mb-2">
                          <strong>Location URL</strong>
                          <div>{companyInfo.location || '–'}</div>
                        </div>
                      </CCol>
                      <CCol md={6}>
                        <div className="mb-2">
                          <strong>Address</strong>
                          <div>{companyInfo.address || '–'}</div>
                        </div>
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard>

                <div className="mb-4">
                  <strong>Purchase Managers</strong>
                  {(companyInfo.purchaseManagers || []).length === 0 ? (
                    <p className="text-muted small mb-0">No purchase managers added.</p>
                  ) : (
                    <CTable responsive size="sm" bordered className="mt-2">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Name</CTableHeaderCell>
                          <CTableHeaderCell>Phone</CTableHeaderCell>
                          <CTableHeaderCell>Email</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {(companyInfo.purchaseManagers || []).map((m, idx) => (
                          <CTableRow key={idx}>
                            <CTableDataCell>{m.name || '–'}</CTableDataCell>
                            <CTableDataCell>{m.phone || '–'}</CTableDataCell>
                            <CTableDataCell>{m.email || '–'}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
                </div>

                <h6 className="mb-3">Products</h6>
                {products.length === 0 ? (
                  <p className="text-muted small mb-0">
                    No products added. Go back to add at least one product.
                  </p>
                ) : (
                  <CTable responsive hover bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S.No.</CTableHeaderCell>
                        <CTableHeaderCell>Product name</CTableHeaderCell>
                        <CTableHeaderCell>Quantity</CTableHeaderCell>
                        <CTableHeaderCell>Unit</CTableHeaderCell>
                        <CTableHeaderCell>Variants</CTableHeaderCell>
                        <CTableHeaderCell>HSN Number</CTableHeaderCell>
                        <CTableHeaderCell>GST %</CTableHeaderCell>
                        <CTableHeaderCell>Description</CTableHeaderCell>
                        <CTableHeaderCell>Remark</CTableHeaderCell>
                        <CTableHeaderCell>Images</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {products.map((p, index) => (
                        <CTableRow key={index}>
                          <CTableDataCell>{index + 1}</CTableDataCell>
                          <CTableDataCell>{p.productName || '–'}</CTableDataCell>
                          <CTableDataCell>{p.quantity ?? '–'}</CTableDataCell>
                          <CTableDataCell>{p.unit || '–'}</CTableDataCell>
                          <CTableDataCell>
                            {(p.variants || []).length > 0
                              ? (p.variants || [])
                                  .map((v) => v.variantName || '–')
                                  .join(', ')
                              : '–'}
                          </CTableDataCell>
                          <CTableDataCell className="small">
                            {p.hsnNumber || '–'}
                          </CTableDataCell>
                          <CTableDataCell className="small">
                            {typeof p.gstPercentage === 'number'
                              ? `${p.gstPercentage}%`
                              : '–'}
                          </CTableDataCell>
                          <CTableDataCell>
                            {(p.description || '').slice(0, 80)}
                            {(p.description || '').length > 80 ? '…' : ''}
                          </CTableDataCell>
                          <CTableDataCell>
                            {(p.remark || '').slice(0, 80)}
                            {(p.remark || '').length > 80 ? '…' : ''}
                          </CTableDataCell>
                          <CTableDataCell>
                            {renderProductImagesCell(p)}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </CCardBody>
            </CCard>

            <div className="d-flex justify-content-between mb-4">
              <CButton color="secondary" type="button" onClick={() => goToStep(2)}>
                Back to Products
              </CButton>
            </div>
          </>
        )}

        <CCard className="mb-4">
          <CCardBody className="d-flex justify-content-end gap-2">
            <CButton color="secondary" type="button" onClick={handleCancel}>
              Cancel
            </CButton>
            {currentStep === 3 && (
              <CButton color="primary" type="submit" disabled={submitting}>
                {submitting && <CSpinner size="sm" className="me-2" />}
                {isEdit ? 'Update Query' : 'Save Query'}
              </CButton>
            )}
          </CCardBody>
        </CCard>
      </CForm>

      <FindProductModal
        visible={showFindProductModal}
        onClose={() => setShowFindProductModal(false)}
        onImport={handleImportProducts}
      />

      <CModal
        visible={imagesModal.visible}
        onClose={() => setImagesModal({ visible: false, images: [] })}
        size="lg"
      >
        <CModalHeader closeButton>
          <CModalTitle>Product Images</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {imagesModal.images.length === 0 ? (
            <p className="text-muted mb-0">No images available.</p>
          ) : (
            <div className="d-flex flex-wrap gap-3 justify-content-start">
              {imagesModal.images.map((path, idx) => (
                <div
                  key={`${path}-${idx}`}
                  className="border rounded p-1 bg-white"
                  style={{ maxWidth: 200 }}
                >
                  <CImage
                    src={getAssetsUrl(path)}
                    alt={`Product ${idx + 1}`}
                    className="w-100"
                    style={{ objectFit: 'contain', maxHeight: 200 }}
                  />
                </div>
              ))}
            </div>
          )}
        </CModalBody>
      </CModal>
    </>
  )
}

export default QueryForm
