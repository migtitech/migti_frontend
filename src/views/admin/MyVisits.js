import React, { useEffect, useState } from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormTextarea,
  CPagination,
  CPaginationItem,
  CRow,
} from '@coreui/react'
import visitService from '../../services/visitService'
import { Loader } from '../../components'
import { toastError, toastSuccess } from '../../utils/toast'

const unwrapResponse = (response) => {
  if (response?.data && typeof response.data === 'object') return response.data
  return response || {}
}

const getTodayInputDate = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const MyVisits = () => {
  const drawerWidth = 420
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  })
  const [page, setPage] = useState(1)
  const [selectedDate, setSelectedDate] = useState(getTodayInputDate())
  const [activeTab, setActiveTab] = useState('active')
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false)
  const [remarkText, setRemarkText] = useState('')
  const [savingRemark, setSavingRemark] = useState(false)

  const loadMyVisits = async (pageNumber = 1) => {
    setLoading(true)
    try {
      const res = await visitService.myList({
        pageNumber,
        pageSize: 10,
        dateFrom: selectedDate,
        dateTo: selectedDate,
        status: activeTab,
      })
      const payload = unwrapResponse(res)
      const data = payload?.data || payload || {}
      setRows(data?.visits || [])
      setPagination(
        data?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
        },
      )
    } catch (err) {
      toastError(err?.message || 'Failed to load my visits')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMyVisits(page)
  }, [page, selectedDate, activeTab])

  useEffect(() => {
    setPage(1)
  }, [selectedDate, activeTab])

  const onOpenVisitView = (visit) => {
    setSelectedVisit(visit)
    setRemarkText(visit?.remark || '')
    setIsViewDrawerOpen(true)
  }

  const getWordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length

  const onSubmitRemark = async () => {
    if (!selectedVisit?._id) return
    const words = getWordCount(remarkText)
    if (words < 20) {
      toastError('Remark must contain at least 20 words')
      return
    }

    setSavingRemark(true)
    try {
      await visitService.completeWithRemark({
        visitId: selectedVisit._id,
        remark: remarkText,
      })
      toastSuccess('Remark saved and visit marked as completed')
      setIsViewDrawerOpen(false)
      setSelectedVisit(null)
      setRemarkText('')
      setActiveTab('completed')
      setPage(1)
      loadMyVisits(1)
    } catch (err) {
      toastError(err?.message || 'Failed to save remark')
    } finally {
      setSavingRemark(false)
    }
  }

  return (
    <>
      <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardHeader>
            <strong>My Visits</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-3">
              <CCol xs={12} sm={6} md={4}>
                <div className="small text-muted mb-1">Date</div>
                <CFormInput type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </CCol>
              <CCol xs={12} sm={6} md={4} className="d-flex align-items-end">
                <div className="d-flex gap-2 w-100">
                  <CButton
                    color={activeTab === 'active' ? 'primary' : 'light'}
                    className="w-50"
                    onClick={() => setActiveTab('active')}
                  >
                    Active
                  </CButton>
                  <CButton
                    color={activeTab === 'completed' ? 'success' : 'light'}
                    className="w-50"
                    onClick={() => setActiveTab('completed')}
                  >
                    Completed
                  </CButton>
                </div>
              </CCol>
              <CCol xs={12} sm={6} md={4}>
                <CCard>
                  <CCardBody className="py-2">
                    <div className="small text-muted">Total {activeTab === 'active' ? 'Active' : 'Completed'} Visits</div>
                    <div className="fs-5 fw-semibold">{pagination.totalItems || 0}</div>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            {loading ? (
              <div className="text-center py-5">
                <Loader message="Loading my visits..." />
              </div>
            ) : (
              <CRow className="g-3">
                {rows.length > 0 ? (
                  rows.map((visit) => (
                    <CCol key={visit._id} xs={12} sm={6} lg={4}>
                      <CCard
                        className="h-100"
                        onClick={() => onOpenVisitView(visit)}
                        style={{ cursor: 'pointer' }}
                      >
                        <CCardBody className="py-2">
                          <div className="mb-1">
                            <CBadge color={visit.status === 'completed' ? 'success' : 'primary'}>
                              {visit.status === 'completed' ? 'Completed' : 'Active'}
                            </CBadge>
                          </div>
                          <div className="small text-muted">Industry</div>
                          <div className="mb-1">{visit.industries?.[0]?.name || '-'}</div>

                          <div className="small text-muted">Instructions</div>
                          <div className="mb-1 text-truncate" title={visit.instructions || '-'}>
                            {visit.instructions || '-'}
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  ))
                ) : (
                  <CCol xs={12}>
                    <div className="text-center text-muted py-4">No visits found for your login.</div>
                  </CCol>
                )}
              </CRow>
            )}

            {pagination.totalPages > 1 && (
              <CPagination className="mt-3 justify-content-center">
                <CPaginationItem disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Previous
                </CPaginationItem>
                <CPaginationItem active>
                  {page} / {pagination.totalPages}
                </CPaginationItem>
                <CPaginationItem
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                >
                  Next
                </CPaginationItem>
              </CPagination>
            )}
          </CCardBody>
        </CCard>
      </CCol>
      </CRow>
      <div
      style={{
        position: 'fixed',
        top: 0,
        right: isViewDrawerOpen ? 0 : -drawerWidth,
        width: drawerWidth,
        height: '100vh',
        background: '#fff',
        borderLeft: '1px solid #dee2e6',
        boxShadow: '0 0 16px rgba(0,0,0,0.08)',
        zIndex: 2999,
        transition: 'right 0.2s ease',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">My Visit Details</h6>
        <CButton color="light" size="sm" onClick={() => setIsViewDrawerOpen(false)}>
          Close
        </CButton>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <div className="mb-2">
          <CBadge color={selectedVisit?.status === 'completed' ? 'success' : 'primary'}>
            {selectedVisit?.status === 'completed' ? 'Completed' : 'Active'}
          </CBadge>
        </div>
        <div className="small text-muted">Branch</div>
        <div className="mb-2 fw-semibold">{selectedVisit?.branchName || '-'}</div>

        <div className="small text-muted">Zone</div>
        <div className="mb-2">{selectedVisit?.zoneName || '-'}</div>

        <div className="small text-muted">Industry</div>
        <div className="mb-2">{selectedVisit?.industries?.[0]?.name || '-'}</div>

        <div className="small text-muted">Instructions</div>
        <div className="mb-2">{selectedVisit?.instructions || '-'}</div>

        <div className="small text-muted">Remark (minimum 20 words)</div>
        <CFormTextarea
          rows={5}
          value={remarkText}
          onChange={(e) => setRemarkText(e.target.value)}
          placeholder="Write detailed remark with minimum 20 words..."
          disabled={selectedVisit?.status === 'completed'}
        />
        <div className="small text-muted mt-1 mb-2">Words: {getWordCount(remarkText)}</div>

        {selectedVisit?.status !== 'completed' ? (
          <CButton color="success" disabled={savingRemark} onClick={onSubmitRemark}>
            {savingRemark ? 'Saving...' : 'Save Remark & Complete'}
          </CButton>
        ) : (
          <div className="small text-success">This visit is already completed.</div>
        )}
      </div>
      </div>
    </>
  )
}

export default MyVisits
