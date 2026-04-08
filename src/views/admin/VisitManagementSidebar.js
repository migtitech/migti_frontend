import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CPagination,
  CPaginationItem,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilX } from '@coreui/icons'
import useBranchContext from '../../hooks/useBranchContext'
import branchService from '../../services/branchService'
import areaService from '../../services/areaService'
import employeeService from '../../services/employeeService'
import industryService from '../../services/industryService'
import visitService from '../../services/visitService'
import { Loader } from '../../components'
import { toastError, toastSuccess } from '../../utils/toast'

const unwrapResponse = (response) => {
  if (response?.data && typeof response.data === 'object') return response.data
  return response || {}
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yy} ${hh}:${min}`
}

const drawerWidth = 460
const PERIOD_OPTIONS = [
  { value: 'all', label: 'Total' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const getPeriodRange = (period) => {
  if (!period || period === 'all') return { from: '', to: '' }
  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start = new Date(todayEnd)
  if (period === 'weekly') start.setDate(todayEnd.getDate() - 6)
  if (period === 'monthly') start = new Date(todayEnd.getFullYear(), todayEnd.getMonth(), 1)
  const toInputDate = (d) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  return { from: toInputDate(start), to: toInputDate(todayEnd) }
}

const VisitManagementSidebar = () => {
  const { branchId } = useBranchContext()

  const [loadingInit, setLoadingInit] = useState(false)
  const [loadingRows, setLoadingRows] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState(null)

  const [branches, setBranches] = useState([])
  const [zones, setZones] = useState([])
  const [employees, setEmployees] = useState([])
  const [industries, setIndustries] = useState([])
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  })
  const [page, setPage] = useState(1)
  const [period, setPeriod] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [form, setForm] = useState({
    branchId: branchId || '',
    zoneId: '',
    employeeId: '',
    industryId: '',
    instructions: '',
  })
  const [industrySearchText, setIndustrySearchText] = useState('')

  useEffect(() => {
    setForm((prev) => ({ ...prev, branchId: branchId || prev.branchId || '' }))
  }, [branchId])

  const loadRows = async (pageNumber = 1) => {
    setLoadingRows(true)
    try {
      const res = await visitService.list({
        pageNumber,
        pageSize: 10,
        period,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: statusFilter || undefined,
      })
      const payload = unwrapResponse(res)
      const data = payload?.data || payload || {}
      setRows(data?.visits || [])
      setPagination(
        data?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
        },
      )
    } catch (err) {
      toastError(err?.message || 'Failed to load visits')
      setRows([])
    } finally {
      setLoadingRows(false)
    }
  }

  const loadInitial = async () => {
    setLoadingInit(true)
    try {
      const [branchesRes] = await Promise.all([
        branchService.getAll({ pageNumber: 1, pageSize: 100 }),
      ])
      const branchesPayload = unwrapResponse(branchesRes)
      const branchRows =
        branchesPayload?.data?.branches ||
        branchesPayload?.branches ||
        branchesPayload?.data?.companyBranches ||
        branchesPayload?.companyBranches ||
        []
      setBranches((branchRows || []).map((b) => ({ ...b, id: b._id || b.id })))
    } catch (err) {
      toastError(err?.message || 'Failed to load branches')
    } finally {
      setLoadingInit(false)
    }
  }

  useEffect(() => {
    loadInitial()
    loadRows(1)
  }, [])

  useEffect(() => {
    const nextRange = getPeriodRange(period)
    setDateFrom(nextRange.from)
    setDateTo(nextRange.to)
    setPage(1)
  }, [period])

  useEffect(() => {
    setPage(1)
  }, [dateFrom, dateTo, statusFilter])

  useEffect(() => {
    loadRows(page)
  }, [page, period, dateFrom, dateTo, statusFilter])

  useEffect(() => {
    const selectedBranchId = form.branchId
    if (!selectedBranchId) {
      setZones([])
      setEmployees([])
      setIndustries([])
      setForm((prev) => ({ ...prev, zoneId: '', employeeId: '', industryId: '' }))
      return
    }

    const loadBranchScopedData = async () => {
      try {
        const [zonesRes, employeesRes, industriesRes] = await Promise.all([
          areaService.getAll({
            pageNumber: 1,
            pageSize: 100,
            branchId: selectedBranchId,
            areaType: 'industry',
          }),
          employeeService.getAll({
            pageNumber: 1,
            pageSize: 100,
            branchId: selectedBranchId,
          }),
          industryService.getAll({
            pageNumber: 1,
            pageSize: 100,
            branchId: selectedBranchId,
          }),
        ])

        const zonesPayload = unwrapResponse(zonesRes)
        const employeesPayload = unwrapResponse(employeesRes)
        const industriesPayload = unwrapResponse(industriesRes)

        const zoneRows = zonesPayload?.data?.areas || zonesPayload?.areas || []
        const employeeRows = employeesPayload?.data?.employees || employeesPayload?.employees || []
        const industryRows = industriesPayload?.data?.industries || industriesPayload?.industries || []

        setZones((zoneRows || []).map((z) => ({ ...z, id: z._id || z.id })))
        setEmployees((employeeRows || []).map((e) => ({ ...e, id: e._id || e.id })))
        setIndustries((industryRows || []).map((i) => ({ ...i, id: i._id || i.id })))
      } catch (err) {
        toastError(err?.message || 'Failed to load branch wise data')
      }
    }

    loadBranchScopedData()
  }, [form.branchId])

  const visibleIndustries = useMemo(() => {
    const q = industrySearchText.trim().toLowerCase()
    if (!q) return industries
    return industries.filter((industry) => String(industry?.name || '').toLowerCase().includes(q))
  }, [industries, industrySearchText])

  const onSaveVisit = async () => {
    if (!form.branchId || !form.zoneId || !form.employeeId) {
      toastError('Branch, zone and employee are required')
      return
    }

    setSubmitting(true)
    try {
      await visitService.create({
        branchId: form.branchId,
        zoneId: form.zoneId,
        employeeId: form.employeeId,
        industryIds: form.industryId ? [form.industryId] : [],
        instructions: form.instructions || '',
      })

      toastSuccess('Visit created successfully')
      setIsDrawerOpen(false)
      setForm({
        branchId: branchId || form.branchId || '',
        zoneId: '',
        employeeId: '',
        industryId: '',
        instructions: '',
      })
      setIndustrySearchText('')
      setPage(1)
      loadRows(1)
    } catch (err) {
      toastError(err?.message || 'Failed to create visit')
    } finally {
      setSubmitting(false)
    }
  }

  const onViewVisit = (visit) => {
    setSelectedVisit(visit)
    setIsDrawerOpen(false)
    setIsViewDrawerOpen(true)
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Visit Management</strong>
              <CButton color="primary" onClick={() => setIsDrawerOpen(true)}>
                Create Task
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3 mb-3 align-items-end">
                <CCol md={3}>
                  <CFormLabel className="small text-muted mb-1">Period</CFormLabel>
                  <CFormSelect value={period} onChange={(e) => setPeriod(e.target.value)}>
                    {PERIOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="small text-muted mb-1">From</CFormLabel>
                  <CFormInput
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="small text-muted mb-1">To</CFormLabel>
                  <CFormInput
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="small text-muted mb-1">Status</CFormLabel>
                  <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value || 'all'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CCard>
                    <CCardBody className="py-2">
                      <div className="small text-muted">Total Visits</div>
                      <div className="fs-5 fw-semibold">{pagination.totalItems || 0}</div>
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>

              {loadingInit || loadingRows ? (
                <div className="text-center py-5">
                  <Loader message="Loading visits..." />
                </div>
              ) : (
                <>
                  <CTable hover bordered responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Branch</CTableHeaderCell>
                        <CTableHeaderCell>Zone</CTableHeaderCell>
                        <CTableHeaderCell>Employee</CTableHeaderCell>
                        <CTableHeaderCell>Industry</CTableHeaderCell>
                        <CTableHeaderCell>Instructions</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                        <CTableHeaderCell>Action</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {rows.length > 0 ? (
                        rows.map((item, index) => (
                          <CTableRow key={item._id || index}>
                            <CTableDataCell>{(page - 1) * 10 + index + 1}</CTableDataCell>
                            <CTableDataCell>{item.branchName || '-'}</CTableDataCell>
                            <CTableDataCell>{item.zoneName || '-'}</CTableDataCell>
                            <CTableDataCell>{item.employeeName || '-'}</CTableDataCell>
                            <CTableDataCell>{item.industries?.[0]?.name || '-'}</CTableDataCell>
                            <CTableDataCell>{item.instructions || '-'}</CTableDataCell>
                            <CTableDataCell className="text-capitalize">{item.status || 'active'}</CTableDataCell>
                            <CTableDataCell>{formatDateTime(item.createdAt)}</CTableDataCell>
                            <CTableDataCell>
                              <CButton
                                color="light"
                                size="sm"
                                className="d-inline-flex align-items-center justify-content-center"
                                onClick={() => onViewVisit(item)}
                                title="View visit"
                              >
                                <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
                                  👁
                                </span>
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      ) : (
                        <CTableRow>
                          <CTableDataCell colSpan={9} className="text-center">
                            No visits found.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>

                  {pagination.totalPages > 1 && (
                    <CPagination className="mt-3 justify-content-center">
                      <CPaginationItem disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                        Previous
                      </CPaginationItem>
                      <CPaginationItem active>
                        {page} / {pagination.totalPages}
                      </CPaginationItem>
                      <CPaginationItem
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
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

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isDrawerOpen ? 0 : -drawerWidth,
          width: drawerWidth,
          height: '100vh',
          background: '#fff',
          borderLeft: '1px solid #dee2e6',
          boxShadow: '0 0 16px rgba(0,0,0,0.08)',
          zIndex: 2999,
          transition: 'right 0.2s ease',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Create Task</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26 }}
            onClick={() => setIsDrawerOpen(false)}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Branch</CFormLabel>
              <CFormSelect
                value={form.branchId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    branchId: e.target.value,
                    zoneId: '',
                    employeeId: '',
                    industryId: '',
                  }))
                }
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name || branch.id}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={12}>
              <CFormLabel>Zone</CFormLabel>
              <CFormSelect
                value={form.zoneId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    zoneId: e.target.value,
                    employeeId: '',
                  }))
                }
              >
                <option value="">Select zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name || zone.id}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={12}>
              <CFormLabel>Employee</CFormLabel>
              <CFormSelect
                value={form.employeeId}
                onChange={(e) => setForm((prev) => ({ ...prev, employeeId: e.target.value }))}
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name || employee.id}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={12}>
              <CFormLabel>Search industry</CFormLabel>
              <CFormInput
                placeholder="Type to search industries"
                value={industrySearchText}
                onChange={(e) => setIndustrySearchText(e.target.value)}
              />
            </CCol>

            <CCol md={12}>
              <CFormLabel>Industry</CFormLabel>
              <CFormSelect
                value={form.industryId}
                onChange={(e) => setForm((prev) => ({ ...prev, industryId: e.target.value }))}
              >
                <option value="">Select industry</option>
                {visibleIndustries.map((industry) => (
                  <option key={industry.id} value={industry.id}>
                    {industry.name || industry.id}
                  </option>
                ))}
              </CFormSelect>
            </CCol>

            <CCol md={12}>
              <CFormLabel>Instructions</CFormLabel>
              <CFormTextarea
                rows={4}
                placeholder="Add instructions"
                value={form.instructions}
                onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
              />
            </CCol>
          </CRow>
        </div>

        <div className="d-flex justify-content-end gap-2 pt-3">
          <CButton color="secondary" onClick={() => setIsDrawerOpen(false)}>
            Cancel
          </CButton>
          <CButton color="primary" disabled={submitting} onClick={onSaveVisit}>
            {submitting ? 'Saving...' : 'Save'}
          </CButton>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isViewDrawerOpen ? 0 : -drawerWidth,
          width: drawerWidth,
          height: '100vh',
          background: '#fff',
          borderLeft: '1px solid #dee2e6',
          boxShadow: '0 0 16px rgba(0,0,0,0.08)',
          zIndex: 2999,
          transition: 'right 0.2s ease',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Visit Details</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26 }}
            onClick={() => setIsViewDrawerOpen(false)}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">Branch</CFormLabel>
              <div>{selectedVisit?.branchName || '-'}</div>
            </CCol>
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">Zone</CFormLabel>
              <div>{selectedVisit?.zoneName || '-'}</div>
            </CCol>
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">Employee</CFormLabel>
              <div>{selectedVisit?.employeeName || '-'}</div>
            </CCol>
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">Industry</CFormLabel>
              <div>{selectedVisit?.industries?.[0]?.name || '-'}</div>
            </CCol>
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">Status</CFormLabel>
              <div>
                <span
                  className={`badge ${selectedVisit?.status === 'completed' ? 'bg-success' : 'bg-primary'}`}
                >
                  {selectedVisit?.status === 'completed' ? 'Completed' : 'Active'}
                </span>
              </div>
            </CCol>
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">Instructions</CFormLabel>
              <div>{selectedVisit?.instructions || '-'}</div>
            </CCol>
            {selectedVisit?.status === 'completed' ? (
              <CCol md={12}>
                <CFormLabel className="text-muted small mb-1">Remark</CFormLabel>
                <div>{selectedVisit?.remark || '-'}</div>
              </CCol>
            ) : null}
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">Date</CFormLabel>
              <div>{formatDateTime(selectedVisit?.createdAt)}</div>
            </CCol>
          </CRow>
        </div>
      </div>
    </>
  )
}

export default VisitManagementSidebar
