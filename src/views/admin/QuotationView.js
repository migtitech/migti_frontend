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
import { cilArrowLeft, cilArrowRight, cilCloudDownload, cilEnvelopeClosed } from '@coreui/icons'
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
  const [productListRateEdits, setProductListRateEdits] = useState({})
  const [productListGstEdits, setProductListGstEdits] = useState({})
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
    expectedDeliveryDate: '',
  })
  const [savingPackingDelivery, setSavingPackingDelivery] = useState(false)

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
  const queryId = quotation?.queryId?._id ?? quotation?.queryId
  const hasRate = (p) => p.rate != null && !Number.isNaN(Number(p.rate)) && Number(p.rate) >= 0
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
      const expDate = quotation.expectedDeliveryDate
      setPackingDeliveryForm({
        freightCharge: typeof freight === 'number' ? freight : (Number(freight) || 0),
        packingCharge: typeof packing === 'number' ? packing : (Number(packing) || 0),
        expectedDeliveryDate: expDate ? new Date(expDate).toISOString().slice(0, 10) : '',
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
        expectedDeliveryDate: packingDeliveryForm.expectedDeliveryDate ? new Date(packingDeliveryForm.expectedDeliveryDate).toISOString() : null,
      })
      const data = res?.data?.data ?? res?.data ?? res
      if (data) {
        setQuotation((prev) => (prev ? {
          ...prev,
          freightCharge: data.freightCharge ?? packingDeliveryForm.freightCharge,
          packingCharge: data.packingCharge ?? packingDeliveryForm.packingCharge,
          expectedDeliveryDate: data.expectedDeliveryDate ?? (packingDeliveryForm.expectedDeliveryDate || null),
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
        images: p.images || [],
      })
    } else {
      setEditingProduct(null)
    }
  }, [productIndex, products])

  useEffect(() => {
    if (activeTab !== 'products' && activeTab !== 'productList') return
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
  const getListTotal = (idx) => {
    const p = products[idx]
    const qty = Number(p?.quantity) ?? 0
    const rate = getListRate(idx)
    const r = rate === '' || rate == null ? 0 : (Number.isNaN(Number(rate)) ? 0 : Number(rate))
    return qty > 0 ? qty * r : 0
  }
  const setListRate = (idx, val) => setProductListRateEdits((prev) => ({ ...prev, [idx]: val }))

  const calculatedTotalTaxable = products.reduce((sum, p, idx) => {
    const qty = Number(p?.quantity) ?? 0
    const rateVal = getListRate(idx)
    const rate = rateVal !== '' && rateVal != null && !Number.isNaN(Number(rateVal)) ? Number(rateVal) : 0
    return sum + qty * rate
  }, 0)
  const calculatedTotalGst = products.reduce((sum, p, idx) => {
    const qty = Number(p?.quantity) ?? 0
    const rateVal = getListRate(idx)
    const gstVal = getListGst(idx)
    const rate = rateVal !== '' && rateVal != null && !Number.isNaN(Number(rateVal)) ? Number(rateVal) : 0
    const gstPct = gstVal !== '' && !Number.isNaN(Number(gstVal)) ? Number(gstVal) : (p?.gstPercentage ?? (typeof p.product_id === 'object' ? p.product_id?.gstPercentage : null) ?? 0)
    const lineTotal = qty * rate
    return sum + lineTotal * (gstPct / 100)
  }, 0)
  const calculatedTotalAmount = calculatedTotalTaxable + calculatedTotalGst
  const setListTotal = (idx, totalVal) => {
    const p = products[idx]
    const qty = Number(p?.quantity) ?? 0
    if (qty <= 0) return
    const t = Number(totalVal)
    if (Number.isNaN(t) || totalVal === '') return
    setListRate(idx, t / qty)
  }

  const handleUpdateProductFromList = async (idx) => {
    if (!quotation?.id || !products[idx]) return
    const rateVal = getListRate(idx)
    const gstVal = getListGst(idx)
    const gstNum = gstVal !== '' && !Number.isNaN(Number(gstVal)) ? Number(gstVal) : null
    if (gstVal === '' || gstNum === null) {
      toastError('GST % is required. Enter a value between 0 and 100.')
      return
    }
    if (gstNum < 0 || gstNum > 100) {
      toastError('GST % must be between 0 and 100.')
      return
    }
    const r = rateVal !== '' && !Number.isNaN(Number(rateVal)) ? Number(rateVal) : (products[idx]?.rate ?? null)
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
      ...override,
    })
    const updatedProducts = products.map((p, i) =>
      i === idx ? toProductPayload(p, { rate: r, gstPercentage: gstNum }) : toProductPayload(p)
    )
    setUpdating(true)
    try {
      const res = await quotationService.update(quotation.id, { products: updatedProducts })
      const data = res?.data?.data ?? res?.data ?? res
      if (data?.products) {
        setQuotation((prev) => (prev ? { ...prev, products: data.products } : null))
        setProductListRateEdits((prev) => { const next = { ...prev }; delete next[idx]; return next })
        setProductListGstEdits((prev) => { const next = { ...prev }; delete next[idx]; return next })
      } else {
        setQuotation((prev) => (prev ? { ...prev, products: updatedProducts } : null))
      }
      toastSuccess('Rate and GST updated')
    } catch (err) {
      toastError(err?.message || 'Failed to update rate')
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
      case 'draft':
        return <CBadge color="secondary">Draft</CBadge>
      case 'hod_approved':
        return <CBadge color="success">HOD Approved</CBadge>
      case 'sent':
      case 'sentToClient':
        return <CBadge color="info">Sent</CBadge>
      case 'accepted':
        return <CBadge color="success">Accepted</CBadge>
      case 'rejected':
        return <CBadge color="danger">Rejected</CBadge>
      case 'expired':
        return <CBadge color="warning">Expired</CBadge>
      default:
        return <CBadge color="secondary">{status}</CBadge>
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
      <CRow className="mb-3">
        <CCol className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <CButton color="secondary" variant="outline" onClick={() => navigate('/quotations')}>
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back to Quotations
            </CButton>
            <CBadge color="info" className="fs-6 px-3 py-2">
              {quotation.quotationCode || `QT-${String(quotation.id).slice(-6)}`}
            </CBadge>
            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded bg-light border">
              <span className="small fw-bold text-uppercase text-muted">Status</span>
              {getStatusBadge(quotation.status)}
            </div>
          </div>
          <div className="d-flex align-items-center gap-3 flex-grow-1 flex-wrap justify-content-center" style={{ minWidth: 0, maxWidth: 600 }}>
            <span className="text-nowrap fw-bold text-secondary">Total: {products.length}</span>
            <span className="text-nowrap fw-bold text-success">With Rate: {productsWithRate.length}</span>
            <span className="text-nowrap fw-bold" style={{ color: '#fd7e14' }}>Without Rate: {productsWithoutRate.length}</span>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <CButton
              color="primary"
              variant="outline"
              onClick={handleMarkApproved}
              disabled={isHodApproved}
            >
              Mark Approved
            </CButton>
            <CButton color="success" onClick={handleDownloadProductsPdf} disabled={exportingPdf || !productsWithRate.length}>
              {exportingPdf && <CSpinner size="sm" className="me-2" />}
              {!exportingPdf && <CIcon icon={cilCloudDownload} className="me-2" />}
              {exportingPdf ? 'Generating PDF...' : 'Download PDF'}
            </CButton>
            <CButton color="info" disabled={!isHodApproved}>
              <CIcon icon={cilEnvelopeClosed} className="me-2" />
              Send to Customer
            </CButton>
          </div>
        </CCol>
      </CRow>

      <CCard className="mb-4">
        <CCardHeader>
          <CNav variant="tabs" role="tablist">
            <CNavItem>
              <CNavLink active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} style={{ cursor: 'pointer' }}>
                Preview
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'company'} onClick={() => setActiveTab('company')} style={{ cursor: 'pointer' }}>
                Company Information
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'packingDelivery'} onClick={() => setActiveTab('packingDelivery')} style={{ cursor: 'pointer' }}>
                Packing &amp; Delivery
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'products'} onClick={() => setActiveTab('products')} style={{ cursor: 'pointer' }}>
                Products ({products.length})
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'addNewProduct'} onClick={() => setActiveTab('addNewProduct')} style={{ cursor: 'pointer' }}>
                Add New Product
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'productList'} onClick={() => setActiveTab('productList')} style={{ cursor: 'pointer' }}>
                Product List ({products.length})
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'withRate'} onClick={() => setActiveTab('withRate')} style={{ cursor: 'pointer' }}>
                Products with Rate ({productsWithRate.length})
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'withoutRate'} onClick={() => setActiveTab('withoutRate')} style={{ cursor: 'pointer' }}>
                Products without Rate ({productsWithoutRate.length})
              </CNavLink>
            </CNavItem>
          </CNav>
        </CCardHeader>
        <CCardBody>
          <CTabContent>
            {/* Tab 0: Preview - read-only full quotation */}
            <CTabPane visible={activeTab === 'preview'}>
              <CCard className="mb-4">
                <CCardHeader className="bg-light"><strong>Quotation Preview</strong> — All information at a glance (read-only)</CCardHeader>
                <CCardBody>
                  {/* Quotation meta */}
                  <div className="mb-4 pb-3 border-bottom">
                    <h6 className="text-muted text-uppercase small mb-2">Quotation Details</h6>
                    <CRow>
                      <CCol md={3}><strong>Quotation No.</strong></CCol>
                      <CCol md={9}>{quotation?.quotationCode || `QT-${String(quotation?.id || '').slice(-6)}` || '–'}</CCol>
                      <CCol md={3}><strong>Status</strong></CCol>
                      <CCol md={9}><CBadge color="info">{quotation?.status || '–'}</CBadge></CCol>
                      <CCol md={3}><strong>Quotation Date</strong></CCol>
                      <CCol md={9}>{quotation?.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : '–'}</CCol>
                      {queryId && (
                        <>
                          <CCol md={3}><strong>Related Query</strong></CCol>
                          <CCol md={9}>
                            <CButton color="link" className="p-0" onClick={() => navigate(`/queries/${queryId}`)}>View Query</CButton>
                          </CCol>
                        </>
                      )}
                      {quotation?.remark && (
                        <>
                          <CCol md={3}><strong>Remark</strong></CCol>
                          <CCol md={9}>{quotation.remark}</CCol>
                        </>
                      )}
                    </CRow>
                  </div>

                  {/* Company information */}
                  <div className="mb-4 pb-3 border-bottom">
                    <h6 className="text-muted text-uppercase small mb-2">Company Information</h6>
                    <CRow>
                      <CCol md={4}>
                        <p className="mb-1"><strong>Company name</strong></p>
                        <p className="text-body mb-3">{companyForm.name || '–'}</p>
                        <p className="mb-1"><strong>Location</strong></p>
                        <p className="text-body mb-3">{companyForm.location || '–'}</p>
                        <p className="mb-1"><strong>Zone</strong></p>
                        <p className="text-body mb-0">{(zoneNameDisplay ?? companyForm.area) || '–'}</p>
                      </CCol>
                      <CCol md={4}>
                        <p className="mb-1"><strong>Address</strong></p>
                        <p className="text-body mb-3" style={{ whiteSpace: 'pre-wrap' }}>{companyForm.address || '–'}</p>
                      </CCol>
                      <CCol md={4}>
                        <p className="mb-1"><strong>Purchase manager name</strong></p>
                        <p className="text-body mb-3">{companyForm.purchaseManagerName || '–'}</p>
                        <p className="mb-1"><strong>Purchase manager phone</strong></p>
                        <p className="text-body mb-3">{companyForm.purchaseManagerPhone || '–'}</p>
                        <p className="mb-1"><strong>Purchase manager email</strong></p>
                        <p className="text-body mb-0">{companyForm.purchaseManagerEmail || '–'}</p>
                      </CCol>
                    </CRow>
                  </div>

                  {/* Contact (Migti) */}
                  <div className="mb-4 pb-3 border-bottom">
                    <h6 className="text-muted text-uppercase small mb-2">Contact</h6>
                    <CRow>
                      <CCol md={6}>
                        <p className="mb-1"><strong>Email</strong></p>
                        <p className="text-body mb-0">info@migti.co.in</p>
                      </CCol>
                      <CCol md={6}>
                        <p className="mb-1"><strong>Phone</strong></p>
                        <p className="text-body mb-0">+91 9220199533<br />+91 9971117391</p>
                      </CCol>
                    </CRow>
                  </div>

                  {/* Products table */}
                  <div className="mb-4">
                    <h6 className="text-muted text-uppercase small mb-2">Products</h6>
                    {products.length > 0 ? (
                      <>
                        <CTable responsive hover bordered size="sm">
                          <CTableHead>
                            <CTableRow>
                              <CTableHeaderCell className="text-center">#</CTableHeaderCell>
                              <CTableHeaderCell>Product name</CTableHeaderCell>
                              <CTableHeaderCell className="text-center" style={{ width: 100 }}>Images</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">Qty</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">Unit</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">HSN</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">Model</CTableHeaderCell>
                              <CTableHeaderCell className="text-center">GST %</CTableHeaderCell>
                              <CTableHeaderCell className="text-end">Rate (₹)</CTableHeaderCell>
                              <CTableHeaderCell className="text-end">Total Amount (₹)</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {products.map((p, idx) => {
                              const productRef = typeof p.product_id === 'object' ? p.product_id : null
                              const allImages = Array.isArray(p?.images) ? p.images : (productRef?.images || [])
                              const rateVal = getListRate(idx)
                              const gstVal = getListGst(idx)
                              const rate = rateVal !== '' && rateVal != null && !Number.isNaN(Number(rateVal)) ? Number(rateVal) : (Number(p?.rate) || 0)
                              const gstPct = gstVal !== '' && !Number.isNaN(Number(gstVal)) ? Number(gstVal) : (p?.gstPercentage ?? productRef?.gstPercentage ?? 0)
                              const qty = Number(p?.quantity) || 0
                              const total = qty * rate
                              const gstAmount = total * (gstPct / 100)
                              return (
                                <CTableRow key={idx}>
                                  <CTableDataCell className="text-center">{idx + 1}</CTableDataCell>
                                  <CTableDataCell>
                                    <div>{p.productName || '–'}</div>
                                    {(p.description || productRef?.shortDescription) ? (
                                      <div className="small text-muted" style={{ whiteSpace: 'pre-wrap' }}>{p.description || productRef?.shortDescription || ''}</div>
                                    ) : null}
                                    {p.remark ? <div className="small text-muted">{p.remark}</div> : null}
                                  </CTableDataCell>
                                  <CTableDataCell className="text-center align-middle">
                                    {allImages.length > 0 ? (
                                      <div className="d-flex flex-wrap gap-1 justify-content-center align-items-center">
                                        {allImages.slice(0, 2).map((img, i) => (
                                          <div
                                            key={i}
                                            role="button"
                                            tabIndex={0}
                                            className="rounded overflow-hidden border"
                                            style={{ width: 48, height: 48, cursor: 'pointer' }}
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
                                            className="d-flex align-items-center justify-content-center rounded border bg-light text-primary small fw-bold"
                                            style={{ width: 48, height: 48, cursor: 'pointer', fontSize: '0.75rem' }}
                                            onClick={() => openImageGallery(allImages, 2)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openImageGallery(allImages, 2) } }}
                                            title={`${allImages.length - 2} more`}
                                          >
                                            +{allImages.length - 2}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted small">–</span>
                                    )}
                                  </CTableDataCell>
                                  <CTableDataCell className="text-center">{p.quantity ?? '–'}</CTableDataCell>
                                  <CTableDataCell className="text-center">{p.unit || '–'}</CTableDataCell>
                                  <CTableDataCell className="text-center">{productRef?.hsnNumber || p.hsnNumber || '–'}</CTableDataCell>
                                  <CTableDataCell className="text-center">{productRef?.modelNumber || productRef?.defaultModelNumber || p.modelNumber || '–'}</CTableDataCell>
                                  <CTableDataCell className="text-center">{gstPct != null ? `${Number(gstPct).toFixed(2)}%` : '–'}</CTableDataCell>
                                  <CTableDataCell className="text-end">{rate ? rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '–'}</CTableDataCell>
                                  <CTableDataCell className="text-end">{total ? total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '–'}</CTableDataCell>
                                </CTableRow>
                              )
                            })}
                          </CTableBody>
                        </CTable>
                        {(() => {
                          const totTaxable = products.reduce((sum, p, i) => {
                            const r = getListRate(i)
                            const rate = r !== '' && r != null && !Number.isNaN(Number(r)) ? Number(r) : (Number(products[i]?.rate) || 0)
                            return sum + (Number(p?.quantity) || 0) * rate
                          }, 0)
                          const totGst = products.reduce((sum, p, i) => {
                            const r = getListRate(i)
                            const g = getListGst(i)
                            const rate = r !== '' && r != null && !Number.isNaN(Number(r)) ? Number(r) : (Number(products[i]?.rate) || 0)
                            const gstPct = g !== '' && !Number.isNaN(Number(g)) ? Number(g) : (p?.gstPercentage ?? (typeof p.product_id === 'object' ? p.product_id?.gstPercentage : null) ?? 0)
                            const lineTotal = (Number(p?.quantity) || 0) * rate
                            return sum + lineTotal * (gstPct / 100)
                          }, 0)
                          const grandTotal = totTaxable + totGst
                          return (
                            <div className="mt-3 text-end border-top pt-3">
                              <p className="mb-1"><strong>Total (Taxable):</strong> ₹{totTaxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              <p className="mb-1"><strong>GST Amount:</strong> ₹{totGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              <p className="mb-0 fs-5"><strong>Total Amount:</strong> ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                          )
                        })()}
                      </>
                    ) : (
                      <p className="text-muted mb-0">No products in this quotation.</p>
                    )}
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
                        <CFormLabel>Expected Delivery Date</CFormLabel>
                        <CFormInput
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={packingDeliveryForm.expectedDeliveryDate}
                          onChange={(e) => setPackingDeliveryForm((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                          title="Leave empty for NA"
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

            {/* Tab 2: Products - one at a time, editable, 3 columns */}
            <CTabPane visible={activeTab === 'products'}>
              {products.length > 0 && editingProduct ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <CButton
                      color="secondary"
                      variant="outline"
                      disabled={productIndex <= 0}
                      onClick={() => setProductIndex((i) => Math.max(0, i - 1))}
                    >
                      <CIcon icon={cilArrowLeft} className="me-1" />
                      Previous
                    </CButton>
                    <span className="fw-bold">
                      {Math.min(productIndex + 1, products.length)} / {products.length}
                    </span>
                    <CButton
                      color="secondary"
                      variant="outline"
                      disabled={productIndex >= products.length - 1 || updating}
                      onClick={handleNextProduct}
                    >
                      {updating ? 'Saving...' : 'Next'}
                      <CIcon icon={cilArrowRight} className="ms-1" />
                    </CButton>
                  </div>
                  <CCard>
                    <CCardBody>
                      <CRow>
                        <CCol md={4}>
                          <div className="mb-3">
                            <CFormLabel>Product name</CFormLabel>
                            <CFormInput value={editingProduct.productName} onChange={(e) => updateFormField('productName', e.target.value)} placeholder="Product name" />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Description</CFormLabel>
                            <CFormTextarea rows={3} value={editingProduct.description} onChange={(e) => updateFormField('description', e.target.value)} placeholder="Description" />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Quantity</CFormLabel>
                            <CFormInput type="number" min={0} value={editingProduct.quantity} onChange={(e) => updateFormField('quantity', e.target.value)} placeholder="Quantity" />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Unit</CFormLabel>
                            <CFormInput value={editingProduct.unit} onChange={(e) => updateFormField('unit', e.target.value)} placeholder="Unit" />
                          </div>
                        </CCol>
                        <CCol md={4}>
                          <div className="mb-3">
                            <CFormLabel>HSN Number</CFormLabel>
                            <CFormInput value={editingProduct.hsnNumber} onChange={(e) => updateFormField('hsnNumber', e.target.value)} placeholder="HSN" />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Model Number</CFormLabel>
                            <CFormInput value={editingProduct.modelNumber} onChange={(e) => updateFormField('modelNumber', e.target.value)} placeholder="Model" />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>GST %</CFormLabel>
                            <CFormInput type="number" min={0} max={100} value={editingProduct.gstPercentage} onChange={(e) => updateFormField('gstPercentage', e.target.value)} placeholder="GST %" />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Remark</CFormLabel>
                            <CFormInput value={editingProduct.remark} onChange={(e) => updateFormField('remark', e.target.value)} placeholder="Remark" />
                          </div>
                        </CCol>
                        <CCol md={4}>
                          {(() => {
                            const p = products[Math.min(productIndex, products.length - 1)]
                            const productRef = typeof p?.product_id === 'object' ? p.product_id : null
                            const allImages = Array.isArray(p?.images) ? p.images : (productRef?.images || [])
                            const imageUrls = allImages.map((img) => getImageUrl(img)).filter((src) => !!src)
                            return allImages.length > 0 ? (
                              <div className="mb-3">
                                <CFormLabel>Images</CFormLabel>
                                <div className="d-flex flex-wrap gap-2">
                                  {allImages.map((img, i) => (
                                    <div
                                      key={i}
                                      role="button"
                                      tabIndex={0}
                                      className="rounded overflow-hidden border"
                                      style={{ width: 80, height: 80, cursor: 'pointer' }}
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
                                </div>
                              </div>
                            ) : null
                          })()}
                          <div className="mb-3">
                            <CFormLabel>Rate (₹)</CFormLabel>
                            <CFormInput type="number" min={0} step="0.01" value={editingProduct.rate} onChange={(e) => updateFormField('rate', e.target.value)} placeholder="Rate" />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Total (₹)</CFormLabel>
                            <CFormInput
                              type="text"
                              value={
                                editingProduct.quantity !== '' && editingProduct.rate !== '' && !Number.isNaN(Number(editingProduct.quantity)) && !Number.isNaN(Number(editingProduct.rate))
                                  ? (Number(editingProduct.quantity) * Number(editingProduct.rate)).toFixed(2)
                                  : ''
                              }
                              readOnly
                              placeholder="Qty × Rate"
                            />
                          </div>
                          <div className="mb-3 p-3 rounded" style={{ border: '1px solid #dee2e6', backgroundColor: '#ffe6e6' }}>
                            <CFormLabel>Assign Task</CFormLabel>
                            <div className="small text-muted mb-2">
                              Select Purchase Manager or Purchase Executive
                            </div>
                            <div className="d-flex flex-column gap-2 mb-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                              {purchaseEmployees.length === 0 ? (
                                <span className="text-muted small">No purchase employees found</span>
                              ) : (
                                purchaseEmployees.map((emp) => {
                                  const empId = emp._id || emp.id
                                  return (
                                    <div key={empId} className="d-flex align-items-center gap-2">
                                      <CFormCheck
                                        id={`assign-${empId}`}
                                        checked={!!assignTaskSelected[empId]}
                                        onChange={(e) => toggleAssignEmployee(empId, e.target.checked)}
                                      />
                                      <CFormLabel
                                        htmlFor={`assign-${empId}`}
                                        className="mb-0 flex-grow-1"
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                      >
                                        {emp.name || emp.email || '–'}
                                      </CFormLabel>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                            <CButton
                              color="primary"
                              size="sm"
                              onClick={openAssignTaskModal}
                              disabled={assigningTask || purchaseEmployees.length === 0}
                            >
                              {assigningTask ? 'Assigning...' : 'Assign Task'}
                            </CButton>
                          </div>
                        </CCol>
                      </CRow>
                      <div className="mt-3">
                        <CButton color="primary" onClick={handleUpdateProduct} disabled={updating}>
                          {updating ? 'Updating...' : 'Update'}
                        </CButton>
                      </div>
                    </CCardBody>
                  </CCard>
                </>
              ) : (
                <p className="text-muted mb-0">No products in this quotation.</p>
              )}
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
              {products.length > 0 ? (
                <>
                  <CTable responsive hover bordered className="table-fixed">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell className="text-center" style={{ width: 50 }}>#</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: 140, maxWidth: 180 }}>Product name / Description</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 90 }}>Quantity</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 80 }}>Unit</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 100 }}>HSN Number</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 100 }}>Model Number</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 70 }}>GST %</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 120 }}>Images</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 100 }}>Rate (₹)</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 100 }}>Total Amount (₹)</CTableHeaderCell>
                        <CTableHeaderCell className="text-center" style={{ width: 90 }}>Actions</CTableHeaderCell>
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
                        const hasRate = rateVal !== '' && rateVal != null && !Number.isNaN(Number(rateVal))
                        const rowBg = hasRate ? { backgroundColor: '#d4edda' } : { backgroundColor: '#ffe8cc' }
                        return (
                          <CTableRow key={idx} style={rowBg}>
                            <CTableDataCell className="text-center">{idx + 1}</CTableDataCell>
                            <CTableDataCell style={{ width: 140, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <div className="text-truncate" title={p.productName || ''}>{p.productName || '–'}</div>
                              {desc ? <div className="small text-muted text-truncate" style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap' }} title={String(desc)}>{String(desc).slice(0, 120)}{desc.length > 120 ? '…' : ''}</div> : null}
                            </CTableDataCell>
                            <CTableDataCell className="text-center">{p.quantity ?? '–'}</CTableDataCell>
                            <CTableDataCell className="text-center">{p.unit || '–'}</CTableDataCell>
                            <CTableDataCell className="small text-center">{productRef?.hsnNumber || p.hsnNumber || '–'}</CTableDataCell>
                            <CTableDataCell className="small text-center">{productRef?.modelNumber || productRef?.defaultModelNumber || p.modelNumber || '–'}</CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CFormInput
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                size="sm"
                                value={getListGst(idx)}
                                onChange={(e) => setListGst(idx, e.target.value)}
                                placeholder="GST %"
                                title="GST % (required, 0–100)"
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              {allImages.length > 0 ? (
                                <div className="d-flex flex-wrap gap-1 justify-content-center align-items-center">
                                  {allImages.slice(0, 2).map((img, i) => (
                                    <div
                                      key={i}
                                      role="button"
                                      tabIndex={0}
                                      className="rounded overflow-hidden border"
                                      style={{ width: 40, height: 40, cursor: 'pointer' }}
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
                                      style={{ width: 40, height: 40, fontSize: '1.1rem', cursor: 'pointer' }}
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
                            <CTableDataCell className="text-center">
                              <CFormInput
                                type="number"
                                min={0}
                                step="0.01"
                                size="sm"
                                value={rateVal}
                                onChange={(e) => setListRate(idx, e.target.value)}
                                placeholder="Rate"
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CFormInput
                                type="number"
                                min={0}
                                step="0.01"
                                size="sm"
                                value={totalVal}
                                onChange={(e) => setListTotal(idx, e.target.value)}
                                placeholder="Qty × Rate"
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CButton color="primary" size="sm" onClick={() => handleUpdateProductFromList(idx)} disabled={updating}>
                                Update
                              </CButton>
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
            </CTabPane>

            {/* Tab 4: Products with Rate */}
            <CTabPane visible={activeTab === 'withRate'}>
              {productsWithRate.length > 0 ? (
                <>
                <CTable responsive hover bordered className="table-fixed">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell className="text-center" style={{ width: 50 }}>#</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 140, maxWidth: 180 }}>Product name / Description</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 90 }}>Quantity</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 80 }}>Unit</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 100 }}>HSN Number</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 100 }}>Model Number</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 70 }}>GST %</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 120 }}>Images</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 100 }}>Rate (₹)</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 100 }}>Total Amount (₹)</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 90 }}>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {productsWithRate.map((p, idx) => {
                      const realIdx = products.indexOf(p)
                      const productRef = typeof p.product_id === 'object' ? p.product_id : null
                      const allImages = Array.isArray(p.images) ? p.images : (productRef?.images || [])
                      const imageUrls = allImages.map((img) => getImageUrl(img)).filter((src) => !!src)
                      const desc = (p.description || productRef?.shortDescription || p.remark || '').trim()
                      const rateVal = getListRate(realIdx)
                      const totalVal = getListTotal(realIdx)
                      return (
                        <CTableRow key={realIdx}>
                          <CTableDataCell className="text-center">{idx + 1}</CTableDataCell>
                          <CTableDataCell style={{ width: 140, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <div className="text-truncate" title={p.productName || ''}>{p.productName || '–'}</div>
                            {desc ? <div className="small text-muted text-truncate" style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap' }} title={String(desc)}>{String(desc).slice(0, 120)}{desc.length > 120 ? '…' : ''}</div> : null}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">{p.quantity ?? '–'}</CTableDataCell>
                          <CTableDataCell className="text-center">{p.unit || '–'}</CTableDataCell>
                          <CTableDataCell className="small text-center">{productRef?.hsnNumber || p.hsnNumber || '–'}</CTableDataCell>
                          <CTableDataCell className="small text-center">{productRef?.modelNumber || productRef?.defaultModelNumber || p.modelNumber || '–'}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CFormInput
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              size="sm"
                              value={getListGst(realIdx)}
                              onChange={(e) => setListGst(realIdx, e.target.value)}
                              placeholder="GST %"
                              title="GST % (required, 0–100)"
                            />
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {allImages.length > 0 ? (
                              <div className="d-flex flex-wrap gap-1 justify-content-center align-items-center">
                                {allImages.slice(0, 2).map((img, i) => (
                                  <div
                                    key={i}
                                    role="button"
                                    tabIndex={0}
                                    className="rounded overflow-hidden border"
                                    style={{ width: 40, height: 40, cursor: 'pointer' }}
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
                                    style={{ width: 40, height: 40, fontSize: '1.1rem', cursor: 'pointer' }}
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
                          <CTableDataCell className="text-center">
                            <CFormInput
                              type="number"
                              min={0}
                              step="0.01"
                              size="sm"
                              value={rateVal}
                              onChange={(e) => setListRate(realIdx, e.target.value)}
                              placeholder="Rate"
                            />
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CFormInput
                              type="number"
                              min={0}
                              step="0.01"
                              size="sm"
                              value={totalVal}
                              onChange={(e) => setListTotal(realIdx, e.target.value)}
                              placeholder="Qty × Rate"
                            />
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CButton color="primary" size="sm" onClick={() => handleUpdateProductFromList(realIdx)} disabled={updating}>
                              Update
                            </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                  <div className="mt-3 text-end border-top pt-3">
                    <p className="mb-1"><strong>Total (Taxable):</strong> ₹{calculatedTotalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="mb-1"><strong>GST Amount:</strong> ₹{calculatedTotalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="mb-0 fs-5"><strong>Total Amount:</strong> ₹{calculatedTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted mb-0">No products with rate.</p>
              )}
            </CTabPane>

            {/* Tab 5: Products without Rate */}
            <CTabPane visible={activeTab === 'withoutRate'}>
              {productsWithoutRate.length > 0 ? (
                <>
                <CTable responsive hover bordered className="table-fixed">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell className="text-center" style={{ width: 50 }}>#</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 140, maxWidth: 180 }}>Product name / Description</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 90 }}>Quantity</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 80 }}>Unit</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 100 }}>HSN Number</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 100 }}>Model Number</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 70 }}>GST %</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 120 }}>Images</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 100 }}>Rate (₹)</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 100 }}>Total Amount (₹)</CTableHeaderCell>
                      <CTableHeaderCell className="text-center" style={{ width: 90 }}>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {productsWithoutRate.map((p, idx) => {
                      const realIdx = products.indexOf(p)
                      const productRef = typeof p.product_id === 'object' ? p.product_id : null
                      const allImages = Array.isArray(p.images) ? p.images : (productRef?.images || [])
                      const imageUrls = allImages.map((img) => getImageUrl(img)).filter((src) => !!src)
                      const desc = (p.description || productRef?.shortDescription || p.remark || '').trim()
                      const rateVal = getListRate(realIdx)
                      const totalVal = getListTotal(realIdx)
                      return (
                        <CTableRow key={realIdx}>
                          <CTableDataCell className="text-center">{idx + 1}</CTableDataCell>
                          <CTableDataCell style={{ width: 140, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <div className="text-truncate" title={p.productName || ''}>{p.productName || '–'}</div>
                            {desc ? <div className="small text-muted text-truncate" style={{ fontSize: '0.8em', whiteSpace: 'pre-wrap' }} title={String(desc)}>{String(desc).slice(0, 120)}{desc.length > 120 ? '…' : ''}</div> : null}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">{p.quantity ?? '–'}</CTableDataCell>
                          <CTableDataCell className="text-center">{p.unit || '–'}</CTableDataCell>
                          <CTableDataCell className="small text-center">{productRef?.hsnNumber || p.hsnNumber || '–'}</CTableDataCell>
                          <CTableDataCell className="small text-center">{productRef?.modelNumber || productRef?.defaultModelNumber || p.modelNumber || '–'}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CFormInput
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              size="sm"
                              value={getListGst(realIdx)}
                              onChange={(e) => setListGst(realIdx, e.target.value)}
                              placeholder="GST %"
                              title="GST % (required, 0–100)"
                            />
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {allImages.length > 0 ? (
                              <div className="d-flex flex-wrap gap-1 justify-content-center align-items-center">
                                {allImages.slice(0, 2).map((img, i) => (
                                  <div
                                    key={i}
                                    role="button"
                                    tabIndex={0}
                                    className="rounded overflow-hidden border"
                                    style={{ width: 40, height: 40, cursor: 'pointer' }}
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
                                    style={{ width: 40, height: 40, fontSize: '1.1rem', cursor: 'pointer' }}
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
                          <CTableDataCell className="text-center">
                            <CFormInput
                              type="number"
                              min={0}
                              step="0.01"
                              size="sm"
                              value={rateVal}
                              onChange={(e) => setListRate(realIdx, e.target.value)}
                              placeholder="Rate"
                            />
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CFormInput
                              type="number"
                              min={0}
                              step="0.01"
                              size="sm"
                              value={totalVal}
                              onChange={(e) => setListTotal(realIdx, e.target.value)}
                              placeholder="Qty × Rate"
                            />
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CButton color="primary" size="sm" onClick={() => handleUpdateProductFromList(realIdx)} disabled={updating}>
                              Update
                            </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                  <div className="mt-3 text-end border-top pt-3">
                    <p className="mb-1"><strong>Total (Taxable):</strong> ₹{calculatedTotalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="mb-1"><strong>GST Amount:</strong> ₹{calculatedTotalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="mb-0 fs-5"><strong>Total Amount:</strong> ₹{calculatedTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted mb-0">No products without rate.</p>
              )}
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

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
    </>
  )
}

export default QuotationView
