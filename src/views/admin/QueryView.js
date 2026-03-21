import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CListGroup,
  CListGroupItem,
  CBadge,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CImage,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilArrowRight, cilPencil, cilTrash, cilCheckAlt, cilX, cilCloudDownload } from '@coreui/icons'
import { getAssetsUrl } from '../../api/endpoints'
import queryService from '../../services/queryService'
import employeeService from '../../services/employeeService'
import userService from '../../services/userService'
import { useAuth } from '../../context/AuthContext'
import usePermissions from '../../hooks/usePermissions'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('migticrm_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const getUserDisplayName = (userObj) => {
  if (!userObj) return null
  return userObj.name || userObj.username ||
    (userObj.firstName ? [userObj.firstName, userObj.lastName].filter(Boolean).join(' ') : null) ||
    userObj.email || null
}

const fetchUserById = async (userId) => {
  try {
    const res = await employeeService.getById(userId)
    const emp = res?.data?.employee || res?.data?.data || res?.data || null
    if (emp && (emp.name || emp.email || emp.firstName)) return emp
  } catch {}
  try {
    const res = await userService.getById(userId)
    const usr = res?.data?.user || res?.data?.admin || res?.data?.data || res?.data || null
    if (usr && (usr.name || usr.email || usr.firstName)) return { ...usr, role: usr.role || 'admin' }
  } catch {}
  return null
}

