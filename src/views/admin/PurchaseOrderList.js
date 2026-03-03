import React, { useState } from 'react'
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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilCloudDownload } from '@coreui/icons'
import { EyeIcon } from '../../components'
import { useData } from '../../context/DataContext'
import { ConfirmDialog } from '../../components'

const PurchaseOrderList = () => {
  const navigate = useNavigate()
  const { purchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, suppliers } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    items: '',
    totalAmount: '',
    expectedDelivery: '',
    shippingAddress: '',
    notes: '',
    status: 'pending',
  })

  const handleOpenModal = (order = null) => {
    if (order) {
      setEditingOrder(order)
      setFormData({
        supplierId: order.supplierId || '',
        supplierName: order.supplierName || '',
        items: order.items || '',
        totalAmount: order.totalAmount || '',
        expectedDelivery: order.expectedDelivery ? order.expectedDelivery.split('T')[0] : '',
        shippingAddress: order.shippingAddress || '',
        notes: order.notes || '',
        status: order.status || 'pending',
      })
    } else {
      setEditingOrder(null)
      setFormData({
        supplierId: '',
        supplierName: '',
        items: '',
        totalAmount: '',
        expectedDelivery: '',
        shippingAddress: '',
        notes: '',
        status: 'pending',
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingOrder(null)
    setFormData({
      supplierId: '',
      supplierName: '',
      items: '',
      totalAmount: '',
      expectedDelivery: '',
      shippingAddress: '',
      notes: '',
      status: 'pending',
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...formData,
      supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
      totalAmount: parseFloat(formData.totalAmount) || 0,
      expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery).toISOString() : null,
    }
    if (editingOrder) {
      updatePurchaseOrder(editingOrder.id, data)
    } else {
      addPurchaseOrder(data)
    }
    handleCloseModal()
  }

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id })
  }

  const handleDeleteConfirm = () => {
    const id = confirmDelete.id
    setConfirmDelete({ visible: false, id: null })
    if (id != null) deletePurchaseOrder(id)
  }

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

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Purchase Orders</strong>
              <CButton color="primary" onClick={() => handleOpenModal()}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Purchase Order
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive bordered>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>S No</CTableHeaderCell>
                    <CTableHeaderCell>PO Number</CTableHeaderCell>
                    <CTableHeaderCell>Supplier</CTableHeaderCell>
                    <CTableHeaderCell>Items</CTableHeaderCell>
                    <CTableHeaderCell>Total Amount</CTableHeaderCell>
                    <CTableHeaderCell>Expected Delivery</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {purchaseOrders && purchaseOrders.map((order, index) => (
                    <CTableRow
                      key={order.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/purchase-orders/${order.id}`)}
                    >
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>
                        <strong>PO-{String(order.id).padStart(4, '0')}</strong>
                      </CTableDataCell>
                      <CTableDataCell>{order.supplierName || 'N/A'}</CTableDataCell>
                      <CTableDataCell>
                        <small>{order.items?.substring(0, 50)}{order.items?.length > 50 ? '...' : ''}</small>
                      </CTableDataCell>
                      <CTableDataCell>₹{order.totalAmount?.toLocaleString() || '0'}</CTableDataCell>
                      <CTableDataCell>
                        {order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : '-'}
                      </CTableDataCell>
                      <CTableDataCell>{getStatusBadge(order.status)}</CTableDataCell>
                      <CTableDataCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </CTableDataCell>
                      <CTableDataCell onClick={(e) => e.stopPropagation()}>
                        <CButton
                          color="info"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/purchase-orders/${order.id}`)
                          }}
                          title="View"
                        >
                          <EyeIcon />
                        </CButton>
                        <CButton
                          color="success"
                          variant="ghost"
                          size="sm"
                          title="Download PDF"
                        >
                          <CIcon icon={cilCloudDownload} />
                        </CButton>
                        <CButton
                          color="warning"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenModal(order)
                          }}
                          title="Edit"
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(order.id)
                          }}
                          title="Delete"
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {(!purchaseOrders || purchaseOrders.length === 0) && (
                    <CTableRow>
                      <CTableDataCell colSpan={9} className="text-center">
                        No purchase orders found. Click "Add Purchase Order" to create one.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal visible={showModal} onClose={handleCloseModal} size="lg">
        <CModalHeader>
          <CModalTitle>{editingOrder ? 'Edit Purchase Order' : 'Add New Purchase Order'}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="supplierId">Supplier</CFormLabel>
                  <CFormSelect
                    id="supplierId"
                    value={formData.supplierId}
                    onChange={(e) => {
                      const supplier = suppliers?.find((s) => s.id === parseInt(e.target.value))
                      setFormData({
                        ...formData,
                        supplierId: e.target.value,
                        supplierName: supplier?.name || formData.supplierName,
                      })
                    }}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers && suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="supplierName">Supplier Name *</CFormLabel>
                  <CFormInput
                    id="supplierName"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    required
                  />
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="totalAmount">Total Amount *</CFormLabel>
                  <CFormInput
                    type="number"
                    id="totalAmount"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    required
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="expectedDelivery">Expected Delivery</CFormLabel>
                  <CFormInput
                    type="date"
                    id="expectedDelivery"
                    value={formData.expectedDelivery}
                    onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                  />
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="status">Status</CFormLabel>
                  <CFormSelect
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="ordered">Ordered</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="shippingAddress">Shipping Address</CFormLabel>
                  <CFormInput
                    id="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                  />
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={12}>
                <div className="mb-3">
                  <CFormLabel htmlFor="items">Items/Description *</CFormLabel>
                  <CFormTextarea
                    id="items"
                    rows={4}
                    value={formData.items}
                    onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                    placeholder="Enter item details, quantities, and specifications"
                    required
                  />
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={12}>
                <div className="mb-3">
                  <CFormLabel htmlFor="notes">Notes</CFormLabel>
                  <CFormTextarea
                    id="notes"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseModal}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit">
              {editingOrder ? 'Update' : 'Create'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Purchase Order?"
        message="Are you sure you want to delete this purchase order? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  )
}

export default PurchaseOrderList
