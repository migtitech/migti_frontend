import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import branchService from '../../services/branchService'
import companyService from '../../services/companyService'
import { getAccessToken } from '../../api/axiosClient'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastSuccess, toastError } from '../../utils/toast'
import { ConfirmDialog } from '../../components'
import BranchHeader from './branches/BranchHeader'
import BranchCards from './branches/BranchCards'
import BranchFormModal from './branches/BranchFormModal'

const BranchList = () => {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null })

  const decodeTokenPayload = (token) => {
    if (!token) return null
    try {
      const payload = token.split('.')[1]
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = decodeURIComponent(
        atob(normalized)
          .split('')
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      )
      return JSON.parse(decoded)
    } catch (err) {
      return null
    }
  }

  const getAdminIdFromToken = () => {
    const token = getAccessToken()
    const payload = decodeTokenPayload(token)
    return payload?.id || ''
  }

  const normalizeId = (item) => ({
    ...item,
    id: item?.id || item?._id,
  })

  const loadCompanies = async () => {
    try {
      const response = await companyService.getAll()
      const list = response?.data?.companies || response?.data || []
      setCompanies(list.map(normalizeId))
    } catch (err) {
      setError(err?.message || 'Failed to load companies')
    }
  }

  const loadBranches = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await withMinimumDelay(() => branchService.getAll())
      const list = response?.data?.branches || response?.data || []
      setBranches(list.map(normalizeId))
    } catch (err) {
      toastError(err?.message || 'Failed to load branches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies()
    loadBranches()
  }, [])

  const handleOpenModal = (branch = null) => {
    setEditingBranch(branch)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingBranch(null)
  }

  const onSubmit = async (data) => {
    setSubmitting(true)
    setError('')
    try {
      const adminId = getAdminIdFromToken()
      const payload = {
        ...data,
        ...(adminId ? { adminId } : {}),
      }

      if (editingBranch) {
        const response = await branchService.update(editingBranch.id, payload)
        const updated = normalizeId(response?.data || response)
        setBranches((prev) => prev.map((item) => (item.id === editingBranch.id ? updated : item)))
      } else {
        const response = await branchService.create(payload)
        const created = normalizeId(response?.data || response)
        setBranches((prev) => [created, ...prev])
      }
      handleCloseModal()
    } catch (err) {
      setError(err?.message || 'Failed to save branch')
    } finally {
      setSubmitting(false)
    }
  }

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
      await branchService.delete(id)
      setBranches((prev) => prev.filter((branch) => branch.id !== id))
      toastSuccess('Branch deleted successfully')
    } catch (err) {
      toastError(err?.message || 'Failed to delete branch')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewUsers = (companyId, branchId) => {
    navigate(`/admin/companies/${companyId}/branches/${branchId}/users`)
  }

  const defaultValues = useMemo(() => {
    if (editingBranch) {
      return {
        name: editingBranch.name || '',
        email: editingBranch.email || '',
        phone: editingBranch.phone || '',
        location: editingBranch.location || '',
        companyId: editingBranch.companyId || '',
        address: editingBranch.address || '',
        branchcode: editingBranch.branchcode || '',
        gstNumber: editingBranch.gstNumber || '',
        fullAddress: editingBranch.fullAddress || '',
        officeImages: editingBranch.officeImages || '',
      }
    }

    return {
      name: '',
      email: '',
      phone: '',
      location: '',
      companyId: companies.length > 0 ? companies[0].id : '',
      address: '',
      branchcode: '',
      gstNumber: '',
      fullAddress: '',
      officeImages: '',
    }
  }, [companies, editingBranch])

  return (
    <>
      <BranchHeader onAdd={() => handleOpenModal()} />
      <BranchCards
        branches={branches}
        companies={companies}
        loading={loading}
        error={error}
        onClearError={() => setError('')}
        onAdd={() => handleOpenModal()}
        onView={(branchId) => navigate(`/branches/${branchId}`)}
        onEdit={handleOpenModal}
        onDelete={handleDeleteClick}
        onViewUsers={handleViewUsers}
      />
      <BranchFormModal
        visible={showModal}
        onClose={handleCloseModal}
        onSubmit={onSubmit}
        submitting={submitting}
        companies={companies}
        editingBranch={editingBranch}
        defaultValues={defaultValues}
      />
      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Branch?"
        message="Are you sure you want to delete this branch? All related users will also be deleted."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  )
}

export default BranchList
