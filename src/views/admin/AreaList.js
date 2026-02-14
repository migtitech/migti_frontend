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
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilZoom } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import areaService from '../../services/areaService'
import companyService from '../../services/companyService'
import Filtered from '../../filtered/Filtered'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'

const AreaList = () => {
  const navigate = useNavigate()
  const [areas, setAreas] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [filterCompanyId, setFilterCompanyId] = useState('')
  const [filterAreaType, setFilterAreaType] = useState('')
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const fetchCompanies = async () => {
    try {
      const res = await companyService.getAll({ pageNumber: 1, pageSize: 100 })
      const data = res?.data?.data || res?.data || res
      setCompanies(data?.companies || data || [])
    } catch (err) {
      console.error('Failed to fetch companies', err)
    }
  }

  const fetchAreas = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { pageNumber: page, pageSize: 10, search: searchTerm }
      if (filterCompanyId) params.companyId = filterCompanyId
      if (filterAreaType) params.areaType = filterAreaType
      const res = await withMinimumDelay(() => areaService.getAll(params))
      const data = res?.data?.data || res?.data || res
      setAreas(data?.areas || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      toastError(err?.message || 'Failed to fetch zones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchAreas(), 300)
    return () => clearTimeout(timer)
  }, [searchTerm, page, filterCompanyId, filterAreaType])

  const handleDeleteClick = (id) => setConfirmDelete({ visible: true, id })
  const handleDeleteConfirm = async () => {
    const aid = confirmDelete.id
    console.log('Deleting area with id:', aid)
    setConfirmDelete({ visible: false, id: null })
    if (!aid) return
    try {
      await areaService.delete(aid)
      toastSuccess('Zone deleted successfully')
      fetchAreas()
    } catch (err) {
      toastError(err?.message || 'Failed to delete zone')
    }
  }

  const getAreaTypeBadge = (type) =>
    type === 'market' ? <CBadge color="info">Market</CBadge> : <CBadge color="secondary">Industry</CBadge>
  const getId = (item) => item?.id || item?._id

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <strong>Zones</strong>
            <CButton color="primary" onClick={() => navigate('/zones/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Zone
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}
            <div className="mb-3 d-flex flex-wrap gap-2 align-items-end">
              <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              <CFormSelect
                style={{ maxWidth: 200 }}
                value={filterCompanyId}
                onChange={(e) => {
                  setFilterCompanyId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={getId(c)} value={getId(c)}>
                    {c.name}
                  </option>
                ))}
              </CFormSelect>
              <CFormSelect
                style={{ maxWidth: 180 }}
                value={filterAreaType}
                onChange={(e) => {
                  setFilterAreaType(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All Types</option>
                <option value="market">Market</option>
                <option value="industry">Industry</option>
              </CFormSelect>
            </div>
            {loading ? (
              <Loader message="Loading zones..." />
            ) : (
              <>
                <CTable responsive hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>City</CTableHeaderCell>
                      <CTableHeaderCell>Zone Type</CTableHeaderCell>
                      <CTableHeaderCell>Company</CTableHeaderCell>
                      <CTableHeaderCell>Branch</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {areas.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={6} className="text-center py-4 text-muted">
                          No zones found
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      areas.map((area) => (
                        <CTableRow key={getId(area)}>
                          <CTableDataCell><strong>{area.name}</strong></CTableDataCell>
                          <CTableDataCell>{area.city}</CTableDataCell>
                          <CTableDataCell>{getAreaTypeBadge(area.areaType)}</CTableDataCell>
                          <CTableDataCell>{area.companyId?.name ?? '—'}</CTableDataCell>
                          <CTableDataCell>{area.branchId?.name ?? '—'}</CTableDataCell>
                          <CTableDataCell className="text-end">
                            <CButton
                              color="info"
                              variant="ghost"
                              size="sm"
                              className="me-2"
                              onClick={() => navigate(`/zones/${getId(area)}`)}
                            >
                              <CIcon icon={cilZoom} />
                            </CButton>
                            <CButton
                              color="primary"
                              variant="ghost"
                              size="sm"
                              className="me-2"
                              onClick={() => navigate(`/zones/edit/${getId(area)}`)}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(getId(area))}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
                {pagination.totalPages > 1 && (
                  <CPagination className="mt-3 justify-content-center">
                    <CPaginationItem
                      disabled={!pagination.hasPrevPage}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </CPaginationItem>
                    <CPaginationItem active>
                      {pagination.currentPage} / {pagination.totalPages}
                    </CPaginationItem>
                    <CPaginationItem
                      disabled={!pagination.hasNextPage}
                      onClick={() => setPage((p) => p + 1)}
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
      <ConfirmDialog
        visible={confirmDelete.visible}
        title="Delete Zone"
        confirmText="Delete"
        message="Are you sure you want to delete this zone?"
        onConfirm={handleDeleteConfirm}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
      />
    </CRow>
  )
}

export default AreaList
