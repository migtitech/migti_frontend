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
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilZoom, cilLocationPin } from '@coreui/icons'
import Filtered from '../../filtered/Filtered'
import companyService from '../../services/companyService'
import Badge from '../../badges/badge'

const CompanyList = () => {
  const navigate = useNavigate()

  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchCompanies = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await companyService.getAll({ search: searchTerm || '' })
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company? All related branches will also be deleted.')) {
      return
    }
    try {
      await companyService.delete(id)
      fetchCompanies()
    } catch (err) {
      setError(err?.message || 'Failed to delete company')
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Companies</strong>
            <CButton color="primary" onClick={() => navigate('/companies/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Company
            </CButton>
          </CCardHeader>

          <CCardBody>
            {error && (
              <CAlert color="danger" className="mb-3" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}

            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

            {loading ? (
              <div className="text-center py-4">
                <CSpinner color="primary" />
              </div>
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
                      <CTableRow key={id}>
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell>{company.name}</CTableDataCell>
                        <CTableDataCell>{company.brandName}</CTableDataCell>
                        <CTableDataCell>{company.email}</CTableDataCell>
                        <CTableDataCell>{company.logoUrl || '-'}</CTableDataCell>
                        <CTableDataCell>
                          {/* <CBadge color="success">Active</CBadge> */}
                          <Badge text="active" color='primary'/>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            title="View"
                            onClick={() => navigate(`/companies/${id}`)}
                          >
                            <CIcon icon={cilZoom} />
                          </CButton>

                          <CButton
                            color="primary"
                            variant="ghost"
                            size="sm"
                            title="Branches"
                            onClick={() => navigate(`/companies/${id}/branches`)}
                          >
                            <CIcon icon={cilLocationPin} />
                          </CButton>

                          <CButton
                            color="warning"
                            variant="ghost"
                            size="sm"
                            title="Edit"
                            onClick={() => navigate(`/companies/edit/${id}`)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>

                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            onClick={() => handleDelete(id)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
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
    </CRow>
  )
}

export default CompanyList
