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
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    setPageNumber(1)
  }, [searchDebounced])

  const fetchQuotations = async () => {
    setLoading(true)
    try {
      const res = await withMinimumDelay(() =>
        quotationService.getAll({
          pageNumber,
          pageSize,
          search: searchDebounced.trim() || undefined,
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
            <CButton color="primary" onClick={() => navigate('/quotations/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Quotation
            </CButton>
          </CCardHeader>

          <CCardBody>
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            {loading && <Loader />}
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>S No</CTableHeaderCell>
                  <CTableHeaderCell>Quotation No.</CTableHeaderCell>
                  <CTableHeaderCell>Company</CTableHeaderCell>
                  <CTableHeaderCell>Products / Items</CTableHeaderCell>
                  <CTableHeaderCell>Total Amount</CTableHeaderCell>
                  <CTableHeaderCell>Valid Until</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {filteredQuotations && filteredQuotations.length > 0 ? (
                  filteredQuotations.map((quotation, index) => (
                    <CTableRow key={quotation.id}
                    onClick={() => navigate(`/quotations/${quotation.id}`)}
                    style={{ cursor: 'pointer' }}
                    >
                      <CTableDataCell>{index + 1}</CTableDataCell>
                      <CTableDataCell>
                        <strong>QT-{String(quotation.id).padStart(4, '0')}</strong>
                      </CTableDataCell>
                      <CTableDataCell>
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
                      <CTableDataCell>
                        <small>
                          {Array.isArray(quotation.products) && quotation.products.length > 0
                            ? `${quotation.products.length} product(s)`
                            : (quotation.items?.substring(0, 50) || '')}
                          {quotation.items && quotation.items.length > 50 && !quotation.products?.length ? '...' : ''}
                        </small>
                      </CTableDataCell>
                      <CTableDataCell>
                        ₹{quotation.totalAmount?.toLocaleString() || '0'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {quotation.validUntil
                          ? new Date(quotation.validUntil).toLocaleDateString()
                          : '-'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {getStatusBadge(quotation.status)}
                      </CTableDataCell>
                      <CTableDataCell>
                        {quotation.createdAt
                          ? new Date(quotation.createdAt).toLocaleDateString()
                          : '-'}
                      </CTableDataCell>
                      <CTableDataCell>
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
                  ))
                ) : (
                  <CTableRow>
                    <CTableDataCell colSpan={9} className="text-center">
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
