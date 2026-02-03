import React from 'react'
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
  CWidgetStatsA,
  CWidgetStatsB,
  CBadge,
  CProgress,
} from '@coreui/react'
import { CChartLine, CChartBar, CChartDoughnut } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilArrowTop, cilArrowBottom, cilDollar, cilCart, cilFile, cilPeople } from '@coreui/icons'
import { useData } from '../../context/DataContext'

const FinanceDashboard = () => {
  const { quotations, purchaseOrders, queries } = useData()

  // Calculate statistics
  const totalQuotations = quotations?.length || 0
  const acceptedQuotations = quotations?.filter((q) => q.status === 'accepted').length || 0
  const totalQuotationValue = quotations?.reduce((sum, q) => sum + (q.totalAmount || 0), 0) || 0
  const acceptedQuotationValue = quotations?.filter((q) => q.status === 'accepted').reduce((sum, q) => sum + (q.totalAmount || 0), 0) || 0

  const totalPurchaseOrders = purchaseOrders?.length || 0
  const deliveredOrders = purchaseOrders?.filter((o) => o.status === 'delivered').length || 0
  const totalPurchaseValue = purchaseOrders?.reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0
  const pendingPurchaseValue = purchaseOrders?.filter((o) => o.status === 'pending').reduce((sum, o) => sum + (o.totalAmount || 0), 0) || 0

  const totalQueries = queries?.length || 0
  const convertedQueries = queries?.filter((q) => q.status === 'quoted' || q.status === 'closed').length || 0

  // Calculate conversion rate
  const conversionRate = totalQueries > 0 ? ((convertedQueries / totalQueries) * 100).toFixed(1) : 0

  // Sample data for charts
  const monthlyRevenue = [45000, 52000, 48000, 61000, 55000, 67000]
  const monthlyExpenses = [32000, 38000, 35000, 42000, 40000, 48000]
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h4>Finance Dashboard</h4>
          <p className="text-muted">Overview of financial metrics and performance</p>
        </CCol>
      </CRow>

      {/* Stats Cards */}
      <CRow className="mb-4">
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="primary"
            value={
              <>
                ₹{totalQuotationValue.toLocaleString()}{' '}
                <span className="fs-6 fw-normal">
                  ({acceptedQuotations} accepted)
                </span>
              </>
            }
            title="Total Quotation Value"
            action={
              <CIcon icon={cilFile} height={52} className="my-4 text-white opacity-25" />
            }
            chart={
              <CChartLine
                className="mt-3 mx-3"
                style={{ height: '70px' }}
                data={{
                  labels: months,
                  datasets: [
                    {
                      label: 'Quotations',
                      backgroundColor: 'transparent',
                      borderColor: 'rgba(255,255,255,.55)',
                      pointBackgroundColor: '#5856d6',
                      data: [35, 45, 40, 55, 50, 65],
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  maintainAspectRatio: false,
                  scales: {
                    x: { display: false },
                    y: { display: false },
                  },
                  elements: {
                    line: { borderWidth: 2, tension: 0.4 },
                    point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
                  },
                }}
              />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="info"
            value={
              <>
                ₹{totalPurchaseValue.toLocaleString()}{' '}
                <span className="fs-6 fw-normal">
                  ({deliveredOrders} delivered)
                </span>
              </>
            }
            title="Total Purchase Orders"
            action={
              <CIcon icon={cilCart} height={52} className="my-4 text-white opacity-25" />
            }
            chart={
              <CChartLine
                className="mt-3 mx-3"
                style={{ height: '70px' }}
                data={{
                  labels: months,
                  datasets: [
                    {
                      label: 'Purchase Orders',
                      backgroundColor: 'transparent',
                      borderColor: 'rgba(255,255,255,.55)',
                      pointBackgroundColor: '#39f',
                      data: [20, 30, 25, 35, 32, 40],
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  maintainAspectRatio: false,
                  scales: {
                    x: { display: false },
                    y: { display: false },
                  },
                  elements: {
                    line: { borderWidth: 2, tension: 0.4 },
                    point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
                  },
                }}
              />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="warning"
            value={
              <>
                ₹{pendingPurchaseValue.toLocaleString()}{' '}
                <span className="fs-6 fw-normal">
                  pending
                </span>
              </>
            }
            title="Pending Payments"
            action={
              <CIcon icon={cilDollar} height={52} className="my-4 text-white opacity-25" />
            }
            chart={
              <CChartLine
                className="mt-3"
                style={{ height: '70px' }}
                data={{
                  labels: months,
                  datasets: [
                    {
                      label: 'Pending',
                      backgroundColor: 'rgba(255,255,255,.2)',
                      borderColor: 'rgba(255,255,255,.55)',
                      data: [15, 18, 22, 18, 20, 25],
                      fill: true,
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  maintainAspectRatio: false,
                  scales: {
                    x: { display: false },
                    y: { display: false },
                  },
                  elements: {
                    line: { borderWidth: 2, tension: 0.4 },
                    point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
                  },
                }}
              />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="success"
            value={
              <>
                {conversionRate}%{' '}
                <span className="fs-6 fw-normal">
                  ({convertedQueries}/{totalQueries} queries)
                </span>
              </>
            }
            title="Conversion Rate"
            action={
              <CIcon icon={cilPeople} height={52} className="my-4 text-white opacity-25" />
            }
            chart={
              <CChartBar
                className="mt-3 mx-3"
                style={{ height: '70px' }}
                data={{
                  labels: months,
                  datasets: [
                    {
                      label: 'Conversion',
                      backgroundColor: 'rgba(255,255,255,.2)',
                      borderColor: 'rgba(255,255,255,.55)',
                      data: [45, 52, 48, 55, 60, 65],
                      barPercentage: 0.6,
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { display: false },
                    y: { display: false },
                  },
                }}
              />
            }
          />
        </CCol>
      </CRow>

      {/* Revenue vs Expenses Chart */}
      <CRow className="mb-4">
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Revenue vs Expenses</strong>
            </CCardHeader>
            <CCardBody>
              <CChartBar
                data={{
                  labels: months,
                  datasets: [
                    {
                      label: 'Revenue',
                      backgroundColor: '#2eb85c',
                      data: monthlyRevenue,
                    },
                    {
                      label: 'Expenses',
                      backgroundColor: '#e55353',
                      data: monthlyExpenses,
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => '₹' + value.toLocaleString(),
                      },
                    },
                  },
                }}
              />
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Order Status Distribution</strong>
            </CCardHeader>
            <CCardBody>
              <CChartDoughnut
                data={{
                  labels: ['Pending', 'Approved', 'Shipped', 'Delivered', 'Cancelled'],
                  datasets: [
                    {
                      data: [
                        purchaseOrders?.filter((o) => o.status === 'pending').length || 1,
                        purchaseOrders?.filter((o) => o.status === 'approved').length || 1,
                        purchaseOrders?.filter((o) => o.status === 'shipped').length || 1,
                        purchaseOrders?.filter((o) => o.status === 'delivered').length || 1,
                        purchaseOrders?.filter((o) => o.status === 'cancelled').length || 0,
                      ],
                      backgroundColor: ['#f9b115', '#39f', '#636f83', '#2eb85c', '#e55353'],
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom',
                    },
                  },
                }}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Additional Stats */}
      <CRow className="mb-4">
        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Quotation Performance</strong>
            </CCardHeader>
            <CCardBody>
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  <span>Accepted</span>
                  <span>{totalQuotations > 0 ? ((acceptedQuotations / totalQuotations) * 100).toFixed(0) : 0}%</span>
                </div>
                <CProgress value={totalQuotations > 0 ? (acceptedQuotations / totalQuotations) * 100 : 0} color="success" />
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  <span>Pending</span>
                  <span>{totalQuotations > 0 ? ((quotations?.filter((q) => q.status === 'sent').length / totalQuotations) * 100).toFixed(0) : 0}%</span>
                </div>
                <CProgress value={totalQuotations > 0 ? (quotations?.filter((q) => q.status === 'sent').length / totalQuotations) * 100 : 0} color="info" />
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  <span>Rejected</span>
                  <span>{totalQuotations > 0 ? ((quotations?.filter((q) => q.status === 'rejected').length / totalQuotations) * 100).toFixed(0) : 0}%</span>
                </div>
                <CProgress value={totalQuotations > 0 ? (quotations?.filter((q) => q.status === 'rejected').length / totalQuotations) * 100 : 0} color="danger" />
              </div>
              <div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Draft</span>
                  <span>{totalQuotations > 0 ? ((quotations?.filter((q) => q.status === 'draft').length / totalQuotations) * 100).toFixed(0) : 0}%</span>
                </div>
                <CProgress value={totalQuotations > 0 ? (quotations?.filter((q) => q.status === 'draft').length / totalQuotations) * 100 : 0} color="secondary" />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Recent Transactions</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Reference</CTableHeaderCell>
                    <CTableHeaderCell>Amount</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {quotations?.slice(0, 3).map((q) => (
                    <CTableRow key={`qt-${q.id}`}>
                      <CTableDataCell>
                        <CBadge color="primary">Quotation</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>QT-{String(q.id).padStart(4, '0')}</CTableDataCell>
                      <CTableDataCell>₹{q.totalAmount?.toLocaleString() || 0}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={q.status === 'accepted' ? 'success' : q.status === 'rejected' ? 'danger' : 'info'}>
                          {q.status}
                        </CBadge>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {purchaseOrders?.slice(0, 2).map((o) => (
                    <CTableRow key={`po-${o.id}`}>
                      <CTableDataCell>
                        <CBadge color="warning">PO</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>PO-{String(o.id).padStart(4, '0')}</CTableDataCell>
                      <CTableDataCell>₹{o.totalAmount?.toLocaleString() || 0}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'info'}>
                          {o.status}
                        </CBadge>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {(!quotations?.length && !purchaseOrders?.length) && (
                    <CTableRow>
                      <CTableDataCell colSpan={4} className="text-center">
                        No recent transactions
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default FinanceDashboard
