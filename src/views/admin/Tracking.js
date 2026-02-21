import React, { useState, useEffect } from 'react'
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
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CSpinner,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilUser,
  cilPencil,
  cilCheckAlt,
  cilClock,
  cilEnvelopeClosed,
  cilPhone,
} from '@coreui/icons'
import { EyeIcon } from '../../components'
import rawQueryService from '../../services/rawQueryService'
import queryService from '../../services/queryService'
import employeeService from '../../services/employeeService'
import userService from '../../services/userService'
import { toastError } from '../../utils/toast'

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

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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
  return formatDate(dateStr)
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

// Fetch user details by ID - try employee first, then admin/user
const fetchUserById = async (userId) => {
  try {
    const res = await employeeService.getById(userId)
    const emp = res?.data?.employee || res?.data?.data || res?.data || null
    if (emp && (emp.name || emp.email || emp.firstName)) return emp
  } catch { /* not an employee */ }
  try {
    const res = await userService.getById(userId)
    const usr = res?.data?.user || res?.data?.admin || res?.data?.data || res?.data || null
    if (usr && (usr.name || usr.email || usr.firstName)) return { ...usr, role: usr.role || 'admin' }
  } catch { /* not found */ }
  return null
}

const Tracking = () => {
  const [trackingType, setTrackingType] = useState('rawQuery') // 'rawQuery' | 'query'
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [userCache, setUserCache] = useState({})

  const handleSearch = async () => {
    const trimmed = searchInput.trim()
    if (!trimmed) {
      toastError(trackingType === 'query' ? 'Please enter a query code (e.g. QRY012345) or ID' : 'Please enter a raw query number or ID')
      return
    }
    try {
      setLoading(true)
      setSearched(true)
      setQuery(null)
      setActivities([])

      let payload = null
      let recordId = null

      if (trackingType === 'query') {
        // Query Tracking: search by QRY0... or ID
        if (trimmed.toUpperCase().startsWith('QRY0')) {
          try {
            const searchRes = await queryService.searchByCode(trimmed)
            const searchData = searchRes?.data || {}
            const result = searchData?.data ?? searchData
            const results = result?.queries || []
            const match = results.find(
              (q) => (q.queryCode || '').toUpperCase() === trimmed.toUpperCase(),
            )
            if (match) {
              recordId = match._id || match.id
              const fullRes = await queryService.getById(recordId)
              const fullData = fullRes?.data || fullRes
              payload = fullData?.data ?? fullData ?? match
            }
          } catch {
            // fall through
          }
        }
        if (!payload) {
          try {
            const response = await queryService.getById(trimmed)
            const resData = response?.data || response
            payload = resData?.data ?? resData ?? null
            recordId = payload?._id || payload?.id || trimmed
          } catch {
            // not found
          }
        }
        if (!payload || (!payload._id && !payload.id)) {
          toastError('Query not found')
          setQuery(null)
          setLoading(false)
          return
        }
        setQuery(payload)
        recordId = payload._id || payload.id
        try {
          const actRes = await queryService.getActivities(recordId)
          const resData = actRes?.data
          const arr = Array.isArray(resData) ? resData : (resData?.data ?? [])
          setActivities(Array.isArray(arr) ? arr : [])
        } catch {
          setActivities([])
        }
      } else {
        // Raw Query Tracking (existing logic)
        if (trimmed.toUpperCase().startsWith('RQRY')) {
          try {
            const searchRes = await rawQueryService.searchByNumber(trimmed)
            const searchData = searchRes?.data || {}
            const results = searchData.rawQueries || searchData?.data?.rawQueries || []
            const match = results.find(
              (q) => (q.raw_query_number || q.rawQueryNumber || '').toUpperCase() === trimmed.toUpperCase(),
            )
            if (match) {
              recordId = match._id || match.id
              const fullRes = await rawQueryService.getById(recordId)
              payload =
                fullRes?.data?.rawQuery ||
                fullRes?.data?.data ||
                fullRes?.data?.query ||
                fullRes?.data ||
                null
            }
          } catch {
            // Fall through
          }
        }
        if (!payload) {
          try {
            const response = await rawQueryService.getById(trimmed)
            payload =
              response?.data?.rawQuery ||
              response?.data?.data ||
              response?.data?.query ||
              response?.data ||
              null
            recordId = payload?._id || payload?.id || trimmed
          } catch {
            // Not found
          }
        }
        if (!payload || (!payload._id && !payload.id)) {
          toastError('Raw query not found')
          setQuery(null)
          setLoading(false)
          return
        }
        setQuery(payload)
        recordId = payload._id || payload.id
        try {
          const actRes = await rawQueryService.getActivities(recordId)
          const actData = actRes?.data ?? []
          setActivities(Array.isArray(actData) ? actData : (actRes?.data?.data ?? []))
        } catch {
          setActivities([])
        }
      }
    } catch {
      toastError(trackingType === 'query' ? 'Query not found or invalid ID' : 'Raw query not found or invalid ID')
      setQuery(null)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Resolve unknown user IDs from activities and created_by
  useEffect(() => {
    if (!query && activities.length === 0) return
    const storedUser = getStoredUser()
    const idsToResolve = new Set()

    if (query?.created_by && typeof query.created_by === 'string') {
      const cid = query.created_by
      if (!userCache[cid] && !(storedUser && (storedUser._id === cid || storedUser.id === cid))) {
        idsToResolve.add(cid)
      }
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
        if (userData) {
          newCache[uid] = userData
        }
      }
      setUserCache(newCache)
    }
    resolveUsers()
  }, [query, activities])

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <CBadge color="danger">High</CBadge>
      case 'medium':
      case 'normal':
        return <CBadge color="secondary">Medium</CBadge>
      case 'low':
        return <CBadge color="info">Low</CBadge>
      default:
        return <CBadge color="secondary">{priority || 'N/A'}</CBadge>
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'viewed':
        return null
      case 'action':
        return cilPencil
      case 'follow_up':
        return cilCheckAlt
      default:
        return cilPencil
    }
  }

  const getActivityLabel = (type) => {
    switch (type) {
      case 'viewed':
        return 'Viewed'
      case 'action':
        return 'Action Recorded'
      case 'follow_up':
        return 'Follow-up'
      default:
        return type || 'Activity'
    }
  }

  const getActivityBadgeColor = (type) => {
    switch (type) {
      case 'viewed':
        return 'info'
      case 'action':
        return 'warning'
      case 'follow_up':
        return 'success'
      default:
        return 'secondary'
    }
  }

  const getFollowUpStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'primary'
      case 'pending':
        return 'warning'
      case 'cancelled':
        return 'danger'
      default:
        return 'secondary'
    }
  }

  const getPerformerInfo = (act) => {
    const performer =
      act.performedBy && typeof act.performedBy === 'object' ? act.performedBy : null
    const performerAlt =
      act.performed_by && typeof act.performed_by === 'object' ? act.performed_by : null
    const p = performer || performerAlt
    if (p) {
      return {
        name: getUserDisplayName(p),
        email: p.email || null,
        phone: p.phone || p.phone_1 || null,
        role: p.role || p.designation || null,
      }
    }
    // performedBy is just a string ID
    const performerId = typeof act.performedBy === 'string' ? act.performedBy : (typeof act.performed_by === 'string' ? act.performed_by : null)
    if (performerId) {
      // Check user cache (fetched from employee/admin API)
      const cached = userCache[performerId]
      if (cached) {
        return {
          name: getUserDisplayName(cached),
          email: cached.email || null,
          phone: cached.phone || cached.phone_1 || null,
          role: cached.role || cached.designation || null,
        }
      }
      // Match with stored user
      const storedUser = getStoredUser()
      if (storedUser && (storedUser._id === performerId || storedUser.id === performerId)) {
        return {
          name: getUserDisplayName(storedUser),
          email: storedUser.email || null,
          phone: storedUser.phone || storedUser.phone_1 || null,
          role: storedUser.role || storedUser.designation || null,
        }
      }
    }
    return { name: null, email: null, phone: null, role: null }
  }

  const getTimestamp = (act) => {
    return act.createdAt || act.created_at || act.timestamp || null
  }

  const supplier =
    query?.supplier_id && typeof query.supplier_id === 'object' ? query.supplier_id : null
  const industry =
    query?.industry_id && typeof query.industry_id === 'object' ? query.industry_id : null

  // Resolve creator: populated object > userCache > stored user
  let creator = query?.created_by && typeof query.created_by === 'object' ? query.created_by : null
  if (!creator && query?.created_by) {
    const creatorId = typeof query.created_by === 'string' ? query.created_by : null
    if (creatorId) {
      if (userCache[creatorId]) {
        creator = userCache[creatorId]
      } else {
        const storedUser = getStoredUser()
        if (storedUser && (storedUser._id === creatorId || storedUser.id === creatorId)) {
          creator = storedUser
        }
      }
    }
  }

  const getQueryStatusBadge = (status) => {
    const colorMap = { closed: 'secondary', convertedToQuotation: 'success', progress: 'primary', followup01pending: 'warning', followup02pending: 'warning', followup03pending: 'warning', pending: 'info' }
    return <CBadge color={colorMap[status] || 'secondary'}>{status || '—'}</CBadge>
  }

  return (
    <>
      <CRow className="mb-4">
        <CCol xs={12}>
          <CCard>
            <CCardHeader>
              <strong>Tracking</strong>
              <CNav className="nav-tabs card-header-tabs ms-3" role="tablist">
                <CNavItem>
                  <CNavLink
                    active={trackingType === 'rawQuery'}
                    onClick={() => { setTrackingType('rawQuery'); setQuery(null); setActivities([]); setSearched(false); setSearchInput(''); }}
                    style={{ cursor: 'pointer' }}
                  >
                    Raw Query Tracking
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={trackingType === 'query'}
                    onClick={() => { setTrackingType('query'); setQuery(null); setActivities([]); setSearched(false); setSearchInput(''); }}
                    style={{ cursor: 'pointer' }}
                  >
                    Query Tracking
                  </CNavLink>
                </CNavItem>
              </CNav>
            </CCardHeader>
            <CCardBody>
              <CRow className="justify-content-center">
                <CCol md={8} lg={6}>
                  <p className="text-muted mb-3">
                    {trackingType === 'query'
                      ? 'Enter a query code (e.g. QRY012345) or ID to view its complete tracking history'
                      : 'Enter a raw query number (e.g. RQRY0XXXXX) or ID to view its complete tracking history'}
                  </p>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder={trackingType === 'query' ? 'e.g. QRY012345 or query ID...' : 'e.g. RQRY012345 or query ID...'}
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <CButton color="primary" onClick={handleSearch} disabled={loading}>
                      {loading ? <CSpinner size="sm" /> : 'Search'}
                    </CButton>
                  </CInputGroup>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {loading && (
        <div className="text-center py-5">
          <CSpinner color="primary" />
          <p className="mt-2 text-muted">Fetching tracking data...</p>
        </div>
      )}

      {!loading && searched && !query && (
        <CCard>
          <CCardBody className="text-center py-5">
            <h5 className="text-muted">{trackingType === 'query' ? 'No query found' : 'No raw query found'}</h5>
            <p className="text-muted">Please check the number/ID and try again.</p>
          </CCardBody>
        </CCard>
      )}

      {!loading && query && (
        <CRow>
          {/* Left side - Details */}
          <CCol lg={5}>
            {trackingType === 'query' ? (
              <CCard className="mb-4">
                <CCardHeader className="d-flex justify-content-between align-items-center">
                  <strong>Query Details</strong>
                  {getQueryStatusBadge(query.status)}
                </CCardHeader>
                <CCardBody>
                  <CListGroup flush>
                    {query.queryCode && (
                      <CListGroupItem className="d-flex justify-content-between align-items-center">
                        <strong>Query Code</strong>
                        <span className="badge bg-info fs-6">{query.queryCode}</span>
                      </CListGroupItem>
                    )}
                    <CListGroupItem className="d-flex justify-content-between align-items-start">
                      <strong>Query ID</strong>
                      <span className="text-muted small text-end ms-3" style={{ wordBreak: 'break-all' }}>
                        {query._id || query.id}
                      </span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between align-items-start">
                      <strong>Company</strong>
                      <span className="text-end ms-3">{query.companyInfo?.name || '-'}</span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between align-items-start">
                      <strong>Location</strong>
                      <span className="text-end ms-3">{query.companyInfo?.location || query.delivery?.location || '-'}</span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between align-items-start">
                      <strong>Products</strong>
                      <span>{query.products?.length ? `${query.products.length} item(s)` : '—'}</span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between align-items-start">
                      <strong>Contact person</strong>
                      <span className="text-end ms-3">{query.delivery?.contactPersonName || '-'}</span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between align-items-center">
                      <strong>Created</strong>
                      <span className="small">{formatDateTime(query.createdAt || query.created_at)}</span>
                    </CListGroupItem>
                    {creator && (
                      <CListGroupItem>
                        <strong>Created By</strong>
                        <div className="mt-1 d-flex align-items-center gap-2">
                          <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, minWidth: 32 }}>
                            <CIcon icon={cilUser} className="text-primary" size="sm" />
                          </div>
                          <div>
                            <div className="fw-semibold">{getUserDisplayName(creator) || 'Unknown'}</div>
                            {creator.email && <div className="text-muted small">{creator.email}</div>}
                            {creator.role && <CBadge color="light" textColor="dark" className="mt-1">{creator.role}</CBadge>}
                          </div>
                        </div>
                      </CListGroupItem>
                    )}
                  </CListGroup>
                </CCardBody>
              </CCard>
            ) : (
            <CCard className="mb-4">
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>Query Details</strong>
                {getPriorityBadge(query.priority)}
              </CCardHeader>
              <CCardBody>
                <CListGroup flush>
                  {(query.raw_query_number || query.rawQueryNumber) && (
                    <CListGroupItem className="d-flex justify-content-between align-items-center">
                      <strong>Query Number</strong>
                      <span className="badge bg-dark fs-6">{query.raw_query_number || query.rawQueryNumber}</span>
                    </CListGroupItem>
                  )}
                  <CListGroupItem className="d-flex justify-content-between align-items-start">
                    <strong>Title</strong>
                    <span className="text-end ms-3">{query.title || '-'}</span>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between align-items-start">
                    <strong>Query ID</strong>
                    <span className="text-muted small text-end ms-3" style={{ wordBreak: 'break-all' }}>
                      {query._id || query.id}
                    </span>
                  </CListGroupItem>
                  {industry && (
                    <CListGroupItem>
                      <strong>Industry</strong>
                      <div className="mt-1">
                        <div className="fw-semibold">{industry.name}</div>
                        {(industry.location || industry.address) && (
                          <div className="text-muted small">
                            {[industry.location, industry.address].filter(Boolean).join(' | ')}
                          </div>
                        )}
                        {industry.email && (
                          <div className="text-muted small">{industry.email}</div>
                        )}
                      </div>
                    </CListGroupItem>
                  )}
                  {!industry && (query.company_info || query.companyInfo) && (
                    <CListGroupItem>
                      <strong>Company Info</strong>
                      <p className="mb-0 mt-1">{query.company_info || query.companyInfo}</p>
                    </CListGroupItem>
                  )}
                  {supplier && (
                    <CListGroupItem>
                      <strong>Supplier</strong>
                      <div className="mt-1">
                        <div className="fw-semibold">{supplier.name}</div>
                        {supplier.shopname && (
                          <div className="text-muted small">{supplier.shopname}</div>
                        )}
                        {(supplier.email || supplier.phone_1) && (
                          <div className="text-muted small">
                            {[supplier.email, supplier.phone_1].filter(Boolean).join(' | ')}
                          </div>
                        )}
                      </div>
                    </CListGroupItem>
                  )}
                  <CListGroupItem>
                    <strong>Description</strong>
                    <p className="mb-0 mt-1">{query.description || 'No description'}</p>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between align-items-center">
                    <strong>Created</strong>
                    <span className="small">
                      {formatDateTime(query.createdAt || query.created_at)}
                    </span>
                  </CListGroupItem>
                  {creator && (
                    <CListGroupItem>
                      <strong>Created By</strong>
                      <div className="mt-1 d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32, minWidth: 32 }}
                        >
                          <CIcon icon={cilUser} className="text-primary" size="sm" />
                        </div>
                        <div>
                          <div className="fw-semibold">
                            {getUserDisplayName(creator) || 'Unknown'}
                          </div>
                          {creator.email && (
                            <div className="text-muted small">{creator.email}</div>
                          )}
                          {creator.role && (
                            <CBadge color="light" textColor="dark" className="mt-1">
                              {creator.role}
                            </CBadge>
                          )}
                        </div>
                      </div>
                    </CListGroupItem>
                  )}
                </CListGroup>
              </CCardBody>
            </CCard>
            )}
          </CCol>

          {/* Right side - Full Tracking Timeline */}
          <CCol lg={7}>
            <CCard className="mb-4">
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>Tracking Timeline</strong>
                <CBadge color="primary" shape="rounded-pill">
                  {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                </CBadge>
              </CCardHeader>
              <CCardBody>
                {/* Created entry */}
                <div className="d-flex align-items-start mb-3 pb-3 border-bottom">
                  <div
                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3"
                    style={{ width: 40, height: 40, minWidth: 40 }}
                  >
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
                        <span className="fw-semibold">
                          {getUserDisplayName(creator) || 'Unknown user'}
                        </span>
                        {creator?.role && (
                          <CBadge color="light" textColor="dark" size="sm" className="ms-1">
                            {creator.role}
                          </CBadge>
                        )}
                      </div>
                      {creator?.email && (
                        <div className="small text-muted ms-3">
                          <CIcon icon={cilEnvelopeClosed} size="sm" className="me-1" />
                          {creator.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activity timeline */}
                {activities.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <CIcon icon={cilClock} size="xl" className="mb-2 d-block mx-auto" />
                    No tracking activities recorded yet.
                  </div>
                ) : (
                  activities.map((act, index) => {
                    const performer = getPerformerInfo(act)
                    const timestamp = getTimestamp(act)
                    const isLast = index === activities.length - 1
                    return (
                      <div
                        key={act._id || act.id || index}
                        className={`d-flex align-items-start mb-3 ${!isLast ? 'pb-3 border-bottom' : ''}`}
                      >
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center me-3"
                          style={{
                            width: 40,
                            height: 40,
                            minWidth: 40,
                            backgroundColor: `var(--cui-${getActivityBadgeColor(act.type)})`,
                          }}
                        >
                          {act.type === 'viewed' ? <EyeIcon size={20} className="text-white" /> : <CIcon icon={getActivityIcon(act.type)} className="text-white" />}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <CBadge color={getActivityBadgeColor(act.type)}>
                              {getActivityLabel(act.type)}
                            </CBadge>
                            <span className="small text-muted">
                              <CIcon icon={cilClock} size="sm" className="me-1" />
                              {formatDateTime(timestamp)}
                            </span>
                            <span className="small text-muted fst-italic">
                              ({getTimeAgo(timestamp)})
                            </span>
                          </div>

                          {/* Performer details */}
                          <div className="mt-1">
                            <div className="d-flex align-items-center gap-2">
                              <CIcon icon={cilUser} size="sm" className="text-muted" />
                              <span className="fw-semibold">
                                {performer.name || 'Unknown user'}
                              </span>
                              {performer.role && (
                                <CBadge color="light" textColor="dark" size="sm">
                                  {performer.role}
                                </CBadge>
                              )}
                            </div>
                            {performer.email && (
                              <div className="small text-muted ms-4">
                                <CIcon icon={cilEnvelopeClosed} size="sm" className="me-1" />
                                {performer.email}
                              </div>
                            )}
                            {performer.phone && (
                              <div className="small text-muted ms-4">
                                <CIcon icon={cilPhone} size="sm" className="me-1" />
                                {performer.phone}
                              </div>
                            )}
                          </div>

                          {/* Action details */}
                          {act.type === 'action' && (act.meta?.action || act.metadata?.action) && (
                            <div className="mt-2 p-2 bg-light rounded small">
                              <strong>Action:</strong>{' '}
                              {act.meta?.action || act.metadata?.action}
                            </div>
                          )}

                          {/* Follow-up details */}
                          {act.type === 'follow_up' && (
                            <div className="mt-2 p-2 bg-light rounded small">
                              {(act.meta?.followUpStatus || act.metadata?.followUpStatus) && (
                                <div className="mb-1">
                                  <strong>Status:</strong>{' '}
                                  <CBadge
                                    color={getFollowUpStatusColor(
                                      act.meta?.followUpStatus || act.metadata?.followUpStatus,
                                    )}
                                  >
                                    {act.meta?.followUpStatus || act.metadata?.followUpStatus}
                                  </CBadge>
                                </div>
                              )}
                              {(act.meta?.note || act.metadata?.note) && (
                                <div>
                                  <strong>Note:</strong>{' '}
                                  {act.meta?.note || act.metadata?.note}
                                </div>
                              )}
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
      )}
    </>
  )
}

export default Tracking
