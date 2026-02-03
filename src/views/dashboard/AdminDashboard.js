import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CWidgetStatsA,
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBuilding,
  cilBriefcase,
  cilPeople,
  cilPlus,
  cilPencil,
  cilTrash,
} from '@coreui/icons'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const { companies, branches, branchUsers, addCompany, updateCompany, deleteCompany } = useData()
  const { user } = useAuth()

  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: '',
  })

  const stats = {
    totalCompanies: companies.length,
    totalBranches: branches.length,
    totalUsers: branchUsers.length,
  }

  const handleOpenModal = (company = null) => {
    if (company) {
      setEditingCompany(company)
      setFormData({
        name: company.name,
        email: company.email,
        location: company.location,
      })
    } else {
      setEditingCompany(null)
      setFormData({ name: '', email: '', location: '' })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCompany(null)
    setFormData({ name: '', email: '', location: '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingCompany) {
      updateCompany(editingCompany.id, formData)
    } else {
      addCompany(formData)
    }
    handleCloseModal()
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this company? All branches will also be deleted.')) {
      deleteCompany(id)
    }
  }

  const handleViewBranches = (companyId) => {
    navigate(`/admin/companies/${companyId}/branches`)
  }

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2>Welcome, {user?.name}</h2>
          <p className="text-body-secondary">Admin Dashboard - Company Management</p>
        </CCol>
      </CRow>

      <CRow>
        <CCol sm={6} lg={4}>
          <CWidgetStatsA
            className="mb-4"
            color="primary"
            value={stats.totalCompanies.toString()}
            title="Total Companies"
            chart={
              <CIcon icon={cilBuilding} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={4}>
          <CWidgetStatsA
            className="mb-4"
            color="info"
            value={stats.totalBranches.toString()}
            title="Total Branches"
            chart={
              <CIcon icon={cilBriefcase} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={4}>
          <CWidgetStatsA
            className="mb-4"
            color="warning"
            value={stats.totalUsers.toString()}
            title="Total Users"
            chart={
              <CIcon icon={cilPeople} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Companies</strong>
              <CButton color="primary" size="sm" onClick={() => handleOpenModal()}>
                <CIcon icon={cilPlus} className="me-1" />
                Add Company
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
                    <CTableHeaderCell>Branches</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {companies.map((company, index) => (
                    <CTableRow key={company.id}>
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>{company.name}</CTableDataCell>
                      <CTableDataCell>{company.email}</CTableDataCell>
                      <CTableDataCell>{company.location}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge
                          color="info"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleViewBranches(company.id)}
                        >
                          {branches.filter((b) => b.companyId === company.id).length} Branches
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          color="info"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewBranches(company.id)}
                          title="View Branches"
                        >
                          <CIcon icon={cilBriefcase} />
                        </CButton>
                        <CButton
                          color="warning"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(company)}
                          title="Edit"
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(company.id)}
                          title="Delete"
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {companies.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={6} className="text-center text-body-secondary">
                        No companies found. Click &quot;Add Company&quot; to create one.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Add/Edit Company Modal */}
      <CModal visible={showModal} onClose={handleCloseModal}>
        <CForm onSubmit={handleSubmit}>
          <CModalHeader>
            <CModalTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel htmlFor="name">Company Name</CFormLabel>
              <CFormInput
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
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
                placeholder="Enter company email"
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
                placeholder="Enter company location"
                required
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseModal}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit">
              {editingCompany ? 'Update' : 'Create'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default AdminDashboard
