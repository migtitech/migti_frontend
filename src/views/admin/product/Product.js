import React, { useCallback, useEffect, useState } from "react"
import {
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CRow,
    CFormLabel,
    CFormInput,
    CFormTextarea,
    CButton,
    CTable,
    CTableHead,
    CTableRow,
    CTableHeaderCell,
    CTableBody,
    CTableDataCell,
} from "@coreui/react"

import CIcon from "@coreui/icons-react"
import { cilPlus, cilTrash, cilPencil } from "@coreui/icons"
import productService from "../../../services/productService"

const Product = () => {
    const [products, setProducts] = useState([])
    const [editingProductId, setEditingProductId] = useState(null)
    const INITIAL_VARIANT = { variantName: '', quantity: 1 }

    const [formProduct, setFormProduct] = useState({
        productName: "",
        quantity: 0,
        unit: "",
        variants: [],
        remark: "",
    })

    const [productSearch, setProductSearch] = useState("")
    const [productSearchResults, setProductSearchResults] = useState([])
    const [productSearchLoading, setProductSearchLoading] = useState(false)

    const fetchProducts = async () => {
        try {
            const res = await productService.getAll()
            const data = res?.data || res
            setProducts(data?.products || [])
            console.log("Fetched products:", data?.products || [])
        } catch (error) {
            console.error("Fetch products error:", error)
        }
    }
    

    useEffect(() => {
        fetchProducts()
    }, [])

    const updateFormProduct = (field, value) => {
        setFormProduct((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const saveProduct = async () => {
        if (!formProduct.productName?.trim()) return

        try {
            const res = await productService.create(formProduct)
            const created = res?.data || res

            setProducts((prev) => [...prev, created])
            clearProductForm()
        } catch (error) {
            console.error("Create error:", error)
        }
    }

    const updateProduct = async () => {
        try {
            const res = await productService.update(editingProductId, formProduct)
            const updated = res?.data || res

            setProducts((prev) =>
                prev.map((p) =>
                    p._id === editingProductId ? updated : p
                )
            )

            clearProductForm()
        } catch (error) {
            console.error("Update error:", error)
        }
    }

    const deleteProduct = async (id) => {
        try {
            await productService.delete(id)

            setProducts((prev) => prev.filter((p) => p._id !== id))
        } catch (error) {
            console.error("Delete error:", error)
        }
    }

    const editProduct = (product) => {
        setFormProduct(product)
        setEditingProductId(product._id)
    }

    const clearProductForm = () => {
        setFormProduct({
            productName: "",
            quantity: 0,
            unit: "",
            variants: [],
            remark: "",
        })
        setEditingProductId(null)
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
    const fetchProductSearch = useCallback(async (term) => {
        if (!term?.trim()) {
            setProductSearchResults([])
            return
        }

        setProductSearchLoading(true)
        try {
            const res = await productService.getAll({
                search: term,
                pageSize: 5,
            })

            const data = res?.data || res
            setProductSearchResults(data?.products || [])
        } catch {
            setProductSearchResults([])
        } finally {
            setProductSearchLoading(false)
        }
    }, [])

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProductSearch(productSearch)
        }, 300)

        return () => clearTimeout(timeout)
    }, [productSearch, fetchProductSearch])


    return (
        <CRow>
            <CCol>
                <CCard>
                    <CCardHeader>
                        <strong>2. Products</strong>
                    </CCardHeader>

                    <CCardBody>
                        <CFormLabel>Type/Name (search - best 5 matches)</CFormLabel>
                        <CFormInput
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Search product type or name"
                        />

                        <CRow className="mt-3">
                            <CCol md={6}>
                                <CFormLabel>Product Name</CFormLabel>
                                <CFormInput
                                    value={formProduct.productName}
                                    placeholder="Product name"
                                    onChange={(e) =>
                                        updateFormProduct("productName", e.target.value)
                                    }
                                />
                            </CCol>

                            <CCol md={3}>
                                <CFormLabel>Quantity</CFormLabel>
                                <CFormInput
                                    type="number"
                                    value={formProduct.quantity}
                                    onChange={(e) =>
                                        updateFormProduct("quantity", Number(e.target.value))
                                    }
                                />
                            </CCol>

                            <CCol md={3}>
                                <CFormLabel>Unit</CFormLabel>
                                <CFormInput
                                    value={formProduct.unit}
                                    placeholder="pcs, kg, etc."
                                    onChange={(e) =>
                                        updateFormProduct("unit", e.target.value)
                                    }
                                />
                            </CCol>
                        </CRow>
                        <CRow className="mt-3">
                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <CFormLabel className="mb-0">Variants (name + quantity)</CFormLabel>
                                    <CButton color="primary" size="sm" type="button" onClick={addVariant}>
                                        <CIcon icon={cilPlus} className="me-1" />
                                        Add variant
                                    </CButton>
                                </div>
                                {(formProduct.variants || []).length > 0 ? (
                                    (formProduct.variants || []).map((v, vIdx) => (
                                        <CRow key={vIdx} className="mb-2 align-items-end">
                                            <CCol md={5}>
                                                <CFormInput
                                                    value={v.variantName || ''}
                                                    onChange={(e) => updateVariant(vIdx, 'variantName', e.target.value)}
                                                    placeholder="Variant name"
                                                />
                                            </CCol>
                                            <CCol md={3}>
                                                <CFormInput
                                                    type="number"
                                                    min={0}
                                                    value={v.quantity ?? ''}
                                                    onChange={(e) => updateVariant(vIdx, 'quantity', Number(e.target.value) ?? 0)}
                                                    placeholder="Qty"
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
                        </CRow>

                        <div className="mt-3">
                            <CFormLabel>Remark</CFormLabel>
                            <CFormTextarea
                                value={formProduct.remark}
                                onChange={(e) =>
                                    updateFormProduct("remark", e.target.value)
                                }
                            />
                        </div>

                        <div className="mt-3">
                            {editingProductId ? (
                                <CButton color="primary" onClick={updateProduct}>
                                    Update
                                </CButton>
                            ) : (
                                <CButton color="primary" onClick={saveProduct}>
                                    Save
                                </CButton>
                            )}
                        </div>


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
                                            <CTableHeaderCell>Remark</CTableHeaderCell>
                                            <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                                        </CTableRow>
                                    </CTableHead>
                                    <CTableBody>
                                        {products.map((p, index) => (
                                            <CTableRow key={index}>
                                                <CTableDataCell>{p.name || '–'}</CTableDataCell>
                                                <CTableDataCell>{p.quantity ?? '–'}</CTableDataCell>
                                                <CTableDataCell>{p.unit || '–'}</CTableDataCell>
                                                <CTableDataCell>
                                                    {(p.variants || []).length > 0
                                                        ? (p.variants || []).map((v, i) => `${v.variants || '–'}: ${v.quantity ?? 0}`).join(', ')
                                                        : '–'}
                                                </CTableDataCell>
                                                <CTableDataCell>{(p.remark || '').slice(0, 40)}{(p.remark || '').length > 40 ? '…' : ''}</CTableDataCell>
                                                <CTableDataCell className="text-end">
                                                    <CButton color="primary" variant="ghost" size="sm" className="me-1" onClick={() => editProduct(index)}>
                                                        <CIcon icon={cilPencil} />
                                                    </CButton>
                                                    <CButton color="danger" variant="ghost" size="sm" onClick={() => deleteProduct(index)}>
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
            </CCol>
        </CRow>
    )
}

export default Product
