import React, { useEffect, useState } from 'react'
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
import imageService from '../../services/imageService'
import categoryService from '../../services/categoryService'
import brandService from '../../services/brandService'
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
  name: yup.string().required('Product name is required').min(2).max(120),
  sku: yup.string().required('SKU is required').min(2).max(60),
  description: yup.string().optional(),
  shortDescription: yup.string().optional(),
  category: yup.string().required('Category is required'),
  subcategory: yup.string().optional(),
  brand: yup.string().optional(),
  price: numberField('Selling price', true),
  mrp: numberField('MRP'),
  costPrice: numberField('Cost price'),
  quantity: numberField('Quantity'),
  hasVariants: yup.boolean().default(false),
  weight: numberField('Weight'),
  weightUnit: yup.string().required('Weight unit is required'),
  dimensions: yup.object({
    length: numberField('Length'),
    width: numberField('Width'),
    height: numberField('Height'),
  }),
  dimensionUnit: yup.string().required('Dimension unit is required'),
  tags: yup.string().optional(),
  status: yup.string().required('Status is required'),
  unit: yup.string().required('Unit is required'),
})

const defaultValues = {
  name: '',
  sku: '',
  description: '',
  shortDescription: '',
  category: '',
  subcategory: '',
  brand: '',
  price: '',
  mrp: '',
  costPrice: '',
  quantity: '',
  hasVariants: false,
  weight: '',
  weightUnit: 'g',
  dimensions: { length: '', width: '', height: '' },
  dimensionUnit: 'cm',
  tags: '',
  status: 'draft',
  unit: 'pcs',
}

const ProductForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [brands, setBrands] = useState([])

  const [variants, setVariants] = useState([])
  const [customVariantInput, setCustomVariantInput] = useState({})

  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [variantImageFiles, setVariantImageFiles] = useState({})

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

  useEffect(() => {
    fetchDropdownData()
    if (isEdit) {
      fetchProduct()
    } else {
      reset(defaultValues)
    }
  }, [id])

  useEffect(() => {
    if (!hasVariants) {
      setVariants([])
    }
  }, [hasVariants])

  const fetchDropdownData = async () => {
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
      console.error('Failed to fetch dropdown data', err)
    }
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

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const res = await withMinimumDelay(() => productService.getById(id))
      const product = res?.data || res
      if (product) {
        reset({
          name: product.name || '',
          sku: product.sku || '',
          description: product.description || '',
          shortDescription: product.shortDescription || '',
          category: product.category?._id || product.category || '',
          subcategory: product.subcategory?._id || product.subcategory || '',
          brand: product.brand?._id || product.brand || '',
          price: product.price ?? '',
          mrp: product.mrp ?? '',
          costPrice: product.costPrice ?? '',
          quantity: product.quantity ?? '',
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
        setExistingImages(product.images || [])
        setImagePreviews(product.images || [])
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

  const handleVariantImageUpload = (comboIndex, e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setVariantImageFiles((prev) => ({
      ...prev,
      [comboIndex]: [...(prev[comboIndex] || []), ...files],
    }))
  }

  const removeVariantImage = (comboIndex, fileIndex) => {
    setVariantImageFiles((prev) => {
      const list = prev[comboIndex] || []
      const next = list.filter((_, i) => i !== fileIndex)
      if (next.length === 0) {
        const { [comboIndex]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [comboIndex]: next }
    })
  }

  const extractImageUrls = (images) => {
    if (!images || !Array.isArray(images)) return []
    return images.map((img) => getImageDisplayUrl(img)).filter(Boolean)
  }

  const onSubmit = async (values) => {
    setSubmitting(true)
    setUploadStatus('')
    setError('')
    setSuccess('')

    try {
      const combosForPayload = (values.hasVariants ? variantCombinations : []).map((c, i) => ({
        ...c,
        sku: (c.sku || '').trim() || `${values.sku}-V${i + 1}`,
      }))

      const basePayload = {
        name: values.name,
        sku: values.sku,
        description: values.description || '',
        shortDescription: values.shortDescription || '',
        category: values.category,
        subcategory: values.subcategory || null,
        brand: values.brand || null,
        price: parseFloat(values.price) || 0,
        mrp: parseFloat(values.mrp) || 0,
        costPrice: parseFloat(values.costPrice) || 0,
        quantity: parseInt(values.quantity) || 0,
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

      if (isEdit) {
        let productImages = [...existingImages]
        if (imageFiles.length > 0) {
          try {
            const uploadRes = await productService.uploadImagesS3(id, imageFiles)
            const uploaded = uploadRes?.data?.images || []
            productImages = [...productImages, ...extractImageUrls(uploaded)]
          } catch (uploadErr) {
            console.error('Product image upload failed', uploadErr)
          }
        }

        const combosWithImages = variantCombinations.map((combo, idx) => {
          const existing = extractImageUrls(combo.images || [])
          if (variantImageFiles[idx]?.length > 0 && combo.uniqueId) {
            return { ...combo, _pendingVariantUpload: variantImageFiles[idx] }
          }
          return { ...combo, images: existing }
        })

        const pendingVariantUploads = combosWithImages
          .map((c, i) => (c._pendingVariantUpload ? { index: i, combo: c } : null))
          .filter(Boolean)

        for (const { index, combo } of pendingVariantUploads) {
          try {
            const res = await imageService.uploadImages({
              productId: id,
              files: combo._pendingVariantUpload,
              imageType: 'variant',
              variantCombinationUniqueId: combo.uniqueId,
            })
            const urls = extractImageUrls(res?.data?.images || [])
            combosWithImages[index] = {
              ...combo,
              images: [...extractImageUrls(combo.images || []), ...urls],
              _pendingVariantUpload: undefined,
            }
          } catch (uploadErr) {
            console.error('Variant image upload failed', uploadErr)
          }
        }

        const finalCombos = combosWithImages.map(({ _pendingVariantUpload, ...c }) => c)
        const payload = { ...basePayload, images: productImages, variantCombinations: finalCombos }
        await productService.update(id, payload)
        toastSuccess('Product updated successfully')
        navigate('/products')
      } else {
        await productService.create(payload)
        toastSuccess('Product created successfully')
        setTimeout(() => navigate('/products'), 1500)
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
    <CForm onSubmit={handleSubmit(onSubmit)}>
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
      {uploadStatus && (
        <CAlert color="info" className="mb-2">
          {uploadStatus}
        </CAlert>
      )}
      {success && (
        <CAlert color="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </CAlert>
      )}

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Basic Information</strong>
        </CCardHeader>
        <CCardBody>
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
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Full Description</CFormLabel>
                <CFormTextarea rows={4} placeholder="Detailed product description" {...register('description')} />
                {errors.description && (
                  <div className="text-danger small mt-1">{errors.description.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Category *</CFormLabel>
                <CFormSelect
                  {...register('category', {
                    onChange: (e) => handleCategoryChange(e.target.value),
                  })}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </CFormSelect>
                {errors.category && (
                  <div className="text-danger small mt-1">{errors.category.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Subcategory</CFormLabel>
                <CFormSelect {...register('subcategory')} disabled={subcategories.length === 0}>
                  <option value="">
                    {subcategories.length === 0 ? 'No subcategories' : 'Select Subcategory'}
                  </option>
                  {subcategories.map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {sub.name}
                    </option>
                  ))}
                </CFormSelect>
                {errors.subcategory && (
                  <div className="text-danger small mt-1">{errors.subcategory.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={4}>
              <div className="mb-3">
                <CFormLabel>Brand</CFormLabel>
                <CFormSelect {...register('brand')}>
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </CFormSelect>
                {errors.brand && (
                  <div className="text-danger small mt-1">{errors.brand.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Unit *</CFormLabel>
                <CFormInput placeholder="e.g., pcs, kg, ltr" {...register('unit')} />
                {errors.unit && (
                  <div className="text-danger small mt-1">{errors.unit.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
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
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Tags (comma separated)</CFormLabel>
                <CFormInput placeholder="e.g., electronics, gadgets, sale" {...register('tags')} />
                {errors.tags && (
                  <div className="text-danger small mt-1">{errors.tags.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Pricing & Stock</strong>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Selling Price *</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('price')} />
                {errors.price && (
                  <div className="text-danger small mt-1">{errors.price.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>MRP</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('mrp')} />
                {errors.mrp && (
                  <div className="text-danger small mt-1">{errors.mrp.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Cost Price</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('costPrice')} />
                {errors.costPrice && (
                  <div className="text-danger small mt-1">{errors.costPrice.message}</div>
                )}
              </div>
            </CCol>
            {!hasVariants && (
              <CCol md={3}>
                <div className="mb-3">
                  <CFormLabel>Quantity</CFormLabel>
                  <CFormInput type="number" min="0" {...register('quantity')} />
                  {errors.quantity && (
                    <div className="text-danger small mt-1">{errors.quantity.message}</div>
                  )}
                </div>
              </CCol>
            )}
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Variants</strong>
          <CFormCheck
            id="hasVariants"
            label="This product has variants"
            checked={!!hasVariants}
            {...register('hasVariants')}
          />
        </CCardHeader>
        {hasVariants && (
          <CCardBody>
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
          </CCardBody>
        )}
      </CCard>

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Physical Attributes</strong>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Weight</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('weight')} />
                {errors.weight && (
                  <div className="text-danger small mt-1">{errors.weight.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
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
          </CRow>
          <CRow>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Length</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('dimensions.length')} />
                {errors.dimensions?.length && (
                  <div className="text-danger small mt-1">{errors.dimensions.length.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Width</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('dimensions.width')} />
                {errors.dimensions?.width && (
                  <div className="text-danger small mt-1">{errors.dimensions.width.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Height</CFormLabel>
                <CFormInput type="number" min="0" step="0.01" {...register('dimensions.height')} />
                {errors.dimensions?.height && (
                  <div className="text-danger small mt-1">{errors.dimensions.height.message}</div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
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
        <CCardHeader>
          <strong>Images</strong>
        </CCardHeader>
        <CCardBody>
          <div className="mb-3">
            <CFormInput type="file" accept="image/*" multiple onChange={handleImageUpload} />
            <small className="text-muted">Upload product images (optional). Max 10 images.</small>
          </div>
          {imagePreviews.length > 0 && (
            <div className="d-flex flex-wrap gap-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="position-relative">
                  <CImage
                    src={preview}
                    width={120}
                    height={120}
                    className="object-fit-cover rounded border"
                  />
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
