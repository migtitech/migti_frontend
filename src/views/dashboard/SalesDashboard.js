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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCart, cilDollar, cilPeople } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'
import queryService from '../../services/queryService'

const SalesDashboard = () => {
  const { user } = useAuth()
  const [cards, setCards] = useState({
    weeklyTarget: 0,
    weeklyBilling: 0,
    monthlyTarget: 0,
    monthlyBilling: 0,
    weeklyFrom: '',
    weeklyTo: '',
    monthlyFrom: '',
    monthlyTo: '',
  })
  const [recentBillings, setRecentBillings] = useState([])

  useEffect(() => {
    const fetchSalesCards = async () => {
      try {
        const response = await queryService.getSalesDashboardCards()
        // axios interceptor returns API body: { success, message, data }
        const data = response?.data ?? {}
        setCards({
          weeklyTarget: Number(data.weeklyTarget || 0),
          weeklyBilling: Number(data.weeklyBilling || 0),
          monthlyTarget: Number(data.monthlyTarget || 0),
          monthlyBilling: Number(data.monthlyBilling || 0),
          weeklyFrom: data.weeklyFrom || '',
          weeklyTo: data.weeklyTo || '',
          monthlyFrom: data.monthlyFrom || '',
          monthlyTo: data.monthlyTo || '',
        })
      } catch (_error) {
        setCards({
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
    fetchSalesCards()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const response = await queryService.getSalesRecentBillings({ limit: 5 })
        const list = response?.data
        setRecentBillings(Array.isArray(list) ? list : [])
      } catch (_e) {
        setRecentBillings([])
      }
    }
    load()
  }, [])

  const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const formatBillingDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  /** dd/mm/yy from ISO or Date */
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
          <div className="mb-4">
            <CWidgetStatsA
              color="success"
              value={formatAmount(cards.weeklyTarget)}
              title="Weekly Target"
              chart={<CIcon icon={cilDollar} height={52} className="my-4 text-white opacity-25" />}
            />
            <div className="small text-body-secondary mt-1 px-1">
              {rangeLabel(cards.weeklyFrom, cards.weeklyTo)}
            </div>
          </div>
        </CCol>
        <CCol sm={6} lg={3}>
          <div className="mb-4">
            <CWidgetStatsA
              color="success"
              value={formatAmount(cards.weeklyBilling)}
              title="Weekly Billing"
              chart={<CIcon icon={cilCart} height={52} className="my-4 text-white opacity-25" />}
            />
            <div className="small text-body-secondary mt-1 px-1">
              {rangeLabel(cards.weeklyFrom, cards.weeklyTo)}
            </div>
          </div>
        </CCol>
        <CCol sm={6} lg={3}>
          <div className="mb-4">
            <CWidgetStatsA
              color="warning"
              value={formatAmount(cards.monthlyTarget)}
              title="Monthly Target"
              chart={<CIcon icon={cilPeople} height={52} className="my-4 text-white opacity-25" />}
            />
            <div className="small text-body-secondary mt-1 px-1">
              {rangeLabel(cards.monthlyFrom, cards.monthlyTo)}
            </div>
          </div>
        </CCol>
        <CCol sm={6} lg={3}>
          <div className="mb-4">
            <CWidgetStatsA
              color="warning"
              value={formatAmount(cards.monthlyBilling)}
              title="Monthly Billing"
              chart={<CIcon icon={cilPeople} height={52} className="my-4 text-white opacity-25" />}
            />
            <div className="small text-body-secondary mt-1 px-1">
              {rangeLabel(cards.monthlyFrom, cards.monthlyTo)}
            </div>
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Recent Billing</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Company</CTableHeaderCell>
                    <CTableHeaderCell>Amount</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {recentBillings.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={3} className="text-body-secondary text-center py-4">
                        No billing entries yet
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    recentBillings.map((row) => (
                      <CTableRow key={row.id}>
                        <CTableDataCell>{row.companyName}</CTableDataCell>
                        <CTableDataCell>{formatAmount(row.amount)}</CTableDataCell>
                        <CTableDataCell>{formatBillingDate(row.date)}</CTableDataCell>
                      </CTableRow>
                    ))
                  )}
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
              <strong>Sales Target Progress</strong>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">Weekly Target</div>
                    <div className="fs-5 fw-semibold">{formatAmount(cards.weeklyTarget)}</div>
                    <div className="small text-body-secondary mt-1">
                      {rangeLabel(cards.weeklyFrom, cards.weeklyTo)}
                    </div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">Weekly Billing</div>
                    <div className="fs-5 fw-semibold">{formatAmount(cards.weeklyBilling)}</div>
                    <div className="small text-body-secondary mt-1">
                      {rangeLabel(cards.weeklyFrom, cards.weeklyTo)}
                    </div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">Monthly Target</div>
                    <div className="fs-5 fw-semibold">{formatAmount(cards.monthlyTarget)}</div>
                    <div className="small text-body-secondary mt-1">
                      {rangeLabel(cards.monthlyFrom, cards.monthlyTo)}
                    </div>
                  </div>
                </CCol>
                <CCol md={3}>
                  <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                    <div className="text-body-secondary text-truncate small">Monthly Billing</div>
                    <div className="fs-5 fw-semibold">{formatAmount(cards.monthlyBilling)}</div>
                    <div className="small text-body-secondary mt-1">
                      {rangeLabel(cards.monthlyFrom, cards.monthlyTo)}
                    </div>
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
