import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
  CRow,
} from '@coreui/react'
import taskManagementService from '../../services/taskManagementService'
import Filtered from '../../filtered/Filtered'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
]

const getStatusBadge = (status) => {
  switch (status) {
    case 'draft':
      return <CBadge color="secondary">Draft</CBadge>
    case 'assigned':
      return <CBadge color="info">Assigned</CBadge>
    case 'submitted':
      return <CBadge color="success">Submitted</CBadge>
    default:
      return <CBadge color="secondary">{status || '–'}</CBadge>
  }
}

const TaskBucket = () => {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [pagination, setPagination] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState('assigned')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    setPageNumber(1)
  }, [searchDebounced, statusFilter])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await withMinimumDelay(() =>
        taskManagementService.getMyTasks({
          pageNumber,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: statusFilter || undefined,
        }),
      )
      const data = res?.data || res
      const result = data?.data ?? data
      const list = result?.tasks ?? []
      setTasks(list)
      setPagination(result?.pagination ?? null)
    } catch (err) {
      toastError(err?.message || 'Failed to load tasks')
      setTasks([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [pageNumber, pageSize, searchDebounced, statusFilter])

  const assignedCount = tasks.filter((t) => t.status === 'assigned').length
  const submittedCount = tasks.filter((t) => t.status === 'submitted').length

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Task Bucket</strong>
            <div className="d-flex gap-3 small">
              <span>
                <span className="text-muted me-1">Assigned:</span>
                <strong>{assignedCount}</strong>
              </span>
              <span>
                <span className="text-muted me-1">Submitted:</span>
                <strong>{submittedCount}</strong>
              </span>
            </div>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3 g-2 align-items-end">
              <CCol xs={12} sm={6} md={4}>
                <label className="form-label small text-body-secondary mb-1">Search</label>
                <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              </CCol>
              <CCol xs={12} sm={6} md={4}>
                <label className="form-label small text-body-secondary mb-1">Status</label>
                <CFormSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-100"
                  aria-label="Filter by status"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
            {loading && <Loader />}
            <CRow className="g-3">
              {tasks && tasks.length > 0 ? (
                tasks.map((task, index) => (
                  <CCol key={task._id || index} xs={12} md={6} lg={4}>
                    <CCard
                      className="h-100 border"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/task-bucket/${task._id}`)}
                    >
                      <CCardBody>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <div className="small text-muted">
                              #{(pagination?.currentPage - 1) * pageSize + index + 1}
                            </div>
                            <strong>{task.title || '–'}</strong>
                          </div>
                          {getStatusBadge(task.status)}
                        </div>
                        <div className="mb-2">
                          <div className="small text-muted">Product</div>
                          <div>
                            {task.productInfo?.name || '–'}
                            {task.productInfo?.modelNumber && (
                              <small className="d-block text-muted">
                                {task.productInfo.modelNumber}
                              </small>
                            )}
                          </div>
                        </div>
                        <div className="mb-2 d-flex justify-content-between">
                          <div>
                            <div className="small text-muted">Target Rate</div>
                            <div>
                              {task.targetRate != null
                                ? `₹${Number(task.targetRate).toLocaleString()}`
                                : '–'}
                            </div>
                          </div>
                          <div>
                            <div className="small text-muted text-end">Due Date</div>
                            <div className="text-end">
                              {task.dueDate
                                ? new Date(task.dueDate).toLocaleDateString()
                                : '–'}
                            </div>
                          </div>
                        </div>
                        {task.supplierInfo?.rate != null && (
                          <div className="mb-2">
                            <div className="small text-muted">Rate</div>
                            <div>
                              ₹{Number(task.supplierInfo.rate).toLocaleString()}
                              {(task.supplierInfo.supplierName ||
                                task.supplierInfo.contactName ||
                                task.supplierInfo.contactPhone) && (
                                <small className="d-block text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                                  {task.supplierInfo.supplierName && (
                                    <span className="d-block">
                                      {task.supplierInfo.supplierName}
                                    </span>
                                  )}
                                  {task.supplierInfo.contactName && (
                                    <span className="d-block">
                                      {task.supplierInfo.contactName}
                                    </span>
                                  )}
                                  {task.supplierInfo.contactPhone && (
                                    <span className="d-block">
                                      {task.supplierInfo.contactPhone}
                                    </span>
                                  )}
                                </small>
                              )}
                            </div>
                          </div>
                        )}
                        {task.supplierInfo?.remark && (
                          <div className="mb-2">
                            <div className="small text-muted">Remark</div>
                            <div className="text-break">{task.supplierInfo.remark}</div>
                          </div>
                        )}
                        <div className="d-flex justify-content-end mt-2">
                          <CButton
                            color="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/task-bucket/${task._id}/rate`)
                            }}
                          >
                            {task.supplierInfo?.rate != null ? 'Edit Rate' : 'Add Rate'}
                          </CButton>
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                ))
              ) : (
                !loading && (
                  <CCol xs={12} className="text-center text-muted py-4">
                    No tasks found in your bucket.
                  </CCol>
                )
              )}
            </CRow>
            {pagination && pagination.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted">
                  Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total)
                </small>
                <div className="d-flex gap-1">
                  <CButton
                    size="sm"
                    color="secondary"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </CButton>
                  <CButton
                    size="sm"
                    color="secondary"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPageNumber((p) => p + 1)}
                  >
                    Next
                  </CButton>
                </div>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default TaskBucket

