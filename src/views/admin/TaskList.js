import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import { EyeIcon } from '../../components'
import taskManagementService from '../../services/taskManagementService'
import Filtered from '../../filtered/Filtered'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'assigned', label: 'Assigned' },
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

const TaskList = () => {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [pagination, setPagination] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

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
        taskManagementService.getAll({
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

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await taskManagementService.delete(deleteTarget._id)
      setDeleteTarget(null)
      await fetchTasks()
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || 'Failed to delete task')
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Task Dashboard</strong>
            <CButton color="primary" onClick={() => navigate('/task-dashboard/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Create Task
            </CButton>
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
            <CTable hover responsive bordered>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>#</CTableHeaderCell>
                  <CTableHeaderCell>Title</CTableHeaderCell>
                  <CTableHeaderCell>Product</CTableHeaderCell>
                  <CTableHeaderCell>Assigned To</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Supplier</CTableHeaderCell>
                  <CTableHeaderCell>Rate</CTableHeaderCell>
                  <CTableHeaderCell>Remark</CTableHeaderCell>
                  <CTableHeaderCell>Due Date</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {tasks && tasks.length > 0 ? (
                  tasks.map((task, index) => (
                    <CTableRow
                      key={task._id}
                      onClick={() => navigate(`/task-dashboard/${task._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <CTableDataCell>{(pagination?.currentPage - 1) * pageSize + index + 1}</CTableDataCell>
                      <CTableDataCell>
                        <strong>{task.title || '–'}</strong>
                      </CTableDataCell>
                      <CTableDataCell>
                        {task.productInfo?.name || '–'}
                        {task.productInfo?.modelNumber && (
                          <small className="d-block text-muted">{task.productInfo.modelNumber}</small>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>
                        {task.employeeId?.name ? (
                          <>
                            {task.employeeId.name}
                            {task.employeeId.designation && (
                              <small className="d-block text-muted">{task.employeeId.designation}</small>
                            )}
                          </>
                        ) : (
                          '–'
                        )}
                      </CTableDataCell>
                      <CTableDataCell>{getStatusBadge(task.status)}</CTableDataCell>
                      <CTableDataCell>
                        {task.supplierInfo ? (
                          <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                            {task.supplierInfo.supplierName && (
                              <span className="d-block">{task.supplierInfo.supplierName}</span>
                            )}
                            {task.supplierInfo.contactName && (
                              <span className="d-block">{task.supplierInfo.contactName}</span>
                            )}
                            {task.supplierInfo.contactPhone && (
                              <span className="d-block">{task.supplierInfo.contactPhone}</span>
                            )}
                            {!task.supplierInfo.supplierName &&
                              !task.supplierInfo.contactName &&
                              !task.supplierInfo.contactPhone &&
                              '–'}
                          </small>
                        ) : (
                          '–'
                        )}
                      </CTableDataCell>
                      <CTableDataCell>
                        {task.supplierInfo?.rate != null
                          ? `₹${Number(task.supplierInfo.rate).toLocaleString()}`
                          : '–'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {task.supplierInfo?.remark || '–'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString()
                          : '–'}
                      </CTableDataCell>
                      <CTableDataCell onClick={(e) => e.stopPropagation()}>
                        <CButton
                          color="primary"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/task-dashboard/${task._id}`)}
                        >
                          <EyeIcon />
                        </CButton>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(task)}
                        >
                          Delete
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                ) : (
                  !loading && (
                    <CTableRow>
                      <CTableDataCell colSpan={10} className="text-center text-muted py-4">
                        No tasks found. Create one to get started.
                      </CTableDataCell>
                    </CTableRow>
                  )
                )}
              </CTableBody>
            </CTable>
            <ConfirmDialog
              visible={!!deleteTarget}
              title="Delete Task"
              message={
                deleteTarget
                  ? `Are you sure you want to delete task "${deleteTarget.title || ''}"?`
                  : ''
              }
              onConfirm={handleDelete}
              onCancel={() => setDeleteTarget(null)}
            />
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

export default TaskList
