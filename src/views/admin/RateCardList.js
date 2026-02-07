import React, { useState, useEffect } from 'react'
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
  CAlert,
  CPagination,
  CPaginationItem,
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
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import rateCardService from '../../services/rateCardService'
import Filtered from '../../filtered/Filtered'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const RateCardList = () => {
  const navigate = useNavigate()
  const [rateCards, setRateCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  // Modal state for create/edit product
  const [modalVisible, setModalVisible] = useState(false)
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [editingRateCard, setEditingRateCard] = useState(null)
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    status: 'active',
  })

  const fetchRateCards = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await withMinimumDelay(() =>
        rateCardService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
        })
      )
      const data = res?.data || res
      setRateCards(data?.rateCards || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      toastError(err?.message || 'Failed to fetch rate cards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRateCards()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, page])

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id })
  }

  const handleDeleteConfirm = async () => {
    const { id } = confirmDelete
    setConfirmDelete({ visible: false, id: null })
    if (!id) return
    try {
      await rateCardService.delete(id)
      toastSuccess('Rate card deleted successfully')
      fetchRateCards()
    } catch (err) {
      toastError(err?.message || 'Failed to delete rate card')
    }
  }

  const openCreateModal = () => {
    setEditingRateCard(null)
    setFormData({ productName: '', description: '', status: 'active' })
    setModalVisible(true)
  }

  const openEditModal = (rateCard) => {
    setEditingRateCard(rateCard)
    setFormData({
      productName: rateCard.productName || '',
      description: rateCard.description || '',
      status: rateCard.status || 'active',
    })
    setModalVisible(true)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setModalSubmitting(true)
    setError('')
    try {
      const payload = {
        name: formData.productName,
        description: formData.description,
        status: formData.status,
      }
      if (editingRateCard) {
        await rateCardService.update(editingRateCard._id, payload)
        toastSuccess('Rate card updated successfully')
      } else {
        await rateCardService.create(payload)
        toastSuccess('Rate card created successfully')
      }
      setModalVisible(false)
      fetchRateCards()
    } catch (err) {
      toastError(err?.message || 'Failed to save rate card')
    } finally {
      setModalSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    return status === 'active' ? (
      <CBadge color="success">Active</CBadge>
    ) : (
      <CBadge color="secondary">Inactive</CBadge>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Rate Cards</strong>
            <CButton color="primary" onClick={openCreateModal}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Product
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            {loading ? (
              <Loader message="Loading rate cards..." />
            ) : (
              <>
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Product Name</CTableHeaderCell>
                      <CTableHeaderCell>Description</CTableHeaderCell>
                      <CTableHeaderCell>Suppliers</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {rateCards.map((rc, index) => (
                      <CTableRow
                        key={rc._id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/rate-cards/${rc._id}`)}
                      >
                        <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <strong>{rc.name || rc.productName}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          {rc.description?.substring(0, 60) || '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info">{rc.suppliers?.length || 0}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{getStatusBadge(rc.status)}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="warning"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(rc)
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
                              handleDeleteClick(rc._id)
                            }}
                            title="Delete"
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                    {rateCards.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={6} className="text-center">
                          {searchTerm
                            ? `No rate cards found matching "${searchTerm}"`
                            : 'No rate cards found. Click "Add Product" to create one.'}
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
                {pagination.totalPages > 1 && (
                  <CPagination className="justify-content-center">
                    <CPaginationItem
                      disabled={!pagination.hasPrevPage}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </CPaginationItem>
                    {Array.from({ length: pagination.totalPages }, (_, i) => (
                      <CPaginationItem
                        key={i + 1}
                        active={page === i + 1}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </CPaginationItem>
                    ))}
                    <CPaginationItem
                      disabled={!pagination.hasNextPage}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </CPaginationItem>
                  </CPagination>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      {/* Create/Edit Product Modal */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)}>
        <CModalHeader>
          <CModalTitle>{editingRateCard ? 'Edit Product' : 'Add Product'}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleFormSubmit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Product Name *</CFormLabel>
              <CFormInput
                name="productName"
                value={formData.productName}
                onChange={handleFormChange}
                required
                placeholder="e.g. Laptop Acer 8GB RAM Intel i5 512 SSD"
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Description</CFormLabel>
              <CFormTextarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Enter product description..."
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Status</CFormLabel>
              <CFormSelect name="status" value={formData.status} onChange={handleFormChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </CFormSelect>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setModalVisible(false)}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={modalSubmitting}>
              {modalSubmitting ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : editingRateCard ? (
                'Update Product'
              ) : (
                'Create Product'
              )}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Rate Card?"
        message="Are you sure you want to delete this rate card? All suppliers associated with it will also be removed. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default RateCardList
