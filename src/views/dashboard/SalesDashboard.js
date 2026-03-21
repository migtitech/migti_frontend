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
  CBadge,
  CProgress,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCart,
  cilDollar,
  cilPeople,
} from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import queryService from '../../services/queryService'

const SalesDashboard = () => {
  const { user } = useAuth()
  const [todayStats, setTodayStats] = useState({
    todayQueryCount: 0,
    todayQuotationCount: 0,
    todayQuotedAmount: 0,
  })

  useEffect(() => {
    const fetchTodayStats = async () => {
      try {
        const response = await queryService.getTodayStats()
        setTodayStats({
          todayQueryCount: Number(response?.data?.todayQueryCount || 0),
          todayQuotationCount: Number(response?.data?.todayQuotationCount || 0),
          todayQuotedAmount: Number(response?.data?.todayQuotedAmount || 0),
        })
      } catch (error) {
        setTodayStats({
          todayQueryCount: 0,
          todayQuotationCount: 0,
          todayQuotedAmount: 0,
        })
      }
    }

    fetchTodayStats()
  }, [])

  const recentOrders = [
    { id: 'ORD001', customer: 'ABC Corp', amount: 45000, status: 'Pending', date: '2024-01-15' },
    { id: 'ORD002', customer: 'XYZ Ltd', amount: 78000, status: 'Confirmed', date: '2024-01-14' },
    { id: 'ORD003', customer: 'PQR Industries', amount: 125000, status: 'Shipped', date: '2024-01-13' },
    { id: 'ORD004', customer: 'LMN Enterprises', amount: 56000, status: 'Delivered', date: '2024-01-12' },
    { id: 'ORD005', customer: 'RST Solutions', amount: 92000, status: 'Pending', date: '2024-01-11' },
  ]

  const topCustomers = [
    { name: 'ABC Corp', orders: 15, revenue: 450000 },
    { name: 'XYZ Ltd', orders: 12, revenue: 380000 },
    { name: 'PQR Industries', orders: 10, revenue: 320000 },
    { name: 'LMN Enterprises', orders: 8, revenue: 250000 },
  ]

  const getStatusColor = (status) => {
    const colors = {
      Pending: 'warning',
      Confirmed: 'info',
      Shipped: 'primary',
      Delivered: 'success',
      Cancelled: 'danger',
    }
    return colors[status] || 'secondary'
  }

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2>Welcome, {user?.name}</h2>
          <p className="text-body-secondary">Sales Dashboard - Track your sales performance</p>
        </CCol>
      </CRow>

      <CRow>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="success"
            value={todayStats.todayQueryCount.toString()}
            title="Queries Today"
            chart={
              <CIcon icon={cilDollar} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="warning"
            value={todayStats.todayQuotationCount.toString()}
            title="Quotations Today"
            chart={
              <CIcon icon={cilCart} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={6}>
          <CWidgetStatsA
            className="mb-4"
            color="info"
            value={`₹${todayStats.todayQuotedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            title="Quoted Amount Today"
            chart={
              <CIcon icon={cilPeople} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
      </CRow>

      <CRow>
        <CCol lg={8}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Recent Orders</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Order ID</CTableHeaderCell>
                    <CTableHeaderCell>Customer</CTableHeaderCell>
                    <CTableHeaderCell>Amount</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {recentOrders.map((order) => (
                    <CTableRow key={order.id}>
                      <CTableDataCell>{order.id}</CTableDataCell>
                      <CTableDataCell>{order.customer}</CTableDataCell>
                      <CTableDataCell>₹{order.amount.toLocaleString()}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getStatusColor(order.status)}>{order.status}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{order.date}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Top Customers</strong>
            </CCardHeader>
            <CCardBody>
              {topCustomers.map((customer, index) => (
                <div key={index} className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>{customer.name}</span>
                    <span className="text-body-secondary">{customer.orders} orders</span>
                  </div>
                  <div className="small text-body-secondary mb-1">
                    Revenue: ₹{customer.revenue.toLocaleString()}
                  </div>
                  <CProgress
                    value={(customer.revenue / topCustomers[0].revenue) * 100}
                    color="success"
                    className="mb-1"
                  />
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
              <strong>Sales Target Progress</strong>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">This Month</div>
                    <div className="fs-5 fw-semibold">₹12.5L / ₹18L</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-info py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">This Quarter</div>
                    <div className="fs-5 fw-semibold">₹38L / ₹50L</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">Conversion Rate</div>
                    <div className="fs-5 fw-semibold">24%</div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-primary py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">Avg Order Value</div>
                    <div className="fs-5 fw-semibold">₹52,000</div>
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

export default SalesDashboard
