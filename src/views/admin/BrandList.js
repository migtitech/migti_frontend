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
  CSpinner,
  CAlert,
  CImage,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import brandService from '../../services/brandService'
import Filtered from '../../filtered/Filtered'
import { useNavigate } from 'react-router-dom'

const BrandList = () => {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})

  const navigate = useNavigate()

  const fetchBrands = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await brandService.getAll({
        pageNumber: page,
        pageSize: 10,
        search: searchTerm,
      })
      const data = res?.data || res
      setBrands(data?.brands || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      setError(err?.message || 'Failed to fetch brands')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchBrands, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, page])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this brand?')) return
    try {
      await brandService.delete(id)
      fetchBrands()
    } catch (err) {
      setError(err?.message || 'Failed to delete brand')
    }
  }

  const getStatusBadge = (status) =>
    status === 'active' ? (
      <CBadge color="success">Active</CBadge>
    ) : (
      <CBadge color="secondary">Inactive</CBadge>
    )

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Brands</strong>
            <CButton color="primary" onClick={() => navigate('/brands/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Brand
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
              <div className="text-center p-4">
                <CSpinner />
              </div>
            ) : (
              <>
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Logo</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Website</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>

                  <CTableBody>
                    {brands.map((brand, index) => (
                      <CTableRow key={brand._id}>
                        <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>

                        <CTableDataCell>
                          {brand.logo ? (
                            <CImage src={brand.logo} width={40} height={40} />
                          ) : (
                            <small className="text-muted">N/A</small>
                          )}
                        </CTableDataCell>

                        <CTableDataCell>
                          <strong>{brand.name}</strong>
                        </CTableDataCell>

                        <CTableDataCell>
                          {brand.website || '-'}
                        </CTableDataCell>

                        <CTableDataCell>
                          {getStatusBadge(brand.status)}
                        </CTableDataCell>

                        <CTableDataCell>
                          <CButton
                            size="sm"
                            color="warning"
                            variant="ghost"
                            onClick={() => navigate(`/brands/edit/${brand._id}`)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>

                          <CButton
                            size="sm"
                            color="danger"
                            variant="ghost"
                            onClick={() => handleDelete(brand._id)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}

                    {brands.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={6} className="text-center">
                          No brands found
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>

                {pagination.totalPages > 1 && (
                  <CPagination className="justify-content-center mt-3">
                    <CPaginationItem
                      disabled={!pagination.hasPrevPage}
                      onClick={() => setPage(page - 1)}
                    >
                      Prev
                    </CPaginationItem>

                    {Array.from({ length: pagination.totalPages }).map((_, i) => (
                      <CPaginationItem
                        key={i}
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
    </CRow>
  )
}

export default BrandList
