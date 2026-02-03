import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CBreadcrumb,
  CBreadcrumbItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilPeople,
  cilArrowLeft,
} from '@coreui/icons'
import { useData } from '../../context/DataContext'

const BranchManagement = () => {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const {
    getCompanyById,
    getBranchesByCompany,
    addBranch,
    updateBranch,
    deleteBranch,
    getUsersByBranch,
  } = useData()

  const company = getCompanyById(parseInt(companyId))
  const branches = getBranchesByCompany(parseInt(companyId))

  const [showModal, setShowModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: '',
    logo: '',
  })

  if (!company) {
    return (
      <CCard>
        <CCardBody className="text-center">
          <h4>Company not found</h4>
          <CButton color="primary" onClick={() => navigate('/admin/dashboard')}>
            Back to Dashboard
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  const handleOpenModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch)
      setFormData({
        name: branch.name,
        email: branch.email,
        location: branch.location,
        logo: branch.logo || '',
      })
    } else {
      setEditingBranch(null)
      setFormData({ name: '', email: '', location: '', logo: '' })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingBranch(null)
    setFormData({ name: '', email: '', location: '', logo: '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingBranch) {
      updateBranch(editingBranch.id, formData)
    } else {
      addBranch({ ...formData, companyId: parseInt(companyId) })
    }
    handleCloseModal()
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this branch? All users will also be removed.')) {
      deleteBranch(id)
    }
  }

  const handleViewUsers = (branchId) => {
    navigate(`/admin/companies/${companyId}/branches/${branchId}/users`)
  }

  return (
    <>
      <CBreadcrumb className="mb-4">
        <CBreadcrumbItem>
          <span
            style={{ cursor: 'pointer', color: 'var(--cui-link-color)' }}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </span>
        </CBreadcrumbItem>
        <CBreadcrumbItem active>{company.name} - Branches</CBreadcrumbItem>
      </CBreadcrumb>

      <CRow className="mb-4">
        <CCol>
          <CButton color="link" className="p-0 mb-2" onClick={() => navigate('/dashboard')}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Companies
          </CButton>
          <h2>{company.name}</h2>
          <p className="text-body-secondary">Branch Management</p>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Branches</strong>
              <CButton color="primary" size="sm" onClick={() => handleOpenModal()}>
                <CIcon icon={cilPlus} className="me-1" />
                Add Branch
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>#</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Location</CTableHeaderCell>
                    <CTableHeaderCell>Users</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {branches.map((branch, index) => (
                    <CTableRow key={branch.id}>
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>{branch.name}</CTableDataCell>
                      <CTableDataCell>{branch.email}</CTableDataCell>
                      <CTableDataCell>{branch.location}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge
                          color="success"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleViewUsers(branch.id)}
                        >
                          {getUsersByBranch(branch.id).length} Users
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          color="info"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUsers(branch.id)}
                          title="Manage Users"
                        >
                          <CIcon icon={cilPeople} />
                        </CButton>
                        <CButton
                          color="warning"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(branch)}
                          title="Edit"
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(branch.id)}
                          title="Delete"
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {branches.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={6} className="text-center text-body-secondary">
                        No branches found. Click &quot;Add Branch&quot; to create one.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Add/Edit Branch Modal */}
      <CModal visible={showModal} onClose={handleCloseModal}>
        <CForm onSubmit={handleSubmit}>
          <CModalHeader>
            <CModalTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel htmlFor="name">Branch Name</CFormLabel>
              <CFormInput
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter branch name"
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="email">Email</CFormLabel>
              <CFormInput
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter branch email"
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="location">Location</CFormLabel>
              <CFormInput
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Enter branch location"
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="logo">Logo URL (Optional)</CFormLabel>
              <CFormInput
                id="logo"
                type="text"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                placeholder="Enter logo URL"
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseModal}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit">
              {editingBranch ? 'Update' : 'Create'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default BranchManagement
