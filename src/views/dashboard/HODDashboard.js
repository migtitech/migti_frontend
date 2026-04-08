import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CWidgetStatsA,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { useNavigate } from 'react-router-dom'
import {
  cilPeople,
  cilCart,
  cilChartLine,
  cilDollar,
} from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import quotationService from '../../services/quotationService'
import queryService from '../../services/queryService'
import targetAnalyticsService from '../../services/targetAnalyticsService'
import {
  formatIstDateKey,
  formatIstDisplayDate,
  buildLastNDaysIst,
} from '../../utils/istDate'

const HODDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hodCards, setHodCards] = useState({
    weeklyTarget: 0,
    weeklyBilling: 0,
    monthlyTarget: 0,
    monthlyBilling: 0,
    weeklyFrom: '',
    weeklyTo: '',
    monthlyFrom: '',
    monthlyTo: '',
  })

  const [pendingApprovals, setPendingApprovals] = useState([])
  const [pendingQueries, setPendingQueries] = useState([])
  const [weeklyLabels, setWeeklyLabels] = useState([])
  const [weeklyQueries, setWeeklyQueries] = useState([])
  const [weeklyQuotations, setWeeklyQuotations] = useState([])
  const [weeklyQuotedAmount, setWeeklyQuotedAmount] = useState([])
  const [pendingApprovalsPage, setPendingApprovalsPage] = useState(1)
  const [pendingQueriesPage, setPendingQueriesPage] = useState(1)

  const ROWS_PER_PAGE = 5

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [queryResponse, quotationResponse] = await Promise.all([
          queryService.getAll({ pageNumber: 1, pageSize: 100 }),
          quotationService.getAll({ pageNumber: 1, pageSize: 100 }),
        ])

        const queries = queryResponse?.data?.queries || []
        const quotations = quotationResponse?.data?.quotations || []

        const convertedQuotations = quotations
          .filter((q) => q?.status !== 'hod_approved')
          .map((q) => ({
            id: q._id || q.id,
            quotationCode: q.quotationCode || '-',
            convertedDate: q.createdAt ? formatIstDisplayDate(q.createdAt) : '-',
            industryName: q?.industry_id?.name || '-',
          }))

        setPendingApprovals(convertedQuotations)

        const nonConvertedQueries = queries
          .filter((q) => q?.status !== 'convertedToQuotation')
          .map((q) => {
            const fromCompany = String(q?.companyInfo?.name || '').trim()
            return {
              id: q._id || q.id,
              queryCode: q.queryCode || '-',
              createdDate: q.createdAt ? formatIstDisplayDate(q.createdAt) : '-',
              clientName: fromCompany || q?.industry_id?.name || '-',
            }
          })

        setPendingQueries(nonConvertedQueries)

        const { keys: dateKeys, labels: dateLabels } = buildLastNDaysIst(7)

        const queryCountMap = Object.fromEntries(dateKeys.map((k) => [k, 0]))
        const quotationCountMap = Object.fromEntries(dateKeys.map((k) => [k, 0]))
        const quotationAmountMap = Object.fromEntries(dateKeys.map((k) => [k, 0]))

        queries.forEach((q) => {
          if (!q?.createdAt) return
          const key = formatIstDateKey(q.createdAt)
          if (!key) return
          if (key in queryCountMap) queryCountMap[key] += 1
        })

        quotations.forEach((q) => {
          if (!q?.createdAt) return
          const key = formatIstDateKey(q.createdAt)
          if (!key) return
          const amt = Number(q?.totalAmount || 0)
          if (key in quotationCountMap) quotationCountMap[key] += 1
          if (key in quotationAmountMap) quotationAmountMap[key] += amt
        })

        setWeeklyLabels(dateLabels)
        setWeeklyQueries(dateKeys.map((k) => queryCountMap[k]))
        setWeeklyQuotations(dateKeys.map((k) => quotationCountMap[k]))
        setWeeklyQuotedAmount(dateKeys.map((k) => quotationAmountMap[k]))
      } catch (error) {
        setPendingApprovals([])
        setPendingQueries([])
        setWeeklyLabels([])
        setWeeklyQueries([])
        setWeeklyQuotations([])
        setWeeklyQuotedAmount([])
      }
    }

    fetchDashboardData()
  }, [])

  useEffect(() => {
    const loadCards = async () => {
      try {
        const response = await targetAnalyticsService.getHodDashboardCards()
        const data = response?.data ?? {}
        setHodCards({
          weeklyTarget: Number(data.weeklyTarget || 0),
          weeklyBilling: Number(data.weeklyBilling || 0),
          monthlyTarget: Number(data.monthlyTarget || 0),
          monthlyBilling: Number(data.monthlyBilling || 0),
          weeklyFrom: data.weeklyFrom || '',
          weeklyTo: data.weeklyTo || '',
          monthlyFrom: data.monthlyFrom || '',
          monthlyTo: data.monthlyTo || '',
        })
      } catch (_e) {
        setHodCards({
          weeklyTarget: 0,
          weeklyBilling: 0,
          monthlyTarget: 0,
          monthlyBilling: 0,
          weeklyFrom: '',
          weeklyTo: '',
          monthlyFrom: '',
          monthlyTo: '',
        })
      }
    }
    loadCards()
  }, [])

  const formatAmount = (value) =>
    `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const formatDdMmYy = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(-2)
    return `${dd}/${mm}/${yy}`
  }

  const rangeLabel = (fromIso, toIso) => {
    const a = formatDdMmYy(fromIso)
    const b = formatDdMmYy(toIso)
    if (!a && !b) return ''
    return `From ${a || '—'} to ${b || '—'}`
  }

  const pendingApprovalsTotalPages = Math.max(1, Math.ceil(pendingApprovals.length / ROWS_PER_PAGE))
  const pendingQueriesTotalPages = Math.max(1, Math.ceil(pendingQueries.length / ROWS_PER_PAGE))

  const paginatedPendingApprovals = pendingApprovals.slice(
    (pendingApprovalsPage - 1) * ROWS_PER_PAGE,
    pendingApprovalsPage * ROWS_PER_PAGE,
  )
  const paginatedPendingQueries = pendingQueries.slice(
    (pendingQueriesPage - 1) * ROWS_PER_PAGE,
    pendingQueriesPage * ROWS_PER_PAGE,
  )

  useEffect(() => {
    if (pendingApprovalsPage > pendingApprovalsTotalPages) setPendingApprovalsPage(1)
  }, [pendingApprovalsPage, pendingApprovalsTotalPages])

  useEffect(() => {
    if (pendingQueriesPage > pendingQueriesTotalPages) setPendingQueriesPage(1)
  }, [pendingQueriesPage, pendingQueriesTotalPages])

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2>Welcome, {user?.name}</h2>
          <p className="text-body-secondary">HOD Dashboard - Department Overview</p>
        </CCol>
      </CRow>

      <CRow>
        <CCol sm={6} lg={3}>
          <div className="mb-4">
            <CWidgetStatsA
              color="warning"
              value={formatAmount(hodCards.monthlyTarget)}
              title="Monthly Target"
              chart={<CIcon icon={cilChartLine} height={52} className="my-4 text-white opacity-25" />}
            />
            <div className="small text-body-secondary mt-1 px-1">
              {rangeLabel(hodCards.monthlyFrom, hodCards.monthlyTo)}
            </div>
          </div>
        </CCol>
        <CCol sm={6} lg={3}>
          <div className="mb-4">
            <CWidgetStatsA
              color="warning"
              value={formatAmount(hodCards.monthlyBilling)}
              title="Monthly Billing"
              chart={<CIcon icon={cilCart} height={52} className="my-4 text-white opacity-25" />}
            />
            <div className="small text-body-secondary mt-1 px-1">
              {rangeLabel(hodCards.monthlyFrom, hodCards.monthlyTo)}
            </div>
          </div>
        </CCol>
        <CCol sm={6} lg={3}>
          <div className="mb-4">
            <CWidgetStatsA
              color="success"
              value={formatAmount(hodCards.weeklyTarget)}
              title="Weekly Target"
              chart={<CIcon icon={cilDollar} height={52} className="my-4 text-white opacity-25" />}
            />
            <div className="small text-body-secondary mt-1 px-1">
              {rangeLabel(hodCards.weeklyFrom, hodCards.weeklyTo)}
            </div>
          </div>
        </CCol>
        <CCol sm={6} lg={3}>
          <div className="mb-4">
            <CWidgetStatsA
              color="success"
              value={formatAmount(hodCards.weeklyBilling)}
              title="Weekly Billing"
              chart={<CIcon icon={cilPeople} height={52} className="my-4 text-white opacity-25" />}
            />
            <div className="small text-body-secondary mt-1 px-1">
              {rangeLabel(hodCards.weeklyFrom, hodCards.weeklyTo)}
            </div>
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Weekly Queries (Last 7 Days)</strong>
            </CCardHeader>
            <CCardBody>
              <CChartBar
                data={{
                  labels: weeklyLabels,
                  datasets: [
                    {
                      label: 'Queries',
                      backgroundColor: '#0d6efd',
                      borderColor: '#0d6efd',
                      borderWidth: 1,
                      data: weeklyQueries,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => ` Queries: ${context.parsed.y || 0}`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
                style={{ height: '280px' }}
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Weekly Quotations (Last 7 Days)</strong>
            </CCardHeader>
            <CCardBody>
              <CChartBar
                data={{
                  labels: weeklyLabels,
                  datasets: [
                    {
                      label: 'Quotations',
                      backgroundColor: '#f59f00',
                      borderColor: '#f59f00',
                      borderWidth: 1,
                      data: weeklyQuotations,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => ` Quotations: ${context.parsed.y || 0}`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
                style={{ height: '280px' }}
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Weekly Quoted Amount (Last 7 Days)</strong>
            </CCardHeader>
            <CCardBody>
              <CChartBar
                data={{
                  labels: weeklyLabels,
                  datasets: [
                    {
                      label: 'Quoted Amount',
                      backgroundColor: '#198754',
                      borderColor: '#198754',
                      borderWidth: 1,
                      data: weeklyQuotedAmount,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => ` Amount: Rs ${(context.parsed.y || 0).toLocaleString('en-IN')}`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
                style={{ height: '280px' }}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Pending Approvals</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Quotation Code</CTableHeaderCell>
                    <CTableHeaderCell>Converted Date</CTableHeaderCell>
                    <CTableHeaderCell>Client name</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {paginatedPendingApprovals.map((approval) => (
                    <CTableRow key={approval.id}>
                      <CTableDataCell>
                        <span
                          role="button"
                          tabIndex={0}
                          style={{ cursor: 'pointer', color: '#0d6efd' }}
                          onClick={() => navigate(`/quotations/${approval.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              navigate(`/quotations/${approval.id}`)
                            }
                          }}
                        >
                          {approval.quotationCode}
                        </span>
                      </CTableDataCell>
                      <CTableDataCell>{approval.convertedDate}</CTableDataCell>
                      <CTableDataCell>{approval.industryName}</CTableDataCell>
                    </CTableRow>
                  ))}
                  {paginatedPendingApprovals.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={3} className="text-center text-body-secondary">
                        No pending approvals found
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
              {pendingApprovals.length > ROWS_PER_PAGE && (
                <div className="d-flex justify-content-end mt-3">
                  <CPagination aria-label="Pending approvals pagination">
                    <CPaginationItem
                      disabled={pendingApprovalsPage === 1}
                      onClick={() => setPendingApprovalsPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </CPaginationItem>
                    {Array.from({ length: pendingApprovalsTotalPages }, (_, index) => (
                      <CPaginationItem
                        key={`pending-approval-page-${index + 1}`}
                        active={pendingApprovalsPage === index + 1}
                        onClick={() => setPendingApprovalsPage(index + 1)}
                      >
                        {index + 1}
                      </CPaginationItem>
                    ))}
                    <CPaginationItem
                      disabled={pendingApprovalsPage === pendingApprovalsTotalPages}
                      onClick={() =>
                        setPendingApprovalsPage((p) => Math.min(pendingApprovalsTotalPages, p + 1))
                      }
                    >
                      Next
                    </CPaginationItem>
                  </CPagination>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Pending Queries</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Query Code</CTableHeaderCell>
                    <CTableHeaderCell>Created Date</CTableHeaderCell>
                    <CTableHeaderCell>Client name</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {paginatedPendingQueries.map((query) => (
                    <CTableRow key={query.id}>
                      <CTableDataCell>
                        <span
                          role="button"
                          tabIndex={0}
                          style={{ cursor: 'pointer', color: '#0d6efd' }}
                          onClick={() => navigate(`/queries/${query.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              navigate(`/queries/${query.id}`)
                            }
                          }}
                        >
                          {query.queryCode}
                        </span>
                      </CTableDataCell>
                      <CTableDataCell>{query.createdDate}</CTableDataCell>
                      <CTableDataCell>{query.clientName}</CTableDataCell>
                    </CTableRow>
                  ))}
                  {paginatedPendingQueries.length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={3} className="text-center text-body-secondary">
                        No pending queries found
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
              {pendingQueries.length > ROWS_PER_PAGE && (
                <div className="d-flex justify-content-end mt-3">
                  <CPagination aria-label="Pending queries pagination">
                    <CPaginationItem
                      disabled={pendingQueriesPage === 1}
                      onClick={() => setPendingQueriesPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </CPaginationItem>
                    {Array.from({ length: pendingQueriesTotalPages }, (_, index) => (
                      <CPaginationItem
                        key={`pending-query-page-${index + 1}`}
                        active={pendingQueriesPage === index + 1}
                        onClick={() => setPendingQueriesPage(index + 1)}
                      >
                        {index + 1}
                      </CPaginationItem>
                    ))}
                    <CPaginationItem
                      disabled={pendingQueriesPage === pendingQueriesTotalPages}
                      onClick={() =>
                        setPendingQueriesPage((p) => Math.min(pendingQueriesTotalPages, p + 1))
                      }
                    >
                      Next
                    </CPaginationItem>
                  </CPagination>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default HODDashboard
