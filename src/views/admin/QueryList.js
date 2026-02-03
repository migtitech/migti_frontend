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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CImage,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilZoom, cilImage } from '@coreui/icons'
import { useData } from '../../context/DataContext'
import Filtered from '../../filtered/Filtered'

const QueryList = () => {
  const navigate = useNavigate()
  const { queries, deleteQuery } = useData()

  const [searchTerm, setSearchTerm] = useState('')
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this query?')) {
      deleteQuery(id)
    }
  }

  const handleViewImages = (images) => {
    setSelectedImages(images || [])
    setShowImageModal(true)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <CBadge color="info">New</CBadge>
      case 'in_progress':
        return <CBadge color="warning">In Progress</CBadge>
      case 'quoted':
        return <CBadge color="primary">Quoted</CBadge>
      case 'closed':
        return <CBadge color="success">Closed</CBadge>
      case 'cancelled':
        return <CBadge color="danger">Cancelled</CBadge>
      default:
        return <CBadge color="secondary">{status}</CBadge>
    }
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <CBadge color="danger">High</CBadge>
      case 'normal':
        return <CBadge color="secondary">Normal</CBadge>
      case 'low':
        return <CBadge color="info">Low</CBadge>
      default:
        return <CBadge color="secondary">{priority}</CBadge>
    }
  }

  const filteredQueries = queries?.filter(
    (q) =>
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Queries</strong>
              <CButton color="primary" onClick={() => navigate('/queries/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Query
              </CButton>
            </CCardHeader>

            <CCardBody>
              <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>S No</CTableHeaderCell>
                    <CTableHeaderCell>Customer</CTableHeaderCell>
                    <CTableHeaderCell>Subject</CTableHeaderCell>
                    <CTableHeaderCell>Contact</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Priority</CTableHeaderCell>
                    <CTableHeaderCell>Images</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {filteredQueries?.length > 0 ? (
                    filteredQueries.map((query, index) => (
                      <CTableRow key={query.id}>
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <strong>{query.customerName}</strong>
                          <br />
                          <small className="text-muted">{query.customerEmail}</small>
                        </CTableDataCell>
                        <CTableDataCell>{query.subject}</CTableDataCell>
                        <CTableDataCell>{query.customerPhone || '-'}</CTableDataCell>
                        <CTableDataCell>{getStatusBadge(query.status)}</CTableDataCell>
                        <CTableDataCell>{getPriorityBadge(query.priority)}</CTableDataCell>
                        <CTableDataCell>
                          {query.images?.length ? (
                            <CButton
                              color="info"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewImages(query.images)}
                            >
                              <CIcon icon={cilImage} className="me-1" />
                              {query.images.length}
                            </CButton>
                          ) : (
                            '-'
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {new Date(query.createdAt).toLocaleDateString()}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/queries/${query.id}`)}
                            title="View"
                          >
                            <CIcon icon={cilZoom} />
                          </CButton>
                          <CButton
                            color="warning"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/queries/edit/${query.id}`)}
                            title="Edit"
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(query.id)}
                            title="Delete"
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  ) : (
                    <CTableRow>
                      <CTableDataCell colSpan={9} className="text-center">
                        No queries found.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Image Preview Modal */}
      <CModal visible={showImageModal} onClose={() => setShowImageModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Query Images</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow>
            {selectedImages.length ? (
              selectedImages.map((img, i) => (
                <CCol md={6} key={i} className="mb-3">
                  <CImage src={img} fluid className="rounded" />
                </CCol>
              ))
            ) : (
              <CCol className="text-center text-muted">No images available</CCol>
            )}
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowImageModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default QueryList
