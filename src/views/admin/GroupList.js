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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import groupService from '../../services/groupService'
import Filtered from '../../filtered/Filtered'
import { Loader, ConfirmDialog } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'
import usePermissions from '../../hooks/usePermissions'

const GroupList = () => {
  const navigate = useNavigate()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const fetchGroups = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await withMinimumDelay(() =>
        groupService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
        })
      )
      const data = res?.data || res
      setGroups(data?.groups || [])
      setPagination(data?.pagination || {})
    } catch (err) {
      setError(err?.message || 'Failed to fetch groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGroups()
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
      await groupService.delete(id)
      toastSuccess('Group deleted successfully')
      fetchGroups()
    } catch (err) {
      toastError(err?.message || 'Failed to delete group')
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
            <strong>Groups</strong>
            {canCreate('groups') && (
              <CButton color="primary" onClick={() => navigate('/groups/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Group
              </CButton>
            )}
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            {loading ? (
              <Loader message="Loading groups..." />
            ) : (
              <>
                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>S No</CTableHeaderCell>
                      <CTableHeaderCell>Code</CTableHeaderCell>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Description</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {groups.map((grp, index) => (
                      <CTableRow
                        key={grp._id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/groups/edit/${grp._id}`)}
                      >
                        <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <code>{grp.code || '—'}</code>
                        </CTableDataCell>
                        <CTableDataCell>
                          <strong>{grp.name}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          {grp.description?.substring(0, 50) || '—'}
                        </CTableDataCell>
                        <CTableDataCell>{getStatusBadge(grp.status)}</CTableDataCell>
                        <CTableDataCell onClick={(e) => e.stopPropagation()}>
                          {canUpdate('groups') && (
                            <CButton
                              color="warning"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/groups/edit/${grp._id}`)
                              }}
                              title="Edit"
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          )}
                          {canDelete('groups') && (
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(grp._id)
                              }}
                              title="Delete"
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                    {groups.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={6} className="text-center">
                          {searchTerm
                            ? `No groups found matching "${searchTerm}"`
                            : 'No groups found. Click "Add Group" to create one.'}
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
                {pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="small text-medium-emphasis">
                      Showing {((pagination?.currentPage ?? 1) - 1) * (pagination?.itemsPerPage ?? 10) + 1}
                      -{Math.min((pagination?.currentPage ?? 1) * (pagination?.itemsPerPage ?? 10), pagination?.totalItems ?? 0)} of {pagination?.totalItems ?? 0}
                    </div>
                    <CPagination className="mb-0">
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
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Group?"
        message="Are you sure you want to delete this group? Categories linked to it will need to be updated first."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </CRow>
  )
}

export default GroupList
