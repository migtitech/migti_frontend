import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CAlert,
  CBadge,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil } from '@coreui/icons'
import industryService from '../../services/industryService'
import queryService from '../../services/queryService'
import quotationService from '../../services/quotationService'
import { EyeIcon, Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const formatDate = (date) => {
  if (!date) return '-'
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString()
}

const getText = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const formatStatus = (value) => {
  if (!value) return '-'
  const normalized = String(value)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

const formatINRCurrency = (value) => {
  const amount = Number(value)
  if (Number.isNaN(amount)) return '-'
  return `₹${new Intl.NumberFormat('en-IN').format(amount)}`
}

const IndustryView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [industry, setIndustry] = useState(null)
  const [queries, setQueries] = useState([])
  const [quotations, setQuotations] = useState([])
  const [activeTab, setActiveTab] = useState('company')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchIndustry = async () => {
      setLoading(true)
      setError('')
      try {
        const [industryRes, queryRes, quotationRes] = await Promise.all([
          withMinimumDelay(() => industryService.getById(id)),
          queryService.getAll({ pageSize: 100 }),
          quotationService.getAll({ pageSize: 100 }),
        ])

        const industryData = industryRes?.data || industryRes
        const queryData = queryRes?.data || queryRes
        const quotationData = quotationRes?.data || quotationRes

        const queryList = queryData?.queries || []
        const quotationList = quotationData?.quotations || []

        const belongsToIndustry = (record) => {
          const industryIdFromRef = record?.industry_id?._id || record?.industry_id
          return String(industryIdFromRef || '') === String(id)
        }

        setIndustry(industryData)
        setQueries(queryList.filter(belongsToIndustry))
        setQuotations(quotationList.filter(belongsToIndustry))
      } catch (err) {
        const message = err?.message || 'Failed to fetch client'
        setError(message)
        toastError(message)
      } finally {
        setLoading(false)
      }
    }
    fetchIndustry()
  }, [id])

  const purchaseManagers = useMemo(() => {
    const list = industry?.purchaseManagers || []
    if (list.length > 0) return list
    if (industry?.purchase_manager_name || industry?.purchase_manager_phone || industry?.email) {
      return [
        {
          name: industry?.purchase_manager_name || '',
          phone: industry?.purchase_manager_phone || '',
          email: industry?.email || '',
        },
      ]
    }
    return []
  }, [industry])

  const purchaseOrders = useMemo(
    () => quotations.filter((q) => String(q?.status || '').toLowerCase() === 'poreceived'),
    [quotations],
  )

  const totalQuotationValue = useMemo(
    () =>
      quotations.reduce((sum, q) => {
        const amount = Number(q?.totalAmount)
        return sum + (Number.isNaN(amount) ? 0 : amount)
      }, 0),
    [quotations],
  )

  const industryEntries = useMemo(() => {
    if (!industry) return []
    const skipKeys = [
      'purchaseManagers',
      'purchase_manager_name',
      'purchase_manager_phone',
      'branchId',
      'isActive',
      'isDeleted',
      'uniqueId',
      'id',
      '__v',
    ]
    return Object.entries(industry)
      .filter(([key]) => !skipKeys.includes(key))
      .map(([key, value]) => {
        if (key === 'area') {
          const zoneName =
            typeof value === 'object' && value !== null ? value?.name || '-' : value || '-'
          return ['Zone', zoneName]
        }
        return [key, value]
      })
  }, [industry])

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading client..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CAlert color="danger">
        {error}
        <CButton color="secondary" variant="outline" onClick={() => navigate('/industries')}>
          Back to clients
        </CButton>
      </CAlert>
    )
  }

  if (!industry) {
    return (
      <CAlert color="warning">
        Client not found.
        <CButton color="secondary" variant="outline" onClick={() => navigate('/industries')}>
          Back to clients
        </CButton>
      </CAlert>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex gap-2">
          <CButton color="secondary" variant="outline" onClick={() => navigate('/industries')}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to clients
          </CButton>
          <CButton color="warning" onClick={() => navigate(`/industries/edit/${id}`)}>
            <CIcon icon={cilPencil} className="me-1" />
            Edit
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <strong>{industry.name || 'Client details'}</strong>
              <div className="d-flex gap-2 flex-wrap">
                <CBadge color="primary">Queries: {queries.length}</CBadge>
                <CBadge color="info">Quotations: {quotations.length}</CBadge>
                <CBadge color="success">PO: {purchaseOrders.length}</CBadge>
              </div>
            </CCardHeader>
            <CCardBody>
              <CNav variant="tabs" className="mb-3">
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'company'}
                    onClick={() => setActiveTab('company')}
                    style={{ cursor: 'pointer' }}
                  >
                    Company Information
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'queries'}
                    onClick={() => setActiveTab('queries')}
                    style={{ cursor: 'pointer' }}
                  >
                    Queries
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'quotations'}
                    onClick={() => setActiveTab('quotations')}
                    style={{ cursor: 'pointer' }}
                  >
                    Quotations
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'po'}
                    onClick={() => setActiveTab('po')}
                    style={{ cursor: 'pointer' }}
                  >
                    PO
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'analytics'}
                    onClick={() => setActiveTab('analytics')}
                    style={{ cursor: 'pointer' }}
                  >
                    Analytics
                  </CNavLink>
                </CNavItem>
              </CNav>

              <CTabContent>
                <CTabPane visible={activeTab === 'company'}>
                  <CTable bordered responsive hover>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell style={{ width: '30%' }}>Field</CTableHeaderCell>
                        <CTableHeaderCell>Value</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {industryEntries.map(([key, value]) => (
                        <CTableRow key={key}>
                          <CTableDataCell>{key}</CTableDataCell>
                          <CTableDataCell>{getText(value)}</CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>

                  <h6 className="mt-4">Purchase Managers</h6>
                  <CTable bordered responsive hover>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Name</CTableHeaderCell>
                        <CTableHeaderCell>Phone</CTableHeaderCell>
                        <CTableHeaderCell>Email</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {purchaseManagers.map((pm, idx) => (
                        <CTableRow key={pm._id || idx}>
                          <CTableDataCell>{idx + 1}</CTableDataCell>
                          <CTableDataCell>{pm.name || '-'}</CTableDataCell>
                          <CTableDataCell>{pm.phone || '-'}</CTableDataCell>
                          <CTableDataCell>{pm.email || '-'}</CTableDataCell>
                        </CTableRow>
                      ))}
                      {purchaseManagers.length === 0 && (
                        <CTableRow>
                          <CTableDataCell colSpan={4} className="text-center">
                            No purchase managers found.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                </CTabPane>

                <CTabPane visible={activeTab === 'queries'}>
                  <CTable bordered responsive hover>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Query Code</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Products</CTableHeaderCell>
                        <CTableHeaderCell>Created At</CTableHeaderCell>
                        <CTableHeaderCell>Action</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {queries.map((query, idx) => (
                        <CTableRow key={query._id || idx}>
                          <CTableDataCell>{idx + 1}</CTableDataCell>
                          <CTableDataCell>{query.queryCode || '-'}</CTableDataCell>
                          <CTableDataCell>{formatStatus(query.status)}</CTableDataCell>
                          <CTableDataCell>{query.products?.length || 0}</CTableDataCell>
                          <CTableDataCell>{formatDate(query.createdAt)}</CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="info"
                              size="sm"
                              variant="ghost"
                              title="View Query"
                              onClick={() =>
                                window.open(`/#/queries/${query._id || query.id}`, '_blank', 'noopener,noreferrer')
                              }
                            >
                              <EyeIcon />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                      {queries.length === 0 && (
                        <CTableRow>
                          <CTableDataCell colSpan={6} className="text-center">
                            No queries found for this company.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                </CTabPane>

                <CTabPane visible={activeTab === 'quotations'}>
                  <CTable bordered responsive hover>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Quotation Code</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Products</CTableHeaderCell>
                        <CTableHeaderCell>Total Amount</CTableHeaderCell>
                        <CTableHeaderCell>Created At</CTableHeaderCell>
                        <CTableHeaderCell>Action</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {quotations.map((quotation, idx) => (
                        <CTableRow key={quotation._id || idx}>
                          <CTableDataCell>{idx + 1}</CTableDataCell>
                          <CTableDataCell>{quotation.quotationCode || '-'}</CTableDataCell>
                          <CTableDataCell>{formatStatus(quotation.status)}</CTableDataCell>
                          <CTableDataCell>{quotation.products?.length || 0}</CTableDataCell>
                          <CTableDataCell>{formatINRCurrency(quotation.totalAmount)}</CTableDataCell>
                          <CTableDataCell>{formatDate(quotation.createdAt)}</CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="info"
                              size="sm"
                              variant="ghost"
                              title="View Quotation"
                              onClick={() =>
                                window.open(`/#/quotations/${quotation._id || quotation.id}`, '_blank', 'noopener,noreferrer')
                              }
                            >
                              <EyeIcon />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                      {quotations.length === 0 && (
                        <CTableRow>
                          <CTableDataCell colSpan={7} className="text-center">
                            No quotations found for this company.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                </CTabPane>

                <CTabPane visible={activeTab === 'po'}>
                  <CTable bordered responsive hover>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Quotation Code</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Total Amount</CTableHeaderCell>
                        <CTableHeaderCell>Expected Delivery</CTableHeaderCell>
                        <CTableHeaderCell>Created At</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {purchaseOrders.map((po, idx) => (
                        <CTableRow key={po._id || idx}>
                          <CTableDataCell>{idx + 1}</CTableDataCell>
                          <CTableDataCell>{po.quotationCode || '-'}</CTableDataCell>
                          <CTableDataCell>{formatStatus(po.status)}</CTableDataCell>
                          <CTableDataCell>{formatINRCurrency(po.totalAmount)}</CTableDataCell>
                          <CTableDataCell>{formatDate(po.expectedDeliveryDate)}</CTableDataCell>
                          <CTableDataCell>{formatDate(po.createdAt)}</CTableDataCell>
                        </CTableRow>
                      ))}
                      {purchaseOrders.length === 0 && (
                        <CTableRow>
                          <CTableDataCell colSpan={6} className="text-center">
                            No PO entries found (from quotation status `poReceived`).
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>
                </CTabPane>

                <CTabPane visible={activeTab === 'analytics'}>
                  <CRow className="g-3">
                    <CCol md={3}>
                      <CCard>
                        <CCardBody>
                          <div className="text-muted small">Total Queries</div>
                          <h4 className="mb-0">{queries.length}</h4>
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol md={3}>
                      <CCard>
                        <CCardBody>
                          <div className="text-muted small">Total Quotations</div>
                          <h4 className="mb-0">{quotations.length}</h4>
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol md={3}>
                      <CCard>
                        <CCardBody>
                          <div className="text-muted small">PO Received</div>
                          <h4 className="mb-0">{purchaseOrders.length}</h4>
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol md={3}>
                      <CCard>
                        <CCardBody>
                          <div className="text-muted small">Quotation Value</div>
                          <h4 className="mb-0">{formatINRCurrency(totalQuotationValue)}</h4>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  </CRow>
                </CTabPane>
              </CTabContent>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default IndustryView
