import React from 'react'
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
  CBadge,
  CProgress,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilDollar,
  cilWallet,
  cilChartLine,
  cilCreditCard,
} from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'

const FinanceDashboard = () => {
  const { user } = useAuth()

  const stats = {
    totalRevenue: 4500000,
    pendingPayments: 850000,
    receivables: 1200000,
    expenses: 2800000,
  }

  const recentTransactions = [
    { id: 'TXN001', type: 'Receipt', party: 'ABC Corp', amount: 125000, status: 'Completed', date: '2024-01-15' },
    { id: 'TXN002', type: 'Payment', party: 'Steel Suppliers', amount: 78000, status: 'Pending', date: '2024-01-14' },
    { id: 'TXN003', type: 'Receipt', party: 'XYZ Ltd', amount: 92000, status: 'Completed', date: '2024-01-13' },
    { id: 'TXN004', type: 'Payment', party: 'Raw Materials Inc', amount: 45000, status: 'Processing', date: '2024-01-12' },
    { id: 'TXN005', type: 'Receipt', party: 'PQR Industries', amount: 156000, status: 'Completed', date: '2024-01-11' },
  ]

  const pendingInvoices = [
    { id: 'INV001', customer: 'ABC Corp', amount: 250000, dueDate: '2024-01-20', overdue: false },
    { id: 'INV002', customer: 'LMN Enterprises', amount: 180000, dueDate: '2024-01-10', overdue: true },
    { id: 'INV003', customer: 'RST Solutions', amount: 95000, dueDate: '2024-01-25', overdue: false },
    { id: 'INV004', customer: 'DEF Industries', amount: 320000, dueDate: '2024-01-05', overdue: true },
  ]

  const getStatusColor = (status) => {
    const colors = {
      Completed: 'success',
      Pending: 'warning',
      Processing: 'info',
      Failed: 'danger',
    }
    return colors[status] || 'secondary'
  }

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2>Welcome, {user?.name}</h2>
          <p className="text-body-secondary">Finance Dashboard - Financial Overview</p>
        </CCol>
      </CRow>

      <CRow>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="success"
            value={`₹${(stats.totalRevenue / 100000).toFixed(1)}L`}
            title="Total Revenue"
            chart={
              <CIcon icon={cilDollar} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="warning"
            value={`₹${(stats.pendingPayments / 100000).toFixed(1)}L`}
            title="Pending Payments"
            chart={
              <CIcon icon={cilWallet} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="info"
            value={`₹${(stats.receivables / 100000).toFixed(1)}L`}
            title="Receivables"
            chart={
              <CIcon icon={cilCreditCard} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="danger"
            value={`₹${(stats.expenses / 100000).toFixed(1)}L`}
            title="Expenses"
            chart={
              <CIcon icon={cilChartLine} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
      </CRow>

      <CRow>
        <CCol lg={7}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Recent Transactions</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>ID</CTableHeaderCell>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Party</CTableHeaderCell>
                    <CTableHeaderCell>Amount</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {recentTransactions.map((txn) => (
                    <CTableRow key={txn.id}>
                      <CTableDataCell>{txn.id}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={txn.type === 'Receipt' ? 'success' : 'primary'}>
                          {txn.type}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{txn.party}</CTableDataCell>
                      <CTableDataCell>₹{txn.amount.toLocaleString()}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getStatusColor(txn.status)}>{txn.status}</CBadge>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={5}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Pending Invoices</strong>
            </CCardHeader>
            <CCardBody>
              {pendingInvoices.map((invoice) => (
                <div key={invoice.id} className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                  <div>
                    <div className="fw-semibold">{invoice.customer}</div>
                    <div className="small text-body-secondary">
                      {invoice.id} • Due: {invoice.dueDate}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="fw-semibold">₹{invoice.amount.toLocaleString()}</div>
                    {invoice.overdue && (
                      <CBadge color="danger" size="sm">Overdue</CBadge>
                    )}
                  </div>
                </div>
              ))}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Financial Summary</strong>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol md={4}>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Cash Flow</span>
                      <span className="text-success">+₹17L</span>
                    </div>
                    <CProgress value={68} color="success" />
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Collection Rate</span>
                      <span>78%</span>
                    </div>
                    <CProgress value={78} color="info" />
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Budget Utilization</span>
                      <span>62%</span>
                    </div>
                    <CProgress value={62} color="warning" />
                  </div>
                </CCol>
              </CRow>
              <CRow className="mt-3">
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-success py-1 px-3">
                    <div className="text-body-secondary small">Net Profit</div>
                    <div className="fs-5 fw-semibold">₹17L</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-info py-1 px-3">
                    <div className="text-body-secondary small">Gross Margin</div>
                    <div className="fs-5 fw-semibold">38%</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-warning py-1 px-3">
                    <div className="text-body-secondary small">Overdue Amount</div>
                    <div className="fs-5 fw-semibold">₹5L</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-primary py-1 px-3">
                    <div className="text-body-secondary small">Bank Balance</div>
                    <div className="fs-5 fw-semibold">₹22L</div>
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default FinanceDashboard
