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
  cilPeople,
  cilCart,
  cilDollar,
  cilTruck,
  cilChartLine,
} from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'

const HODDashboard = () => {
  const { user } = useAuth()

  // Dummy data for demonstration
  const stats = {
    teamMembers: 12,
    pendingApprovals: 8,
    monthlyTarget: 85,
    completedTasks: 156,
  }

  const teamMembers = [
    { id: 1, name: 'John Smith', role: 'Sales', status: 'Active', tasks: 12 },
    { id: 2, name: 'Jane Doe', role: 'Purchase', status: 'Active', tasks: 8 },
    { id: 3, name: 'Mike Wilson', role: 'Finance', status: 'Active', tasks: 15 },
    { id: 4, name: 'Sarah Brown', role: 'Delivery', status: 'On Leave', tasks: 5 },
  ]

  const pendingApprovals = [
    { id: 1, type: 'Purchase Order', amount: 25000, requestedBy: 'Jane Doe', date: '2024-01-15' },
    { id: 2, type: 'Sales Discount', amount: 5000, requestedBy: 'John Smith', date: '2024-01-14' },
    { id: 3, type: 'Expense Claim', amount: 3500, requestedBy: 'Mike Wilson', date: '2024-01-13' },
  ]

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
          <CWidgetStatsA
            className="mb-4"
            color="primary"
            value={stats.teamMembers.toString()}
            title="Team Members"
            chart={
              <CIcon icon={cilPeople} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="warning"
            value={stats.pendingApprovals.toString()}
            title="Pending Approvals"
            chart={
              <CIcon icon={cilCart} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="success"
            value={`${stats.monthlyTarget}%`}
            title="Monthly Target"
            chart={
              <CIcon icon={cilChartLine} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="info"
            value={stats.completedTasks.toString()}
            title="Completed Tasks"
            chart={
              <CIcon icon={cilTruck} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
      </CRow>

      <CRow>
        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Team Members</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Role</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Tasks</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {teamMembers.map((member) => (
                    <CTableRow key={member.id}>
                      <CTableDataCell>{member.name}</CTableDataCell>
                      <CTableDataCell>{member.role}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={member.status === 'Active' ? 'success' : 'warning'}>
                          {member.status}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{member.tasks}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Pending Approvals</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Amount</CTableHeaderCell>
                    <CTableHeaderCell>Requested By</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {pendingApprovals.map((approval) => (
                    <CTableRow key={approval.id}>
                      <CTableDataCell>{approval.type}</CTableDataCell>
                      <CTableDataCell>₹{approval.amount.toLocaleString()}</CTableDataCell>
                      <CTableDataCell>{approval.requestedBy}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Department Performance</strong>
            </CCardHeader>
            <CCardBody>
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  <span>Sales Target</span>
                  <span>78%</span>
                </div>
                <CProgress value={78} color="success" />
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  <span>Purchase Efficiency</span>
                  <span>92%</span>
                </div>
                <CProgress value={92} color="info" />
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  <span>Finance Processing</span>
                  <span>85%</span>
                </div>
                <CProgress value={85} color="warning" />
              </div>
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  <span>Delivery Completion</span>
                  <span>95%</span>
                </div>
                <CProgress value={95} color="primary" />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default HODDashboard
