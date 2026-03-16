import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CImage,
  CListGroup,
  CListGroupItem,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import taskManagementService from '../../services/taskManagementService'
import { getAssetsUrl } from '../../api/endpoints'
import { Loader } from '../../components'
import { toastError } from '../../utils/toast'

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

const getImageUrl = (img) => {
  if (!img) return ''
  if (typeof img === 'string') return img.startsWith('http') ? img : getAssetsUrl(img)
  if (img?.path) return img.path.startsWith('http') ? img.path : getAssetsUrl(img.path)
  return ''
}

const TaskBucketView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTask = async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await taskManagementService.getById(id)
        const data = res?.data?.data ?? res?.data
        setTask(data)
      } catch (err) {
        toastError(err?.message || 'Failed to load task')
        setTask(null)
      } finally {
        setLoading(false)
      }
    }
    fetchTask()
  }, [id])

  if (loading) return <Loader message="Loading task..." />
  if (!task) return null

  const productImg = task.productInfo?.image
  const supplier = task.supplierInfo || {}

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <CButton
                color="link"
                variant="ghost"
                className="me-2 p-0"
                onClick={() => navigate('/task-bucket')}
              >
                <CIcon icon={cilArrowLeft} size="lg" />
              </CButton>
              <div>
                <strong>{task.title || 'Task'}</strong>
                <div className="mt-1">
                  {getStatusBadge(task.status)}
                  {task.priority && (
                    <CBadge color="light" className="ms-2 text-uppercase">
                      {task.priority}
                    </CBadge>
                  )}
                </div>
              </div>
            </div>
            <CButton
              color="primary"
              size="sm"
              onClick={() => navigate(`/task-bucket/${task._id || task.id}/rate`)}
            >
              {supplier && supplier.rate != null ? 'Edit Rate' : 'Add Rate'}
            </CButton>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CCard className="h-100">
                  <CCardHeader>
                    <strong>Task & Product Details</strong>
                  </CCardHeader>
                  <CCardBody>
                    <CListGroup flush>
                      <CListGroupItem>
                        <span className="text-muted d-block mb-1">Title</span>
                        <span>{task.title || '–'}</span>
                      </CListGroupItem>
                      <CListGroupItem>
                        <span className="text-muted d-block mb-1">Product</span>
                        <span>{task.productInfo?.name || '–'}</span>
                        {task.productInfo?.modelNumber && (
                          <small className="d-block text-muted">
                            {task.productInfo.modelNumber}
                          </small>
                        )}
                      </CListGroupItem>
                      <CListGroupItem>
                        <span className="text-muted d-block mb-1">Target Rate</span>
                        <span>
                          {task.targetRate != null
                            ? `₹${Number(task.targetRate).toLocaleString()}`
                            : '–'}
                        </span>
                      </CListGroupItem>
                      <CListGroupItem>
                        <span className="text-muted d-block mb-1">Due Date</span>
                        <span>
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString()
                            : '–'}
                        </span>
                      </CListGroupItem>
                      {task.remark && (
                        <CListGroupItem>
                          <span className="text-muted d-block mb-1">Remark</span>
                          <span>{task.remark}</span>
                        </CListGroupItem>
                      )}
                    </CListGroup>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={6}>
                <CCard className="h-100">
                  <CCardHeader>
                    <strong>Supplier & Rate</strong>
                  </CCardHeader>
                  <CCardBody>
                    {productImg && getImageUrl(productImg) && (
                      <div className="mb-3 text-center">
                        <CImage
                          src={getImageUrl(productImg)}
                          thumbnail
                          style={{ maxHeight: 160, objectFit: 'contain' }}
                        />
                      </div>
                    )}
                    <CListGroup flush>
                      <CListGroupItem>
                        <span className="text-muted d-block mb-1">Supplier</span>
                        <span>{supplier.supplierName || '–'}</span>
                      </CListGroupItem>
                      <CListGroupItem>
                        <span className="text-muted d-block mb-1">Contact Person</span>
                        <span>{supplier.contactName || '–'}</span>
                        {(supplier.contactEmail || supplier.contactPhone) && (
                          <small className="d-block text-muted">
                            {supplier.contactEmail}
                            {supplier.contactEmail && supplier.contactPhone ? ' · ' : ''}
                            {supplier.contactPhone}
                          </small>
                        )}
                      </CListGroupItem>
                      <CListGroupItem>
                        <span className="text-muted d-block mb-1">Rate</span>
                        <span>
                          {supplier.rate != null
                            ? `${supplier.currency || 'INR'} ${Number(
                                supplier.rate,
                              ).toLocaleString()}`
                            : '–'}
                        </span>
                      </CListGroupItem>
                      {supplier.remark && (
                        <CListGroupItem>
                          <span className="text-muted d-block mb-1">Supplier Remark</span>
                          <span>{supplier.remark}</span>
                        </CListGroupItem>
                      )}
                    </CListGroup>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default TaskBucketView

