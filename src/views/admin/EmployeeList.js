import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CCol, CRow, CFormSelect } from '@coreui/react'
import employeeService from '../../services/employeeService'
import branchService from '../../services/branchService'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'
import { ConfirmDialog } from '../../components'
import EmployeeHeader from './employees/EmployeeHeader'
import EmployeeTable from './employees/EmployeeTable'
import usePermissions from '../../hooks/usePermissions'
import useBranchContext from '../../hooks/useBranchContext'

const EmployeeList = () => {
  const navigate = useNavigate()
  const { canCreate, canUpdate, canDelete } = usePermissions()
  const { branchId: userBranchId, canSelectBranch } = useBranchContext()
  const [employees, setEmployees] = useState([])
  const [branches, setBranches] = useState([])
  const [branchFilterId, setBranchFilterId] = useState('')
  const [branchDefaultApplied, setBranchDefaultApplied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const normalizeId = (item) => ({
    ...item,
    id: item?.id || item?._id,
  })

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      const effectiveBranchId = branchFilterId || userBranchId
      if (effectiveBranchId) params.branchId = effectiveBranchId
      const response = await withMinimumDelay(() => employeeService.getAll(params))
      const list = response?.data?.employees || response?.data || []
      setEmployees(list.map(normalizeId))
    } catch (err) {
      toastError(err?.message || 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [branchFilterId, userBranchId])

  const loadBranches = useCallback(async () => {
    try {
      const response = await branchService.getAll()
      const list = response?.data?.branches || response?.data || []
      setBranches(list.map(normalizeId))
    } catch (err) {
      toastError(err?.message || 'Failed to load branches')
    }
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  // Branch isolation: default to user's branch so list shows only that branch's data
  useEffect(() => {
    if (branchDefaultApplied || !userBranchId || branches.length === 0) return
    const id = String(userBranchId)
    if (branches.some((b) => String(b.id || b._id) === id)) {
      setBranchFilterId(id)
      setBranchDefaultApplied(true)
    }
  }, [userBranchId, branches, branchDefaultApplied])


  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id })
  }

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id
    setConfirmDelete({ visible: false, id: null })
    if (!id) return
    setSubmitting(true)
    setError('')
    try {
      await employeeService.delete(id)
      setEmployees((prev) => prev.filter((employee) => employee.id !== id))
      toastSuccess('Employee deleted successfully')
    } catch (err) {
      toastError(err?.message || 'Failed to delete employee')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <EmployeeHeader onAdd={() => navigate('/employees/new')} canCreate={canCreate} />
      {canSelectBranch && branches.length > 0 && (
        <CRow className="mb-3">
          <CCol md={4}>
            <CFormSelect
              value={branchFilterId}
              onChange={(e) => setBranchFilterId(e.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id || b._id} value={b.id || b._id}>
                  {b.name || b.branchcode || b.id}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>
      )}
      <EmployeeTable
        employees={employees}
        branches={branches}
        loading={loading}
        error={error}
        onClearError={() => setError('')}
        onView={(employeeId) => navigate(`/employees/${employeeId}`)}
        onEdit={(employee) => navigate(`/employees/edit/${employee.id}`)}
        onDelete={handleDeleteClick}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Employee?"
        message="Are you sure you want to delete this employee? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  )
}

export default EmployeeList
