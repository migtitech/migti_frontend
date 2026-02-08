import React, { useEffect, useState, useRef } from 'react'
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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilUser, cilAction, cilCheckAlt, cilZoom } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import rawQueryService from '../../services/rawQueryService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError, toastSuccess } from '../../utils/toast'

const RawQueryView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [error, setError] = useState('')
  const viewRecordedRef = useRef(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [actionForm, setActionForm] = useState({ action: '' })
  const [followUpForm, setFollowUpForm] = useState({ followUpStatus: 'pending', note: '' })
  const [submitting, setSubmitting] = useState(false)

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
        return <CBadge color="secondary">{priority}</CBadge>
    }
  }

  const fetchActivities = async () => {
    if (!id) return
    try {
      setActivitiesLoading(true)
      const res = await rawQueryService.getActivities(id)
      const data = res?.data ?? []
      setActivities(Array.isArray(data) ? data : [])
    } catch {
      setActivities([])
    } finally {
      setActivitiesLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await withMinimumDelay(() => rawQueryService.getById(id))
        const payload =
          response?.data?.rawQuery ||
          response?.data?.data ||
          response?.data?.query ||
          response?.data ||
          null
        setQuery(payload)
        if (payload) {
          await fetchActivities()
        }
      } catch (err) {
        toastError(err?.message || 'Failed to load raw query')
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
    rawQueryService
      .recordActivity(id, 'viewed', performedBy, {})
      .then(() => fetchActivities())
      .catch(() => {})
  }, [query, user, id])

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading raw query..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error}</p>
          <CButton color="primary" onClick={() => navigate('/raw-query')}>
            Back to Raw Queries
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  if (!query) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Raw query not found</h4>
          <CButton color="primary" onClick={() => navigate('/raw-query')}>
            Back to Raw Queries
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  const files = Array.isArray(query.files) ? query.files : []
  const supplier = query.supplier_id && typeof query.supplier_id === 'object' ? query.supplier_id : null
  const industry = query.industry_id && typeof query.industry_id === 'object' ? query.industry_id : null
  const creator = query.created_by && typeof query.created_by === 'object' ? query.created_by : null

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
      await rawQueryService.recordActivity(id, 'action', performedBy, {
        action: actionForm.action.trim(),
      })
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
      await rawQueryService.recordActivity(id, 'follow_up', performedBy, {
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

  const getActivityIcon = (type) => {
    switch (type) {
      case 'viewed':
        return cilZoom
      case 'action':
        return cilAction
      case 'follow_up':
        return cilCheckAlt
      default:
        return cilAction
    }
  }

  const getActivityLabel = (type) => {
    switch (type) {
      case 'viewed':
        return 'Viewed'
      case 'action':
        return 'Action'
      case 'follow_up':
        return 'Follow-up'
      default:
        return type
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

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/raw-query')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Raw Queries
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Raw Query Details</strong>
              <div className="d-flex gap-2">
                {getPriorityBadge(query.priority)}
              </div>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Title:</strong>
                  <span>{query.title || '-'}</span>
                </CListGroupItem>
                {industry && (
                  <CListGroupItem>
                    <strong>Industry:</strong>
                    <div className="mt-2">
                      <div className="fw-semibold">{industry.name}</div>
                      {(industry.location || industry.address) && (
                        <div className="text-muted small">
                          {[industry.location, industry.address].filter(Boolean).join(' • ')}
                        </div>
                      )}
                      {(industry.email || industry.purchase_manager_name || industry.purchase_manager_phone) && (
                        <div className="text-muted small">
                          {[industry.email, industry.purchase_manager_name, industry.purchase_manager_phone]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      )}
                    </div>
                  </CListGroupItem>
                )}
                {!industry && (query.company_info || query.companyInfo) && (
                  <CListGroupItem>
                    <strong>Company Info:</strong>
                    <p className="mb-0 mt-2">{query.company_info || query.companyInfo}</p>
                  </CListGroupItem>
                )}
                {supplier && (
                  <CListGroupItem>
                    <strong>Supplier Details:</strong>
                    <div className="mt-2">
                      <div className="fw-semibold">{supplier.name}</div>
                      {supplier.shopname && <div className="text-muted">{supplier.shopname}</div>}
                      <div className="text-muted small">
                        {[supplier.email, supplier.phone_1, supplier.phone_2, supplier.other_contact]
                          .filter(Boolean)
                          .join(' • ') || 'No contact details'}
                      </div>
                      {(supplier.label || supplier.shop_location) && (
                        <div className="text-muted small">
                          {[supplier.label, supplier.shop_location].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </div>
                  </CListGroupItem>
                )}
                <CListGroupItem>
                  <strong>Description:</strong>
                  <p className="mb-0 mt-2">{query.description || 'No description provided'}</p>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Voice Notes:</strong>
                  {files.length > 0 ? (
                    <div className="mt-2 d-flex flex-column gap-2">
                      {files.map((file, index) => (
                        <audio key={`${index}-${file}`} controls src={file} />
                      ))}
                    </div>
                  ) : (
                    <p className="mb-0 mt-2 text-muted">No voice notes attached.</p>
                  )}
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>{new Date(query.createdAt).toLocaleString()}</span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Query Tracking</strong>
              <div className="d-flex gap-1">
                <CButton color="primary" size="sm" onClick={() => setShowActionModal(true)}>
                  <CIcon icon={cilAction} className="me-1" />
                  Action
                </CButton>
                <CButton color="success" size="sm" onClick={() => setShowFollowUpModal(true)}>
                  <CIcon icon={cilCheckAlt} className="me-1" />
                  Follow-up
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody className="pt-0">
              <div className="query-tracking-timeline">
                {/* Created by */}
                <div className="d-flex align-items-start mb-3 pb-3 border-bottom">
                  <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center me-3" style={{ width: 36, height: 36, minWidth: 36 }}>
                    <CIcon icon={cilUser} className="text-primary" />
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <CBadge color="primary">Created</CBadge>
                      <span className="small text-muted">
                        {new Date(query.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 fw-semibold">
                      {creator?.name || creator?.email || 'Unknown user'}
                    </div>
                    {creator?.email && (
                      <div className="small text-muted">{creator.email}</div>
                    )}
                  </div>
                </div>

                {/* Activity timeline */}
                {activitiesLoading ? (
                  <div className="text-center py-3 text-muted small">Loading activities...</div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-3 text-muted small">No other activity yet.</div>
                ) : (
                  activities.map((act) => {
                    const performer = act.performedBy && typeof act.performedBy === 'object' ? act.performedBy : null
                    const name = performer?.name || performer?.email || 'Unknown'
                    return (
                      <div key={act._id} className="d-flex align-items-start mb-3">
                        <div className="rounded-circle bg-opacity-10 d-flex align-items-center justify-content-center me-3" style={{ width: 36, height: 36, minWidth: 36, backgroundColor: `var(--cui-${getActivityBadgeColor(act.type)})` }}>
                          <CIcon icon={getActivityIcon(act.type)} />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <CBadge color={getActivityBadgeColor(act.type)}>
                              {getActivityLabel(act.type)}
                            </CBadge>
                            <span className="small text-muted">
                              {act.createdAt ? new Date(act.createdAt).toLocaleString() : ''}
                            </span>
                          </div>
                          <div className="mt-1 fw-semibold">{name}</div>
                          {act.type === 'action' && act.meta?.action && (
                            <div className="small text-body-secondary mt-1">{act.meta.action}</div>
                          )}
                          {act.type === 'follow_up' && (
                            <div className="small mt-1">
                              {act.meta?.followUpStatus && (
                                <CBadge color="info" className="me-1">{act.meta.followUpStatus}</CBadge>
                              )}
                              {act.meta?.note && <span className="text-body-secondary">{act.meta.note}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Record Action Modal */}
      <CModal visible={showActionModal} onClose={() => setShowActionModal(false)}>
        <CModalHeader>
          <CModalTitle>Record Action</CModalTitle>
        </CModalHeader>
        <form onSubmit={handleRecordAction}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Action performed</CFormLabel>
              <CFormInput
                value={actionForm.action}
                onChange={(e) => setActionForm({ ...actionForm, action: e.target.value })}
                placeholder="e.g. Called supplier, Sent quotation"
                required
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowActionModal(false)}>Cancel</CButton>
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Record'}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>

      {/* Submit Follow-up Modal */}
      <CModal visible={showFollowUpModal} onClose={() => setShowFollowUpModal(false)}>
        <CModalHeader>
          <CModalTitle>Submit Follow-up</CModalTitle>
        </CModalHeader>
        <form onSubmit={handleSubmitFollowUp}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Follow-up status</CFormLabel>
              <CFormSelect
                value={followUpForm.followUpStatus}
                onChange={(e) => setFollowUpForm({ ...followUpForm, followUpStatus: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel>Note (optional)</CFormLabel>
              <CFormTextarea
                value={followUpForm.note}
                onChange={(e) => setFollowUpForm({ ...followUpForm, note: e.target.value })}
                placeholder="Add details about the follow-up"
                rows={3}
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowFollowUpModal(false)}>Cancel</CButton>
            <CButton color="success" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit follow-up'}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>
    </>
  )
}

export default RawQueryView
