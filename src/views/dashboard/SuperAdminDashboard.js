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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPeople, cilBuilding, cilBriefcase, cilChartLine } from '@coreui/icons'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

const SuperAdminDashboard = () => {
  const { companies, branches, branchUsers } = useData()
  const { user } = useAuth()

  const stats = {
    totalCompanies: companies.length,
    totalBranches: branches.length,
    totalUsers: branchUsers.length,
    activeUsers: branchUsers.length, // In real app, filter by status
  }

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2>Welcome, {user?.name}</h2>
          <p className="text-body-secondary">Super Admin Dashboard - MigtiCRM</p>
        </CCol>
      </CRow>

      <CRow>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="primary"
            value={stats.totalCompanies.toString()}
            title="Total Companies"
            chart={
              <CIcon icon={cilBuilding} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="info"
            value={stats.totalBranches.toString()}
            title="Total Branches"
            chart={
              <CIcon icon={cilBriefcase} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="warning"
            value={stats.totalUsers.toString()}
            title="Total Users"
            chart={
              <CIcon icon={cilPeople} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsA
            className="mb-4"
            color="success"
            value={stats.activeUsers.toString()}
            title="Active Users"
            chart={
              <CIcon icon={cilChartLine} height={52} className="my-4 text-white opacity-25" />
            }
          />
        </CCol>
      </CRow>

      <CRow>
        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Recent Companies</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Location</CTableHeaderCell>
                    <CTableHeaderCell>Branches</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {companies.slice(0, 5).map((company) => (
                    <CTableRow key={company.id}>
                      <CTableDataCell>{company.name}</CTableDataCell>
                      <CTableDataCell>{company.location}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="info">
                          {branches.filter((b) => b.companyId === company.id).length}
                        </CBadge>
                      </CTableDataCell>
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
              <strong>Recent Branches</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Company</CTableHeaderCell>
                    <CTableHeaderCell>Users</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {branches.slice(0, 5).map((branch) => {
                    const company = companies.find((c) => c.id === branch.companyId)
                    return (
                      <CTableRow key={branch.id}>
                        <CTableDataCell>{branch.name}</CTableDataCell>
                        <CTableDataCell>{company?.name || 'N/A'}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="success">
                            {branchUsers.filter((u) => u.branchId === branch.id).length}
                          </CBadge>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
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
              <strong>System Overview</strong>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol md={4}>
                  <div className="border-start border-start-4 border-start-primary py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">Platform</div>
                    <div className="fs-5 fw-semibold">MigtiCRM v1.0</div>
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="border-start border-start-4 border-start-info py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">Organization</div>
                    <div className="fs-5 fw-semibold">Migti Industrial Pvt Ltd</div>
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">Status</div>
                    <div className="fs-5 fw-semibold text-success">Active</div>
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

export default SuperAdminDashboard
