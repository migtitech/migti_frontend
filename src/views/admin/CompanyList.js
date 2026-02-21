import React, { useState, useEffect } from 'react'
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
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilLocationPin } from '@coreui/icons'
import { EyeIcon } from '../../components'
import Filtered from '../../filtered/Filtered'
import companyService from '../../services/companyService'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'
import usePermissions from '../../hooks/usePermissions'

const CompanyList = () => {
  const navigate = useNavigate()
  const { canCreate, canUpdate, canDelete } = usePermissions()

  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const fetchCompanies = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await withMinimumDelay(() => companyService.getAll({ search: searchTerm || '' }))
      const data = res?.data || res
      setCompanies(data?.companies || data || [])
    } catch (err) {
      setError(err?.message || 'Failed to fetch companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchCompanies, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id })
  }

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id
    setConfirmDelete({ visible: false, id: null })
    if (!id) return
    try {
      await companyService.delete(id)
      toastSuccess('Company deleted successfully')
      fetchCompanies()
    } catch (err) {
      toastError(err?.message || 'Failed to delete company')
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Companies</strong>
            {canCreate('companies') && (
              <CButton color="primary" onClick={() => navigate('/companies/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Company
              </CButton>
            )}
          </CCardHeader>

          <CCardBody>
            {error && (
              <CAlert color="danger" className="mb-3" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}

            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

            {loading ? (
              <Loader message="Loading companies..." />
            ) : (
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>S No</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Brand Name</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Logo</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {companies.map((company, index) => {
                    const id = company._id || company.id
                    return (
                      <CTableRow key={id} 
                        onClick={() => navigate(`/companies/${id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell>{company.name}</CTableDataCell>
                        <CTableDataCell>{company.brandName}</CTableDataCell>
                        <CTableDataCell>{company.email}</CTableDataCell>
                        <CTableDataCell>
                          {(company.logoDisplayUrl || company.logoUrl) ? (
                            <img
                              src={company.logoDisplayUrl || company.logoUrl}
                              alt="Logo"
                              style={{ height: 32, width: 'auto', maxWidth: 80, objectFit: 'contain' }}
                            />
                          ) : (
                            '-'
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={company.isActive !== false ? 'success' : 'secondary'}>
                            {company.isActive !== false ? 'Active' : 'Inactive'}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            title="View"
                            onClick={() => navigate(`/companies/${id}`)}
                          >
                            <EyeIcon />
                          </CButton>

                          <CButton
                            color="primary"
                            variant="ghost"
                            size="sm"
                            title="Branches"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/companies/${id}/branches`)}}
                          >
                            <CIcon icon={cilLocationPin} />
                          </CButton>

                          {canUpdate('companies') && (
                            <CButton
                              color="warning"
                              variant="ghost"
                              size="sm"
                              title="Edit"
                              onClick={(e) =>{
                                e.stopPropagation()
                                navigate(`/companies/edit/${id}`)}}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          )}

                          {canDelete('companies') && (
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={(e) =>{
                                e.stopPropagation()
                                handleDeleteClick(id)}}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}

                  {companies.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center">
                        {searchTerm
                          ? `No companies found matching "${searchTerm}"`
                          : 'No companies found. Click "Add Company" to create one.'}
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Company?"
        message="Are you sure you want to delete this company? All related branches will also be deleted."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default CompanyList
