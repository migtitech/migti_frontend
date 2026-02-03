import React from 'react'
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
  CTable,
  CTableBody,
  CTableDataCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCloudDownload } from '@coreui/icons'
import { useData } from '../../context/DataContext'

const PurchaseOrderView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { purchaseOrders } = useData()

  const order = purchaseOrders?.find((o) => o.id === parseInt(id))

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <CBadge color="warning">Pending</CBadge>
      case 'approved':
        return <CBadge color="info">Approved</CBadge>
      case 'ordered':
        return <CBadge color="primary">Ordered</CBadge>
      case 'shipped':
        return <CBadge color="secondary">Shipped</CBadge>
      case 'delivered':
        return <CBadge color="success">Delivered</CBadge>
      case 'cancelled':
        return <CBadge color="danger">Cancelled</CBadge>
      default:
        return <CBadge color="secondary">{status}</CBadge>
    }
  }

  if (!order) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Purchase Order not found</h4>
          <CButton color="primary" onClick={() => navigate('/purchase-orders')}>
            Back to Purchase Orders
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex justify-content-between align-items-center">
          <CButton color="secondary" variant="outline" onClick={() => navigate('/purchase-orders')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Purchase Orders
          </CButton>
          <CButton color="success">
            <CIcon icon={cilCloudDownload} className="me-2" />
            Download PDF
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Purchase Order #PO-{String(order.id).padStart(4, '0')}</strong>
              </div>
              {getStatusBadge(order.status)}
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-4">
                <CCol md={6}>
                  <h6 className="text-muted">Supplier Details</h6>
                  <p className="mb-1"><strong>{order.supplierName}</strong></p>
                </CCol>
                <CCol md={6} className="text-md-end">
                  <h6 className="text-muted">Order Details</h6>
                  <p className="mb-1">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                  <p className="mb-1">Expected Delivery: {order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : 'N/A'}</p>
                </CCol>
              </CRow>

              {order.shippingAddress && (
                <>
                  <CRow className="mb-4">
                    <CCol>
                      <h6 className="text-muted">Shipping Address</h6>
                      <p className="mb-0">{order.shippingAddress}</p>
                    </CCol>
                  </CRow>
                </>
              )}

              <hr />

              <h6 className="mb-3">Items/Description</h6>
              <div className="bg-light p-3 rounded mb-4">
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{order.items || 'No items specified'}</pre>
              </div>

              <CRow>
                <CCol md={8}></CCol>
                <CCol md={4}>
                  <CTable borderless small>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell><strong>Total Amount:</strong></CTableDataCell>
                        <CTableDataCell className="text-end">
                          <strong>₹{order.totalAmount?.toLocaleString() || '0'}</strong>
                        </CTableDataCell>
                      </CTableRow>
                    </CTableBody>
                  </CTable>
                </CCol>
              </CRow>

              {order.notes && (
                <>
                  <hr />
                  <h6>Notes</h6>
                  <p className="text-muted">{order.notes}</p>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Order Info</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Status:</strong>
                  {getStatusBadge(order.status)}
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created:</strong>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Expected:</strong>
                  <span>{order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : 'N/A'}</span>
                </CListGroupItem>
                {order.supplierId && (
                  <CListGroupItem className="d-flex justify-content-between">
                    <strong>Supplier:</strong>
                    <CButton
                      color="link"
                      size="sm"
                      onClick={() => navigate(`/suppliers/${order.supplierId}`)}
                    >
                      View Supplier
                    </CButton>
                  </CListGroupItem>
                )}
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default PurchaseOrderView
