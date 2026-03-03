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
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilCloudDownload } from '@coreui/icons'
import { EyeIcon } from '../../components'
import quotationService from '../../services/quotationService'
import Filtered from '../../filtered/Filtered'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const mapQuotation = (q) => (q ? { ...q, id: q._id ?? q.id } : null)

const QuotationList = () => {
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState([])
  const [pagination, setPagination] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    setPageNumber(1)
  }, [searchDebounced, statusFilter])

  const fetchQuotations = async () => {
    setLoading(true)
    try {
      const res = await withMinimumDelay(() =>
        quotationService.getAll({
          pageNumber,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: statusFilter || undefined,
        }),
      )
      const data = res?.data || res
      const result = data?.data ?? data
      const list = (result?.quotations || []).map(mapQuotation)
      setQuotations(list)
      setPagination(result?.pagination || null)
    } catch (err) {
      toastError(err?.message || 'Failed to load quotations')
      setQuotations([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotations()
  }, [pageNumber, pageSize, searchDebounced])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <CBadge color="secondary">Draft</CBadge>
      case 'partial':
        return <CBadge color="warning">Partially Fulfilled</CBadge>
      case 'fulfilled':
        return <CBadge color="info">Fulfilled</CBadge>
      case 'hod_approved':
        return <CBadge color="success">HOD Approved</CBadge>
      case 'sent':
      case 'sentToClient':
        return <CBadge color="info">Sent</CBadge>
      case 'accepted':
        return <CBadge color="success">Accepted</CBadge>
      case 'rejected':
        return <CBadge color="danger">Rejected</CBadge>
      case 'expired':
        return <CBadge color="warning">Expired</CBadge>
      default:
        return <CBadge color="secondary">{status || 'Draft'}</CBadge>
    }
  }

  const filteredQuotations = quotations

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Quotations</strong>
            <div className="d-flex gap-2">
              <CButton color="primary" onClick={() => navigate('/quotations/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Quotation
              </CButton>
            </div>
          </CCardHeader>

            <CCardBody>
            <div className="d-flex flex-wrap gap-3 align-items-center mb-3">
              <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 small fw-semibold">Status</label>
                <CFormSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: 'auto', minWidth: 180 }}
                >
                  <option value="">All</option>
                  <option value="draft">Draft</option>
                  <option value="partial">Partially Fulfilled</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="hod_approved">HOD Approved</option>
                </CFormSelect>
              </div>
            </div>
            {loading && <Loader />}
            <CTable hover responsive bordered>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>S No</CTableHeaderCell>
                  <CTableHeaderCell>Quotation No.</CTableHeaderCell>
                  <CTableHeaderCell>Company</CTableHeaderCell>
                  <CTableHeaderCell>Products / Items</CTableHeaderCell>
                  <CTableHeaderCell>Total Amount</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {filteredQuotations && filteredQuotations.length > 0 ? (
                  filteredQuotations.map((quotation, index) => {
                    const isHodApproved = quotation.status === 'hod_approved'
                    const rowBg = isHodApproved ? { backgroundColor: '#d4edda' } : {}
                    return (
                    <CTableRow
                      key={quotation.id}
                      onClick={() => navigate(`/quotations/${quotation.id}`)}
                      style={{ cursor: 'pointer', ...rowBg }}
                    >
                      <CTableDataCell style={rowBg}>{index + 1}</CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        <strong>{quotation.quotationCode || `QT-${String(quotation.id).slice(-6)}`}</strong>
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        <strong>{quotation.companyInfo?.name || quotation.customerName || '-'}</strong>
                        {(quotation.companyInfo?.email || quotation.customerEmail) && (
                          <>
                            <br />
                            <small className="text-muted">
                              {quotation.companyInfo?.email || quotation.customerEmail}
                            </small>
                          </>
                        )}
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        <small>
                          {Array.isArray(quotation.products) && quotation.products.length > 0
                            ? `${quotation.products.length} product(s)`
                            : (quotation.items?.substring(0, 50) || '')}
                          {quotation.items && quotation.items.length > 50 && !quotation.products?.length ? '...' : ''}
                        </small>
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        ₹{quotation.totalAmount?.toLocaleString() || '0'}
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        {quotation.validUntil
                          ? new Date(quotation.validUntil).toLocaleDateString()
                          : '-'}
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        {getStatusBadge(quotation.status)}
                      </CTableDataCell>
                      <CTableDataCell style={rowBg}>
                        {quotation.createdAt
                          ? new Date(quotation.createdAt).toLocaleDateString()
                          : '-'}
                      </CTableDataCell>
                      <CTableDataCell style={rowBg} onClick={(e) => e.stopPropagation()}>
                        <CButton
                          color="info"
                          variant="ghost"
                          size="sm"
                          title="View"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/quotations/${quotation.id}`)}}
                        >
                          <EyeIcon />
                        </CButton>

                        <CButton
                          color="success"
                          variant="ghost"
                          size="sm"
                          title="Download"
                        >
                          <CIcon icon={cilCloudDownload} />
                        </CButton>

                        <CButton
                          color="warning"
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/quotations/edit/${quotation.id}`)
                          }}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                    )
                  })
                ) : (
                  <CTableRow>
                    <CTableDataCell colSpan={8} className="text-center">
                      {!loading && (quotations?.length === 0
                        ? 'No quotations available.'
                        : 'No quotations match your search.')}
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default QuotationList
