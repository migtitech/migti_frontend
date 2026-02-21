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
import { cilArrowLeft, cilPencil, cilTrash, cilUser, cilClock, cilCheckAlt, cilEnvelopeClosed } from '@coreui/icons'
import { EyeIcon } from '../../components'
import queryService from '../../services/queryService'
import employeeService from '../../services/employeeService'
import userService from '../../services/userService'
import { useAuth } from '../../context/AuthContext'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const QUERY_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'followup01pending', label: 'Follow-up 01 Pending' },
  { value: 'followup02pending', label: 'Follow-up 02 Pending' },
  { value: 'followup03pending', label: 'Follow-up 03 Pending' },
  { value: 'progress', label: 'Progress' },
  { value: 'convertedToQuotation', label: 'Converted to Quotation' },
  { value: 'closed', label: 'Closed' },
]

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

const getTimeAgo = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMs = now - d
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHrs = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)
  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return ''
}

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
  const [query, setQuery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState({ visible: false })
  const [activities, setActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const viewRecordedRef = useRef(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [actionForm, setActionForm] = useState({ action: '' })
  const [followUpForm, setFollowUpForm] = useState({ followUpStatus: 'pending', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [userCache, setUserCache] = useState({})

  const fetchActivities = async () => {
    if (!id) return
    try {
      setActivitiesLoading(true)
      const res = await queryService.getActivities(id)
      const resData = res?.data
      const arr = Array.isArray(resData) ? resData : (resData?.data ?? [])
      setActivities(Array.isArray(arr) ? arr : [])
    } catch {
      setActivities([])
    } finally {
      setActivitiesLoading(false)
    }
  }

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
        if (q) await fetchActivities()
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

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    if (!query || query.status === newStatus) return
    setStatusUpdating(true)
    try {
      await queryService.update(id, { ...query, status: newStatus })
      setQuery((q) => (q ? { ...q, status: newStatus } : q))
      toastSuccess('Status updated')
    } catch (err) {
      toastError(err?.message || 'Failed to update status')
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleRecordAction = async (e) => {
    e.preventDefault()
    const performedBy = user?.id || user?._id
    if (!performedBy) {
      toastError('Please log in to record an action.')
      return
    }
    if (!actionForm.action?.trim()) {
      toastError('Please enter the action performed.')
      return
    }
    try {
      setSubmitting(true)
      await queryService.recordActivity(id, 'action', performedBy, { action: actionForm.action.trim() })
      toastSuccess('Action recorded.')
      setActionForm({ action: '' })
      setShowActionModal(false)
      await fetchActivities()
    } catch (err) {
      toastError(err?.message || 'Failed to record action')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitFollowUp = async (e) => {
    e.preventDefault()
    const performedBy = user?.id || user?._id
    if (!performedBy) {
      toastError('Please log in to submit follow-up.')
      return
    }
    try {
      setSubmitting(true)
      await queryService.recordActivity(id, 'follow_up', performedBy, {
        followUpStatus: followUpForm.followUpStatus,
        note: followUpForm.note?.trim() || '',
      })
      toastSuccess('Follow-up submitted.')
      setFollowUpForm({ followUpStatus: 'pending', note: '' })
      setShowFollowUpModal(false)
      await fetchActivities()
    } catch (err) {
      toastError(err?.message || 'Failed to submit follow-up')
    } finally {
      setSubmitting(false)
    }
  }

  const getPerformerInfo = (act) => {
    const performer = act.performedBy && typeof act.performedBy === 'object' ? act.performedBy : (act.performed_by && typeof act.performed_by === 'object' ? act.performed_by : null)
    if (performer) {
      return { name: getUserDisplayName(performer), email: performer.email || null, role: performer.role || performer.designation || null }
    }
    const performerId = typeof act.performedBy === 'string' ? act.performedBy : (typeof act.performed_by === 'string' ? act.performed_by : null)
    if (performerId) {
      const cached = userCache[performerId]
      if (cached) return { name: getUserDisplayName(cached), email: cached.email || null, role: cached.role || cached.designation || null }
      const storedUser = getStoredUser()
      if (storedUser && (storedUser._id === performerId || storedUser.id === performerId)) {
        return { name: getUserDisplayName(storedUser), email: storedUser.email || null, role: storedUser.role || storedUser.designation || null }
      }
    }
    return { name: null, email: null, role: null }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'viewed': return null
      case 'action': return cilPencil
      case 'follow_up': return cilCheckAlt
      default: return cilPencil
    }
  }

  const getActivityLabel = (type) => {
    switch (type) {
      case 'viewed': return 'Viewed'
      case 'action': return 'Action'
      case 'follow_up': return 'Follow-up'
      default: return type || 'Activity'
    }
  }

  const getActivityBadgeColor = (type) => {
    switch (type) {
      case 'viewed': return 'info'
      case 'action': return 'warning'
      case 'follow_up': return 'success'
      default: return 'secondary'
    }
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
  const del = query.delivery || {}

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
    return variants.map((v) => `${v.variantName || '—'} × ${v.quantity ?? 0}`).join(', ')
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
            <CFormSelect
              value={query.status || 'pending'}
              onChange={handleStatusChange}
              disabled={statusUpdating}
              style={{ width: 'auto', minWidth: 180 }}
              className="mb-0"
            >
              {QUERY_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </CFormSelect>
          </div>
          <div className="d-flex gap-2">
            <CButton color="warning" onClick={() => navigate(`/queries/edit/${id}`)}>
              <CIcon icon={cilPencil} className="me-1" />
              Edit
            </CButton>
            <CButton color="danger" onClick={handleDeleteClick}>
              <CIcon icon={cilTrash} className="me-1" />
              Delete
            </CButton>
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
                <CListGroupItem className="d-flex justify-content-between"><strong>Email</strong><span>{ci.email || '-'}</span></CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between"><strong>Purchase manager name</strong><span>{ci.purchase_manager_name || '-'}</span></CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between"><strong>Purchase manager phone</strong><span>{ci.purchase_manager_phone || '-'}</span></CListGroupItem>
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
                      <CTableHeaderCell>Remark</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {prods.map((p, index) => (
                      <CTableRow key={p._id || index}>
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell>{p.productName || '—'}</CTableDataCell>
                        <CTableDataCell>{p.quantity != null ? p.quantity : '—'}</CTableDataCell>
                        <CTableDataCell>{p.unit || '—'}</CTableDataCell>
                        <CTableDataCell className="small">{formatVariants(p.variants)}</CTableDataCell>
                        <CTableDataCell className="small">{p.remark || '—'}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              ) : (
                <p className="text-muted mb-0">No products added.</p>
              )}
            </CCardBody>
          </CCard>

          {/* 3. Delivery & Payment */}
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>3. Delivery & Payment</strong>
              {del.urgent ? <CBadge color="danger">Urgent</CBadge> : <CBadge color="secondary">Non-urgent</CBadge>}
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between"><strong>Location</strong><span>{del.location || '-'}</span></CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between"><strong>Contact person name</strong><span>{del.contactPersonName || '-'}</span></CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between"><strong>Contact person phone</strong><span>{del.contactPersonPhone || '-'}</span></CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Expected date by company</strong>
                  <span>{del.expectedDateByCompany ? new Date(del.expectedDateByCompany).toLocaleDateString() : '-'}</span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Query Tracking sidebar */}
        <CCol lg={4}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Query Tracking</strong>
              <div className="d-flex gap-1">
                <CButton color="primary" size="sm" onClick={() => setShowActionModal(true)}>
                  <CIcon icon={cilPencil} className="me-1" />
                  Action
                </CButton>
                <CButton color="success" size="sm" onClick={() => setShowFollowUpModal(true)}>
                  <CIcon icon={cilCheckAlt} className="me-1" />
                  Follow-up
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody className="pt-0">
              <div className="d-flex align-items-start mb-3 pb-3 border-bottom">
                <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3" style={{ width: 40, height: 40, minWidth: 40 }}>
                  <CIcon icon={cilUser} className="text-white" />
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <CBadge color="primary">Created</CBadge>
                    <span className="small text-muted">
                      <CIcon icon={cilClock} size="sm" className="me-1" />
                      {formatDateTime(query.createdAt || query.created_at)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="d-flex align-items-center gap-1">
                      <CIcon icon={cilUser} size="sm" className="text-muted" />
                      <span className="fw-semibold">{getUserDisplayName(creator) || 'Unknown user'}</span>
                      {creator?.role && <CBadge color="light" textColor="dark" size="sm" className="ms-1">{creator.role}</CBadge>}
                    </div>
                    {creator?.email && <div className="small text-muted ms-3"><CIcon icon={cilEnvelopeClosed} size="sm" className="me-1" />{creator.email}</div>}
                  </div>
                </div>
              </div>

              {activitiesLoading ? (
                <div className="text-center py-3 text-muted small">Loading activities...</div>
              ) : activities.length === 0 ? (
                <div className="text-center py-3 text-muted small">No other activity yet.</div>
              ) : (
                activities.map((act, index) => {
                  const performer = getPerformerInfo(act)
                  const timestamp = act.createdAt || act.created_at || act.timestamp
                  return (
                    <div key={act._id || act.id || index} className="d-flex align-items-start mb-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: 40, height: 40, minWidth: 40, backgroundColor: `var(--cui-${getActivityBadgeColor(act.type)})` }}>
                        {act.type === 'viewed' ? <EyeIcon size={20} className="text-white" /> : <CIcon icon={getActivityIcon(act.type)} className="text-white" />}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <CBadge color={getActivityBadgeColor(act.type)}>{getActivityLabel(act.type)}</CBadge>
                          <span className="small text-muted"><CIcon icon={cilClock} size="sm" className="me-1" />{formatDateTime(timestamp)}</span>
                          {getTimeAgo(timestamp) && <span className="small text-muted fst-italic">({getTimeAgo(timestamp)})</span>}
                        </div>
                        <div className="mt-1">
                          <div className="d-flex align-items-center gap-1">
                            <CIcon icon={cilUser} size="sm" className="text-muted" />
                            <span className="fw-semibold">{performer.name || 'Unknown user'}</span>
                            {performer.role && <CBadge color="light" textColor="dark" size="sm" className="ms-1">{performer.role}</CBadge>}
                          </div>
                          {performer.email && <div className="small text-muted ms-3"><CIcon icon={cilEnvelopeClosed} size="sm" className="me-1" />{performer.email}</div>}
                        </div>
                        {act.type === 'action' && (act.meta?.action || act.metadata?.action) && (
                          <div className="mt-2 p-2 bg-light rounded small"><strong>Action:</strong> {act.meta?.action || act.metadata?.action}</div>
                        )}
                        {act.type === 'follow_up' && (
                          <div className="mt-2 p-2 bg-light rounded small">
                            {(act.meta?.followUpStatus || act.metadata?.followUpStatus) && <div className="mb-1"><strong>Status:</strong> <CBadge color="secondary">{(act.meta?.followUpStatus || act.metadata?.followUpStatus)}</CBadge></div>}
                            {(act.meta?.note || act.metadata?.note) && <div><strong>Note:</strong> {act.meta?.note || act.metadata?.note}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal visible={showActionModal} onClose={() => setShowActionModal(false)}>
        <CModalHeader><CModalTitle>Record Action</CModalTitle></CModalHeader>
        <CForm onSubmit={handleRecordAction}>
          <CModalBody>
            <CFormLabel>Action performed</CFormLabel>
            <CFormTextarea rows={3} value={actionForm.action} onChange={(e) => setActionForm({ action: e.target.value })} placeholder="Describe the action..." />
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowActionModal(false)}>Cancel</CButton>
            <CButton color="primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <CModal visible={showFollowUpModal} onClose={() => setShowFollowUpModal(false)}>
        <CModalHeader><CModalTitle>Record Follow-up</CModalTitle></CModalHeader>
        <CForm onSubmit={handleSubmitFollowUp}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Follow-up status</CFormLabel>
              <CFormSelect value={followUpForm.followUpStatus} onChange={(e) => setFollowUpForm((f) => ({ ...f, followUpStatus: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </CFormSelect>
            </div>
            <div>
              <CFormLabel>Note</CFormLabel>
              <CFormTextarea rows={3} value={followUpForm.note} onChange={(e) => setFollowUpForm((f) => ({ ...f, note: e.target.value }))} placeholder="Note..." />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowFollowUpModal(false)}>Cancel</CButton>
            <CButton color="primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <ConfirmDialog visible={confirmDelete.visible} onClose={() => setConfirmDelete({ visible: false })} onConfirm={handleDeleteConfirm} title="Delete Query?" message="Are you sure you want to delete this query? This action cannot be undone." confirmText="Delete" cancelText="Cancel" />
    </>
  )
}

export default QueryView