const QueryView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { canUpdate, canDelete } = usePermissions()
  const [query, setQuery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState({ visible: false })
  const [confirmConvert, setConfirmConvert] = useState({ visible: false })
  const [activities, setActivities] = useState([])
  const [activitiesPagination, setActivitiesPagination] = useState(null)
  const [activitiesPage, setActivitiesPage] = useState(1)
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const viewRecordedRef = useRef(false)
  const [userCache, setUserCache] = useState({})
  const [expandedImages, setExpandedImages] = useState([]) // array of image URLs for slider
  const [expandedImageIndex, setExpandedImageIndex] = useState(0)
  const [exportingPdf, setExportingPdf] = useState(false)

  const getImageUrl = (img) => {
    if (!img) return ''
    if (typeof img === 'object' && img?.path) return getAssetsUrl(img.path)
    return typeof img === 'string' ? img : ''
  }

  const fetchActivities = async (page = 1) => {
    if (!id) return
    try {
      setActivitiesLoading(true)
      const res = await queryService.getActivities(id, { pageNumber: page, pageSize: 10 })
      const data = res?.data?.data ?? res?.data
      const arr = Array.isArray(data?.activities) ? data.activities : (Array.isArray(data) ? data : [])
      setActivities(arr)
      setActivitiesPagination(data?.pagination ?? null)
      setActivitiesPage(page)
    } catch {
      setActivities([])
      setActivitiesPagination(null)
    } finally {
      setActivitiesLoading(false)
    }
  }

  const loadActivitiesPage = (page) => fetchActivities(page)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => queryService.getById(id))
        const data = res?.data || res
        const q = data?.data ?? data
        setQuery(q)
        if (q) await fetchActivities(1)
      } catch (err) {
        toastError(err?.message || 'Failed to load query')
        setError(err?.message || 'Failed to load query')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!query || !user || viewRecordedRef.current) return
    const performedBy = user?.id || user?._id
    if (!performedBy) return
    viewRecordedRef.current = true
    queryService.recordActivity(id, 'viewed', performedBy, {}).then(() => fetchActivities()).catch(() => {})
  }, [query, user, id])

  useEffect(() => {
    if (!query && activities.length === 0) return
    const storedUser = getStoredUser()
    const idsToResolve = new Set()
    if (query?.created_by && typeof query.created_by === 'string') {
      const cid = query.created_by
      if (!userCache[cid] && !(storedUser && (storedUser._id === cid || storedUser.id === cid))) idsToResolve.add(cid)
    }
    activities.forEach((act) => {
      const pid = typeof act.performedBy === 'string' ? act.performedBy : (typeof act.performed_by === 'string' ? act.performed_by : null)
      if (pid && !userCache[pid] && !(storedUser && (storedUser._id === pid || storedUser.id === pid)) &&
          !(act.performedBy && typeof act.performedBy === 'object') &&
          !(act.performed_by && typeof act.performed_by === 'object')) {
        idsToResolve.add(pid)
      }
    })
    if (idsToResolve.size === 0) return
    const resolveUsers = async () => {
      const newCache = { ...userCache }
      for (const uid of idsToResolve) {
        if (newCache[uid]) continue
        const userData = await fetchUserById(uid)
        if (userData) newCache[uid] = userData
      }
      setUserCache(newCache)
    }
    resolveUsers()
  }, [query, activities])

  const handleDeleteClick = () => setConfirmDelete({ visible: true })

  const handleDeleteConfirm = async () => {
    setConfirmDelete({ visible: false })
    try {
      await queryService.delete(id)
      toastSuccess('Query deleted successfully')
      navigate('/queries')
    } catch (err) {
      toastError(err?.message || 'Failed to delete query')
    }
  }

  const handleConvertClick = () => {
    setConfirmConvert({ visible: true })
  }

  const handleConvertConfirm = () => {
    if (!query?.queryCode) {
      toastError('Query code is missing, cannot convert to quotation.')
      setConfirmConvert({ visible: false })
      return
    }
    setConfirmConvert({ visible: false })
    navigate(`/quotations/generate/${id}`, {
      state: { query },
    })
  }

  const handleCreateReQuotation = () => {
    if (!query?.queryCode) {
      toastError('Query code is missing, cannot create re-quotation.')
      return
    }
    navigate(`/quotations/generate/${id}`, {
      state: { query, forceNewQuotation: true },
    })
  }

  const formatVariants = (variants) => {
    if (!variants?.length) return '—'
    return variants.map((v) => v.variantName || '—').filter(Boolean).join(', ') || '—'
  }

  const handleExportPDF = async () => {
    if (!id) return
    setExportingPdf(true)
    try {
      const response = await queryService.exportPdf(id)
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
      a.download = `query-${query?.queryCode || id}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toastSuccess('PDF exported successfully')
    } catch (err) {
      toastError(err?.message || 'Failed to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const getPerformerInfo = (act) => {
    const performer = act.performedBy && typeof act.performedBy === 'object' ? act.performedBy : (act.performed_by && typeof act.performed_by === 'object' ? act.performed_by : null)
    if (performer) {
      return {
        name: getUserDisplayName(performer) || act.performByName || performer.name,
        email: performer.email || null,
        phone: performer.phone || performer.phone_1 || null,
        role: performer.role || performer.designation || null,
      }
    }
    const performerId = typeof act.performedBy === 'string' ? act.performedBy : (typeof act.performed_by === 'string' ? act.performed_by : null)
    if (performerId) {
      const cached = userCache[performerId]
      if (cached) return { name: getUserDisplayName(cached), email: cached.email || null, phone: cached.phone || cached.phone_1 || null, role: cached.role || cached.designation || null }
      const storedUser = getStoredUser()
      if (storedUser && (storedUser._id === performerId || storedUser.id === performerId)) {
        return { name: getUserDisplayName(storedUser), email: storedUser.email || null, phone: storedUser.phone || storedUser.phone_1 || null, role: storedUser.role || storedUser.designation || null }
      }
    }
    return { name: act.performByName || null, email: null, phone: null, role: null }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'closed': return 'secondary'
      case 'convertedToQuotation': return 'success'
      case 'progress': return 'primary'
      case 'followup01pending':
      case 'followup02pending':
      case 'followup03pending': return 'warning'
      default: return 'info'
    }
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading query..." />
      </div>
    )
  }

  if (error || !query) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error || 'Query not found'}</p>
          <CButton color="primary" onClick={() => navigate('/queries')}>Back to Queries</CButton>
        </CCardBody>
      </CCard>
    )
  }

  const ci = query.companyInfo || {}
  const prods = query.products || []
  const companyName = ci.name || ci.companyName || '-'
  const companyLocation = ci.location || '-'

  let creator = query.created_by && typeof query.created_by === 'object' ? query.created_by : null
  if (!creator && query.created_by) {
    const creatorId = typeof query.created_by === 'string' ? query.created_by : null
    if (creatorId) {
      if (userCache[creatorId]) creator = userCache[creatorId]
      else {
        const storedUser = getStoredUser()
        if (storedUser && (storedUser._id === creatorId || storedUser.id === creatorId)) creator = storedUser
      }
    }
  }

  return (
    <>
      <CCard className="mb-4 border-0 shadow-sm" style={{ borderRadius: 12, backgroundColor: '#f8f9fb' }}>
        <CCardBody className="p-3 p-md-4">
          <div className="d-flex flex-column gap-3">
            <div className="small text-muted" style={{ fontSize: '0.82rem' }}>
              Home&nbsp;/&nbsp;Queries
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="px-3 py-2 rounded border bg-white">
                <span className="small text-muted me-2">Company</span>
                <span className="fw-semibold">{companyName}</span>
              </div>
              <div className="px-3 py-2 rounded border bg-white">
                <span className="small text-muted me-2">Location</span>
                <span className="fw-semibold">{companyLocation}</span>
              </div>
            </div>

            <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate('/queries')}
                  className="d-inline-flex align-items-center px-3"
                  style={{ height: 40 }}
                >
                  <CIcon icon={cilArrowLeft} className="me-2" />
                  Back to Queries
                </CButton>
                {query.queryCode && (
                  <div
                    className="fw-bold text-primary px-3 py-2 rounded-pill border"
                    style={{ fontSize: '0.95rem', letterSpacing: '0.3px', backgroundColor: '#eef4ff' }}
                  >
                    {query.queryCode}
                  </div>
                )}
              </div>

              <div className="d-flex flex-wrap justify-content-lg-end align-items-center gap-2">
                {canUpdate('quotations') && query.status !== 'convertedToQuotation' && (
                  <CButton
                    color="success"
                    disabled={!query?.queryCode}
                    onClick={handleConvertClick}
                    className="d-inline-flex align-items-center px-3"
                    style={{ height: 40 }}
                  >
                    <CIcon icon={cilCheckAlt} className="me-1" />
                    Convert to Quotation
                  </CButton>
                )}
                {canUpdate('quotations') && query.status === 'convertedToQuotation' && (
                  <CButton
                    color="success"
                    variant="outline"
                    disabled={!query?.queryCode}
                    onClick={handleCreateReQuotation}
                    className="d-inline-flex align-items-center px-3"
                    style={{ height: 40 }}
                  >
                    <CIcon icon={cilCheckAlt} className="me-1" />
                    Create Re-Quotation
                  </CButton>
                )}
                {canUpdate('queries') && (
                  <CButton
                    color="warning"
                    onClick={() => navigate(`/queries/edit/${id}`)}
                    className="d-inline-flex align-items-center px-3"
                    style={{ height: 40 }}
                  >
                    <CIcon icon={cilPencil} className="me-1" />
                    Edit
                  </CButton>
                )}
                {canDelete('queries') && (
                  <CButton
                    color="danger"
                    onClick={handleDeleteClick}
                    className="d-inline-flex align-items-center px-3"
                    style={{ height: 40 }}
                  >
                    <CIcon icon={cilTrash} className="me-1" />
                    Delete
                  </CButton>
                )}
                <CButton
                  color="primary"
                  variant="outline"
                  onClick={handleExportPDF}
                  disabled={exportingPdf}
                  className="d-inline-flex align-items-center px-3"
                  style={{ height: 40 }}
                >
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  {exportingPdf ? 'Exporting...' : 'Export PDF'}
                </CButton>
              </div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <CRow>
        <CCol xs={12}>
          {/* 1. Company Information */}
          <CCard className="mb-4 border-0 shadow-sm" style={{ borderRadius: 10 }}>
            <CCardHeader className="border-bottom" style={{ backgroundColor: '#fbfcfe' }}>
              <strong>1. Company Information</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex flex-column flex-md-row justify-content-between gap-1">
                  <strong>Company name</strong>
                  <span>{companyName}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex flex-column flex-md-row justify-content-between gap-1">
                  <strong>Location</strong>
                  <span>{companyLocation}</span>
                </CListGroupItem>
                <CListGroupItem><strong>Purchase managers</strong><div className="mt-1">{(ci.purchaseManagers || []).length > 0 ? (ci.purchaseManagers || []).map((m, i) => <div key={i}>{m.name || '–'}{m.phone ? ` • ${m.phone}` : ''}{m.email ? ` • ${m.email}` : ''}</div>) : (ci.purchase_manager_name || ci.purchase_manager_phone) ? `${ci.purchase_manager_name || '–'} • ${ci.purchase_manager_phone || ''}` : '–'}</div></CListGroupItem>
                <CListGroupItem><strong>Address</strong><div className="mt-1">{ci.address || '-'}</div></CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>

          {/* 2. Products */}
          <CCard className="mb-4">
            <CCardHeader><strong>2. Products</strong> {prods.length > 0 && <span className="text-muted fw-normal">({prods.length} item{prods.length !== 1 ? 's' : ''})</span>}</CCardHeader>
            <CCardBody>
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
                      <CTableHeaderCell>HSN Number</CTableHeaderCell>
                      <CTableHeaderCell>GST %</CTableHeaderCell>
                      <CTableHeaderCell>Remark</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 120 }}>Images</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {prods.map((p, index) => {
                      const productRef = typeof p.product_id === 'object' ? p.product_id : null
                      const snapshotImages = Array.isArray(p.images) ? p.images : []
                      const productRefImages = Array.isArray(productRef?.images) ? productRef.images : []
                      const allImages = (snapshotImages.length ? snapshotImages : productRefImages) || []
                      const imageUrls = allImages
                        .map((img) => getImageUrl(img))
                        .filter((src) => !!src)

                      return (
                        <CTableRow key={p._id || index}>
                          <CTableDataCell>{index + 1}</CTableDataCell>
                          <CTableDataCell>{p.productName || '—'}</CTableDataCell>
                          <CTableDataCell className="small">
                            {productRef?.shortDescription || p.description || '—'}
                          </CTableDataCell>
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
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setExpandedImages(imageUrls)
                                  setExpandedImageIndex(0)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setExpandedImages(imageUrls)
                                    setExpandedImageIndex(0)
                                  }
                                }}
                              >
                                {imageUrls.slice(0, 2).map((src, i) => (
                                  <div
                                    key={src || i}
                                    className="rounded border overflow-hidden flex-shrink-0"
                                    style={{ width: 48, height: 48 }}
                                  >
                                    <CImage
                                      src={src}
                                      width={48}
                                      height={48}
                                      className="object-fit-cover w-100 h-100"
                                    />
                                  </div>
                                ))}
                                {imageUrls.length > 2 && (
                                  <div
                                    className="d-flex align-items-center justify-content-center rounded border bg-light flex-shrink-0 text-primary small fw-bold"
                                    style={{ width: 40, height: 40, fontSize: '0.75rem' }}
                                  >
                                    +{imageUrls.length - 2}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              ) : (
                <p className="text-muted mb-0">No products added.</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Query?"
        message="Are you sure you want to delete this query? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
      <ConfirmDialog
        visible={confirmConvert.visible}
        onClose={() => setConfirmConvert({ visible: false })}
        onConfirm={handleConvertConfirm}
        title="Convert to quotation?"
        message="Are you sure to convert this query as quotation?"
        confirmText="Yes, convert"
        cancelText="Cancel"
      />
      {/* Image slider modal */}
      <CModal alignment="center" visible={expandedImages.length > 0} onClose={() => setExpandedImages([])} className="p-0">
        <CModalHeader className="border-0 pb-0 d-flex justify-content-between align-items-center">
          <CModalTitle className="mb-0">
            Image {expandedImages.length > 1 ? `${expandedImageIndex + 1} / ${expandedImages.length}` : ''}
          </CModalTitle>
          <CButton color="secondary" variant="ghost" size="sm" className="rounded-circle" onClick={() => setExpandedImages([])} aria-label="Close">
            <CIcon icon={cilX} size="lg" />
          </CButton>
        </CModalHeader>
        <CModalBody className="text-center p-3 position-relative">
          {expandedImages.length > 0 && (
            <>
              {expandedImages.length > 1 && (
                <>
                  <CButton
                    color="light"
                    variant="outline"
                    className="position-absolute top-50 translate-middle-y rounded-circle ms-2"
                    style={{ zIndex: 10, width: 48, height: 48, left: 0 }}
                    onClick={() => setExpandedImageIndex((idx) => (idx <= 0 ? expandedImages.length - 1 : idx - 1))}
                    aria-label="Previous"
                  >
                    <CIcon icon={cilArrowLeft} size="lg" />
                  </CButton>
                  <CButton
                    color="light"
                    variant="outline"
                    className="position-absolute top-50 translate-middle-y rounded-circle me-2"
                    style={{ zIndex: 10, width: 48, height: 48, right: 0 }}
                    onClick={() => setExpandedImageIndex((idx) => (idx >= expandedImages.length - 1 ? 0 : idx + 1))}
                    aria-label="Next"
                  >
                    <CIcon icon={cilArrowRight} size="lg" />
                  </CButton>
                </>
              )}
              <img
                src={expandedImages[expandedImageIndex]}
                alt={`Product ${expandedImageIndex + 1}`}
                className="img-fluid rounded"
                style={{ maxHeight: '80vh', objectFit: 'contain' }}
              />
            </>
          )}
        </CModalBody>
      </CModal>
    </>
  )
}

export default QueryView
