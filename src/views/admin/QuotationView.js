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
  CImage,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CFormCheck,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilArrowRight, cilCloudDownload, cilEnvelopeClosed, cilX } from '@coreui/icons'
import quotationService from '../../services/quotationService'
import employeeService from '../../services/employeeService'
import purchaseTaskService from '../../services/purchaseTaskService'
import areaService from '../../services/areaService'
import documentService from '../../services/documentService'
import queryNewProductService from '../../services/queryNewProductService'
import { getAssetsUrl } from '../../api/endpoints'
import { Loader } from '../../components'
import AuthImage from '../../components/AuthImage/AuthImage'
import { toastError, toastSuccess } from '../../utils/toast'
import { ROLES, ROLE_LABELS } from '../../context/AuthContext'
import QuoteLogsSidebar from './QuoteLogsSidebar'

const PURCHASE_ROLES = [ROLES.PURCHASE_MANAGER, ROLES.PURCHASE_EXICUTIVE, 'purchase_executive']

const getImageUrl = (img) => {
  if (!img) return ''
  if (typeof img === 'string') return img.startsWith('http') ? img : getAssetsUrl(img)
  if (typeof img === 'object' && img?.path) return img.path.startsWith('http') ? img.path : getAssetsUrl(img.path)
  if (typeof img === 'object' && img?.url) return img.url
  return ''
}

const getDocumentId = (img) => {
  if (!img) return null
  if (typeof img === 'object') return img._id ?? img.documentId ?? null
  return typeof img === 'string' ? img : null
}

const formatVariants = (variants) => {
  if (!variants?.length) return '–'
  return variants.map((v) => v.variantName || v || '–').filter(Boolean).join(', ')
}

