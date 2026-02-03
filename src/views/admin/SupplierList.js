import React, { useEffect, useState } from 'react'
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
  CSpinner,
  CAlert,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilZoom } from '@coreui/icons'
import supplierService from '../../services/supplierService'
import Filtered from '../../filtered/Filtered'

const SupplierList = () => {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})

  const fetchSuppliers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await supplierService.getAll({
        pageNumber: page,
        pageSize: 10,
        search: searchTerm,
      })
      const data = res?.data || res
      setSuppliers(data?.suppliers || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      setError(err?.message || 'Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, page])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return
    try {
      await supplierService.delete(id)
      fetchSuppliers()
    } catch (err) {
      setError(err?.message || 'Failed to delete supplier')
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Suppliers</strong>
            <CButton color="primary" onClick={() => navigate('/suppliers/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Supplier
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
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Shop Name</CTableHeaderCell>
                      <CTableHeaderCell>Phone 1</CTableHeaderCell>
                      <CTableHeaderCell>Phone 2</CTableHeaderCell>
                      <CTableHeaderCell>Email</CTableHeaderCell>
                      <CTableHeaderCell>Other Contact</CTableHeaderCell>
                      <CTableHeaderCell>Label</CTableHeaderCell>
                      <CTableHeaderCell>Shop Location</CTableHeaderCell>
                      <CTableHeaderCell>Categories</CTableHeaderCell>
                      <CTableHeaderCell>Remark</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {suppliers.map((supplier, index) => (
                      <CTableRow key={supplier._id}>
                        <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <strong>{supplier.name}</strong>
                        </CTableDataCell>
                        <CTableDataCell>{supplier.shopname || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.phone_1 || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.phone_2 || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.email || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.other_contact || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.label || '-'}</CTableDataCell>
                        <CTableDataCell>{supplier.shop_location || '-'}</CTableDataCell>
                        <CTableDataCell>
                          {supplier.categories?.length
                            ? supplier.categories
                                .map((cat) => (typeof cat === 'string' ? cat : cat?.name))
                                .filter(Boolean)
                                .join(', ')
                            : '-'}
                        </CTableDataCell>
                        <CTableDataCell>{supplier.remark || '-'}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/suppliers/${supplier._id}`)}
                            title="View"
                          >
                            <CIcon icon={cilZoom} />
                          </CButton>
                          <CButton
                            color="warning"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/suppliers/edit/${supplier._id}`)}
                            title="Edit"
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(supplier._id)}
                            title="Delete"
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                    {suppliers.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={12} className="text-center">
                          {searchTerm
                            ? `No suppliers found matching "${searchTerm}"`
                            : 'No suppliers found. Click "Add Supplier" to create one.'}
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
    </CRow>
  )
}

export default SupplierList
