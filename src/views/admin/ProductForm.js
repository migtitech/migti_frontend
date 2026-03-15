import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
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
  CFormTextarea,
  CFormSelect,
  CFormCheck,
  CAlert,
  CImage,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash, cilArrowLeft } from '@coreui/icons'
import productService from '../../services/productService'
import categoryService from '../../services/categoryService'
import brandService from '../../services/brandService'
import groupService from '../../services/groupService'
import { getAssetsUrl } from '../../api/endpoints'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const VARIANT_TYPE_OPTIONS = [
  { value: 'Color', label: 'Color' },
  { value: 'Size', label: 'Size' },
  { value: 'Quantity', label: 'Quantity' },
  { value: 'Dimension', label: 'Dimension' },
  { value: 'Build Material', label: 'Build Material' },
]

const numberField = (label, required = false) => {
  let schema = yup
    .number()
    .typeError(`${label} must be a number`)
    .min(0, `${label} must be 0 or more`)
    .transform((value, original) => (original === '' ? undefined : value))
  if (required) {
    schema = schema.required(`${label} is required`)
  } else {
    schema = schema.notRequired()
  }
  return schema
}

const productSchema = yup.object({
  name: yup.string().trim().required('Product name is required').min(2, 'At least 2 characters').max(200, 'At most 200 characters'),
  sku: yup.string().trim().required('SKU is required').min(1, 'At least 1 character').max(50, 'At most 50 characters'),
  description: yup.string().trim().optional().default(''),
  shortDescription: yup.string().trim().optional().default(''),
  category: yup.string().required('Category is required'),
  subcategory: yup.string().optional().nullable().transform((v, o) => (o === '' ? null : v)),
  brand: yup.string().optional().nullable().transform((v, o) => (o === '' ? null : v)),
  group: yup.string().optional().nullable().transform((v, o) => (o === '' ? null : v)),
  hsnNumber: yup.string().trim().optional().max(50).default(''),
  gstPercentage: yup.number().min(0, 'GST % must be 0 or more').max(100, 'GST % must be 100 or less').optional().nullable().transform((v, o) => (o === '' ? null : v)),
  defaultModelNumber: yup.string().trim().optional().max(100).default(''),
  hasVariants: yup.boolean().default(false),
  weight: numberField('Weight'),
  weightUnit: yup.string().oneOf(['g', 'kg', 'lb', 'oz'], 'Invalid weight unit').default('g'),
  dimensions: yup.object({
    length: numberField('Length'),
    width: numberField('Width'),
    height: numberField('Height'),
  }),
  dimensionUnit: yup.string().oneOf(['cm', 'in', 'm'], 'Invalid dimension unit').default('cm'),
  tags: yup.string().optional().default(''),
  status: yup.string().oneOf(['active', 'inactive', 'draft'], 'Invalid status').default('draft'),
  unit: yup.string().optional().default('pcs'),
})

const defaultValues = {
  name: '',
  sku: '',
  shortDescription: '',
  category: '',
  subcategory: '',
  brand: '',
  group: '',
  hsnNumber: '',
  gstPercentage: '',
  defaultModelNumber: '',
  hasVariants: false,
  weight: '',
  weightUnit: 'g',
  dimensions: { length: '', width: '', height: '' },
  dimensionUnit: 'cm',
  tags: '',
  status: 'draft',
  unit: 'pcs',
}

const PRODUCT_FORM_DRAFT_KEY = 'product_form_draft'

const ProductForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [brands, setBrands] = useState([])
  const [groups, setGroups] = useState([])
  const [groupSearch, setGroupSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [subcategorySearch, setSubcategorySearch] = useState('')
  const [brandSearch, setBrandSearch] = useState('')

  const [variants, setVariants] = useState([])
  const [customVariantInput, setCustomVariantInput] = useState({})

  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [variantCombinations, setVariantCombinations] = useState([])
  const comboFileInputRefs = useRef({})

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues,
    resolver: yupResolver(productSchema),
    mode: 'onBlur',
  })

  const hasVariants = watch('hasVariants')
  const selectedGroup = watch('group')
  const selectedCategory = watch('category')
  const selectedSubcategory = watch('subcategory')
  const selectedBrand = watch('brand')

  const sectionHeaderStyle = { padding: '1rem 1.5rem', fontSize: '1.1rem' }
  const sectionBodyStyle = { padding: '1.5rem 1.5rem' }

  useEffect(() => {
    fetchDropdownData()
    if (isEdit) {
      fetchProduct()
    } else {
      // Load draft for new product form, if present
      try {
        const raw = localStorage.getItem(PRODUCT_FORM_DRAFT_KEY)
        if (raw) {
          const stored = JSON.parse(raw)
          reset({ ...defaultValues, ...stored })
        } else {
          reset(defaultValues)
        }
      } catch {
        reset(defaultValues)
      }
    }
  }, [id, isEdit, reset])

  // Autosave draft for new product
  useEffect(() => {
    if (isEdit) return
    const subscription = watch((values) => {
      try {
        localStorage.setItem(PRODUCT_FORM_DRAFT_KEY, JSON.stringify(values))
      } catch {
        // ignore storage errors
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, isEdit])

  useEffect(() => {
    if (!hasVariants) {
      setVariants([])
    }
  }, [hasVariants])

  const fetchDropdownData = async () => {
    try {
      const [brandRes, groupRes] = await Promise.all([
        brandService.getAll({ pageNumber: 1, pageSize: 100 }),
        groupService.getAll({ pageNumber: 1, pageSize: 100 }),
      ])
      const brandData = brandRes?.data || brandRes
      const groupData = groupRes?.data || groupRes
      setBrands(brandData?.brands || [])
      setGroups(groupData?.groups || [])
    } catch (err) {
      console.error('Failed to fetch dropdown data', err)
    }
  }

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(PRODUCT_FORM_DRAFT_KEY)
    } catch {
      // ignore
    }
    reset(defaultValues)
    toastSuccess('Saved product form data cleared')
  }

  const fetchSubcategories = async (parentId) => {
    if (!parentId) {
      setSubcategories([])
      return
    }
    try {
      const res = await categoryService.getAll({
        pageNumber: 1,
        pageSize: 100,
        parent: parentId,
      })
      const data = res?.data || res
      setSubcategories(data?.categories || [])
    } catch (err) {
      console.error('Failed to fetch subcategories', err)
    }
  }

  // When group changes, fetch categories for that group so category dropdown shows correctly
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const params = { pageNumber: 1, pageSize: 100, parent: 'null' }
        if (selectedGroup) params.group = selectedGroup
        const res = await categoryService.getAll(params)
        if (cancelled) return
        const data = res?.data || res
        setCategories(data?.categories || [])
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch categories by group', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedGroup])

  const filteredGroups = groups.filter((g) =>
    (g.name || '').toLowerCase().includes((groupSearch || '').toLowerCase()),
  )

  const filteredCategories = categories.filter((c) => {
    const nameMatches = (c.name || '')
      .toLowerCase()
      .includes((categorySearch || '').toLowerCase())
    const categoryGroupId =
      c.group && (c.group._id || c.group) ? (c.group._id || c.group) : ''
    const matchesGroup =
      !selectedGroup ||
      String(categoryGroupId) === String(selectedGroup)
    return nameMatches && matchesGroup
  })

  const filteredSubcategories = subcategories.filter((s) =>
    (s.name || '').toLowerCase().includes((subcategorySearch || '').toLowerCase()),
  )

  const filteredBrands = brands.filter((b) =>
    (b.name || '').toLowerCase().includes((brandSearch || '').toLowerCase()),
  )

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const res = await withMinimumDelay(() => productService.getById(id))
      const product = res?.data || res
      if (product) {
        reset({
          name: product.name || '',
          sku: product.sku || '',
          shortDescription: product.shortDescription || '',
          category: product.category?._id || product.category || '',
          subcategory: product.subcategory?._id || product.subcategory || '',
          brand: product.brand?._id || product.brand || '',
          group: product.group?._id || product.group || '',
          hsnNumber: product.hsnNumber || '',
          gstPercentage: product.gstPercentage ?? '',
          defaultModelNumber: product.defaultModelNumber || '',
          hasVariants: product.hasVariants || false,
          weight: product.weight ?? '',
          weightUnit: product.weightUnit || 'g',
          dimensions: product.dimensions || { length: '', width: '', height: '' },
          dimensionUnit: product.dimensionUnit || 'cm',
          tags: (product.tags || []).join(', '),
          status: product.status || 'draft',
          unit: product.unit || 'pcs',
        })
        const loadedVariants = product.variants || []
        setVariants(loadedVariants)
        const customInputMap = {}
        loadedVariants.forEach((v, i) => {
          if (v.name && !VARIANT_TYPE_OPTIONS.some((o) => o.value === v.name)) {
            customInputMap[i] = true
          }
        })
        setCustomVariantInput(customInputMap)
        const imgs = product.images || []
        setExistingImages(imgs.map((i) => (typeof i === 'object' && i?._id ? i._id : i)))
        setImagePreviews(imgs.map((i) => (typeof i === 'object' && i?.path ? getAssetsUrl(i.path) : i)))
        setVariantCombinations(product.variantCombinations || [])
        if (product.category?._id || product.category) {
          fetchSubcategories(product.category?._id || product.category)
        }
      }
    } catch (err) {
      toastError(err?.message || 'Failed to fetch product')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (value) => {
    setValue('subcategory', '')
    fetchSubcategories(value)
  }

  // Variant management
  const addVariant = () => {
    setVariants((prev) => [...prev, { name: '', options: [] }])
  }

  const handleVariantTypeChange = (index, value) => {
    if (value === '__custom__') {
      setCustomVariantInput((prev) => ({ ...prev, [index]: true }))
      setVariants((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], name: '' }
        return next
      })
    } else {
      setCustomVariantInput((prev) => ({ ...prev, [index]: false }))
      setVariants((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], name: value }
        return next
      })
    }
  }

  const updateVariantName = (index, name) => {
    setVariants((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], name }
      return next
    })
  }

  const removeVariant = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  const addSubVariant = (variantIndex) => {
    const variant = variants[variantIndex]
    if (!variant?.name) {
      toastError('Please enter a variant name first.')
      return
    }
    const newOption = ''
    setVariants((prev) => {
      const next = [...prev]
      next[variantIndex] = {
        ...next[variantIndex],
        options: [...next[variantIndex].options, newOption],
      }
      return next
    })
  }

  const updateSubVariantName = (variantIndex, optionIndex, value) => {
    setVariants((prev) => {
      const next = [...prev]
      const newOptions = [...next[variantIndex].options]
      newOptions[optionIndex] = value
      next[variantIndex] = { ...next[variantIndex], options: newOptions }
      return next
    })
  }

  const removeSubVariant = (variantIndex, optionIndex) => {
    setVariants((prev) => {
      const next = [...prev]
      const newOptions = next[variantIndex].options.filter((_, i) => i !== optionIndex)
      next[variantIndex] = { ...next[variantIndex], options: newOptions }
      return next
    })
  }

  // Image handling
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    setImageFiles((prev) => [...prev, ...files])
    const newPreviews = files.map((file) => URL.createObjectURL(file))
    setImagePreviews((prev) => [...prev, ...newPreviews])
  }

  const removeImage = (index) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
    if (index < existingImages.length) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index))
    } else {
      const fileIndex = index - existingImages.length
      setImageFiles((prev) => prev.filter((_, i) => i !== fileIndex))
    }
  }

  const handleVariantComboImageUpload = async (comboIndex, files) => {
    if (!files?.length) return
    const fileList = Array.from(files)
    try {
      const combo = variantCombinations[comboIndex]
      const opts = id ? { productId: id, variantUniqueId: combo?.uniqueId } : {}
      const uploadRes = await productService.uploadImages(fileList, opts)
      const uploadData = uploadRes?.data ?? uploadRes
      const documents = uploadData?.documents ?? uploadData?.data?.documents ?? []
      if (documents.length > 0) {
        const newImages = documents.map((d) => ({
          _id: d._id || d.id,
          path: d.path || d.url || '',
        }))
        setVariantCombinations((prev) => {
          const next = [...prev]
          next[comboIndex] = {
            ...next[comboIndex],
            images: [...(next[comboIndex].images || []), ...newImages],
          }
          return next
        })
        toastSuccess(`${newImages.length} image(s) uploaded (S3)`)
      } else {
        toastError('No documents returned from upload')
      }
    } catch (err) {
      toastError(err?.message || 'Image upload failed')
    }
  }

  const removeVariantComboImage = (comboIndex, imageIndex) => {
    setVariantCombinations((prev) => {
      const next = [...prev]
      next[comboIndex] = {
        ...next[comboIndex],
        images: (next[comboIndex].images || []).filter((_, i) => i !== imageIndex),
      }
      return next
    })
  }

  /** Cartesian product of variant options -> array of { optionValues, uniqueId, sku, price, ... } */
  const generateSubvariantsFromVariants = () => {
    const varsWithOptions = variants.filter((v) => v?.name && v?.options?.length > 0)
    if (varsWithOptions.length === 0) {
      toastError('Add at least one variant with sub-variant options.')
      return
    }
    const baseSku = watch('sku') || 'SKU'
    const productHsn = watch('hsnNumber') || ''
    const productDefaultModel = watch('defaultModelNumber') || ''
    const productGst = watch('gstPercentage')
    const productGstNum = productGst !== '' && productGst != null ? parseFloat(productGst) : 0

    const optionArrays = varsWithOptions.map((v) =>
      (v.options || []).filter(Boolean).map((val) => ({ variantName: v.name, variantValue: val })),
    )
    const combine = (arrs, i = 0) => {
      if (i >= arrs.length) return [[]]
      const rest = combine(arrs, i + 1)
      return arrs[i].flatMap((opt) => rest.map((r) => [opt, ...r]))
    }
    const optionValueLists = combine(optionArrays)
    const newCombos = optionValueLists.map((optionValues, idx) => {
      const slug = optionValues.map((o) => `${o.variantValue}`).join('-').replace(/\s+/g, '-')
      const uniqueId = `combo-${slug}-${Date.now()}-${idx}`
      return {
        uniqueId,
        optionValues,
        sku: `${baseSku}-${slug}`,
        price: 0,
        mrp: 0,
        costPrice: 0,
        quantity: 0,
        weight: 0,
        weightUnit: 'g',
        dimensions: { length: 0, width: 0, height: 0 },
        dimensionUnit: 'cm',
        images: [],
        modelNumber: productDefaultModel,
        hsnNumber: productHsn,
        gstPercentage: productGstNum,
        isActive: true,
      }
    })
    setVariantCombinations(newCombos)
    toastSuccess(`Generated ${newCombos.length} subvariants. Upload images for each.`)
  }

  const updateVariantComboField = (comboIndex, field, value) => {
    setVariantCombinations((prev) => {
      const next = [...prev]
      next[comboIndex] = { ...next[comboIndex], [field]: value }
      return next
    })
  }

  const onSubmit = async (values) => {
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      let uploadedImages = [...existingImages]

      if (imageFiles.length > 0) {
        try {
          const opts = isEdit && id ? { productId: id } : {}
          const uploadRes = await productService.uploadImages(imageFiles, opts)
          const uploadData = uploadRes?.data || uploadRes
          if (uploadData?.documents?.length) {
            uploadedImages = [...uploadedImages, ...uploadData.documents.map((d) => d._id)]
          }
        } catch (uploadErr) {
          console.error('Image upload failed, continuing without images', uploadErr)
        }
      }

      const payload = {
        name: values.name,
        sku: values.sku,
        shortDescription: values.shortDescription || '',
        category: values.category,
        subcategory: values.subcategory || null,
        brand: values.brand || null,
        group: values.group || null,
        hsnNumber: values.hsnNumber || '',
        gstPercentage: values.gstPercentage !== '' && values.gstPercentage != null ? parseFloat(values.gstPercentage) : 0,
        defaultModelNumber: values.defaultModelNumber || '',
        hasVariants: values.hasVariants,
        variants: values.hasVariants ? variants : [],
        images: uploadedImages,
        weight: parseFloat(values.weight) || 0,
        weightUnit: values.weightUnit,
        dimensions: {
          length: parseFloat(values.dimensions?.length) || 0,
          width: parseFloat(values.dimensions?.width) || 0,
          height: parseFloat(values.dimensions?.height) || 0,
        },
        dimensionUnit: values.dimensionUnit,
        tags: values.tags
          ? values.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        status: values.status,
        unit: values.unit,
      }
      if (values.hasVariants && variantCombinations.length > 0) {
        payload.variantCombinations = variantCombinations.map((vc) => ({
          ...vc,
          modelNumber: vc.modelNumber || '',
          hsnNumber: vc.hsnNumber ?? '',
          gstPercentage: vc.gstPercentage !== undefined && vc.gstPercentage !== '' ? parseFloat(vc.gstPercentage) : null,
          images: (vc.images || []).map((img) => (typeof img === 'object' && img?._id ? img._id : img)),
        }))
      }

      if (isEdit) {
        await productService.update(id, payload)
        toastSuccess('Product updated successfully')
        navigate('/products')
      } else {
        const created = await productService.create(payload)
        const createdProduct = created?.data?.data || created?.data
        const productCode = createdProduct?.productCode
        const variantCodes = createdProduct?.variantCombinations?.map((vc) => vc.variantCode).filter(Boolean)
        let msg = 'Product created successfully.'
        if (productCode) msg += ` Product Code: ${productCode}`
        if (variantCodes?.length > 0) msg += ` Variants: ${variantCodes.join(', ')}`
        toastSuccess(msg)
        setTimeout(() => navigate(createdProduct?._id ? `/products/${createdProduct._id}` : '/products'), 1500)
      }
    } catch (err) {
      toastError(err?.message || 'Failed to save product')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading product..." />
      </div>
    )
  }

  return (
    <CForm
      onSubmit={handleSubmit(onSubmit)}
      style={{ fontSize: '1.1rem' }}
    >
      <CRow className="mb-3">
        <CCol>
          <CButton color="light" onClick={() => navigate('/products')} className="me-2">
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Products
          </CButton>
        </CCol>
      </CRow>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError('')}>
          {error}
        </CAlert>
      )}
      {success && (
        <CAlert color="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </CAlert>
      )}

      <CCard className="mb-4">
        <CCardHeader
          style={sectionHeaderStyle}
          className="d-flex justify-content-between align-items-center"
        >
          <strong>Basic Information</strong>
          {!isEdit && (
            <CButton color="secondary" size="sm" variant="outline" onClick={handleClearDraft}>
              Clear saved data
            </CButton>
          )}
        </CCardHeader>
        <CCardBody style={sectionBodyStyle}>
          <CRow>
            <CCol md={8}>
              <div className="mb-3">
                <CFormLabel>Product Name *</CFormLabel>
                <CFormInput placeholder="Enter product name" {...register('name')} />
                {errors.name && (
                  <div className="text-danger small mt-1">{errors.name.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>SKU *</CFormLabel>
                <CFormInput placeholder="e.g., PROD-001" {...register('sku')} />
                {errors.sku && (
                  <div className="text-danger small mt-1">{errors.sku.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Short Description</CFormLabel>
                <CFormInput placeholder="Brief product summary" {...register('shortDescription')} />
                {errors.shortDescription && (
                  <div className="text-danger small mt-1">
                    {errors.shortDescription.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Group</CFormLabel>
                <CFormInput
                  placeholder="Type to search group..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                />
                {groupSearch && (
                  <div
                    className="border rounded mt-1 bg-white"
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  >
                    {filteredGroups.length === 0 && (
                      <div className="px-2 py-1 text-muted small">No matches</div>
                    )}
                    {filteredGroups.map((g) => {
                      const id = g._id || g.id
                      const isSelected = selectedGroup === id
                      return (
                        <div
                          key={id}
                          className={`px-2 py-1 small ${isSelected ? 'bg-light' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const nextVal = id || ''
                            setValue('group', nextVal, { shouldValidate: true })
                            setGroupSearch(g.name || '')
                            // reset dependent fields
                            setValue('category', '', { shouldValidate: true })
                            setValue('subcategory', '', { shouldValidate: true })
                            setCategorySearch('')
                            setSubcategorySearch('')
                          }}
                        >
                          {g.name}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel className="mb-0">Category *</CFormLabel>
                <CFormInput
                  placeholder="Type to search category..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                {(categorySearch || selectedGroup) && (
                  <div
                    className="border rounded mt-1 bg-white"
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  >
                    {filteredCategories.length === 0 && (
                      <div className="px-2 py-1 text-muted small">
                        {selectedGroup ? 'No categories in this group' : 'No matches'}
                      </div>
                    )}
                    {filteredCategories.map((cat) => {
                      const id = cat._id || cat.id
                      const isSelected = selectedCategory === id
                      return (
                        <div
                          key={id}
                          className={`px-2 py-1 small ${isSelected ? 'bg-light' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const nextVal = id || ''
                            setValue('category', nextVal, { shouldValidate: true })
                            setCategorySearch(cat.name || '')
                            handleCategoryChange(nextVal)
                          }}
                        >
                          {cat.name}
                        </div>
                      )
                    })}
                  </div>
                )}
                {errors.category && (
                  <div className="text-danger small mt-1">{errors.category.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel className="mb-0">Subcategory</CFormLabel>
                <CFormInput
                  placeholder="Type to search subcategory..."
                  value={subcategorySearch}
                  onChange={(e) => setSubcategorySearch(e.target.value)}
                  disabled={subcategories.length === 0}
                />
                {subcategorySearch && subcategories.length > 0 && (
                  <div
                    className="border rounded mt-1 bg-white"
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  >
                    {filteredSubcategories.length === 0 && (
                      <div className="px-2 py-1 text-muted small">No matches</div>
                    )}
                    {filteredSubcategories.map((sub) => {
                      const id = sub._id || sub.id
                      const isSelected = selectedSubcategory === id
                      return (
                        <div
                          key={id}
                          className={`px-2 py-1 small ${isSelected ? 'bg-light' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const nextVal = id || ''
                            setValue('subcategory', nextVal, { shouldValidate: true })
                            setSubcategorySearch(sub.name || '')
                          }}
                        >
                          {sub.name}
                        </div>
                      )
                    })}
                  </div>
                )}
                {errors.subcategory && (
                  <div className="text-danger small mt-1">{errors.subcategory.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel className="mb-0">Brand</CFormLabel>
                <CFormInput
                  placeholder="Type to search brand..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                />
                {brandSearch && (
                  <div
                    className="border rounded mt-1 bg-white"
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  >
                    {filteredBrands.length === 0 && (
                      <div className="px-2 py-1 text-muted small">No matches</div>
                    )}
                    {filteredBrands.map((b) => {
                      const id = b._id || b.id
                      const isSelected = selectedBrand === id
                      return (
                        <div
                          key={id}
                          className={`px-2 py-1 small ${isSelected ? 'bg-light' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const nextVal = id || ''
                            setValue('brand', nextVal, { shouldValidate: true })
                            setBrandSearch(b.name || '')
                          }}
                        >
                          {b.name}
                        </div>
                      )
                    })}
                  </div>
                )}
                {errors.brand && (
                  <div className="text-danger small mt-1">{errors.brand.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>HSN Number</CFormLabel>
                <CFormInput placeholder="e.g., 8471" {...register('hsnNumber')} />
                {errors.hsnNumber && (
                  <div className="text-danger small mt-1">{errors.hsnNumber.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Default Model Number</CFormLabel>
                <CFormInput
                  placeholder="Default for subvariants"
                  {...register('defaultModelNumber')}
                />
                {errors.defaultModelNumber && (
                  <div className="text-danger small mt-1">
                    {errors.defaultModelNumber.message}
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>GST %</CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g., 18"
                  {...register('gstPercentage')}
                />
                {errors.gstPercentage && (
                  <div className="text-danger small mt-1">{errors.gstPercentage.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Unit *</CFormLabel>
                <CFormInput placeholder="e.g., pcs, kg, ltr" {...register('unit')} />
                {errors.unit && (
                  <div className="text-danger small mt-1">{errors.unit.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Status *</CFormLabel>
                <CFormSelect {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </CFormSelect>
                {errors.status && (
                  <div className="text-danger small mt-1">{errors.status.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Tags (comma separated)</CFormLabel>
                <CFormInput
                  placeholder="e.g., electronics, gadgets, sale"
                  {...register('tags')}
                />
                {errors.tags && (
                  <div className="text-danger small mt-1">{errors.tags.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader
          className="d-flex justify-content-between align-items-center"
          style={{ ...sectionHeaderStyle, cursor: 'pointer' }}
          onClick={() => setValue('hasVariants', !hasVariants)}
        >
          <strong>Variants</strong>
          <CFormCheck
            id="hasVariants"
            label="This product has variants"
            checked={!!hasVariants}
            {...register('hasVariants')}
            onClick={(e) => e.stopPropagation()}
            style={{ transform: 'scale(1.5)', transformOrigin: 'right center' }}
          />
        </CCardHeader>
        {hasVariants && (
          <CCardBody style={sectionBodyStyle}>
            {variants.map((variant, vIndex) => (
              <CCard key={vIndex} className="mb-3 border">
                <CCardHeader className="bg-light d-flex justify-content-between align-items-center py-2">
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <strong className="text-nowrap">Variant:</strong>
                    {customVariantInput[vIndex] ? (
                      <div className="d-flex align-items-center gap-1">
                        <CFormInput
                          size="sm"
                          value={variant.name}
                          onChange={(e) => updateVariantName(vIndex, e.target.value)}
                          placeholder="Enter custom variant name"
                          style={{ maxWidth: '200px' }}
                          autoFocus
                        />
                        <CButton
                          color="secondary"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomVariantInput((prev) => ({ ...prev, [vIndex]: false }))
                            setVariants((prev) => {
                              const next = [...prev]
                              next[vIndex] = { ...next[vIndex], name: '' }
                              return next
                            })
                          }}
                          title="Back to dropdown"
                        >
                          &times;
                        </CButton>
                      </div>
                    ) : (
                      <CFormSelect
                        size="sm"
                        value={
                          VARIANT_TYPE_OPTIONS.some((o) => o.value === variant.name)
                            ? variant.name
                            : variant.name
                              ? '__custom__'
                              : ''
                        }
                        onChange={(e) => handleVariantTypeChange(vIndex, e.target.value)}
                        style={{ maxWidth: '250px' }}
                      >
                        <option value="" disabled>
                          Select variant type
                        </option>
                        {VARIANT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                        <option value="__custom__">+ Create New</option>
                      </CFormSelect>
                    )}
                  </div>
                  <div className="d-flex gap-1">
                    <CButton
                      color="primary"
                      variant="ghost"
                      size="sm"
                      onClick={() => addSubVariant(vIndex)}
                      title="Add sub-variant"
                    >
                      <CIcon icon={cilPlus} className="me-1" />
                      Add Sub-variant
                    </CButton>
                    <CButton
                      color="danger"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(vIndex)}
                      title="Remove variant"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </div>
                </CCardHeader>
                {variant.options.length > 0 && (
                  <CCardBody className="p-2">
                    {variant.options.map((option, oIndex) => (
                      <div
                        key={oIndex}
                        className="border rounded mb-2"
                        style={{ backgroundColor: '#fafafa' }}
                      >
                        <div className="d-flex align-items-center gap-2 p-2">
                          <CFormInput
                            size="sm"
                            value={option}
                            onChange={(e) =>
                              updateSubVariantName(vIndex, oIndex, e.target.value)
                            }
                            placeholder={`e.g., ${variant.name === 'Color' ? 'Red, Blue, Green' : variant.name === 'Size' ? 'S, M, L, XL' : 'Option name'}`}
                            style={{ maxWidth: '200px' }}
                          />
                          <span className="text-muted small">
                            Sub-variant {oIndex + 1}
                          </span>
                          <div className="ms-auto d-flex gap-1">
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSubVariant(vIndex, oIndex)}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CCardBody>
                )}
                {variant.options.length === 0 && (
                  <CCardBody className="text-muted text-center py-3">
                    No sub-variants yet. Click &quot;Add Sub-variant&quot; to add options like Red,
                    Blue, Green.
                  </CCardBody>
                )}
              </CCard>
            ))}

            <div className="mb-3">
              <CButton color="light" onClick={addVariant}>
                <CIcon icon={cilPlus} className="me-1" />
                Add Variant
              </CButton>
            </div>

            {/* Subvariants (combinations) – generate from variant options, then upload images for each */}
            <CCard className="mt-3 border-primary">
              <CCardHeader className="bg-light">
                <strong>Subvariants (combinations)</strong>
                <small className="text-muted ms-2">
                  Generate combinations, then upload multiple images for each (stored on AWS S3).
                </small>
              </CCardHeader>
              <CCardBody>
                {variantCombinations.length === 0 ? (
                  <div>
                    <p className="text-muted mb-2">
                      Add variant types and their options above (e.g. Color: Red, Blue; Size: S, M). Then click below to generate all subvariants.
                    </p>
                    <CButton
                      color="primary"
                      onClick={generateSubvariantsFromVariants}
                      disabled={!variants.some((v) => v?.name && v?.options?.length > 0)}
                    >
                      <CIcon icon={cilPlus} className="me-1" />
                      Generate subvariants from variant options
                    </CButton>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 d-flex justify-content-between align-items-center">
                      <span className="text-muted">{variantCombinations.length} subvariant(s)</span>
                      <CButton color="secondary" size="sm" onClick={generateSubvariantsFromVariants}>
                        Regenerate
                      </CButton>
                    </div>
                    {variantCombinations.map((combo, cIdx) => (
                      <CCard key={combo.uniqueId || cIdx} className="mb-3 border">
                        <CCardBody className="py-2">
                          <div className="mb-2 d-flex align-items-center gap-2 flex-wrap">
                            <strong>
                              {combo.optionValues?.map((o) => `${o.variantName}: ${o.variantValue}`).join(' · ') || 'Subvariant'}
                            </strong>
                            {combo.variantCode && (
                              <code className="text-primary small">Code: {combo.variantCode}</code>
                            )}
                          </div>
                          <div className="row g-2 mb-2">
                            <div className="col-md-4">
                              <CFormLabel className="small text-muted">HSN Number</CFormLabel>
                              <CFormInput
                                type="text"
                                placeholder="Defaults to product HSN"
                                value={combo.hsnNumber ?? ''}
                                onChange={(e) => updateVariantComboField(cIdx, 'hsnNumber', e.target.value)}
                                className="form-control form-control-sm"
                                maxLength={50}
                              />
                            </div>
                            <div className="col-md-4">
                              <CFormLabel className="small text-muted">Model Number</CFormLabel>
                              <CFormInput
                                type="text"
                                placeholder="Defaults to product default"
                                value={combo.modelNumber ?? ''}
                                onChange={(e) => updateVariantComboField(cIdx, 'modelNumber', e.target.value)}
                                className="form-control form-control-sm"
                                maxLength={100}
                              />
                            </div>
                            <div className="col-md-4">
                              <CFormLabel className="small text-muted">GST %</CFormLabel>
                              <CFormInput
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="Defaults to product %"
                                value={combo.gstPercentage !== undefined && combo.gstPercentage !== '' ? combo.gstPercentage : ''}
                                onChange={(e) => updateVariantComboField(cIdx, 'gstPercentage', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="form-control form-control-sm"
                              />
                            </div>
                          </div>
                          <div className="d-flex flex-wrap gap-2 align-items-start">
                            {(combo.images || []).map((img, iIdx) => (
                              <div key={img?._id || iIdx} className="position-relative">
                                <CImage
                                  src={typeof img === 'object' && img?.path ? getAssetsUrl(img.path) : img}
                                  width={80}
                                  height={80}
                                  className="object-fit-cover rounded border"
                                />
                                <CButton
                                  color="danger"
                                  size="sm"
                                  className="position-absolute top-0 end-0"
                                  style={{ transform: 'translate(50%, -50%)' }}
                                  onClick={() => removeVariantComboImage(cIdx, iIdx)}
                                >
                                  &times;
                                </CButton>
                              </div>
                            ))}
                            <div className="mb-0">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={(el) => { comboFileInputRefs.current[cIdx] = el }}
                                className="d-none"
                                onChange={(e) => {
                                  const files = e.target.files
                                  if (files?.length) handleVariantComboImageUpload(cIdx, files)
                                  e.target.value = ''
                                }}
                              />
                              <CButton
                                color="primary"
                                size="sm"
                                type="button"
                                className="mb-0"
                                variant="outline"
                                onClick={() => comboFileInputRefs.current[cIdx]?.click()}
                              >
                                <CIcon icon={cilPlus} className="me-1" />
                                Upload images
                              </CButton>
                            </div>
                          </div>
                        </CCardBody>
                      </CCard>
                    ))}
                  </>
                )}
              </CCardBody>
            </CCard>
          </CCardBody>
        )}
      </CCard>

      <CCard className="mb-4">
        <CCardHeader style={sectionHeaderStyle}>
          <strong>Physical Attributes</strong>
        </CCardHeader>
        <CCardBody style={sectionBodyStyle}>
          <CRow>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Weight</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('weight')} />
                {errors.weight && (
                  <div className="text-danger small mt-1">{errors.weight.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Weight Unit *</CFormLabel>
                <CFormSelect {...register('weightUnit')}>
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="lb">Pounds (lb)</option>
                  <option value="oz">Ounces (oz)</option>
                </CFormSelect>
                {errors.weightUnit && (
                  <div className="text-danger small mt-1">{errors.weightUnit.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Length</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('dimensions.length')} />
                {errors.dimensions?.length && (
                  <div className="text-danger small mt-1">{errors.dimensions.length.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Width</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('dimensions.width')} />
                {errors.dimensions?.width && (
                  <div className="text-danger small mt-1">{errors.dimensions.width.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Height</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('dimensions.height')} />
                {errors.dimensions?.height && (
                  <div className="text-danger small mt-1">{errors.dimensions.height.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Dimension Unit *</CFormLabel>
                <CFormSelect {...register('dimensionUnit')}>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="in">Inches (in)</option>
                  <option value="m">Meters (m)</option>
                </CFormSelect>
                {errors.dimensionUnit && (
                  <div className="text-danger small mt-1">{errors.dimensionUnit.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader style={sectionHeaderStyle}>
          <strong>Images</strong>
        </CCardHeader>
        <CCardBody style={sectionBodyStyle}>
          <CRow className="align-items-start gy-3">
            <CCol md={5}>
              <div
                className="text-center p-4 h-100 d-flex flex-column justify-content-center"
                style={{
                  border: '2px dashed #d8dbe0',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <div className="mb-2">
                  <CIcon icon={cilPlus} className="me-1 text-muted" />
                  <span className="fw-semibold">Add product images</span>
                </div>
                <p className="text-muted small mb-3">
                  JPG, PNG, or WebP. Up to 10 images. First image is used as the primary thumbnail.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('product-images-input')
                      input && input.click()
                    }}
                  >
                    Browse files
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    disabled={imagePreviews.length === 0}
                    onClick={() => {
                      // Clear all newly added images & previews, keep existingImages
                      setImageFiles([])
                      setImagePreviews([])
                    }}
                  >
                    Clear selection
                  </CButton>
                </div>
                <input
                  id="product-images-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                {imagePreviews.length > 0 && (
                  <div className="mt-3 text-muted small">
                    {imagePreviews.length} image{imagePreviews.length > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={7}>
              {imagePreviews.length === 0 ? (
                <div className="text-muted small">
                  No images selected yet. Add a few high-quality photos to help users quickly
                  understand the product (front, back, close-up, packaging, etc.).
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="position-relative rounded border bg-white shadow-sm"
                      style={{ width: 120, height: 120 }}
                    >
                      <CImage
                        src={preview}
                        width={120}
                        height={120}
                        className="object-fit-cover rounded"
                      />
                      {index === 0 && (
                        <span
                          className="badge bg-primary position-absolute"
                          style={{ top: 4, left: 4 }}
                        >
                          Primary
                        </span>
                      )}
                      <CButton
                        color="danger"
                        size="sm"
                        className="position-absolute top-0 end-0"
                        style={{ transform: 'translate(25%, -25%)' }}
                        onClick={() => removeImage(index)}
                      >
                        &times;
                      </CButton>
                    </div>
                  ))}
                </div>
              )}
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardBody className="d-flex justify-content-end gap-2">
          <CButton color="secondary" onClick={() => navigate('/products')}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? <CSpinner size="sm" /> : isEdit ? 'Update Product' : 'Create Product'}
          </CButton>
        </CCardBody>
      </CCard>
    </CForm>
  )
}

export default ProductForm