const QuotationView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quotation, setQuotation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [activeTab, setActiveTab] = useState('preview')
  const [productIndex, setProductIndex] = useState(0)
  const [editingProduct, setEditingProduct] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [deleteProductModalVisible, setDeleteProductModalVisible] = useState(false)
  const [deleteProductIndex, setDeleteProductIndex] = useState(null)
  const [productListRateEdits, setProductListRateEdits] = useState({})
  const [productListGstEdits, setProductListGstEdits] = useState({})
  const [productListApplyDiscount, setProductListApplyDiscount] = useState({})
  const [productListDiscountPct, setProductListDiscountPct] = useState({})
  const [notAvailableModalVisible, setNotAvailableModalVisible] = useState(false)
  const [notAvailableModalIndex, setNotAvailableModalIndex] = useState(null)
  const [notAvailableRemark, setNotAvailableRemark] = useState('')
  const [purchaseEmployees, setPurchaseEmployees] = useState([])
  const [assignTaskSelected, setAssignTaskSelected] = useState({})
  const [assigningTask, setAssigningTask] = useState(false)
  const [assignTaskModalVisible, setAssignTaskModalVisible] = useState(false)
  const [assignTaskTargetRate, setAssignTaskTargetRate] = useState('')
  const [assignTaskDueDate, setAssignTaskDueDate] = useState('')
  const [newProductForm, setNewProductForm] = useState({
    productName: '',
    description: '',
    quantity: 1,
    unit: '',
    hsnNumber: '',
    modelNumber: '',
    gstPercentage: '',
    remark: '',
    rate: '',
  })
  const [newProductImageFiles, setNewProductImageFiles] = useState([])
  const [newProductImagePreviews, setNewProductImagePreviews] = useState([])
  const [createNewQueryProduct, setCreateNewQueryProduct] = useState(true)
  const [addingNewProduct, setAddingNewProduct] = useState(false)
  const [productListSelected, setProductListSelected] = useState({})
  const [productListAssignModalVisible, setProductListAssignModalVisible] = useState(false)
  const [productListAssignEmployeeId, setProductListAssignEmployeeId] = useState('')
  const [productListAssignDueDate, setProductListAssignDueDate] = useState('')
  const [productListAssigningTask, setProductListAssigningTask] = useState(false)
  const [imageGalleryImages, setImageGalleryImages] = useState([])
  const [imageGalleryIndex, setImageGalleryIndex] = useState(0)
  const [imageGalleryVisible, setImageGalleryVisible] = useState(false)
  const [uploadingProductImages, setUploadingProductImages] = useState(false)
  const [companyForm, setCompanyForm] = useState({
    name: '',
    location: '',
    area: '',
    address: '',
    purchaseManagerName: '',
    purchaseManagerPhone: '',
    purchaseManagerEmail: '',
  })
  const [savingCompany, setSavingCompany] = useState(false)
  const [zoneNameDisplay, setZoneNameDisplay] = useState(null)
  const [packingDeliveryForm, setPackingDeliveryForm] = useState({
    freightCharge: 0,
    packingCharge: 0,
    expectedDeliveryWithinDays: '',
  })
  const [savingPackingDelivery, setSavingPackingDelivery] = useState(false)
  const [quoteLogsRefreshKey, setQuoteLogsRefreshKey] = useState(0)
  const [quoteLogsOpen, setQuoteLogsOpen] = useState(false)

  const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/

  useEffect(() => {
    if (!id || !OBJECT_ID_REGEX.test(id)) {
      setLoading(false)
      setError('Invalid quotation id')
      setQuotation(null)
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
  const branchSignature = quotation?.branchSignature || null
  const branchSignatureId =
    branchSignature && typeof branchSignature === 'object'
      ? branchSignature._id || branchSignature.id || null
      : null
  const branchSignaturePath =
    branchSignature && typeof branchSignature === 'object' && branchSignature.path
      ? (branchSignature.path.startsWith('http') ? branchSignature.path : getAssetsUrl(branchSignature.path))
      : ''
  const queryId = quotation?.queryId?._id ?? quotation?.queryId
  const hasRate = (p) => !p.notAvailable && p.rate != null && !Number.isNaN(Number(p.rate)) && Number(p.rate) >= 0
  const productsWithRate = products.filter(hasRate)
  const productsWithoutRate = products.filter((p) => !hasRate(p))

  useEffect(() => {
    const ci = quotation?.companyInfo
    if (ci) {
      const pm = Array.isArray(ci.purchaseManagers) && ci.purchaseManagers.length > 0 ? ci.purchaseManagers[0] : {}
      setCompanyForm({
        name: ci.name || '',
        location: ci.location || '',
        area: ci.area || '',
        address: ci.address || '',
        purchaseManagerName: pm.name || '',
        purchaseManagerPhone: pm.phone || '',
        purchaseManagerEmail: pm.email || '',
      })
    } else if (quotation) {
      setCompanyForm({
        name: quotation.customerName || '',
        location: '',
        area: '',
        address: '',
        purchaseManagerName: '',
        purchaseManagerPhone: '',
        purchaseManagerEmail: '',
      })
    }
  }, [quotation])

  useEffect(() => {
    if (quotation) {
      const freight = quotation.freightCharge
      const packing = quotation.packingCharge
      const expWithinDays = quotation.expectedDeliveryWithinDays
      setPackingDeliveryForm({
        freightCharge: typeof freight === 'number' ? freight : (Number(freight) || 0),
        packingCharge: typeof packing === 'number' ? packing : (Number(packing) || 0),
        expectedDeliveryWithinDays:
          expWithinDays != null && !Number.isNaN(Number(expWithinDays))
            ? Number(expWithinDays)
            : '',
      })
    }
  }, [quotation])

  // Resolve zone ID to name for display in Company Information
  useEffect(() => {
    const areaVal = companyForm.area?.trim?.() || ''
    if (!areaVal) {
      setZoneNameDisplay(null)
      return
    }
    if (!OBJECT_ID_REGEX.test(areaVal)) {
      setZoneNameDisplay(null)
      return
    }
    let cancelled = false
    areaService
      .getById(areaVal)
      .then((res) => {
        if (cancelled) return
        const data = res?.data?.data ?? res?.data ?? res
        const name = data?.name ?? null
        setZoneNameDisplay(name || areaVal)
      })
      .catch(() => {
        if (!cancelled) setZoneNameDisplay(null)
      })
    return () => { cancelled = true }
  }, [companyForm.area])

  const updateCompanyForm = (field, value) => {
    if (field === 'area') setZoneNameDisplay(null)
    setCompanyForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSavePackingDelivery = async () => {
    if (!quotation?.id) return
    setSavingPackingDelivery(true)
    try {
      const res = await quotationService.update(quotation.id, {
        freightCharge: Number(packingDeliveryForm.freightCharge) >= 0 ? Number(packingDeliveryForm.freightCharge) : 0,
        packingCharge: Number(packingDeliveryForm.packingCharge) >= 0 ? Number(packingDeliveryForm.packingCharge) : 0,
        expectedDeliveryWithinDays:
          packingDeliveryForm.expectedDeliveryWithinDays === ''
            ? null
            : (Number(packingDeliveryForm.expectedDeliveryWithinDays) >= 0
                ? Number(packingDeliveryForm.expectedDeliveryWithinDays)
                : null),
      })
      const data = res?.data?.data ?? res?.data ?? res
      if (data) {
        setQuotation((prev) => (prev ? {
          ...prev,
          freightCharge: data.freightCharge ?? packingDeliveryForm.freightCharge,
          packingCharge: data.packingCharge ?? packingDeliveryForm.packingCharge,
          expectedDeliveryWithinDays:
            data.expectedDeliveryWithinDays ??
            (packingDeliveryForm.expectedDeliveryWithinDays === ''
              ? null
              : Number(packingDeliveryForm.expectedDeliveryWithinDays)),
        } : null))
      }
      toastSuccess('Packing & delivery updated')
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || 'Failed to update packing & delivery')
    } finally {
      setSavingPackingDelivery(false)
    }
  }

  const handleSaveCompanyInfo = async () => {
    if (!quotation?.id) return
    setSavingCompany(true)
    try {
      const purchaseManagers =
        companyForm.purchaseManagerName || companyForm.purchaseManagerPhone || companyForm.purchaseManagerEmail
          ? [{ name: companyForm.purchaseManagerName || '', phone: companyForm.purchaseManagerPhone || '', email: companyForm.purchaseManagerEmail || '' }]
          : []
      const res = await quotationService.update(quotation.id, {
        companyInfo: {
          name: companyForm.name || '',
          location: companyForm.location || '',
          area: companyForm.area || '',
          address: companyForm.address || '',
          purchaseManagers,
        },
      })
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.companyInfo) {
        setQuotation((prev) => (prev ? { ...prev, companyInfo: data.companyInfo } : null))
      } else {
        setQuotation((prev) => (prev ? { ...prev, companyInfo: { name: companyForm.name, location: companyForm.location, area: companyForm.area, address: companyForm.address, purchaseManagers } } : null))
      }
      toastSuccess('Company information updated')
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || 'Failed to update company information')
    } finally {
      setSavingCompany(false)
    }
  }

  // Sync editing product when productIndex or products change
  useEffect(() => {
    if (products.length > 0) {
      const idx = Math.min(productIndex, products.length - 1)
      const p = products[idx]
      const productRef = typeof p.product_id === 'object' ? p.product_id : null
      setEditingProduct({
        productName: p.productName || '',
        description: productRef?.shortDescription || p.description || p.remark || '',
        quantity: p.quantity ?? '',
        unit: p.unit || '',
        hsnNumber: productRef?.hsnNumber || p.hsnNumber || '',
        modelNumber: productRef?.modelNumber || productRef?.defaultModelNumber || p.modelNumber || '',
        gstPercentage: p.gstPercentage != null ? p.gstPercentage : '',
        remark: p.remark || '',
        rate: p.rate != null ? p.rate : '',
        variants: p.variants || [],
        product_id: p.product_id,
        images:
          Array.isArray(p.images) && p.images.length > 0
            ? p.images
            : (Array.isArray(productRef?.images) ? productRef.images : []),
      })
    } else {
      setEditingProduct(null)
    }
  }, [productIndex, products])

  useEffect(() => {
    if (activeTab !== 'productList') return
    let cancelled = false
    employeeService
      .getAll({ pageNumber: 1, pageSize: 100 })
      .then((res) => {
        if (cancelled) return
        const data = res?.data || res
        const result = data?.data ?? data
        const list = result?.employees || result?.items || result || []
        const purchase = list.filter((e) => PURCHASE_ROLES.includes(e.role))
        setPurchaseEmployees(purchase)
      })
      .catch(() => {
        if (!cancelled) setPurchaseEmployees([])
      })
    return () => { cancelled = true }
  }, [activeTab])

  const toggleAssignEmployee = (empId, checked) => {
    setAssignTaskSelected((prev) => ({ ...prev, [empId]: !!checked }))
  }

  const openAssignTaskModal = () => {
    const selectedIds = Object.entries(assignTaskSelected)
      .filter(([, checked]) => checked)
      .map(([id]) => id)
    if (!quotation?.id || selectedIds.length === 0) {
      toastError('Please select at least one employee')
      return
    }
    const p = products[Math.min(productIndex, products.length - 1)]
    const rateVal = editingProduct?.rate !== '' && !Number.isNaN(Number(editingProduct?.rate)) ? Number(editingProduct.rate) : ''
    setAssignTaskTargetRate(rateVal !== '' ? String(rateVal) : '')
    setAssignTaskDueDate('')
    setAssignTaskModalVisible(true)
  }

  const handleAssignTask = async () => {
    const selectedIds = Object.entries(assignTaskSelected)
      .filter(([, checked]) => checked)
      .map(([id]) => id)
    if (!quotation?.id || selectedIds.length === 0) return
    const p = products[Math.min(productIndex, products.length - 1)]
    const productRef = typeof p?.product_id === 'object' ? p.product_id : null
    const productObj = {
      productName: p?.productName || editingProduct?.productName || '',
      description: productRef?.shortDescription || p?.description || editingProduct?.description || '',
      quantity: p?.quantity ?? editingProduct?.quantity ?? 1,
      unit: p?.unit || editingProduct?.unit || '',
      hsnNumber: productRef?.hsnNumber || p?.hsnNumber || editingProduct?.hsnNumber || '',
      modelNumber: productRef?.modelNumber || productRef?.defaultModelNumber || p?.modelNumber || editingProduct?.modelNumber || '',
      gstPercentage: productRef?.gstPercentage ?? p?.gstPercentage ?? editingProduct?.gstPercentage ?? null,
      remark: p?.remark || editingProduct?.remark || '',
      rate: editingProduct?.rate ?? p?.rate ?? null,
      variants: p?.variants || editingProduct?.variants || [],
      product_id: productRef?._id || p?.product_id || null,
    }
    const targetRate = assignTaskTargetRate !== '' && !Number.isNaN(Number(assignTaskTargetRate)) ? Number(assignTaskTargetRate) : 0
    const dueDate = assignTaskDueDate ? new Date(assignTaskDueDate).toISOString() : null
    const quotationNumber = quotation?.quotationCode || `QT-${String(quotation?.id || '').slice(-6)}` || ''
    setAssigningTask(true)
    try {
      for (const empId of selectedIds) {
        await purchaseTaskService.assign({
          quotationId: quotation.id,
          assignedTo: empId,
          type: 'quotation',
          priority: 'highest',
          quotationNumber,
          product: productObj,
          productCategory: productRef?.productCategory || productRef?.category?.name || '',
          productGroup: productRef?.productGroup || productRef?.group?.name || '',
          subCategory: productRef?.subCategory || productRef?.subCategory?.name || '',
          targetRate,
          dueDate,
        })
      }
      toastSuccess(`Task assigned to ${selectedIds.length} employee(s)`)
      setAssignTaskSelected({})
      setAssignTaskModalVisible(false)
      setAssignTaskTargetRate('')
      setAssignTaskDueDate('')
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || 'Failed to assign task')
    } finally {
      setAssigningTask(false)
    }
  }

  const updateFormField = (field, value) => {
    setEditingProduct((prev) => (prev ? { ...prev, [field]: value } : null))
  }

  const getProductImagesForEdit = (product) => {
    if (!product) return []
    const imagesFromProduct = Array.isArray(product.images) ? product.images : []
    if (imagesFromProduct.length > 0) return imagesFromProduct
    const productRef = typeof product.product_id === 'object' ? product.product_id : null
    return Array.isArray(productRef?.images) ? productRef.images : []
  }

  const removeEditingProductImage = (imgIndex) => {
    setEditingProduct((prev) => {
      if (!prev) return prev
      const images = Array.isArray(prev.images) ? prev.images : []
      return {
        ...prev,
        images: images.filter((_, index) => index !== imgIndex),
      }
    })
  }

  const uploadEditingProductImages = async (files) => {
    if (!files?.length) return
    setUploadingProductImages(true)
    try {
      const res = await documentService.uploadImages(files)
      const data = res?.data?.data ?? res?.data ?? res
      const docs = data?.documents || []
      const uploaded = docs
        .map((d) => ({ _id: d?._id || d?.id, path: d?.path || d?.url || '' }))
        .filter((d) => !!d._id || !!d.path)
      if (uploaded.length === 0) {
        toastError('No images uploaded')
        return
      }
      setEditingProduct((prev) => {
        if (!prev) return prev
        const existing = Array.isArray(prev.images) ? prev.images : []
        return { ...prev, images: [...existing, ...uploaded] }
      })
      toastSuccess(`${uploaded.length} image(s) uploaded`)
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || 'Failed to upload images')
    } finally {
      setUploadingProductImages(false)
    }
  }

  const handleUpdateProduct = async () => {
    if (!quotation?.id || !editingProduct) return false
    const idx = Math.min(productIndex, products.length - 1)
    const qty = Number(editingProduct.quantity)
    const rateVal = editingProduct.rate !== '' && !Number.isNaN(Number(editingProduct.rate)) ? Number(editingProduct.rate) : null
    const productId = products[idx]?.product_id
    const pid = typeof productId === 'object' && productId?._id ? productId._id : productId
    const toImgIds = (imgs) => (imgs || []).map((img) => (typeof img === 'object' && img?._id ? img._id : img)).filter(Boolean)
    const toProductPayload = (p) => ({
      productName: p.productName || '',
      description: p.description || '',
      quantity: Number(p.quantity) ?? 1,
      unit: p.unit || '',
      hsnNumber: p.hsnNumber || '',
      modelNumber: p.modelNumber || '',
      gstPercentage: p.gstPercentage ?? null,
      remark: p.remark || '',
      product_id: typeof p.product_id === 'object' && p.product_id?._id ? p.product_id._id : p.product_id || null,
      rate: p.rate ?? null,
      variants: p.variants || [],
      images: toImgIds(p.images),
    })
    const updatedProducts = products.map((p, i) => {
      if (i !== idx) return toProductPayload(p)
      return toProductPayload({
        ...p,
        productName: editingProduct.productName || p.productName,
        description: editingProduct.description ?? p.description ?? '',
        quantity: !Number.isNaN(qty) && qty >= 0 ? qty : p.quantity,
        unit: editingProduct.unit ?? p.unit ?? '',
        hsnNumber: editingProduct.hsnNumber ?? p.hsnNumber ?? '',
        modelNumber: editingProduct.modelNumber ?? p.modelNumber ?? '',
        gstPercentage: editingProduct.gstPercentage !== '' && !Number.isNaN(Number(editingProduct.gstPercentage)) ? Number(editingProduct.gstPercentage) : (p.gstPercentage ?? null),
        remark: editingProduct.remark ?? p.remark ?? '',
        product_id: pid ?? p.product_id,
        rate: rateVal,
        variants: editingProduct.variants || p.variants || [],
        images: Array.isArray(editingProduct.images) ? editingProduct.images : getProductImagesForEdit(p),
      })
    })
    setUpdating(true)
    try {
      const res = await quotationService.update(quotation.id, { products: updatedProducts })
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.products) {
        setQuotation((prev) => (prev ? { ...prev, products: data.products } : null))
      } else {
        setQuotation((prev) => (prev ? { ...prev, products: updatedProducts } : null))
      }
      setQuoteLogsRefreshKey((prev) => prev + 1)
      toastSuccess('Product updated')
      return true
    } catch (err) {
      toastError(err?.message || 'Failed to update product')
      return false
    } finally {
      setUpdating(false)
    }
  }

  const handleNextProduct = async () => {
    const saved = await handleUpdateProduct()
    if (saved) {
      setProductIndex((i) => Math.min(products.length - 1, i + 1))
    }
  }

  const getListRate = (idx) => (productListRateEdits[idx] !== undefined ? productListRateEdits[idx] : (products[idx]?.rate ?? ''))
  const getListGst = (idx) => {
    if (productListGstEdits[idx] !== undefined && productListGstEdits[idx] !== '') return productListGstEdits[idx]
    const p = products[idx]
    const productRef = typeof p?.product_id === 'object' ? p.product_id : null
    const val = p?.gstPercentage ?? productRef?.gstPercentage
    return val != null ? String(val) : ''
  }
  const setListGst = (idx, val) => setProductListGstEdits((prev) => ({ ...prev, [idx]: val }))
  const setListRate = (idx, val) => setProductListRateEdits((prev) => ({ ...prev, [idx]: val }))

  const getListApplyDiscount = (idx) => (productListApplyDiscount[idx] !== undefined ? productListApplyDiscount[idx] : !!products[idx]?.applyDiscount)
  const getListDiscountPct = (idx) => (productListDiscountPct[idx] !== undefined ? productListDiscountPct[idx] : (products[idx]?.discountPercentage ?? ''))
  const setListApplyDiscount = (idx, val) => setProductListApplyDiscount((prev) => ({ ...prev, [idx]: !!val }))
  const setListDiscountPct = (idx, val) => setProductListDiscountPct((prev) => ({ ...prev, [idx]: val }))
  const getListTotalBeforeDiscount = (idx) => {
    const p = products[idx]
    const qty = Number(p?.quantity) ?? 0
    const rate = getListRate(idx)
    const r = rate === '' || rate == null ? 0 : (Number.isNaN(Number(rate)) ? 0 : Number(rate))
    return qty > 0 ? qty * r : 0
  }
  const getListDiscountAmount = (idx) => {
    const before = getListTotalBeforeDiscount(idx)
    const apply = getListApplyDiscount(idx)
    const pctVal = getListDiscountPct(idx)
    const pct = (pctVal !== '' && pctVal != null && !Number.isNaN(Number(pctVal)) ? Number(pctVal) : 0) / 100
    return apply && before > 0 ? before * pct : 0
  }
  const getListTotal = (idx) => {
    const before = getListTotalBeforeDiscount(idx)
    const discount = getListDiscountAmount(idx)
    return Math.max(0, before - discount)
  }

  const calculatedTotalTaxable = products.reduce((sum, p, idx) => sum + getListTotal(idx), 0)
  const calculatedTotalGst = products.reduce((sum, p, idx) => {
    const lineTotal = getListTotal(idx)
    const gstVal = getListGst(idx)
    const gstPct =
      gstVal !== '' && !Number.isNaN(Number(gstVal))
        ? Number(gstVal)
        : (p?.gstPercentage ??
            (typeof p.product_id === 'object' ? p.product_id?.gstPercentage : null) ??
            0)
    return sum + lineTotal * (gstPct / 100)
  }, 0)
  const calculatedTotalAmount = calculatedTotalTaxable + calculatedTotalGst

  // Whether to show Discount column in preview (mirror PDF logic)
  const hasDiscountColumn = products.some(
    (p) =>
      !p.notAvailable &&
      p.applyDiscount &&
      (p.discountPercentage != null || p.discountAmount != null),
  )
  const setListTotal = (idx, totalVal) => {
    const p = products[idx]
    const qty = Number(p?.quantity) ?? 0
    if (qty <= 0) return
    const t = Number(totalVal)
    if (Number.isNaN(t) || totalVal === '') return
    const applyDiscount = getListApplyDiscount(idx)
    const discountAmt = applyDiscount ? getListDiscountAmount(idx) : 0
    const amountBeforeDiscount = t + discountAmt
    setListRate(idx, amountBeforeDiscount / qty)
  }

  const handleUpdateProductFromList = async (idx) => {
    if (!quotation?.id || !products[idx]) return
    const p = products[idx]
    const isNotAvailable = !!p.notAvailable
    const rateVal = getListRate(idx)
    const gstVal = getListGst(idx)
    const gstNum = gstVal !== '' && !Number.isNaN(Number(gstVal)) ? Number(gstVal) : null
    if (!isNotAvailable) {
      if (gstVal === '' || gstNum === null) {
        toastError('GST % is required. Enter a value between 0 and 100.')
        return
      }
      if (gstNum < 0 || gstNum > 100) {
        toastError('GST % must be between 0 and 100.')
        return
      }
    }
    const r = isNotAvailable ? null : (rateVal !== '' && !Number.isNaN(Number(rateVal)) ? Number(rateVal) : (p?.rate ?? null))
    const applyDiscount = getListApplyDiscount(idx)
    const discountPctVal = getListDiscountPct(idx)
    const discountPct = (discountPctVal !== '' && discountPctVal != null && !Number.isNaN(Number(discountPctVal)) ? Number(discountPctVal) : null)
    const beforeDiscount = getListTotalBeforeDiscount(idx)
    const discountAmount = applyDiscount && discountPct != null && beforeDiscount > 0 ? beforeDiscount * (discountPct / 100) : 0
    const toImgIds = (imgs) => (imgs || []).map((img) => (typeof img === 'object' && img?._id ? img._id : img)).filter(Boolean)
    const toProductPayload = (prod, override = {}) => ({
      productName: prod.productName || '',
      description: prod.description || '',
      quantity: Number(prod.quantity) ?? 1,
      unit: prod.unit || '',
      hsnNumber: prod.hsnNumber || '',
      modelNumber: prod.modelNumber || '',
      gstPercentage: prod.gstPercentage ?? null,
      remark: prod.remark || '',
      product_id: typeof prod.product_id === 'object' && prod.product_id?._id ? prod.product_id._id : prod.product_id || null,
      rate: prod.rate ?? null,
      variants: prod.variants || [],
      images: toImgIds(prod.images),
      applyDiscount: prod.applyDiscount ?? false,
      discountPercentage: prod.discountPercentage ?? null,
      discountAmount: prod.discountAmount ?? null,
      notAvailable: prod.notAvailable ?? false,
      notAvailableRemark: prod.notAvailableRemark || '',
      ...override,
    })
    const updatedProducts = products.map((prod, i) =>
      i === idx
        ? toProductPayload(prod, {
            rate: r,
            gstPercentage: isNotAvailable ? (prod.gstPercentage ?? null) : gstNum,
            applyDiscount: !!applyDiscount,
            discountPercentage: applyDiscount ? discountPct : null,
            discountAmount: applyDiscount ? discountAmount : null,
            notAvailable: !!prod.notAvailable,
            notAvailableRemark: prod.notAvailableRemark || '',
          })
        : toProductPayload(prod)
    )
    setUpdating(true)
    try {
      const res = await quotationService.update(quotation.id, { products: updatedProducts })
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.products) {
        setQuotation((prev) => (prev ? { ...prev, products: data.products } : null))
        setProductListRateEdits((prev) => { const next = { ...prev }; delete next[idx]; return next })
        setProductListGstEdits((prev) => { const next = { ...prev }; delete next[idx]; return next })
        setProductListApplyDiscount((prev) => { const next = { ...prev }; delete next[idx]; return next })
        setProductListDiscountPct((prev) => { const next = { ...prev }; delete next[idx]; return next })
      } else {
        setQuotation((prev) => (prev ? { ...prev, products: updatedProducts } : null))
      }
      setQuoteLogsRefreshKey((prev) => prev + 1)
      toastSuccess('Rate and GST updated')
    } catch (err) {
      toastError(err?.message || 'Failed to update rate')
    } finally {
      setUpdating(false)
    }
  }

  const openDeleteProductModal = (idx) => {
    if (!products[idx]) return
    setDeleteProductIndex(idx)
    setDeleteProductModalVisible(true)
  }

  const handleConfirmDeleteProduct = async () => {
    if (!quotation?.id || deleteProductIndex == null) return
    const idx = deleteProductIndex
    if (!products[idx]) return
    const toImgIds = (imgs) =>
      (imgs || [])
        .map((img) => (typeof img === 'object' && img?._id ? img._id : img))
        .filter(Boolean)
    const toProductPayload = (prod) => ({
      productName: prod.productName || '',
      description: prod.description || '',
      quantity: Number(prod.quantity) ?? 1,
      unit: prod.unit || '',
      hsnNumber: prod.hsnNumber || '',
      modelNumber: prod.modelNumber || '',
      gstPercentage: prod.gstPercentage ?? null,
      remark: prod.remark || '',
      product_id: typeof prod.product_id === 'object' && prod.product_id?._id ? prod.product_id._id : prod.product_id || null,
      rate: prod.rate ?? null,
      variants: prod.variants || [],
      images: toImgIds(prod.images),
      applyDiscount: prod.applyDiscount ?? false,
      discountPercentage: prod.discountPercentage ?? null,
      discountAmount: prod.discountAmount ?? null,
      notAvailable: prod.notAvailable ?? false,
      notAvailableRemark: prod.notAvailableRemark || '',
    })
    const updatedProducts = products
      .filter((_, i) => i !== idx)
      .map(toProductPayload)

    setUpdating(true)
    try {
      const res = await quotationService.update(quotation.id, { products: updatedProducts })
      const data = res?.data?.data ?? res?.data ?? res
      const nextProducts = data?.products || updatedProducts
      setQuotation((prev) => (prev ? { ...prev, products: nextProducts } : null))
      setDeleteProductModalVisible(false)
      setDeleteProductIndex(null)
      toastSuccess('Product deleted from quotation')
      setProductIndex((pi) => Math.max(0, Math.min(pi, Math.max(0, nextProducts.length - 1))))
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || 'Failed to delete product')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveNotAvailable = async () => {
    const idx = notAvailableModalIndex
    if (idx == null || !quotation?.id || !products[idx]) return
    const toImgIds = (imgs) => (imgs || []).map((img) => (typeof img === 'object' && img?._id ? img._id : img)).filter(Boolean)
    const toProductPayload = (p, override = {}) => ({
      productName: p.productName || '',
      description: p.description || '',
      quantity: Number(p.quantity) ?? 1,
      unit: p.unit || '',
      hsnNumber: p.hsnNumber || '',
      modelNumber: p.modelNumber || '',
      gstPercentage: p.gstPercentage ?? null,
      remark: p.remark || '',
      product_id: typeof p.product_id === 'object' && p.product_id?._id ? p.product_id._id : p.product_id || null,
      rate: p.rate ?? null,
      variants: p.variants || [],
      images: toImgIds(p.images),
      applyDiscount: p.applyDiscount ?? false,
      discountPercentage: p.discountPercentage ?? null,
      discountAmount: p.discountAmount ?? null,
      notAvailable: p.notAvailable ?? false,
      notAvailableRemark: p.notAvailableRemark || '',
      ...override,
    })
    const updatedProducts = products.map((p, i) =>
      i === idx ? toProductPayload(p, { notAvailable: true, notAvailableRemark: notAvailableRemark.trim() || '', rate: null }) : toProductPayload(p)
    )
    setUpdating(true)
    try {
      const res = await quotationService.update(quotation.id, { products: updatedProducts })
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.products) {
        setQuotation((prev) => (prev ? { ...prev, products: data.products } : null))
      } else {
        setQuotation((prev) => (prev ? { ...prev, products: updatedProducts } : null))
      }
      toastSuccess('Product marked as not available')
      setNotAvailableModalVisible(false)
      setNotAvailableModalIndex(null)
      setNotAvailableRemark('')
      setProductListRateEdits((prev) => { const next = { ...prev }; delete next[idx]; return next })
    } catch (err) {
      toastError(err?.message || 'Failed to update')
    } finally {
      setUpdating(false)
    }
  }

  const handleRevokeNotAvailable = async (idx) => {
    if (idx == null || !quotation?.id || !products[idx]) return
    const p = products[idx]
    if (!p.notAvailable) return
    const toImgIds = (imgs) => (imgs || []).map((img) => (typeof img === 'object' && img?._id ? img._id : img)).filter(Boolean)
    const toProductPayload = (prod, override = {}) => ({
      productName: prod.productName || '',
      description: prod.description || '',
      quantity: Number(prod.quantity) ?? 1,
      unit: prod.unit || '',
      hsnNumber: prod.hsnNumber || '',
      modelNumber: prod.modelNumber || '',
      gstPercentage: prod.gstPercentage ?? null,
      remark: prod.remark || '',
      product_id: typeof prod.product_id === 'object' && prod.product_id?._id ? prod.product_id._id : prod.product_id || null,
      rate: prod.rate ?? null,
      variants: prod.variants || [],
      images: toImgIds(prod.images),
      applyDiscount: prod.applyDiscount ?? false,
      discountPercentage: prod.discountPercentage ?? null,
      discountAmount: prod.discountAmount ?? null,
      notAvailable: prod.notAvailable ?? false,
      notAvailableRemark: prod.notAvailableRemark || '',
      ...override,
    })
    const updatedProducts = products.map((prod, i) =>
      i === idx ? toProductPayload(prod, { notAvailable: false, notAvailableRemark: '' }) : toProductPayload(prod)
    )
    setUpdating(true)
    try {
      const res = await quotationService.update(quotation.id, { products: updatedProducts })
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.products) {
        setQuotation((prev) => (prev ? { ...prev, products: data.products } : null))
      } else {
        setQuotation((prev) => (prev ? { ...prev, products: updatedProducts } : null))
      }
      toastSuccess('Product marked as available again')
    } catch (err) {
      toastError(err?.message || 'Failed to revoke')
    } finally {
      setUpdating(false)
    }
  }

  const toggleProductListSelect = (idx, checked) => {
    setProductListSelected((prev) => ({ ...prev, [idx]: !!checked }))
  }
  const toggleProductListSelectAll = () => {
    const allSelected = Object.keys(productListSelected).length === products.length && products.every((_, i) => productListSelected[i])
    if (allSelected) {
      setProductListSelected({})
    } else {
      const next = {}
      products.forEach((_, i) => { next[i] = true })
      setProductListSelected(next)
    }
  }
  const productListSelectedIndices = () => Object.entries(productListSelected).filter(([, v]) => v).map(([k]) => parseInt(k, 10))

  const openProductListAssignModal = () => {
    const selected = productListSelectedIndices()
    if (selected.length === 0) {
      toastError('Please select at least one product')
      return
    }
    setProductListAssignEmployeeId('')
    setProductListAssignDueDate('')
    setProductListAssignModalVisible(true)
  }

  const handleProductListAssignTask = async () => {
    const selectedIndices = productListSelectedIndices()
    if (!quotation?.id || selectedIndices.length === 0 || !productListAssignEmployeeId) {
      toastError('Please select at least one product and one employee')
      return
    }
    const quotationNumber = quotation?.quotationCode || `QT-${String(quotation?.id || '').slice(-6)}` || ''
    const dueDate = productListAssignDueDate ? new Date(productListAssignDueDate).toISOString() : null
    setProductListAssigningTask(true)
    try {
      for (const idx of selectedIndices) {
        const p = products[idx]
        const productRef = typeof p?.product_id === 'object' ? p.product_id : null
        const rateVal = getListRate(idx)
        const targetRate = rateVal !== '' && !Number.isNaN(Number(rateVal)) ? Number(rateVal) : 0
        const productObj = {
          productName: p?.productName || '',
          description: productRef?.shortDescription || p?.description || p?.remark || '',
          quantity: p?.quantity ?? 1,
          unit: p?.unit || '',
          hsnNumber: productRef?.hsnNumber || p?.hsnNumber || '',
          modelNumber: productRef?.modelNumber || productRef?.defaultModelNumber || p?.modelNumber || '',
          gstPercentage: productRef?.gstPercentage ?? p?.gstPercentage ?? null,
          remark: p?.remark || '',
          rate: rateVal !== '' ? Number(rateVal) : p?.rate ?? null,
          variants: p?.variants || [],
          product_id: productRef?._id || p?.product_id || null,
        }
        await purchaseTaskService.assign({
          quotationId: quotation.id,
          assignedTo: productListAssignEmployeeId,
          type: 'quotation',
          priority: 'highest',
          quotationNumber,
          product: productObj,
          productCategory: productRef?.productCategory || productRef?.category?.name || '',
          productGroup: productRef?.productGroup || productRef?.group?.name || '',
          subCategory: productRef?.subCategory || productRef?.subCategory?.name || '',
          targetRate,
          dueDate,
        })
      }
      toastSuccess(`${selectedIndices.length} task(s) assigned`)
      setProductListSelected({})
      setProductListAssignModalVisible(false)
      setProductListAssignEmployeeId('')
      setProductListAssignDueDate('')
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || 'Failed to assign task')
    } finally {
      setProductListAssigningTask(false)
    }
  }

  const updateNewProductForm = (field, value) => {
    setNewProductForm((prev) => ({ ...prev, [field]: value }))
  }

  const clearNewProductForm = () => {
    setNewProductForm({
      productName: '',
      description: '',
      quantity: 1,
      unit: '',
      hsnNumber: '',
      modelNumber: '',
      gstPercentage: '',
      remark: '',
      rate: '',
    })
    setNewProductImageFiles([])
    setNewProductImagePreviews([])
  }

  const handleAddNewProduct = async () => {
    if (!quotation?.id) return
    if (!newProductForm.productName?.trim()) {
      toastError('Product name is required')
      return
    }
    const qty = Number(newProductForm.quantity)
    if (!qty || qty <= 0 || Number.isNaN(qty)) {
      toastError('Quantity must be greater than 0')
      return
    }
    setAddingNewProduct(true)
    try {
      let uploadedDocs = []
      if (newProductImageFiles.length > 0) {
        const res = await documentService.uploadImages(newProductImageFiles)
        const payload = res?.data || res
        const docs = payload?.data?.documents || payload?.documents || []
        uploadedDocs = docs.map((d) => ({ _id: d._id || d.id, path: d.path || d.url || '' }))
      }

      let productId = null

      if (createNewQueryProduct) {
        const newPayload = {
          name: (newProductForm.productName || '').trim(),
          unit: (newProductForm.unit || '').trim(),
          hsnNumber: (newProductForm.hsnNumber || '').trim(),
          modelNumber: (newProductForm.modelNumber || '').trim(),
          variants: [],
          images: uploadedDocs.map((d) => d._id),
        }
        if (newPayload.name) {
          await queryNewProductService.create(newPayload)
        }
      }

      const toImgIds = (imgs) => (imgs || []).map((img) => (typeof img === 'object' && img?._id ? img._id : img)).filter(Boolean)
      const toProductPayload = (p) => ({
        productName: p.productName || '',
        description: p.description || '',
        quantity: Number(p.quantity) ?? 1,
        unit: p.unit || '',
        hsnNumber: p.hsnNumber || '',
        modelNumber: p.modelNumber || '',
        gstPercentage: p.gstPercentage ?? null,
        remark: p.remark || '',
        product_id: typeof p.product_id === 'object' && p.product_id?._id ? p.product_id._id : p.product_id || null,
        rate: p.rate ?? null,
        variants: p.variants || [],
        images: toImgIds(p.images),
      })

      const rateVal = newProductForm.rate !== '' && !Number.isNaN(Number(newProductForm.rate)) ? Number(newProductForm.rate) : null
      const newProd = {
        productName: newProductForm.productName.trim(),
        description: newProductForm.description || '',
        quantity: qty,
        unit: newProductForm.unit || '',
        hsnNumber: newProductForm.hsnNumber || '',
        modelNumber: newProductForm.modelNumber || '',
        gstPercentage: newProductForm.gstPercentage !== '' && !Number.isNaN(Number(newProductForm.gstPercentage)) ? Number(newProductForm.gstPercentage) : null,
        remark: newProductForm.remark || '',
        product_id: productId,
        rate: rateVal,
        variants: [],
        images: uploadedDocs.length ? uploadedDocs : [],
      }

      const updatedProducts = [...products.map(toProductPayload), toProductPayload(newProd)]
      const res = await quotationService.update(quotation.id, { products: updatedProducts })
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.products) {
        setQuotation((prev) => (prev ? { ...prev, products: data.products } : null))
      } else {
        setQuotation((prev) => (prev ? { ...prev, products: updatedProducts } : null))
      }
      clearNewProductForm()
      toastSuccess('Product added to quotation')
      setActiveTab('products')
      setProductIndex(products.length)
    } catch (err) {
      toastError(err?.message || 'Failed to add product')
    } finally {
      setAddingNewProduct(false)
    }
  }

  const handleDownloadProductsPdf = async () => {
    if (!quotation?.id) return
    setExportingPdf(true)
    try {
      const response = await quotationService.exportPdf(quotation.id)
      const blob = response?.data
      if (!blob || !(blob instanceof Blob)) {
        toastError('Invalid PDF response')
        return
      }
      const contentType = response?.headers?.['content-type'] || blob.type || ''
      if (blob.size < 100 || contentType.includes('json')) {
        const text = await blob.text()
        const err = text
          ? (() => {
              try {
                const j = JSON.parse(text)
                return j?.message || j?.error?.detail || text
              } catch {
                return text
              }
            })()
          : 'Invalid PDF response'
        toastError(err)
        return
      }
      const pdfBlob = new Blob([blob], { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${quotation.quotationCode || quotation.id}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toastSuccess('PDF downloaded')
    } catch (err) {
      toastError(err?.message || 'Failed to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const isHodApproved = quotation?.status === 'hod_approved'
  const currentProduct =
    products.length > 0 ? products[Math.min(productIndex, products.length - 1)] : null
  const isCurrentProductNotAvailable = !!currentProduct?.notAvailable

  const handleMarkApproved = async () => {
    if (!quotation?.id) return
    try {
      await quotationService.updateStatus(quotation.id, 'hod_approved')
      setQuotation((prev) => (prev ? { ...prev, status: 'hod_approved' } : null))
      toastSuccess('Quotation marked as HOD Approved')
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || 'Failed to update status')
    }
  }

  const openImageGallery = (images, startIndex = 0) => {
    if (!images?.length) return
    setImageGalleryImages(images)
    setImageGalleryIndex(Math.min(startIndex, images.length - 1))
    setImageGalleryVisible(true)
  }

  const closeImageGallery = () => {
    setImageGalleryVisible(false)
    setImageGalleryImages([])
    setImageGalleryIndex(0)
  }

  const imageGalleryPrev = () => {
    setImageGalleryIndex((i) => (i <= 0 ? imageGalleryImages.length - 1 : i - 1))
  }

  const imageGalleryNext = () => {
    setImageGalleryIndex((i) => (i >= imageGalleryImages.length - 1 ? 0 : i + 1))
  }

  useEffect(() => {
    if (!imageGalleryVisible || imageGalleryImages.length === 0) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        imageGalleryPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        imageGalleryNext()
      } else if (e.key === 'Escape') closeImageGallery()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [imageGalleryVisible, imageGalleryImages.length])

  const [expandedImages, setExpandedImages] = useState([])
  const [expandedImageIndex, setExpandedImageIndex] = useState(0)

  const getImageUrl = (img) => {
    if (!img) return ''
    if (typeof img === 'object' && img?.path) return getAssetsUrl(img.path)
    return typeof img === 'string' ? img : ''
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'partial':
        return (
          <CBadge color="warning" className="text-uppercase fw-semibold px-3 py-2">
            Partial
          </CBadge>
        )
      case 'approved':
        return (
          <CBadge color="success" className="text-uppercase fw-semibold px-3 py-2">
            Approved
          </CBadge>
        )
      case 'draft':
        return <CBadge color="secondary" className="text-uppercase fw-semibold px-3 py-2">Draft</CBadge>
      case 'hod_approved':
        return <CBadge color="success" className="text-uppercase fw-semibold px-3 py-2">HOD Approved</CBadge>
      case 'sent':
      case 'sentToClient':
        return <CBadge color="info" className="text-uppercase fw-semibold px-3 py-2">Sent</CBadge>
      case 'accepted':
        return <CBadge color="success" className="text-uppercase fw-semibold px-3 py-2">Accepted</CBadge>
      case 'rejected':
        return <CBadge color="danger" className="text-uppercase fw-semibold px-3 py-2">Rejected</CBadge>
      case 'expired':
        return <CBadge color="warning" className="text-uppercase fw-semibold px-3 py-2">Expired</CBadge>
      default:
        return <CBadge color="secondary" className="text-uppercase fw-semibold px-3 py-2">{status}</CBadge>
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
      <CCard className="mb-4 border-0 shadow-sm" style={{ borderRadius: 12, backgroundColor: '#f8f9fb' }}>
        <CCardBody className="p-3 p-md-4">
          {/* Row 1: quotation id / status + summary */}
          <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3 mb-3">
            <div
              className="fw-bold text-primary px-3 py-2 rounded-pill border"
              style={{ fontSize: '1rem', letterSpacing: '0.3px', backgroundColor: '#eef4ff' }}
            >
              {quotation.quotationCode || `QT-${String(quotation.id).slice(-6)}`}
            </div>
            <div className="d-flex flex-wrap align-items-center justify-content-lg-end gap-2 gap-md-3" style={{ minWidth: 0 }}>
              {getStatusBadge(quotation.status)}
              <span
                className="text-nowrap fw-semibold text-secondary px-2 py-1 rounded border"
                style={{ backgroundColor: '#ffffff' }}
              >
                Total: {products.length}
              </span>
              <span
                className="text-nowrap fw-semibold text-success px-2 py-1 rounded border"
                style={{ backgroundColor: '#ffffff' }}
              >
                With Rate: {productsWithRate.length}
              </span>
              <span
                className="text-nowrap fw-semibold px-2 py-1 rounded border"
                style={{ color: '#fd7e14', backgroundColor: '#ffffff' }}
              >
                Without Rate: {productsWithoutRate.length}
              </span>
            </div>
          </div>

          {/* Row 2: back + actions */}
          <div
            className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 gap-md-3 pt-3"
            style={{ borderTop: '1px solid #e9ecef' }}
          >
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => navigate('/quotations')}
              className="d-inline-flex align-items-center px-3"
              style={{ height: 40 }}
            >
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back to Quotations
            </CButton>

            <div className="d-flex flex-wrap justify-content-md-end align-items-center gap-2">
              <CButton
                color="dark"
                variant="outline"
                onClick={() => setQuoteLogsOpen((prev) => !prev)}
                className="d-inline-flex align-items-center px-3"
                style={{ height: 40 }}
              >
                {quoteLogsOpen ? 'Hide Quote Logs' : 'Show Quote Logs'}
              </CButton>
              <CButton
                color="primary"
                onClick={handleMarkApproved}
                disabled={isHodApproved}
                className="d-inline-flex align-items-center px-3 fw-semibold"
                style={{ height: 40 }}
              >
                Mark Approved
              </CButton>
              <CButton
                color="secondary"
                variant="outline"
                onClick={handleDownloadProductsPdf}
                disabled={exportingPdf || !isHodApproved}
                title={!isHodApproved ? 'Available after HOD approval' : undefined}
                className="d-inline-flex align-items-center px-3"
                style={{ height: 40 }}
              >
                {exportingPdf && <CSpinner size="sm" className="me-2" />}
                {!exportingPdf && <CIcon icon={cilCloudDownload} className="me-2" />}
                {exportingPdf ? 'Generating PDF...' : 'Download PDF'}
              </CButton>
              <CButton
                color="primary"
                variant="outline"
                disabled={!isHodApproved}
                className="d-inline-flex align-items-center px-3"
                style={{ height: 40 }}
              >
                <CIcon icon={cilEnvelopeClosed} className="me-2" />
                Send to Customer
              </CButton>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader className="border-bottom" style={{ backgroundColor: '#fbfcfe' }}>
          <CNav variant="tabs" role="tablist" className="gap-2">
            <CNavItem>
              <CNavLink
                active={activeTab === 'preview'}
                onClick={() => setActiveTab('preview')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'preview' ? '2px solid #321fdb' : '2px solid transparent',
                  color: activeTab === 'preview' ? '#321fdb' : '#6c757d',
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Preview
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'company'}
                onClick={() => setActiveTab('company')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'company' ? '2px solid #321fdb' : '2px solid transparent',
                  color: activeTab === 'company' ? '#321fdb' : '#6c757d',
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Company Information
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'packingDelivery'}
                onClick={() => setActiveTab('packingDelivery')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'packingDelivery' ? '2px solid #321fdb' : '2px solid transparent',
                  color: activeTab === 'packingDelivery' ? '#321fdb' : '#6c757d',
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Packing &amp; Delivery
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'products'}
                onClick={() => setActiveTab('products')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'products' ? '2px solid #321fdb' : '2px solid transparent',
                  color: activeTab === 'products' ? '#321fdb' : '#6c757d',
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Product
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'addNewProduct'}
                onClick={() => setActiveTab('addNewProduct')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'addNewProduct' ? '2px solid #321fdb' : '2px solid transparent',
                  color: activeTab === 'addNewProduct' ? '#321fdb' : '#6c757d',
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Add New Product
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'productList'}
                onClick={() => setActiveTab('productList')}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: activeTab === 'productList' ? '2px solid #321fdb' : '2px solid transparent',
                  color: activeTab === 'productList' ? '#321fdb' : '#6c757d',
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Product List ({products.length})
              </CNavLink>
            </CNavItem>
          </CNav>
        </CCardHeader>
        <CCardBody>
          <CTabContent>
            {/* Tab 0: Preview - read-only full quotation */}
            <CTabPane visible={activeTab === 'preview'}>
              <CCard className="mb-4">
                <CCardHeader className="bg-light">
                  <strong>Quotation Preview</strong> — matches PDF layout (read-only)
                </CCardHeader>
                <CCardBody>
                  {/* Fixed Migti header (same as PDF) */}
                  <div className="mb-4 pb-3 border-bottom">
                    <CRow className="align-items-center">
                      <CCol md={3} className="mb-3 mb-md-0">
                        <img
                          src="https://migti.co.in/assets/images/logo.png"
                          alt=""
                          style={{ width: 100, maxHeight: 50, objectFit: 'contain' }}
                          onError={(e) => {
                            if (e?.target) e.target.style.display = 'none'
                          }}
                        />
                      </CCol>
                      <CCol md={9} className="text-center">
                        <h5 className="mb-1 fw-bold">Migti Industrial Pvt Ltd</h5>
                        <div className="small">
                          <span className="fw-semibold">GST No.</span>{' '}
                          23AARCM4143L1Z6 &nbsp;|&nbsp; 3rd Floor, M.S.-1, B-304, New
                          Siyaganj, Indore, Madhya Pradesh 452003
                        </div>
                        <div className="small">
                          <span className="fw-semibold">Contact:</span>{' '}
                          +91 7898611052 &nbsp;|&nbsp; sale.migtiindore@gmail.com
                        </div>
                      </CCol>
                    </CRow>
                  </div>

                  {/* Customer & shipping details (same structure as PDF) */}
                  <div className="mb-4">
                    <h6 className="text-muted text-uppercase small mb-2">
                      Customer &amp; Shipping Details
                    </h6>
                    <CRow>
                      <CCol md={7} className="mb-3 mb-md-0">
                        <h6 className="fw-semibold mb-2">Customer Details</h6>
                        <CTable bordered responsive small className="mb-0">
                          <CTableBody>
                            <CTableRow>
                              <CTableHeaderCell scope="row" className="bg-light" style={{ width: '32%' }}>
                                Customer Name
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {companyForm.name ||
                                  quotation?.customerName ||
                                  '–'}
                              </CTableDataCell>
                            </CTableRow>
                            <CTableRow>
                              <CTableHeaderCell scope="row" className="bg-light">
                                Address
                              </CTableHeaderCell>
                              <CTableDataCell style={{ whiteSpace: 'pre-wrap' }}>
                                {companyForm.address ||
                                  quotation?.companyInfo?.address ||
                                  '–'}
                              </CTableDataCell>
                            </CTableRow>
                            <CTableRow>
                              <CTableHeaderCell scope="row" className="bg-light">
                                Contact Person
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {companyForm.purchaseManagerName ||
                                  quotation?.companyInfo?.purchaseManagers?.[0]?.name ||
                                  quotation?.industry_id?.purchase_manager_name ||
                                  '–'}
                              </CTableDataCell>
                            </CTableRow>
                            <CTableRow>
                              <CTableHeaderCell scope="row" className="bg-light">
                                Phone
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {companyForm.purchaseManagerPhone ||
                                  quotation?.companyInfo?.purchaseManagers?.[0]?.phone ||
                                  quotation?.industry_id?.purchase_manager_phone ||
                                  '–'}
                              </CTableDataCell>
                            </CTableRow>
                            <CTableRow>
                              <CTableHeaderCell scope="row" className="bg-light">
                                Email
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {companyForm.purchaseManagerEmail ||
                                  quotation?.companyInfo?.purchaseManagers?.[0]?.email ||
                                  quotation?.companyInfo?.email ||
                                  quotation?.industry_id?.email ||
                                  quotation?.customerEmail ||
                                  '–'}
                              </CTableDataCell>
                            </CTableRow>
                          </CTableBody>
                        </CTable>
                      </CCol>
                      <CCol md={5}>
                        <h6 className="fw-semibold mb-2">Shipping Details</h6>
                        <CTable bordered responsive small className="mb-2">
                          <CTableBody>
                            <CTableRow>
                              <CTableHeaderCell scope="row" className="bg-light" style={{ width: '40%' }}>
                                Shipping Address
                              </CTableHeaderCell>
                              <CTableDataCell style={{ whiteSpace: 'pre-wrap' }}>
                                {companyForm.address ||
                                  quotation?.companyInfo?.address ||
                                  '–'}
                              </CTableDataCell>
                            </CTableRow>
                            <CTableRow>
                              <CTableHeaderCell scope="row" className="bg-light">
                                Contact Person
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {companyForm.purchaseManagerName ||
                                  quotation?.companyInfo?.purchaseManagers?.[0]?.name ||
                                  quotation?.industry_id?.purchase_manager_name ||
                                  '–'}
                              </CTableDataCell>
                            </CTableRow>
                          </CTableBody>
                        </CTable>
                        <div className="mt-2 pt-2 border-top small">
                          <div>
                            <span className="fw-semibold">Quotation Code:</span>{' '}
                            {quotation?.quotationCode ||
                              `QT-${String(quotation?.id || '').slice(-6)}` ||
                              '–'}
                          </div>
                          {quotation?.createdAt && (
                            <div className="mt-1">
                              <span className="fw-semibold">Quotation Date:</span>{' '}
                              {new Date(quotation.createdAt).toLocaleString()}
                            </div>
                          )}
                          {queryId && (
                            <div className="mt-1">
                              <span className="fw-semibold">Related Query:</span>{' '}
                              <CButton
                                color="link"
                                className="p-0 align-baseline"
                                onClick={() => navigate(`/queries/${queryId}`)}
                              >
                                View Query
                              </CButton>
                            </div>
                          )}
                        </div>
                      </CCol>
                    </CRow>
                  </div>

                  {/* Quotation details table (mirror PDF columns) */}
                  <div className="mb-4" style={{ fontSize: '0.8rem' }}>
                    <h6 className="text-muted text-uppercase small mb-2">
                      Quotation Details
                    </h6>
                    {products.length > 0 ? (
                      <CTable responsive bordered size="sm">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell className="text-center">
                              S.N.
                            </CTableHeaderCell>
                            <CTableHeaderCell>
                              Item Name &amp; Description
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              Variants
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              HSN Code
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              Photo
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              Qty.
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              Unit
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-end">
                              Unit Price
                            </CTableHeaderCell>
                            {hasDiscountColumn && (
                              <CTableHeaderCell className="text-end">
                                Discount
                              </CTableHeaderCell>
                            )}
                            <CTableHeaderCell className="text-center">
                              GST %
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-end">
                              Total
                            </CTableHeaderCell>
                            <CTableHeaderCell>Reason</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {products.map((p, index) => {
                            const productRef =
                              typeof p.product_id === 'object' ? p.product_id : null
                            const imagesFromProd = Array.isArray(p.images)
                              ? p.images
                              : []
                            const imagesFromRef = Array.isArray(productRef?.images)
                              ? productRef.images
                              : []
                            const allImages =
                              imagesFromProd.length > 0 ? imagesFromProd : imagesFromRef
                            const firstImg = allImages[0] || null
                            const qty = Number(p.quantity) || 0
                            const rate = Number(p.rate) || 0
                            const beforeDiscount = qty * rate

                            let discountAmount = 0
                            if (
                              !p.notAvailable &&
                              p.applyDiscount &&
                              (p.discountPercentage != null || p.discountAmount != null)
                            ) {
                              if (p.discountPercentage != null) {
                                discountAmount =
                                  beforeDiscount * (Number(p.discountPercentage) / 100)
                              } else if (p.discountAmount != null) {
                                discountAmount = Number(p.discountAmount) || 0
                              }
                            }

                            const taxable = Math.max(0, beforeDiscount - discountAmount)
                            const gstPercent =
                              typeof p.gstPercentage === 'number' &&
                              !Number.isNaN(p.gstPercentage)
                                ? p.gstPercentage
                                : typeof productRef?.gstPercentage === 'number' &&
                                  !Number.isNaN(productRef.gstPercentage)
                                  ? productRef.gstPercentage
                                  : 0
                            const hsn =
                              p.hsnNumber || productRef?.hsnNumber || '–'
                            const variantsText = formatVariants(p.variants || [])
                            const descriptionText = (
                              p.description ||
                              productRef?.shortDescription ||
                              ''
                            ).trim()
                            const isNotAvailable = !!p.notAvailable
                            const reasonText = isNotAvailable
                              ? (p.notAvailableRemark || 'Not available')
                              : '–'

                            const rowTotal = isNotAvailable ? 0 : taxable

                            return (
                              <CTableRow key={index}>
                                <CTableDataCell className="text-center align-middle">
                                  {index + 1}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <div className="fw-semibold">
                                    {p.productName || '–'}
                                  </div>
                                  {descriptionText && (
                                    <div
                                      className="small text-muted"
                                      style={{ whiteSpace: 'pre-wrap' }}
                                    >
                                      {descriptionText}
                                    </div>
                                  )}
                                  {p.remark && (
                                    <div className="small text-muted">
                                      {p.remark}
                                    </div>
                                  )}
                                  {isNotAvailable && (
                                    <div className="small text-danger">
                                      Not available
                                      {p.notAvailableRemark
                                        ? `: ${p.notAvailableRemark}`
                                        : ''}
                                    </div>
                                  )}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {variantsText}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {hsn}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {firstImg ? (
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      className="d-inline-block rounded overflow-hidden border"
                                      style={{ width: 60, height: 60, cursor: 'pointer' }}
                                      onClick={() =>
                                        openImageGallery(allImages, 0)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault()
                                          openImageGallery(allImages, 0)
                                        }
                                      }}
                                    >
                                      {getDocumentId(firstImg) ? (
                                        <AuthImage
                                          documentId={getDocumentId(firstImg)}
                                          fallbackUrl={getImageUrl(firstImg)}
                                          alt=""
                                          className="w-100 h-100"
                                          style={{ objectFit: 'cover' }}
                                        />
                                      ) : (
                                        <CImage
                                          src={getImageUrl(firstImg)}
                                          alt=""
                                          className="w-100 h-100"
                                          style={{ objectFit: 'cover' }}
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted small">–</span>
                                  )}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {qty || ''}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {p.unit || ''}
                                </CTableDataCell>
                                <CTableDataCell className="text-end align-middle">
                                  {rate
                                    ? `₹${rate.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}`
                                    : ''}
                                </CTableDataCell>
                                {hasDiscountColumn && (
                                  <CTableDataCell className="text-end align-middle">
                                    {p.applyDiscount && p.discountPercentage != null
                                      ? `${Number(p.discountPercentage).toFixed(2)}%`
                                      : '–'}
                                  </CTableDataCell>
                                )}
                                <CTableDataCell className="text-center align-middle">
                                  {gstPercent
                                    ? `${gstPercent.toFixed(2)}%`
                                    : '–'}
                                </CTableDataCell>
                                <CTableDataCell className="text-end align-middle">
                                  {rowTotal
                                    ? `₹${rowTotal.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}`
                                    : '–'}
                                </CTableDataCell>
                                <CTableDataCell className="align-middle">
                                  {reasonText}
                                </CTableDataCell>
                              </CTableRow>
                            )
                          })}
                        </CTableBody>
                      </CTable>
                    ) : (
                      <p className="text-muted mb-0">
                        No products in this quotation.
                      </p>
                    )}
                  </div>

                  {/* Terms & summary (same as PDF footer area) */}
                  <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-4">
                    <div style={{ flex: '0 0 55%' }}>
                      <h6 className="fw-semibold mb-2">Terms And Conditions</h6>
                      <ul className="mb-0 small ps-3">
                        <li>Validity – Offer valid for 2 days from quotation date.</li>
                        <li>Once delivered material will not be returned or exchanged.</li>
                        <li>Warranty as per company policy.</li>
                        <li>Payment terms – 100% advance with purchase order.</li>
                        <li>Freight charges as actual.</li>
                        <li>Order once placed cannot be cancelled.</li>
                      </ul>
                    </div>
                    <div style={{ flex: '0 0 40%' }} className="ms-lg-auto">
                      <CTable bordered size="sm" className="mb-3">
                        <CTableBody>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              Amount
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              ₹
                              {calculatedTotalTaxable.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              Freight Charge
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              ₹
                              {(Number(quotation?.freightCharge) || 0).toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              Packing Charge
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              ₹
                              {(Number(quotation?.packingCharge) || 0).toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              Expected Delivery Within
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              {quotation?.expectedDeliveryWithinDays != null &&
                              !Number.isNaN(Number(quotation.expectedDeliveryWithinDays))
                                ? `${Number(quotation.expectedDeliveryWithinDays)} Days`
                                : 'NA'}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              Total Taxable Amount
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              {(() => {
                                const freight =
                                  Number(quotation?.freightCharge) || 0
                                const packing =
                                  Number(quotation?.packingCharge) || 0
                                const taxableAfterCharges =
                                  calculatedTotalTaxable + freight + packing
                                return `₹${taxableAfterCharges.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}`
                              })()}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              GST Amount
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              ₹
                              {calculatedTotalGst.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end fw-semibold">
                              Total Amount
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end fw-semibold">
                              {(() => {
                                const freight =
                                  Number(quotation?.freightCharge) || 0
                                const packing =
                                  Number(quotation?.packingCharge) || 0
                                const taxableAfterCharges =
                                  calculatedTotalTaxable + freight + packing
                                const totalAmount =
                                  taxableAfterCharges + calculatedTotalGst
                                return `₹${totalAmount.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}`
                              })()}
                            </CTableDataCell>
                          </CTableRow>
                        </CTableBody>
                      </CTable>
                      <div className="text-end small">
                        {branchSignatureId || branchSignaturePath ? (
                          <div className="mb-1">
                            <AuthImage
                              documentId={branchSignatureId}
                              fallbackUrl={branchSignaturePath}
                              alt="Authorised signature"
                              style={{ maxHeight: 70, maxWidth: 170, objectFit: 'contain' }}
                            />
                          </div>
                        ) : null}
                        <div className="fw-semibold">
                          For Migti Industrial Pvt Ltd
                        </div>
                        <div>Authorised Signatory</div>
                      </div>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Tab 1: Company Information */}
            <CTabPane visible={activeTab === 'company'}>
              <CCard className="mb-4">
                <CCardHeader><strong>Company Information</strong></CCardHeader>
                <CCardBody>
                  <CRow>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Company name</CFormLabel>
                        <CFormInput value={companyForm.name} onChange={(e) => updateCompanyForm('name', e.target.value)} placeholder="Company name" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Location</CFormLabel>
                        <CFormInput value={companyForm.location} onChange={(e) => updateCompanyForm('location', e.target.value)} placeholder="Location" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Zone</CFormLabel>
                        <CFormInput
                          value={zoneNameDisplay ?? companyForm.area}
                          onChange={(e) => updateCompanyForm('area', e.target.value)}
                          placeholder="Zone"
                        />
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Address</CFormLabel>
                        <CFormTextarea rows={3} value={companyForm.address} onChange={(e) => updateCompanyForm('address', e.target.value)} placeholder="Address" />
                      </div>
                      <CButton color="primary" onClick={handleSaveCompanyInfo} disabled={savingCompany}>
                        {savingCompany ? <><CSpinner size="sm" className="me-2" />Saving...</> : 'Save'}
                      </CButton>
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Purchase manager name</CFormLabel>
                        <CFormInput value={companyForm.purchaseManagerName} onChange={(e) => updateCompanyForm('purchaseManagerName', e.target.value)} placeholder="Name" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Purchase manager phone</CFormLabel>
                        <CFormInput value={companyForm.purchaseManagerPhone} onChange={(e) => updateCompanyForm('purchaseManagerPhone', e.target.value)} placeholder="Phone" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Purchase manager email</CFormLabel>
                        <CFormInput type="email" value={companyForm.purchaseManagerEmail} onChange={(e) => updateCompanyForm('purchaseManagerEmail', e.target.value)} placeholder="Email" />
                      </div>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>

              <CCard className="mb-0">
                <CCardHeader className="d-flex justify-content-between align-items-center">
                  <strong>Related Query</strong>
                  {queryId ? (
                    <CButton color="primary" size="sm" onClick={() => navigate(`/queries/${queryId}`)}>
                      View Query
                    </CButton>
                  ) : null}
                </CCardHeader>
                <CCardBody>
                  {queryId ? (
                    <p className="mb-0 text-muted">This quotation is linked to a query. Click "View Query" to open it.</p>
                  ) : (
                    <p className="mb-0 text-muted">No related query.</p>
                  )}
                  {quotation.remark && (
                    <div className="mt-3 pt-3 border-top">
                      <strong>Remark</strong>
                      <div className="mt-1">{quotation.remark}</div>
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Tab: Packing & Delivery */}
            <CTabPane visible={activeTab === 'packingDelivery'}>
              <CCard className="mb-4">
                <CCardHeader><strong>Packing &amp; Delivery</strong></CCardHeader>
                <CCardBody>
                  <CRow>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Freight Charge (₹)</CFormLabel>
                        <CFormInput
                          type="number"
                          min={0}
                          step="0.01"
                          value={packingDeliveryForm.freightCharge}
                          onChange={(e) => setPackingDeliveryForm((prev) => ({ ...prev, freightCharge: e.target.value === '' ? 0 : e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Packing Charge (₹)</CFormLabel>
                        <CFormInput
                          type="number"
                          min={0}
                          step="0.01"
                          value={packingDeliveryForm.packingCharge}
                          onChange={(e) => setPackingDeliveryForm((prev) => ({ ...prev, packingCharge: e.target.value === '' ? 0 : e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Expected Delivery Within (Days)</CFormLabel>
                        <CFormInput
                          type="number"
                          min={0}
                          step="1"
                          value={packingDeliveryForm.expectedDeliveryWithinDays}
                          onChange={(e) => setPackingDeliveryForm((prev) => ({ ...prev, expectedDeliveryWithinDays: e.target.value }))}
                          placeholder="Enter number of days"
                        />
                        <div className="small text-muted mt-1">Leave empty to show NA in PDF</div>
                      </div>
                    </CCol>
                  </CRow>
                  <CButton color="primary" onClick={handleSavePackingDelivery} disabled={savingPackingDelivery}>
                    {savingPackingDelivery ? <><CSpinner size="sm" className="me-2" />Saving...</> : 'Save'}
                  </CButton>
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Tab: Single Product Edit */}
            <CTabPane visible={activeTab === 'products'}>
              <CCard className="mb-4">
                <CCardHeader className="d-flex justify-content-between align-items-center">
                  <strong>Product Details</strong>
                  {products.length > 0 && (
                    <span className="text-muted small">
                      Product {Math.min(productIndex + 1, products.length)} of {products.length}
                    </span>
                  )}
                </CCardHeader>
                <CCardBody>
                  {products.length === 0 || !editingProduct ? (
                    <p className="text-muted mb-0">No products in this quotation.</p>
                  ) : (
                    <>
                      {isCurrentProductNotAvailable && (
                        <div className="alert alert-warning py-2 px-3 mb-3">
                          This product is marked as not available in Product List. Revoke it there to edit
                          this product again.
                        </div>
                      )}
                      <CRow>
                        <CCol md={4}>
                          <div className="mb-3">
                            <CFormLabel>Product Name</CFormLabel>
                            <CFormInput
                              value={editingProduct.productName || ''}
                              onChange={(e) => updateFormField('productName', e.target.value)}
                              placeholder="Product name"
                              disabled={isCurrentProductNotAvailable}
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Description</CFormLabel>
                            <CFormTextarea
                              rows={3}
                              value={editingProduct.description || ''}
                              onChange={(e) => updateFormField('description', e.target.value)}
                              placeholder="Description"
                              disabled={isCurrentProductNotAvailable}
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Remark</CFormLabel>
                            <CFormInput
                              value={editingProduct.remark || ''}
                              onChange={(e) => updateFormField('remark', e.target.value)}
                              placeholder="Remark"
                              disabled={isCurrentProductNotAvailable}
                            />
                          </div>
                        </CCol>
                        <CCol md={4}>
                          <div className="mb-3">
                            <CFormLabel>Quantity</CFormLabel>
                            <CFormInput
                              type="number"
                              min={0}
                              value={editingProduct.quantity ?? ''}
                              onChange={(e) => updateFormField('quantity', e.target.value)}
                              placeholder="Quantity"
                              disabled={isCurrentProductNotAvailable}
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Unit</CFormLabel>
                            <CFormInput
                              value={editingProduct.unit || ''}
                              onChange={(e) => updateFormField('unit', e.target.value)}
                              placeholder="Unit"
                              disabled={isCurrentProductNotAvailable}
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Rate (Rs)</CFormLabel>
                            <CFormInput
                              type="number"
                              min={0}
                              step="0.01"
                              value={editingProduct.rate ?? ''}
                              onChange={(e) => updateFormField('rate', e.target.value)}
                              placeholder="Rate"
                              disabled={isCurrentProductNotAvailable}
                            />
                          </div>
                        </CCol>
                        <CCol md={4}>
                          <div className="mb-3">
                            <CFormLabel>HSN Number</CFormLabel>
                            <CFormInput
                              value={editingProduct.hsnNumber || ''}
                              onChange={(e) => updateFormField('hsnNumber', e.target.value)}
                              placeholder="HSN Number"
                              disabled={isCurrentProductNotAvailable}
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Model Number</CFormLabel>
                            <CFormInput
                              value={editingProduct.modelNumber || ''}
                              onChange={(e) => updateFormField('modelNumber', e.target.value)}
                              placeholder="Model Number"
                              disabled={isCurrentProductNotAvailable}
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>GST %</CFormLabel>
                            <CFormInput
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              value={editingProduct.gstPercentage ?? ''}
                              onChange={(e) => updateFormField('gstPercentage', e.target.value)}
                              placeholder="GST %"
                              disabled={isCurrentProductNotAvailable}
                            />
                          </div>
                        </CCol>
                      </CRow>
                      <CRow className="mt-1">
                        <CCol md={12}>
                          <CFormLabel>Uploaded Images</CFormLabel>
                          {Array.isArray(editingProduct.images) && editingProduct.images.length > 0 ? (
                            <div className="d-flex flex-wrap gap-2 mb-3">
                              {editingProduct.images.map((img, index) => (
                                <div key={`edit-img-${index}`} className="position-relative border rounded overflow-hidden" style={{ width: 72, height: 72 }}>
                                  {getDocumentId(img) ? (
                                    <AuthImage
                                      documentId={getDocumentId(img)}
                                      fallbackUrl={getImageUrl(img)}
                                      alt=""
                                      className="w-100 h-100"
                                      style={{ objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <CImage
                                      src={getImageUrl(img)}
                                      alt=""
                                      className="w-100 h-100"
                                      style={{ objectFit: 'cover' }}
                                    />
                                  )}
                                  <CButton
                                    color="danger"
                                    size="sm"
                                    shape="rounded-pill"
                                    className="position-absolute d-flex align-items-center justify-content-center p-0"
                                    style={{ top: 4, right: 4, width: 20, height: 20, minWidth: 20 }}
                                    onClick={() => removeEditingProductImage(index)}
                                    title="Remove image"
                                    disabled={isCurrentProductNotAvailable}
                                  >
                                    <CIcon icon={cilX} size="sm" />
                                  </CButton>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="small text-muted mb-3">No uploaded image for this product.</div>
                          )}
                          <CFormInput
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={uploadingProductImages || isCurrentProductNotAvailable}
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || [])
                              if (!files.length) return
                              await uploadEditingProductImages(files)
                              e.target.value = ''
                            }}
                          />
                          <div className="small text-muted mt-1">
                            Remove old images with the cross icon, then upload new image(s).
                          </div>
                        </CCol>
                      </CRow>
                      <div className="mt-4 d-flex flex-wrap gap-2">
                        <CButton
                          color="secondary"
                          variant="outline"
                          disabled={updating || uploadingProductImages || productIndex <= 0}
                          onClick={() => setProductIndex((i) => Math.max(0, i - 1))}
                        >
                          <CIcon icon={cilArrowLeft} className="me-1" />
                          Previous
                        </CButton>
                        <CButton
                          color="primary"
                          disabled={updating || uploadingProductImages || isCurrentProductNotAvailable}
                          onClick={handleUpdateProduct}
                        >
                          {updating ? <><CSpinner size="sm" className="me-2" />Updating...</> : 'Update'}
                        </CButton>
                        <CButton
                          color="info"
                          variant="outline"
                          disabled={updating || uploadingProductImages || productIndex >= products.length - 1}
                          onClick={handleNextProduct}
                        >
                          Next
                          <CIcon icon={cilArrowRight} className="ms-1" />
                        </CButton>
                      </div>
                    </>
                  )}
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Tab: Add New Product */}
            <CTabPane visible={activeTab === 'addNewProduct'}>
              <CCard>
                <CCardHeader><strong>Add New Product</strong></CCardHeader>
                <CCardBody>
                  <CRow>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Product name *</CFormLabel>
                        <CFormInput value={newProductForm.productName} onChange={(e) => updateNewProductForm('productName', e.target.value)} placeholder="Product name" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Description</CFormLabel>
                        <CFormTextarea rows={3} value={newProductForm.description} onChange={(e) => updateNewProductForm('description', e.target.value)} placeholder="Description" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Quantity *</CFormLabel>
                        <CFormInput type="number" min={1} value={newProductForm.quantity} onChange={(e) => updateNewProductForm('quantity', e.target.value)} placeholder="Quantity" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Unit</CFormLabel>
                        <CFormInput value={newProductForm.unit} onChange={(e) => updateNewProductForm('unit', e.target.value)} placeholder="Unit" />
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>HSN Number</CFormLabel>
                        <CFormInput value={newProductForm.hsnNumber} onChange={(e) => updateNewProductForm('hsnNumber', e.target.value)} placeholder="HSN" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Model Number</CFormLabel>
                        <CFormInput value={newProductForm.modelNumber} onChange={(e) => updateNewProductForm('modelNumber', e.target.value)} placeholder="Model" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>GST %</CFormLabel>
                        <CFormInput type="number" min={0} max={100} value={newProductForm.gstPercentage} onChange={(e) => updateNewProductForm('gstPercentage', e.target.value)} placeholder="GST %" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Remark</CFormLabel>
                        <CFormInput value={newProductForm.remark} onChange={(e) => updateNewProductForm('remark', e.target.value)} placeholder="Remark" />
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Rate (₹)</CFormLabel>
                        <CFormInput type="number" min={0} step="0.01" value={newProductForm.rate} onChange={(e) => updateNewProductForm('rate', e.target.value)} placeholder="Rate" />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Total (₹)</CFormLabel>
                        <CFormInput
                          type="text"
                          readOnly
                          value={
                            newProductForm.quantity !== '' && newProductForm.rate !== '' && !Number.isNaN(Number(newProductForm.quantity)) && !Number.isNaN(Number(newProductForm.rate))
                              ? (Number(newProductForm.quantity) * Number(newProductForm.rate)).toFixed(2)
                              : ''
                          }
                          placeholder="Qty × Rate"
                        />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Upload Images</CFormLabel>
                        <CFormInput
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            if (!files.length) return
                            setNewProductImageFiles((prev) => [...prev, ...files])
                            setNewProductImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
                          }}
                        />
                        {newProductImagePreviews.length > 0 && (
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {newProductImagePreviews.map((src, idx) => (
                              <CImage key={idx} src={src} alt="" width={48} height={48} className="border rounded" style={{ objectFit: 'cover' }} />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <CFormCheck
                          id="create-new-query-product"
                          label="Create New Query Product (same as in Query)"
                          checked={!!createNewQueryProduct}
                          onChange={(e) => setCreateNewQueryProduct(e.target.checked)}
                        />
                      </div>
                    </CCol>
                  </CRow>
                  <div className="mt-3">
                    <CButton color="primary" onClick={handleAddNewProduct} disabled={addingNewProduct}>
                      {addingNewProduct ? <><CSpinner size="sm" className="me-2" />Adding...</> : 'Add Product'}
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Tab 3: Product List - bordered table */}
            <CTabPane visible={activeTab === 'productList'}>
              <div style={{ fontSize: '0.9rem' }}>
              {products.length > 0 ? (
                <>
                  <CTable responsive hover bordered className="table-fixed">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell className="text-center" style={{ width: 40 }}>#</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: 140, maxWidth: 180 }}>Product name / Description</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 52 }}>Qty</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 56 }}>Unit</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 72 }}>HSN</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 72 }}>Model</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 82 }}>GST %</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 160 }}>Images</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 101 }}>Rate (₹)</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 85 }}>Discount</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 112 }}>Total (₹)</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 100 }}>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {products.map((p, idx) => {
                        const productRef = typeof p.product_id === 'object' ? p.product_id : null
                        const allImages = Array.isArray(p.images) ? p.images : (productRef?.images || [])
                        const imageUrls = allImages.map((img) => getImageUrl(img)).filter((src) => !!src)
                        const desc = (p.description || productRef?.shortDescription || p.remark || '').trim()
                        const rateVal = getListRate(idx)
                        const totalVal = getListTotal(idx)
                        const hasRate = !p.notAvailable && rateVal !== '' && rateVal != null && !Number.isNaN(Number(rateVal))
                        const rowBg = p.notAvailable ? { backgroundColor: '#e9ecef' } : hasRate ? { backgroundColor: '#d4edda' } : { backgroundColor: '#ffe8cc' }
                        const applyDiscount = getListApplyDiscount(idx)
                        const discountPctVal = getListDiscountPct(idx)
                        return (
                          <CTableRow key={idx} style={rowBg}>
                            <CTableDataCell className="text-center">{idx + 1}</CTableDataCell>
                            <CTableDataCell style={{ width: 140, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <div className="text-truncate" title={p.productName || ''}>{p.productName || '–'}</div>
                              {desc ? <div className="small text-muted text-truncate" style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap' }} title={String(desc)}>{String(desc).slice(0, 120)}{desc.length > 120 ? '…' : ''}</div> : null}
                              {p.notAvailable && (p.notAvailableRemark ? <div className="small text-danger mt-1" title={p.notAvailableRemark}>Not available: {String(p.notAvailableRemark).slice(0, 60)}{p.notAvailableRemark.length > 60 ? '…' : ''}</div> : <div className="small text-danger mt-1">Not available</div>)}
                            </CTableDataCell>
                            <CTableDataCell className="text-center py-1 small" style={{ width: 52 }}>{p.quantity ?? '–'}</CTableDataCell>
                            <CTableDataCell className="text-center py-1 small" style={{ width: 56 }}>{p.unit || '–'}</CTableDataCell>
                            <CTableDataCell className="small text-center py-1">{productRef?.hsnNumber || p.hsnNumber || '–'}</CTableDataCell>
                            <CTableDataCell className="small text-center">{productRef?.modelNumber || productRef?.defaultModelNumber || p.modelNumber || '–'}</CTableDataCell>
                            <CTableDataCell className="text-center py-1">
                              <CFormInput
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                size="sm"
                                className="form-control-sm"
                                style={{ width: 109, minHeight: 28, fontSize: '0.75rem' }}
                                value={getListGst(idx)}
                                onChange={(e) => setListGst(idx, e.target.value)}
                                placeholder="%"
                                title="GST % (required, 0–100)"
                                disabled={!!p.notAvailable}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-center py-1">
                              {allImages.length > 0 ? (
                                <div className="d-flex flex-wrap gap-1 justify-content-center align-items-center">
                                  {allImages.slice(0, 2).map((img, i) => (
                                    <div
                                      key={i}
                                      role="button"
                                      tabIndex={0}
                                      className="rounded overflow-hidden border"
                                      style={{ width: 64, height: 64, cursor: 'pointer' }}
                                      onClick={() => openImageGallery(allImages, i)}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openImageGallery(allImages, i) } }}
                                    >
                                      {getDocumentId(img) ? (
                                        <AuthImage documentId={getDocumentId(img)} fallbackUrl={getImageUrl(img)} alt="" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                                      ) : (
                                        <CImage src={getImageUrl(img)} alt="" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                                      )}
                                    </div>
                                  ))}
                                  {allImages.length > 2 && (
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      className="d-flex align-items-center justify-content-center rounded border bg-light text-primary fw-bold"
                                      style={{ width: 64, height: 64, fontSize: '1.25rem', cursor: 'pointer' }}
                                      onClick={() => openImageGallery(allImages, 2)}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openImageGallery(allImages, 2) } }}
                                      title={`${allImages.length - 2} more`}
                                    >
                                      +
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted small">–</span>
                              )}
                            </CTableDataCell>
                            <CTableDataCell className="text-center py-1">
                              <CFormInput
                                type="number"
                                min={0}
                                step="0.01"
                                size="sm"
                                className="form-control-sm"
                                style={{ width: 140, minHeight: 28, fontSize: '0.75rem' }}
                                value={rateVal}
                                onChange={(e) => setListRate(idx, e.target.value)}
                                placeholder="Rate"
                                disabled={!!p.notAvailable}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-center py-1">
                              <div className="d-flex align-items-center gap-1 justify-content-center flex-wrap">
                                <CFormCheck
                                  id={`discount-cb-${idx}`}
                                  checked={!!applyDiscount}
                                  onChange={(e) => setListApplyDiscount(idx, e.target.checked)}
                                  disabled={!!p.notAvailable}
                                  style={{ cursor: 'pointer' }}
                                />
                                <CFormLabel htmlFor={`discount-cb-${idx}`} className="mb-0 small" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>Apply</CFormLabel>
                                {applyDiscount && (
                                  <CFormInput
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    size="sm"
                                    className="form-control-sm"
                                    style={{ width: 72, fontSize: '0.75rem' }}
                                    value={discountPctVal}
                                    onChange={(e) => setListDiscountPct(idx, e.target.value)}
                                    placeholder="%"
                                  />
                                )}
                              </div>
                            </CTableDataCell>
                            <CTableDataCell className="text-center py-1">
                              <CFormInput
                                type="number"
                                min={0}
                                step="0.01"
                                size="sm"
                                className="form-control-sm"
                                style={{ width: 110, minHeight: 28, fontSize: '0.75rem' }}
                                value={totalVal}
                                onChange={(e) => setListTotal(idx, e.target.value)}
                                placeholder="Total"
                                disabled={!!p.notAvailable}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-center py-1">
                              <div className="d-flex flex-column gap-1 align-items-center">
                                {!p.notAvailable ? (
                                  <>
                                    <CButton color="warning" size="sm" className="w-100" style={{ minWidth: 90, fontSize: '0.75rem' }} onClick={() => { setNotAvailableModalIndex(idx); setNotAvailableRemark(''); setNotAvailableModalVisible(true) }}>
                                      Not available
                                    </CButton>
                                    <CButton color="primary" size="sm" className="w-100" style={{ minWidth: 90, fontSize: '0.75rem' }} onClick={() => handleUpdateProductFromList(idx)} disabled={updating}>
                                      Update
                                    </CButton>
                                    <CButton
                                      color="danger"
                                      size="sm"
                                      className="w-100"
                                      style={{ minWidth: 90, fontSize: '0.75rem' }}
                                      onClick={() => openDeleteProductModal(idx)}
                                      disabled={updating}
                                    >
                                      Delete
                                    </CButton>
                                  </>
                                ) : (
                                  <>
                                    <CButton color="success" size="sm" className="w-100" style={{ minWidth: 90, fontSize: '0.75rem' }} onClick={() => handleRevokeNotAvailable(idx)} disabled={updating}>
                                      Revoke
                                    </CButton>
                                    <CButton color="primary" size="sm" className="w-100" style={{ minWidth: 90, fontSize: '0.75rem' }} onClick={() => handleUpdateProductFromList(idx)} disabled={updating}>
                                      Update
                                    </CButton>
                                    <CButton
                                      color="danger"
                                      size="sm"
                                      className="w-100"
                                      style={{ minWidth: 90, fontSize: '0.75rem' }}
                                      onClick={() => openDeleteProductModal(idx)}
                                      disabled={updating}
                                    >
                                      Delete
                                    </CButton>
                                  </>
                                )}
                              </div>
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                  {products.length > 0 && (
                    <div className="mt-3 text-end border-top pt-3">
                      <p className="mb-1"><strong>Total (Taxable):</strong> ₹{calculatedTotalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="mb-1"><strong>GST Amount:</strong> ₹{calculatedTotalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="mb-0 fs-5"><strong>Total Amount:</strong> ₹{calculatedTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted mb-0">No products in this quotation.</p>
              )}
              </div>
            </CTabPane>

          </CTabContent>
        </CCardBody>
      </CCard>
      <QuoteLogsSidebar
        refreshKey={quoteLogsRefreshKey}
        isOpen={quoteLogsOpen}
        onToggle={() => setQuoteLogsOpen((prev) => !prev)}
        showFloatingToggle={false}
      />

      <CModal visible={assignTaskModalVisible} onClose={() => setAssignTaskModalVisible(false)}>
        <CModalHeader>
          <CModalTitle>Assign Task</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Target Rate (₹)</CFormLabel>
            <CFormInput
              type="number"
              min={0}
              step="0.01"
              placeholder="Optional"
              value={assignTaskTargetRate}
              onChange={(e) => setAssignTaskTargetRate(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Due Date</CFormLabel>
            <CFormInput
              type="date"
              placeholder="Optional"
              value={assignTaskDueDate}
              onChange={(e) => setAssignTaskDueDate(e.target.value)}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setAssignTaskModalVisible(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleAssignTask} disabled={assigningTask}>
            {assigningTask ? <><CSpinner size="sm" className="me-2" />Assigning...</> : 'Assign'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={imageGalleryVisible} onClose={closeImageGallery} alignment="center" size="xl">
        <CModalHeader>
          <CModalTitle>Images</CModalTitle>
        </CModalHeader>
        <CModalBody className="d-flex align-items-center justify-content-center position-relative" style={{ minHeight: 320 }}>
          {imageGalleryImages.length > 0 && (
            <>
              <CButton
                color="light"
                className="position-absolute start-0 top-50 translate-middle-y rounded-circle shadow-sm"
                style={{ zIndex: 2, width: 48, height: 48 }}
                onClick={imageGalleryPrev}
                aria-label="Previous"
              >
                <CIcon icon={cilArrowLeft} />
              </CButton>
              <div className="flex-grow-1 d-flex justify-content-center align-items-center mx-5" style={{ maxHeight: '70vh' }}>
                <AuthImage
                  key={imageGalleryIndex}
                  documentId={getDocumentId(imageGalleryImages[imageGalleryIndex])}
                  fallbackUrl={getImageUrl(imageGalleryImages[imageGalleryIndex])}
                  alt=""
                  className="img-fluid"
                  style={{ maxHeight: '70vh', objectFit: 'contain' }}
                />
              </div>
              <CButton
                color="light"
                className="position-absolute end-0 top-50 translate-middle-y rounded-circle shadow-sm"
                style={{ zIndex: 2, width: 48, height: 48 }}
                onClick={imageGalleryNext}
                aria-label="Next"
              >
                <CIcon icon={cilArrowRight} />
              </CButton>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <span className="me-auto text-muted small">
            {imageGalleryImages.length > 0 ? `${imageGalleryIndex + 1} / ${imageGalleryImages.length}` : ''}
          </span>
          <CButton color="secondary" onClick={closeImageGallery}>Close</CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={productListAssignModalVisible} onClose={() => setProductListAssignModalVisible(false)}>
        <CModalHeader>
          <CModalTitle>Assign Task to Selected Products</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Select Purchase Employee *</CFormLabel>
            <CFormSelect
              value={productListAssignEmployeeId}
              onChange={(e) => setProductListAssignEmployeeId(e.target.value)}
            >
              <option value="">-- Select Employee --</option>
              {purchaseEmployees.map((emp) => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.name || emp.email || '–'}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div className="mb-3">
            <CFormLabel>Due Date</CFormLabel>
            <CFormInput
              type="date"
              value={productListAssignDueDate}
              onChange={(e) => setProductListAssignDueDate(e.target.value)}
            />
          </div>
          <p className="small text-muted mb-0">
            {productListSelectedIndices().length} product(s) selected. One task will be created per product.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setProductListAssignModalVisible(false)}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleProductListAssignTask}
            disabled={productListAssigningTask || !productListAssignEmployeeId}
          >
            {productListAssigningTask ? <><CSpinner size="sm" className="me-2" />Assigning...</> : 'Assign'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={deleteProductModalVisible}
        onClose={() => { setDeleteProductModalVisible(false); setDeleteProductIndex(null) }}
      >
        <CModalHeader>
          <CModalTitle>Delete product</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete this product from the quotation?
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => { setDeleteProductModalVisible(false); setDeleteProductIndex(null) }}
            disabled={updating}
          >
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleConfirmDeleteProduct} disabled={updating}>
            {updating ? <><CSpinner size="sm" className="me-2" />Deleting...</> : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={notAvailableModalVisible} onClose={() => { setNotAvailableModalVisible(false); setNotAvailableModalIndex(null); setNotAvailableRemark('') }}>
        <CModalHeader>
          <CModalTitle>Mark product as Not Available</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="text-muted small mb-2">Add a remark for why this product is not available. The product will be saved without a rate and you can still create the quotation.</p>
          <CFormLabel>Remark *</CFormLabel>
          <CFormTextarea
            rows={3}
            value={notAvailableRemark}
            onChange={(e) => setNotAvailableRemark(e.target.value)}
            placeholder="e.g. Out of stock, discontinued, etc."
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setNotAvailableModalVisible(false); setNotAvailableModalIndex(null); setNotAvailableRemark('') }}>
            Cancel
          </CButton>
          <CButton color="warning" onClick={handleSaveNotAvailable} disabled={updating || !notAvailableRemark.trim()}>
            {updating ? <><CSpinner size="sm" className="me-2" />Saving...</> : 'Save & mark Not available'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default QuotationView
