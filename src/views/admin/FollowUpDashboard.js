import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CButton,
  CBadge,
  CWidgetStatsF,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalendar,
  cilCheck,
  cilClock,
  cilWarning,
  cilPlus,
  cilZoom,
  cilPencil,
} from '@coreui/icons'
import { useData } from '../../context/DataContext'
import { toastSuccess, toastError } from '../../utils/toast'
import queryService from '../../services/queryService'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
// import { Loader, ConfirmDialog } from '../../components'

const FollowUpDashboard = () => {
  const navigate = useNavigate()
  const { followUps, addFollowUp, updateFollowUp, quotations, purchaseOrders } = useData()
  const [activeTab, setActiveTab] = useState(1)
  const [editingFollowUp, setEditingFollowUp] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [queries, setQueries] = useState([])
  const [pagination, setPagination] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  // const [pendingFollowUps, setPendingFollowUps] = useState([])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Filter follow-ups
 
  
  const overdueFollowUps = queries?.filter((f) => {
    const dueDate = new Date(f.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    return f.status === 'pending' && dueDate < today
  }) || []
  const todayFollowUps = queries?.filter((f) => {
    const dueDate = new Date(f.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    return f.status === 'pending' && dueDate.getTime() === today.getTime()
  }) || []
  const completedFollowUps = queries?.filter((f) => f.status === 'completed') || []
 
const pendingFollowUps = queries?.filter((f) => f.status === 'pending') || []

  const fetchQueries = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await withMinimumDelay(() =>
        queryService.getAll({ queries,
          pageNumber,
          pageSize, }),
      )
      const data = res?.data || res
      const result = data?.data ?? data
      setQueries(result?.queries || [])
      setPagination(result?.pagination || null)
      console.log('Result:', result)
      console.log('Queries:', result?.queries || [])
      const product = result?.queries?.[0]?.products?.[0]?.productName || null
      const pendingFollowUps =setPendingFollowUps( queries?.filter((f) => f.status === 'pending') || [])
      console.log('Pending Follow-ups:', pendingFollowUps)
      console.log('Product Name:', product)
    } catch (err) {
      toastError(err?.message || 'Failed to load queries')
      setError(err?.message || 'Failed to load queries')
      // setQueries([])
      setPagination(null)
    } finally {
      setLoading(false)
    }

  }

  const pag = pagination
  const totalPages = pag?.totalPages ?? 1
  const currentPage = pag?.currentPage ?? 1

  useEffect(() => {
    fetchQueries()
    console.log('Follow-ups:', queries)
  }, [])

  const markAsComplete = (id) => {
    updateFollowUp(id, { status: 'completed', completedAt: new Date().toISOString() })
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <CBadge color="danger">High</CBadge>
      case 'normal':
        return <CBadge color="secondary">Normal</CBadge>
      case 'low':
        return <CBadge color="info">Low</CBadge>
      default:
        return <CBadge color="secondary">{priority}</CBadge>
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <CBadge color="warning">Pending</CBadge>
      case 'completed':
        return <CBadge color="success">Completed</CBadge>
      default:
        return <CBadge color="secondary">{status}</CBadge>
    }
  }

  // const getReferenceOptions = () => {
  //   switch (formData.type) {
  //     case 'query':
  //       return queries?.map((q) => ({ id: q.id, label: `Query: ${q.subject}` })) || []
  //     case 'quotation':
  //       return quotations?.map((q) => ({ id: q.id, label: `QT-${String(q.id).padStart(4, '0')}: ${q.customerName}` })) || []
  //     case 'purchase_order':
  //       return purchaseOrders?.map((o) => ({ id: o.id, label: `PO-${String(o.id).padStart(4, '0')}: ${o.supplierName}` })) || []
  //     default:
  //       return []
  //   }
  // }

  const renderFollowUpTable = () => (
    <CTable hover responsive>
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell>Title</CTableHeaderCell>
          <CTableHeaderCell>Type</CTableHeaderCell>
          <CTableHeaderCell>Due Date</CTableHeaderCell>
          <CTableHeaderCell>Priority</CTableHeaderCell>
          <CTableHeaderCell>Status</CTableHeaderCell>
          <CTableHeaderCell>Actions</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {queries.map((followUp, index) => {
          const dueDate = new Date(followUp.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          const isOverdue = followUp.status === 'pending' && dueDate < today
          return (
            <CTableRow key={followUp._id} className={isOverdue ? 'table-danger' : ''}>
              <CTableDataCell>
                <strong>{followUp?.companyInfo?.name}</strong>
                {followUp.description && (
                  <>
                    <br />
                    <small className="text-muted">{followUp.description.substring(0, 50)}...</small>
                  </>
                )}
              </CTableDataCell>
              <CTableDataCell>
                <CBadge color="info">{followUp.type?.replace('_', ' ')}</CBadge>
              </CTableDataCell>
              <CTableDataCell>
                {followUp?.createdAt
                  ? new Date(followUp?.createdAt).toLocaleDateString()
                  : '-'}
              </CTableDataCell>
              <CTableDataCell>{getPriorityBadge(followUp.priority)}</CTableDataCell>
              <CTableDataCell>{getStatusBadge(followUp.status)}</CTableDataCell>
              <CTableDataCell>
                {followUp.status === 'pending' && (
                  <CButton
                    color="success"
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsComplete(followUp._id)}
                    title="Mark Complete"
                  >
                    <CIcon icon={cilCheck} />
                  </CButton>
                )}
                <CButton
                  color="warning"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/followups/edit/${followUp._id}`)}
                  title="Edit"
                >
                  <CIcon icon={cilPencil} />
                </CButton>
              </CTableDataCell>
            </CTableRow>
          )
        }
        
        )}
        {queries.length === 0 && (
          <CTableRow>
            <CTableDataCell colSpan={6} className="text-center">
              No follow-ups found
            </CTableDataCell>
          </CTableRow>
        )}
      </CTableBody>
    </CTable>
    
  )

  return (
    <>
      <CRow className="mb-4">
        <CCol className="d-flex justify-content-between align-items-center">
          <div>
            <h4>Follow-up Dashboard</h4>
            <p className="text-muted mb-0">Track and manage your follow-ups</p>
          </div>
          <CButton color="primary" onClick={() => navigate(`/followups/new`)}>
            <CIcon icon={cilPlus} className="me-2" />
            Add Follow-up
          </CButton>
        </CCol>
      </CRow>

      {/* Stats Cards */}
      <CRow className="mb-4">
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="danger"
            icon={<CIcon icon={cilWarning} height={24} />}
            title="Overdue"
            value={overdueFollowUps.length}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="warning"
            icon={<CIcon icon={cilCalendar} height={24} />}
            title="Due Today"
            value={todayFollowUps.length}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="info"
            icon={<CIcon icon={cilClock} height={24} />}
            title="Pending"
            value={pendingFollowUps.length}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="success"
            icon={<CIcon icon={cilCheck} height={24} />}
            title="Completed"
            value={completedFollowUps.length}
          />
        </CCol>
      </CRow>

      {/* Tabs */}
      <CCard>
        <CCardHeader>
          <CNav variant="tabs" role="tablist">
            <CNavItem>
              <CNavLink
                active={activeTab === 1}
                onClick={() => setActiveTab(1)}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilWarning} className="me-2" />
                Overdue ({overdueFollowUps.length})
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 2}
                onClick={() => setActiveTab(2)}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilCalendar} className="me-2" />
                Today ({todayFollowUps.length})
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 3}
                onClick={() => setActiveTab(3)}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilClock} className="me-2" />
                All Pending ({pendingFollowUps.length})
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 4}
                onClick={() => setActiveTab(4)}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilCheck} className="me-2" />
                Completed ({completedFollowUps.length})
              </CNavLink>
            </CNavItem>
          </CNav>
        </CCardHeader>
        <CCardBody>
          <CTabContent>
            <CTabPane visible={activeTab === 1}>
              {renderFollowUpTable(overdueFollowUps)}
            </CTabPane>
            <CTabPane visible={activeTab === 2}>
              {renderFollowUpTable(todayFollowUps)}
            </CTabPane>
            <CTabPane visible={activeTab === 3}>
              {renderFollowUpTable(pendingFollowUps)}
            </CTabPane>
            <CTabPane visible={activeTab === 4}>
              {renderFollowUpTable(completedFollowUps)}
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

    </>
  )
}

export default FollowUpDashboard
