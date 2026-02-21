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
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilCloudDownload,
} from '@coreui/icons'
import { EyeIcon } from '../../components'
import { useData } from '../../context/DataContext'
import Filtered from '../../filtered/Filtered'
import { ConfirmDialog } from '../../components'

const QuotationList = () => {
  const navigate = useNavigate()
  const { quotations, deleteQuotation } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id })
  }

  const handleDeleteConfirm = () => {
    const id = confirmDelete.id
    setConfirmDelete({ visible: false, id: null })
    if (id != null) deleteQuotation(id)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <CBadge color="secondary">Draft</CBadge>
      case 'sent':
        return <CBadge color="info">Sent</CBadge>
      case 'accepted':
        return <CBadge color="success">Accepted</CBadge>
      case 'rejected':
        return <CBadge color="danger">Rejected</CBadge>
      case 'expired':
        return <CBadge color="warning">Expired</CBadge>
      default:
        return <CBadge color="secondary">{status}</CBadge>
    }
  }

  const filteredQuotations = quotations?.filter((q) =>
    q.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(q.id).includes(searchTerm)
  )

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Quotations</strong>
            <CButton color="primary" onClick={() => navigate('/quotations/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Quotation
            </CButton>
          </CCardHeader>

          <CCardBody>
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>S No</CTableHeaderCell>
                  <CTableHeaderCell>Quotation No.</CTableHeaderCell>
                  <CTableHeaderCell>Customer</CTableHeaderCell>
                  <CTableHeaderCell>Items</CTableHeaderCell>
                  <CTableHeaderCell>Total Amount</CTableHeaderCell>
                  <CTableHeaderCell>Valid Until</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {filteredQuotations && filteredQuotations.length > 0 ? (
                  filteredQuotations.map((quotation, index) => (
                    <CTableRow key={quotation.id}
                    onClick={() => navigate(`/quotations/${quotation.id}`)}
                    style={{ cursor: 'pointer' }}
                    >
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>
                        <strong>QT-{String(quotation.id).padStart(4, '0')}</strong>
                      </CTableDataCell>
                      <CTableDataCell>
                        <strong>{quotation.customerName}</strong>
                        <br />
                        <small className="text-muted">{quotation.customerEmail}</small>
                      </CTableDataCell>
                      <CTableDataCell>
                        <small>
                          {quotation.items?.substring(0, 50)}
                          {quotation.items?.length > 50 ? '...' : ''}
                        </small>
                      </CTableDataCell>
                      <CTableDataCell>
                        ₹{quotation.totalAmount?.toLocaleString() || '0'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {quotation.validUntil
                          ? new Date(quotation.validUntil).toLocaleDateString()
                          : '-'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {getStatusBadge(quotation.status)}
                      </CTableDataCell>
                      <CTableDataCell>
                        {quotation.createdAt
                          ? new Date(quotation.createdAt).toLocaleDateString()
                          : '-'}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          color="info"
                          variant="ghost"
                          size="sm"
                          title="View"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/quotations/${quotation.id}`)}}
                        >
                          <EyeIcon />
                        </CButton>

                        <CButton
                          color="success"
                          variant="ghost"
                          size="sm"
                          title="Download"
                        >
                          <CIcon icon={cilCloudDownload} />
                        </CButton>

                        <CButton
                          color="warning"
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/quotations/edit/${quotation.id}`)}}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>

                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(quotation.id)}}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                ) : (
                  <CTableRow>
                    <CTableDataCell colSpan={9} className="text-center">
                      No quotations found. Click "Add Quotation" to create one.
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Quotation?"
        message="Are you sure you want to delete this quotation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default QuotationList
