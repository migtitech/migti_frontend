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
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil, cilTrash, cilCheckAlt } from '@coreui/icons'
import queryService from '../../services/queryService'
import employeeService from '../../services/employeeService'
import userService from '../../services/userService'
import { useAuth } from '../../context/AuthContext'
import usePermissions from '../../hooks/usePermissions'
import { Loader, ConfirmDialog, TrackingTimeline } from '../../components'
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
  const [converting, setConverting] = useState(false)
  const [activities, setActivities] = useState([])
  const [activitiesPagination, setActivitiesPagination] = useState(null)
  const [activitiesPage, setActivitiesPage] = useState(1)
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const viewRecordedRef = useRef(false)
  const [userCache, setUserCache] = useState({})

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

  const handleConvertConfirm = async () => {
    if (!query?.queryCode) {
      toastError('Query code is missing, cannot convert to quotation.')
      setConfirmConvert({ visible: false })
      return
    }
    setConfirmConvert({ visible: false })
    setConverting(true)
    try {
      await withMinimumDelay(() => queryService.convertToQuotation(query.queryCode))
      toastSuccess('Query converted to quotation draft')
      navigate('/quotations/new', {
        state: {
          fromQuery: query,
        },
      })
    } catch (err) {
      toastError(err?.message || 'Failed to convert query to quotation')
    } finally {
      setConverting(false)
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

  const formatVariants = (variants) => {
    if (!variants?.length) return '—'
    return variants.map((v) => v.variantName || '—').filter(Boolean).join(', ') || '—'
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <CButton color="light" onClick={() => navigate('/queries')}>
              <CIcon icon={cilArrowLeft} className="me-1" />
              Back to Queries
            </CButton>
            {query.queryCode && (
              <CBadge color="info" className="fs-6 px-3 py-2">{query.queryCode}</CBadge>
            )}
          </div>
          <div className="d-flex gap-2">
            {canUpdate('queries') && (
              <>
                <CButton
                  color="success"
                  disabled={converting || !query?.queryCode}
                  onClick={handleConvertClick}
                >
                  <CIcon icon={cilCheckAlt} className="me-1" />
                  Convert to Quotation
                </CButton>
                <CButton color="warning" onClick={() => navigate(`/queries/edit/${id}`)}>
                  <CIcon icon={cilPencil} className="me-1" />
                  Edit
                </CButton>
              </>
            )}
            {canDelete('queries') && (
              <CButton color="danger" onClick={handleDeleteClick}>
                <CIcon icon={cilTrash} className="me-1" />
                Delete
              </CButton>
            )}
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol lg={8}>
          {/* 1. Company Information */}
          <CCard className="mb-4">
            <CCardHeader><strong>1. Company Information</strong></CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between"><strong>Company name</strong><span>{ci.name || '-'}</span></CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between"><strong>Location</strong><span>{ci.location || '-'}</span></CListGroupItem>
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
                <CTable responsive hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: 60 }}>#</CTableHeaderCell>
                      <CTableHeaderCell>Product name</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 100 }}>Quantity</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 80 }}>Unit</CTableHeaderCell>
                      <CTableHeaderCell>Variants</CTableHeaderCell>
                      <CTableHeaderCell>HSN Number</CTableHeaderCell>
                      <CTableHeaderCell>GST %</CTableHeaderCell>
                      <CTableHeaderCell>Remark</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {prods.map((p, index) => {
                      const productRef = typeof p.product_id === 'object' ? p.product_id : null
                      return (
                      <CTableRow key={p._id || index}>
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell>{p.productName || '—'}</CTableDataCell>
                        <CTableDataCell>{p.quantity != null ? p.quantity : '—'}</CTableDataCell>
                        <CTableDataCell>{p.unit || '—'}</CTableDataCell>
                        <CTableDataCell className="small">{formatVariants(p.variants)}</CTableDataCell>
                        <CTableDataCell className="small">{productRef?.hsnNumber || p.hsnNumber || '—'}</CTableDataCell>
                        <CTableDataCell className="small">{productRef?.gstPercentage != null ? `${productRef.gstPercentage}%` : (p.gstPercentage != null ? `${p.gstPercentage}%` : '—')}</CTableDataCell>
                        <CTableDataCell className="small">{p.remark || '—'}</CTableDataCell>
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

        {/* Query Tracking sidebar */}
        <CCol lg={4}>
          <TrackingTimeline
            query={query}
            activities={activities}
            pagination={activitiesPagination}
            loading={activitiesLoading}
            onLoadPage={loadActivitiesPage}
            creator={creator}
            getPerformerInfo={getPerformerInfo}
          />
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
    </>
  )
}

export default QueryView
