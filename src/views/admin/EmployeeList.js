import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import employeeService from '../../services/employeeService'
import branchService from '../../services/branchService'
import EmployeeHeader from './employees/EmployeeHeader'
import EmployeeTable from './employees/EmployeeTable'

const EmployeeList = () => {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')


  const normalizeId = (item) => ({
    ...item,
    id: item?.id || item?._id,
  })

  const loadEmployees = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await employeeService.getAll()
      const list = response?.data?.employees || response?.data || []
      setEmployees(list.map(normalizeId))
    } catch (err) {
      setError(err?.message || 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      const response = await branchService.getAll()
      const list = response?.data?.branches || response?.data || []
      setBranches(list.map(normalizeId))
    } catch (err) {
      setError(err?.message || 'Failed to load branches')
    }
  }

  useEffect(() => {
    loadEmployees()
    loadBranches()
  }, [])


  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      setSubmitting(true)
      setError('')
      try {
        await employeeService.delete(id)
        setEmployees((prev) => prev.filter((employee) => employee.id !== id))
      } catch (err) {
        setError(err?.message || 'Failed to delete employee')
      } finally {
        setSubmitting(false)
      }
    }
  }


  return (
    <>
      <EmployeeHeader onAdd={() => navigate('/employees/new')} />
      <EmployeeTable
        employees={employees}
        branches={branches}
        loading={loading}
        error={error}
        onClearError={() => setError('')}
        onView={(employeeId) => navigate(`/employees/${employeeId}`)}
        onEdit={(employee) => navigate(`/employees/edit/${employee.id}`)}
        onDelete={handleDelete}
      />
    </>
  )
}

export default EmployeeList
