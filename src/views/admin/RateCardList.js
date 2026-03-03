import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CFormInput,
  CFormCheck,
  CInputGroup,
  CInputGroupText,
  CSpinner,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilSave, cilTrash, cilPlus, cilX } from '@coreui/icons'
import rateCardService from '../../services/rateCardService'
import productService from '../../services/productService'
import { Loader, ConfirmDialog } from '../../components'
import { toastSuccess, toastError } from '../../utils/toast'

const RateCardList = () => {
  const [activeTab, setActiveTab] = useState('product')

  // --- Search by Product state ---
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const [productSearching, setProductSearching] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productSuppliers, setProductSuppliers] = useState([])
  const [productInfo, setProductInfo] = useState(null)
  const [productDetail, setProductDetail] = useState(null)
  const [combinationIdsWithRates, setCombinationIdsWithRates] = useState([])
  const [selectedProductCombination, setSelectedProductCombination] = useState(null)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  // --- Search by Supplier state ---
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierResults, setSupplierResults] = useState([])
  const [supplierSearching, setSupplierSearching] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [supplierProducts, setSupplierProducts] = useState([])
  const [supplierInfo, setSupplierInfo] = useState(null)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)

  // --- Rate editing state ---
  const [editingRates, setEditingRates] = useState({})
  const [savingRate, setSavingRate] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
    context: null,
    isRateCombination: false,
  })

  // --- Add Rate tab state ---
  const [addProductSearch, setAddProductSearch] = useState('')
  const [addProductResults, setAddProductResults] = useState([])
  const [addProductSearching, setAddProductSearching] = useState(false)
  const [addSelectedProduct, setAddSelectedProduct] = useState(null)
  const [showAddProductDropdown, setShowAddProductDropdown] = useState(false)

  const [addSupplierSearch, setAddSupplierSearch] = useState('')
  const [addSupplierResults, setAddSupplierResults] = useState([])
  const [addSupplierSearching, setAddSupplierSearching] = useState(false)
  const [addSelectedSupplier, setAddSelectedSupplier] = useState(null)
  const [showAddSupplierDropdown, setShowAddSupplierDropdown] = useState(false)

  const [addRate, setAddRate] = useState('')
  const [addingRate, setAddingRate] = useState(false)
  const [addProductDetail, setAddProductDetail] = useState(null)
  const [addSelectedCombination, setAddSelectedCombination] = useState(null)
  const [addCombinationSearch, setAddCombinationSearch] = useState('')
  const [loadingProductDetail, setLoadingProductDetail] = useState(false)
  const [addNextDueDate, setAddNextDueDate] = useState('')
  const [addNextDueDateMin, setAddNextDueDateMin] = useState('')

  const productDropdownRef = useRef(null)
  const supplierDropdownRef = useRef(null)
  const addProductDropdownRef = useRef(null)
  const addSupplierDropdownRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target)) {
        setShowProductDropdown(false)
      }
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target)) {
        setShowSupplierDropdown(false)
      }
      if (addProductDropdownRef.current && !addProductDropdownRef.current.contains(e.target)) {
        setShowAddProductDropdown(false)
      }
      if (addSupplierDropdownRef.current && !addSupplierDropdownRef.current.contains(e.target)) {
        setShowAddSupplierDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Initialize default next due date (today + 3 months) and min date (today)
  useEffect(() => {
    const today = new Date()
    const toInputDate = (d) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const minDate = toInputDate(today)
    const defaultDate = new Date(today)
    defaultDate.setMonth(defaultDate.getMonth() + 3)

    setAddNextDueDateMin(minDate)
    setAddNextDueDate(toInputDate(defaultDate))
  }, [])

  // --- Product search ---
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults([])
      setShowProductDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setProductSearching(true)
      try {
        const res = await rateCardService.searchProducts({ search: productSearch, limit: 10 })
        const data = res?.data || res
        setProductResults(data?.products || [])
        setShowProductDropdown(true)
      } catch {
        setProductResults([])
      } finally {
        setProductSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  // --- Supplier search ---
  useEffect(() => {
    if (!supplierSearch.trim()) {
      setSupplierResults([])
      setShowSupplierDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setSupplierSearching(true)
      try {
        const res = await rateCardService.searchSuppliers({ search: supplierSearch, limit: 10 })
        const data = res?.data || res
        setSupplierResults(data?.suppliers || [])
        setShowSupplierDropdown(true)
      } catch {
        setSupplierResults([])
      } finally {
        setSupplierSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [supplierSearch])

  // --- Add Rate tab: product search ---
  useEffect(() => {
    if (!addProductSearch.trim()) {
      setAddProductResults([])
      setShowAddProductDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setAddProductSearching(true)
      try {
        const res = await rateCardService.searchProducts({ search: addProductSearch, limit: 10 })
        const data = res?.data || res
        setAddProductResults(data?.products || [])
        setShowAddProductDropdown(true)
      } catch {
        setAddProductResults([])
      } finally {
        setAddProductSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [addProductSearch])

  // --- Add Rate tab: supplier search ---
  useEffect(() => {
    if (!addSupplierSearch.trim()) {
      setAddSupplierResults([])
      setShowAddSupplierDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setAddSupplierSearching(true)
      try {
        const res = await rateCardService.searchSuppliers({ search: addSupplierSearch, limit: 10 })
        const data = res?.data || res
        setAddSupplierResults(data?.suppliers || [])
        setShowAddSupplierDropdown(true)
      } catch {
        setAddSupplierResults([])
      } finally {
        setAddSupplierSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [addSupplierSearch])

  const getVariantComboDisplay = (combo) => {
    const parts = (combo?.optionValues || []).map((o) => o?.variantValue || '').filter(Boolean)
    return parts.join(', ')
  }

  const handleAddProductSelect = async (p) => {
    setAddSelectedProduct(p)
    setAddProductSearch(p.name)
    setShowAddProductDropdown(false)
    setAddSelectedCombination(null)
    setLoadingProductDetail(true)
    try {
      const res = await productService.getById(p._id)
      const product = res?.data ?? res
      setAddProductDetail(product)
    } catch {
      setAddProductDetail(null)
    } finally {
      setLoadingProductDetail(false)
    }
  }

  const handleClearAddProduct = () => {
    setAddSelectedProduct(null)
    setAddProductSearch('')
    setAddProductDetail(null)
    setAddSelectedCombination(null)
    setAddCombinationSearch('')
  }

  const handleClearAddSupplier = () => {
    setAddSelectedSupplier(null)
    setAddSupplierSearch('')
  }

  // --- Add Rate tab: submit handler ---
  const handleAddRate = async () => {
    if (!addSelectedProduct) {
      toastError('Please select a product')
      return
    }
    if (!addSelectedSupplier) {
      toastError('Please select a supplier')
      return
    }
    if (addProductDetail && addProductDetail?.hasVariants && addProductDetail?.variantCombinations?.length > 0) {
      if (!addSelectedCombination) {
        toastError('Please select a combination')
        return
      }
    }
    if (!addRate || isNaN(Number(addRate)) || Number(addRate) < 0) {
      toastError('Please enter a valid rate')
      return
    }
    if (!addNextDueDate) {
      toastError('Please select next due date')
      return
    }
    const selectedDate = new Date(addNextDueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      toastError('Next due date cannot be in the past')
      return
    }
    setAddingRate(true)
    try {
      const payload = {
        productId: addSelectedProduct._id,
        supplierId: addSelectedSupplier._id,
        rate: Number(addRate),
        nextDueDate: selectedDate.toISOString(),
      }
      if (addSelectedCombination && addSelectedCombination !== 'base') {
        payload.combinationUniqueId = addSelectedCombination
      }
      await rateCardService.upsertRate(payload)
      toastSuccess('Rate added successfully')
      // Do NOT reset product and supplier - only clear rate for next entry
      setAddRate('')
    } catch (err) {
      toastError(err?.message || 'Failed to add rate')
    } finally {
      setAddingRate(false)
    }
  }

  const fetchProductSuppliers = useCallback(
    async (productId, combinationUniqueId = null) => {
      const res = await rateCardService.getByProduct(productId, combinationUniqueId)
      const data = res?.data || res
      setProductInfo(data?.product || null)
      setProductSuppliers(data?.rates || [])
      if (Array.isArray(data?.combinationIdsWithRates)) {
        setCombinationIdsWithRates(data.combinationIdsWithRates)
      }
    },
    [],
  )

  // --- Select product & load suppliers ---
  const handleSelectProduct = useCallback(async (product) => {
    setSelectedProduct(product)
    setProductSearch(product.name)
    setShowProductDropdown(false)
    setSelectedProductCombination(null)
    setLoadingSuppliers(true)
    setEditingRates({})
    try {
      let fullProduct = null
      try {
        const pres = await productService.getById(product._id)
        fullProduct = pres?.data ?? pres
        setProductDetail(fullProduct)
      } catch {
        setProductDetail(null)
      }
      await fetchProductSuppliers(product._id)
    } catch (err) {
      toastError(err?.message || 'Failed to load suppliers')
    } finally {
      setLoadingSuppliers(false)
    }
  }, [fetchProductSuppliers])

  const handleSelectProductCombination = useCallback(
    async (comboId) => {
      setSelectedProductCombination(comboId)
      if (!selectedProduct?._id) return
      setLoadingSuppliers(true)
      try {
        await fetchProductSuppliers(
          selectedProduct._id,
          comboId === 'base' ? null : comboId,
        )
      } catch (err) {
        toastError(err?.message || 'Failed to load suppliers')
      } finally {
        setLoadingSuppliers(false)
      }
    },
    [selectedProduct, fetchProductSuppliers],
  )

  // --- Select supplier & load products ---
  const handleSelectSupplier = useCallback(async (supplier) => {
    setSelectedSupplier(supplier)
    setSupplierSearch(supplier.name)
    setShowSupplierDropdown(false)
    setLoadingProducts(true)
    setEditingRates({})
    try {
      const res = await rateCardService.getBySupplier(supplier._id)
      const data = res?.data || res
      setSupplierInfo(data?.supplier || supplier)
      setSupplierProducts(data?.rates || [])
    } catch (err) {
      toastError(err?.message || 'Failed to load products')
    } finally {
      setLoadingProducts(false)
    }
  }, [])

  // --- Save rate ---
  const handleSaveRate = async (productId, supplierId, rate, combinationUniqueId = null) => {
    if (rate === '' || rate === undefined || isNaN(Number(rate))) {
      toastError('Please enter a valid rate')
      return
    }
    const key = combinationUniqueId
      ? `${productId}_${supplierId}_${combinationUniqueId}`
      : `${productId}_${supplierId}`
    setSavingRate(key)
    try {
      const payload = { productId, supplierId, rate: Number(rate) }
      if (combinationUniqueId && combinationUniqueId !== 'base') {
        payload.combinationUniqueId = combinationUniqueId
      }
      await rateCardService.upsertRate(payload)
      toastSuccess('Rate saved successfully')
      if (activeTab === 'product' && selectedProduct) {
        await fetchProductSuppliers(
          selectedProduct._id,
          selectedProductCombination === 'base' ? null : selectedProductCombination,
        )
      } else if (activeTab === 'supplier' && selectedSupplier) {
        await handleSelectSupplier(selectedSupplier)
      }
    } catch (err) {
      toastError(err?.message || 'Failed to save rate')
    } finally {
      setSavingRate(null)
    }
  }

  // --- Delete rate card entry ---
  const handleDeleteConfirm = async () => {
    const { id, context, isRateCombination } = confirmDelete
    setConfirmDelete({ visible: false, id: null, context: null, isRateCombination: false })
    if (!id) return
    try {
      await rateCardService.delete(id, isRateCombination)
      toastSuccess('Rate entry deleted successfully')
      if (context === 'product' && selectedProduct) {
        await fetchProductSuppliers(
          selectedProduct._id,
          selectedProductCombination === 'base' ? null : selectedProductCombination,
        )
      } else if (context === 'supplier' && selectedSupplier) {
        await handleSelectSupplier(selectedSupplier)
      }
    } catch (err) {
      toastError(err?.message || 'Failed to delete rate entry')
    }
  }

  const handleRateChange = (key, value) => {
    setEditingRates((prev) => ({ ...prev, [key]: value }))
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatRateWithGst = (amount, includeGst, gstPercentage) => {
    const base = formatCurrency(amount)
    if (includeGst && gstPercentage && Number(gstPercentage) > 0) {
      return `${base} + GST (${Number(gstPercentage)}%)`
    }
    return base
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Rate Card</strong>
          </CCardHeader>
          <CCardBody>
            {/* Tabs */}
            <CNav variant="tabs" className="mb-4">
              <CNavItem>
                <CNavLink
                  active={activeTab === 'product'}
                  onClick={() => setActiveTab('product')}
                  style={{ cursor: 'pointer' }}
                >
                  Search by Product
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'supplier'}
                  onClick={() => setActiveTab('supplier')}
                  style={{ cursor: 'pointer' }}
                >
                  Search by Supplier
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'addRate'}
                  onClick={() => setActiveTab('addRate')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilPlus} className="me-1" />
                  Add Rate
                </CNavLink>
              </CNavItem>
            </CNav>

            <CTabContent>
              {/* ========== TAB 1: Search by Product ========== */}
              <CTabPane visible={activeTab === 'product'}>
                {/* Product Search */}
                <div ref={productDropdownRef} style={{ position: 'relative', maxWidth: 500 }}>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search product by name or SKU..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value)
                        if (!e.target.value.trim()) {
                          setSelectedProduct(null)
                          setProductSuppliers([])
                          setProductInfo(null)
                        }
                      }}
                    />
                    {productSearching && (
                      <CInputGroupText>
                        <CSpinner size="sm" />
                      </CInputGroupText>
                    )}
                  </CInputGroup>

                  {/* Dropdown results */}
                  {showProductDropdown && productResults.length > 0 && (
                    <CListGroup
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        maxHeight: 250,
                        overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {productResults.map((p) => (
                        <CListGroupItem
                          key={p._id}
                          onClick={() => handleSelectProduct(p)}
                          style={{ cursor: 'pointer' }}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <strong>{p.name}</strong>
                            {p.sku && (
                              <span className="text-muted ms-2" style={{ fontSize: '0.85em' }}>
                                SKU: {p.sku}
                              </span>
                            )}
                          </div>
                          {p.price > 0 && (
                            <CBadge color="info">{formatCurrency(p.price)}</CBadge>
                          )}
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  )}

                  {showProductDropdown &&
                    productResults.length === 0 &&
                    !productSearching &&
                    productSearch.trim() && (
                      <CListGroup
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 1000,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                      >
                        <CListGroupItem className="text-muted text-center">
                          No products found
                        </CListGroupItem>
                      </CListGroup>
                    )}
                </div>

                {/* Product info & suppliers table */}
                {selectedProduct && (
                  <>
                    {productInfo && (
                      <div className="mb-3 p-3 bg-light rounded">
                        <h5 className="mb-1">{productInfo.name}</h5>
                        <div className="text-muted small">
                          {productInfo.sku && <span className="me-3">SKU: {productInfo.sku}</span>}
                          {productInfo.price > 0 && (
                            <span>Base Price: {formatCurrency(productInfo.price)}</span>
                          )}
                        </div>
                        {productInfo.description && (
                          <div className="text-muted small mt-1">{productInfo.description}</div>
                        )}
                      </div>
                    )}

                    {productDetail?.hasVariants && productDetail?.variantCombinations?.length > 0 && (
                      <div className="mb-3">
                        <h6 className="mb-2">Filter by combination</h6>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            gap: '0.5rem 1rem',
                          }}
                        >
                          <label
                            className="form-check d-flex align-items-center gap-2 mb-0"
                            style={{ cursor: 'pointer' }}
                          >
                            <CFormCheck
                              type="radio"
                              name="productCombo"
                              checked={selectedProductCombination === null}
                              onChange={() => handleSelectProductCombination(null)}
                            />
                            <span>All (Product level)</span>
                          </label>
                          {productDetail.variantCombinations
                            .filter((c) => c?.isActive !== false)
                            .filter((c) => {
                              const uid = c.uniqueId || c._id
                              return combinationIdsWithRates.includes(uid)
                            })
                            .map((c) => {
                              const uid = c.uniqueId || c._id
                              return (
                                <label
                                  key={uid}
                                  className="form-check d-flex align-items-center gap-2 mb-0"
                                  style={{ cursor: 'pointer' }}
                                >
                                  <CFormCheck
                                    type="radio"
                                    name="productCombo"
                                    checked={selectedProductCombination === uid}
                                    onChange={() => handleSelectProductCombination(uid)}
                                  />
                                  <span>{getVariantComboDisplay(c)}</span>
                                </label>
                              )
                            })}
                        </div>
                      </div>
                    )}

                    {loadingSuppliers ? (
                      <Loader message="Loading suppliers..." />
                    ) : (
                      <>
                        <h6 className="mb-3">Suppliers ({productSuppliers.length})</h6>
                        <CTable hover responsive bordered>
                          <CTableHead color="light">
                            <CTableRow>
                              <CTableHeaderCell style={{ width: 50 }}>S No</CTableHeaderCell>
                              <CTableHeaderCell>Supplier Name</CTableHeaderCell>
                              <CTableHeaderCell>Shop</CTableHeaderCell>
                              <CTableHeaderCell>Phone</CTableHeaderCell>
                              <CTableHeaderCell style={{ width: 150 }}>
                                Current Rate
                              </CTableHeaderCell>
                              <CTableHeaderCell style={{ width: 150 }}>New Rate</CTableHeaderCell>
                              <CTableHeaderCell style={{ width: 100 }}>Actions</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {productSuppliers.map((entry, index) => {
                              const comboId = entry.combinationUniqueId ?? selectedProductCombination
                              const key = comboId
                                ? `${selectedProduct._id}_${entry.supplier?._id}_${comboId}`
                                : `${selectedProduct._id}_${entry.supplier?._id}`
                              const isComboEntry = !!entry.combinationUniqueId
                              return (
                                <CTableRow
                                  key={entry._id}
                                  color={
                                    index === 0 && productSuppliers.length > 1
                                      ? 'success'
                                      : undefined
                                  }
                                >
                                  <CTableDataCell>{index + 1}</CTableDataCell>
                                  <CTableDataCell>
                                    <strong>{entry.supplier?.name}</strong>
                                    {index === 0 && productSuppliers.length > 1 && (
                                      <CBadge color="success" className="ms-2">
                                        Lowest
                                      </CBadge>
                                    )}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {entry.supplier?.shopname || '-'}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {entry.supplier?.phone_1 || '-'}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    <strong>
                                      {formatRateWithGst(
                                        entry.rate,
                                        entry.includeGst,
                                        entry.gstPercentage,
                                      )}
                                    </strong>
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    <CFormInput
                                      type="number"
                                      size="sm"
                                      min={0}
                                      placeholder="New rate"
                                      value={editingRates[key] ?? ''}
                                      onChange={(e) => handleRateChange(key, e.target.value)}
                                    />
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    <CButton
                                      color="primary"
                                      variant="ghost"
                                      size="sm"
                                      disabled={
                                        !editingRates[key] ||
                                        editingRates[key] === '' ||
                                        savingRate === key
                                      }
                                      onClick={() =>
                                        handleSaveRate(
                                          selectedProduct._id,
                                          entry.supplier?._id,
                                          editingRates[key],
                                        )
                                      }
                                      title="Save Rate"
                                    >
                                      {savingRate === key ? (
                                        <CSpinner size="sm" />
                                      ) : (
                                        <CIcon icon={cilSave} />
                                      )}
                                    </CButton>
                                    <CButton
                                      color="danger"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setConfirmDelete({
                                          visible: true,
                                          id: entry._id,
                                          context: 'product',
                                          isRateCombination: isComboEntry,
                                        })
                                      }
                                      title="Delete"
                                    >
                                      <CIcon icon={cilTrash} />
                                    </CButton>
                                  </CTableDataCell>
                                </CTableRow>
                              )
                            })}
                            {productSuppliers.length === 0 && (
                              <CTableRow>
                                <CTableDataCell colSpan={7} className="text-center text-muted">
                                  No suppliers found for this product.
                                </CTableDataCell>
                              </CTableRow>
                            )}
                          </CTableBody>
                        </CTable>
                        {productSuppliers.length > 1 && (
                          <div className="text-muted small">Sorted by rate (lowest first)</div>
                        )}
                      </>
                    )}
                  </>
                )}
              </CTabPane>

              {/* ========== TAB 2: Search by Supplier ========== */}
              <CTabPane visible={activeTab === 'supplier'}>
                {/* Supplier Search */}
                <div ref={supplierDropdownRef} style={{ position: 'relative', maxWidth: 500 }}>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search supplier by name, shop or phone..."
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value)
                        if (!e.target.value.trim()) {
                          setSelectedSupplier(null)
                          setSupplierProducts([])
                          setSupplierInfo(null)
                        }
                      }}
                    />
                    {supplierSearching && (
                      <CInputGroupText>
                        <CSpinner size="sm" />
                      </CInputGroupText>
                    )}
                  </CInputGroup>

                  {/* Dropdown results */}
                  {showSupplierDropdown && supplierResults.length > 0 && (
                    <CListGroup
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        maxHeight: 250,
                        overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {supplierResults.map((s) => (
                        <CListGroupItem
                          key={s._id}
                          onClick={() => handleSelectSupplier(s)}
                          style={{ cursor: 'pointer' }}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <strong>{s.name}</strong>
                            {s.shopname && (
                              <span className="text-muted ms-2" style={{ fontSize: '0.85em' }}>
                                ({s.shopname})
                              </span>
                            )}
                          </div>
                          {s.phone_1 && <span className="text-muted small">{s.phone_1}</span>}
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  )}

                  {showSupplierDropdown &&
                    supplierResults.length === 0 &&
                    !supplierSearching &&
                    supplierSearch.trim() && (
                      <CListGroup
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 1000,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                      >
                        <CListGroupItem className="text-muted text-center">
                          No suppliers found
                        </CListGroupItem>
                      </CListGroup>
                    )}
                </div>

                {/* Supplier info & products table */}
                {selectedSupplier && (
                  <>
                    {supplierInfo && (
                      <div className="mb-3 p-3 bg-light rounded">
                        <h5 className="mb-1">{supplierInfo.name}</h5>
                        <div className="text-muted small">
                          {supplierInfo.shopname && (
                            <span className="me-3">Shop: {supplierInfo.shopname}</span>
                          )}
                          {supplierInfo.phone_1 && (
                            <span className="me-3">Phone: {supplierInfo.phone_1}</span>
                          )}
                          {supplierInfo.email && <span>Email: {supplierInfo.email}</span>}
                        </div>
                        {supplierInfo.address && (
                          <div className="text-muted small mt-1">{supplierInfo.address}</div>
                        )}
                      </div>
                    )}

                    {loadingProducts ? (
                      <Loader message="Loading products..." />
                    ) : (
                      <>
                        <h6 className="mb-3">
                          Products Supplied ({supplierProducts.length})
                        </h6>
                        <CTable hover responsive bordered>
                          <CTableHead color="light">
                            <CTableRow>
                              <CTableHeaderCell style={{ width: 50 }}>S No</CTableHeaderCell>
                              <CTableHeaderCell>Product Name</CTableHeaderCell>
                              <CTableHeaderCell>SKU</CTableHeaderCell>
                              <CTableHeaderCell style={{ width: 150 }}>
                                Current Rate
                              </CTableHeaderCell>
                              <CTableHeaderCell style={{ width: 150 }}>New Rate</CTableHeaderCell>
                              <CTableHeaderCell style={{ width: 100 }}>Actions</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {supplierProducts.map((entry, index) => {
                              const key = `${entry.product?._id}_${selectedSupplier._id}`
                              return (
                                <CTableRow key={entry._id}>
                                  <CTableDataCell>{index + 1}</CTableDataCell>
                                  <CTableDataCell>
                                    <strong>{entry.product?.name}</strong>
                                  </CTableDataCell>
                                  <CTableDataCell>{entry.product?.sku || '-'}</CTableDataCell>
                                  <CTableDataCell>
                                    <strong>
                                      {formatRateWithGst(
                                        entry.rate,
                                        entry.includeGst,
                                        entry.gstPercentage,
                                      )}
                                    </strong>
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    <CFormInput
                                      type="number"
                                      size="sm"
                                      min={0}
                                      placeholder="New rate"
                                      value={editingRates[key] ?? ''}
                                      onChange={(e) => handleRateChange(key, e.target.value)}
                                    />
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    <CButton
                                      color="primary"
                                      variant="ghost"
                                      size="sm"
                                      disabled={
                                        !editingRates[key] ||
                                        editingRates[key] === '' ||
                                        savingRate === key
                                      }
                                      onClick={() =>
                                        handleSaveRate(
                                          entry.product?._id,
                                          selectedSupplier._id,
                                          editingRates[key],
                                        )
                                      }
                                      title="Save Rate"
                                    >
                                      {savingRate === key ? (
                                        <CSpinner size="sm" />
                                      ) : (
                                        <CIcon icon={cilSave} />
                                      )}
                                    </CButton>
                                    <CButton
                                      color="danger"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setConfirmDelete({
                                          visible: true,
                                          id: entry._id,
                                          context: 'supplier',
                                        })
                                      }
                                      title="Delete"
                                    >
                                      <CIcon icon={cilTrash} />
                                    </CButton>
                                  </CTableDataCell>
                                </CTableRow>
                              )
                            })}
                            {supplierProducts.length === 0 && (
                              <CTableRow>
                                <CTableDataCell colSpan={6} className="text-center text-muted">
                                  No products found for this supplier.
                                </CTableDataCell>
                              </CTableRow>
                            )}
                          </CTableBody>
                        </CTable>
                      </>
                    )}
                  </>
                )}
              </CTabPane>

              {/* ========== TAB 3: Add Rate ========== */}
              <CTabPane visible={activeTab === 'addRate'}>
                <CRow className="mb-3">
                  <CCol xs={12}>
                    <h6 className="mb-0">Add a new rate for a Product + Supplier</h6>
                    <div className="text-muted small">
                      First choose the product and supplier, then set the rate and next due date.
                    </div>
                  </CCol>
                </CRow>

                {/* Top two-column layout: Product (left) and Supplier (right) */}
                <CRow className="mb-4">
                  <CCol xs={12} md={6} className="mb-3 mb-md-0">
                    <div className="border rounded p-3 h-100">
                      <label className="form-label fw-semibold">Product *</label>
                      <div ref={addProductDropdownRef} style={{ position: 'relative' }}>
                        <CInputGroup>
                          <CInputGroupText>
                            <CIcon icon={cilSearch} />
                          </CInputGroupText>
                          <CFormInput
                            placeholder="Search product by name or SKU..."
                            value={addProductSearch}
                            onChange={(e) => {
                              setAddProductSearch(e.target.value)
                              if (!e.target.value.trim()) {
                                handleClearAddProduct()
                              }
                            }}
                          />
                          {addProductSearching && (
                            <CInputGroupText>
                              <CSpinner size="sm" />
                            </CInputGroupText>
                          )}
                        </CInputGroup>
                        <div className="text-muted small mt-1">
                          Start typing to search products by name or SKU, then choose from the dropdown.
                        </div>

                        {showAddProductDropdown && addProductResults.length > 0 && (
                          <CListGroup
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              zIndex: 1000,
                              maxHeight: 200,
                              overflowY: 'auto',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }}
                          >
                            {addProductResults.map((p) => (
                              <CListGroupItem
                                key={p._id}
                                onClick={() => handleAddProductSelect(p)}
                                style={{ cursor: 'pointer' }}
                                className="d-flex justify-content-between align-items-center"
                              >
                                <div>
                                  <strong>{p.name}</strong>
                                  {p.sku && (
                                    <span
                                      className="text-muted ms-2"
                                      style={{ fontSize: '0.85em' }}
                                    >
                                      SKU: {p.sku}
                                    </span>
                                  )}
                                </div>
                                {p.price > 0 && (
                                  <CBadge color="info">{formatCurrency(p.price)}</CBadge>
                                )}
                              </CListGroupItem>
                            ))}
                          </CListGroup>
                        )}

                        {showAddProductDropdown &&
                          addProductResults.length === 0 &&
                          !addProductSearching &&
                          addProductSearch.trim() && (
                            <CListGroup
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 1000,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              }}
                            >
                              <CListGroupItem className="text-muted text-center">
                                No products found
                              </CListGroupItem>
                            </CListGroup>
                          )}
                      </div>

                      {addSelectedProduct && (
                        <div className="mt-2 p-2 bg-light rounded d-flex align-items-center justify-content-between gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <CBadge color="success">Selected</CBadge>
                            <strong>{addSelectedProduct.name}</strong>
                            {addSelectedProduct.sku && (
                              <span className="text-muted small">
                                (SKU: {addSelectedProduct.sku})
                              </span>
                            )}
                          </div>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAddProduct}
                            title="Remove product"
                          >
                            <CIcon icon={cilX} />
                          </CButton>
                        </div>
                      )}

                      {loadingProductDetail && (
                        <div className="mt-2">
                          <CSpinner size="sm" className="me-2" />
                          Loading combinations...
                        </div>
                      )}

                      {addProductDetail && !loadingProductDetail && (
                        <div className="mt-3 w-100">
                          <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
                            <h6 className="mb-0">Select combination</h6>
                            <CInputGroup className="flex-grow-1" style={{ maxWidth: 280 }}>
                              <CInputGroupText>
                                <CIcon icon={cilSearch} />
                              </CInputGroupText>
                              <CFormInput
                                placeholder="Search combination..."
                                value={addCombinationSearch}
                                onChange={(e) => setAddCombinationSearch(e.target.value)}
                                className="form-control-sm"
                              />
                            </CInputGroup>
                          </div>
                          <div className="border rounded p-3 w-100" style={{ minWidth: 0 }}>
                            {(addProductDetail?.hasVariants && addProductDetail?.variantCombinations?.length > 0) ? (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                  gap: '0.5rem 1rem',
                                  alignItems: 'center',
                                  width: '100%',
                                }}
                              >
                                {(() => {
                                  const filtered = addProductDetail.variantCombinations
                                    .filter((c) => c?.isActive !== false)
                                    .filter((c) => {
                                      const q = addCombinationSearch.trim().toLowerCase()
                                      if (!q) return true
                                      const comboText = (getVariantComboDisplay(c) + ' ' + (c.sku || '')).toLowerCase()
                                      return comboText.includes(q)
                                    })
                                  if (filtered.length === 0) {
                                    return (
                                      <div className="text-muted small py-2" style={{ gridColumn: '1 / -1' }}>
                                        No combinations match your search. Try a different term.
                                      </div>
                                    )
                                  }
                                  return filtered.map((c) => {
                                    const uid = c.uniqueId || c._id
                                    const selected = addSelectedCombination === uid
                                    return (
                                      <label
                                        key={uid}
                                        htmlFor={`combo-${uid}`}
                                        className="form-check d-flex align-items-center gap-2 mb-0"
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <CFormCheck
                                          type="radio"
                                          id={`combo-${uid}`}
                                          name="addRateCombo"
                                          checked={selected}
                                          onChange={() => setAddSelectedCombination(uid)}
                                        />
                                        <span>{getVariantComboDisplay(c)}</span>
                                      </label>
                                    )
                                  })
                                })()}
                              </div>
                            ) : (
                              <label
                                htmlFor="combo-base"
                                className="form-check d-flex align-items-center gap-2 mb-0"
                                style={{ cursor: 'pointer' }}
                              >
                                <CFormCheck
                                  type="radio"
                                  id="combo-base"
                                  name="addRateCombo"
                                  checked={addSelectedCombination === 'base'}
                                  onChange={() => setAddSelectedCombination('base')}
                                />
                                <span>Base Product</span>
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CCol>

                  <CCol xs={12} md={6}>
                    <div className="border rounded p-3 h-100">
                      <label className="form-label fw-semibold">Supplier *</label>
                      <div ref={addSupplierDropdownRef} style={{ position: 'relative' }}>
                        <CInputGroup>
                          <CInputGroupText>
                            <CIcon icon={cilSearch} />
                          </CInputGroupText>
                          <CFormInput
                            placeholder="Search supplier by name, shop or phone..."
                            value={addSupplierSearch}
                            onChange={(e) => {
                              setAddSupplierSearch(e.target.value)
                              if (!e.target.value.trim()) {
                                handleClearAddSupplier()
                              }
                            }}
                          />
                          {addSupplierSearching && (
                            <CInputGroupText>
                              <CSpinner size="sm" />
                            </CInputGroupText>
                          )}
                        </CInputGroup>
                        <div className="text-muted small mt-1">
                          Search by supplier name, shop or phone, then pick one from the suggestions.
                        </div>

                        {showAddSupplierDropdown && addSupplierResults.length > 0 && (
                          <CListGroup
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              zIndex: 1000,
                              maxHeight: 200,
                              overflowY: 'auto',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }}
                          >
                            {addSupplierResults.map((s) => (
                              <CListGroupItem
                                key={s._id}
                                onClick={() => {
                                  setAddSelectedSupplier(s)
                                  setAddSupplierSearch(s.name)
                                  setShowAddSupplierDropdown(false)
                                }}
                                style={{ cursor: 'pointer' }}
                                className="d-flex justify-content-between align-items-center"
                              >
                                <div>
                                  {s.shop_location && (
                                    <span className="text-muted me-2" style={{ fontSize: '0.9em' }}>
                                      [{s.shop_location}]{' '}
                                    </span>
                                  )}
                                  <strong>{s.name}</strong>
                                  {s.shopname && (
                                    <span
                                      className="text-muted ms-2"
                                      style={{ fontSize: '0.85em' }}
                                    >
                                      ({s.shopname})
                                    </span>
                                  )}
                                </div>
                                {s.phone_1 && (
                                  <span className="text-muted small">{s.phone_1}</span>
                                )}
                              </CListGroupItem>
                            ))}
                          </CListGroup>
                        )}

                        {showAddSupplierDropdown &&
                          addSupplierResults.length === 0 &&
                          !addSupplierSearching &&
                          addSupplierSearch.trim() && (
                            <CListGroup
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 1000,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              }}
                            >
                              <CListGroupItem className="text-muted text-center">
                                No suppliers found
                              </CListGroupItem>
                            </CListGroup>
                          )}
                      </div>

                      {addSelectedSupplier && (
                        <div className="mt-2 p-2 bg-light rounded d-flex align-items-center justify-content-between gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <CBadge color="success">Selected</CBadge>
                            {addSelectedSupplier.shop_location && (
                              <span className="text-muted" style={{ fontSize: '0.9em' }}>
                                {addSelectedSupplier.shop_location} -{' '}
                              </span>
                            )}
                          <strong>{addSelectedSupplier.name}</strong>
                            {addSelectedSupplier.shopname && (
                              <span className="text-muted small">
                                ({addSelectedSupplier.shopname})
                              </span>
                            )}
                          </div>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAddSupplier}
                            title="Remove supplier"
                          >
                            <CIcon icon={cilX} />
                          </CButton>
                        </div>
                      )}
                    </div>
                  </CCol>
                </CRow>

                {/* Bottom box: Rate and Next Due Date in two columns */}
                <CRow className="mb-4">
                  <CCol xs={12}>
                    <div className="border rounded p-3">
                      <CRow>
                        <CCol xs={12} md={6}>
                          <div className="mb-3">
                            <label className="form-label fw-semibold">Rate (INR) *</label>
                            <CFormInput
                              type="number"
                              min={0}
                              placeholder="Enter rate e.g. 25000"
                              value={addRate}
                              onChange={(e) => setAddRate(e.target.value)}
                            />
                            <div className="text-muted small mt-1">
                              Enter the agreed base rate in Indian Rupees for this product and supplier.
                            </div>
                          </div>
                        </CCol>
                        <CCol xs={12} md={6}>
                          <div className="mb-3">
                            <label className="form-label fw-semibold">Next Due Date *</label>
                            <CFormInput
                              type="date"
                              value={addNextDueDate}
                              onChange={(e) => setAddNextDueDate(e.target.value)}
                              min={addNextDueDateMin}
                            />
                            <div className="text-muted small mt-1">
                              Default is 3 months from today. You can move it forward, but past dates are disabled.
                            </div>
                          </div>
                        </CCol>
                      </CRow>

                      {addSelectedProduct && addSelectedSupplier && addRate && addNextDueDate && (
                        <div className="mt-2 p-2 bg-light rounded">
                          <div className="fw-semibold mb-1">Summary</div>
                          <div className="text-muted small">
                            You will add a rate of{' '}
                            <span className="fw-bold">
                              ₹{Number(addRate).toLocaleString('en-IN')}
                            </span>{' '}
                            for <span className="fw-bold">{addSelectedProduct.name}</span> from{' '}
                            <span className="fw-bold">{addSelectedSupplier.name}</span>, with next due
                            date <span className="fw-bold">{addNextDueDate}</span>.
                          </div>
                        </div>
                      )}
                    </div>
                  </CCol>
                </CRow>

                <CRow>
                  <CCol xs={12}>
                    <CButton
                      color="primary"
                      onClick={handleAddRate}
                      disabled={
                        addingRate ||
                        !addSelectedProduct ||
                        !addSelectedSupplier ||
                        !addRate ||
                        !addNextDueDate
                      }
                    >
                      {addingRate ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CIcon icon={cilPlus} className="me-2" />
                          Add Rate
                        </>
                      )}
                    </CButton>
                  </CCol>
                </CRow>
              </CTabPane>
            </CTabContent>
          </CCardBody>
        </CCard>
      </CCol>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null, context: null, isRateCombination: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Rate Entry?"
        message="Are you sure you want to remove this rate entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default RateCardList
