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
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilCloudDownload } from '@coreui/icons'
import { EyeIcon } from '../../components'
import quotationService from '../../services/quotationService'
import productService from '../../services/productService'
import employeeService from '../../services/employeeService'
import purchaseTaskService from '../../services/purchaseTaskService'
import Filtered from '../../filtered/Filtered'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError, toastSuccess } from '../../utils/toast'

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
  const [selectedQuotationId, setSelectedQuotationId] = useState(null)
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [employees, setEmployees] = useState([])
  const [quotationProducts, setQuotationProducts] = useState([])
  const [assignForm, setAssignForm] = useState({
    assignedTo: '',
    selectedProductIndex: '',
    productCategory: '',
    productGroup: '',
    subCategory: '',
    targetRate: '',
    supplierRateRemark: '',
  })

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

  const loadEmployeesIfNeeded = async () => {
    if (employees.length > 0) return
    try {
      const res = await employeeService.getAll({ pageNumber: 1, pageSize: 100 })
      console.debug('QuotationList.loadEmployeesIfNeeded: employeeService.getAll response:', res)
      const data = res?.data || res
      const result = data?.data ?? data
      const list = result?.employees || result?.items || result || []
      const purchaseEmployees = list.filter((e) => {
        // role may be a string or an array; normalize and match any role containing 'purchase'
        const roleVal = e.role || e.roles || ''
        const roleStr = Array.isArray(roleVal) ? roleVal.join(' ').toLowerCase() : String(roleVal || '').toLowerCase()
        return roleStr.includes('purchase')
      })
      if (!purchaseEmployees || purchaseEmployees.length === 0) {
        // show a helpful toast so the user knows why the select is empty
        // and preserve the full employee list for debugging in UI if needed
        // eslint-disable-next-line no-console
        console.debug('QuotationList: no purchase-role employees found, full employee list:', list)
        // don't show an error toast repeatedly; only show once
        // but here we show a non-blocking info toast to aid debugging
        // (can be removed in production)
        // toastError('No purchase-role employees found')
      }
      setEmployees(purchaseEmployees)
    } catch {
      setEmployees([])
      toastError('Failed to load employees for assignment')
    }
  }

  const openAssignModal = async () => {
    if (!selectedQuotationId) {
      toastError('Please select a quotation first')
      return
    }
    await loadEmployeesIfNeeded()
    setAssignForm({
      assignedTo: '',
      selectedProductIndex: '',
      productCategory: '',
      productGroup: '',
      subCategory: '',
      targetRate: '',
      supplierRateRemark: '',
    })
    // load quotation products so user can pick which product to create task for
    try {
      const res = await quotationService.getById(selectedQuotationId)
      const data = res?.data || res
      const result = data?.data ?? data
      const quotation = result?.quotation || result || {}
      setQuotationProducts(quotation.products || [])
    } catch (err) {
      setQuotationProducts([])
    }
    setAssignModalVisible(true)
  }

  const closeAssignModal = () => {
    setAssignModalVisible(false)
  }

  const handleAssignSubmit = async (e) => {
    e.preventDefault()
    if (!selectedQuotationId) {
      toastError('Please select a quotation')
      return
    }
    if (!assignForm.assignedTo) {
      toastError('Please select an employee')
      return
    }
    const payload = {
      quotationId: selectedQuotationId,
      assignedTo: assignForm.assignedTo,
      productCategory: assignForm.productCategory || undefined,
      productGroup: assignForm.productGroup || undefined,
      subCategory: assignForm.subCategory || undefined,
      supplierRateRemark: assignForm.supplierRateRemark || undefined,
    }
    if (assignForm.targetRate !== '' && !Number.isNaN(Number(assignForm.targetRate))) {
      payload.targetRate = Number(assignForm.targetRate)
    }
    setAssigning(true)
    try {
      await purchaseTaskService.assign(payload)
      toastSuccess('Purchase task created')
      setAssignModalVisible(false)
    } catch (err) {
      toastError(err?.message || 'Failed to assign task')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Quotations</strong>
            <div className="d-flex gap-2">
              <CButton color="secondary" variant="outline" onClick={openAssignModal}>
                Add to Purchase Task
              </CButton>
              <CButton color="primary" onClick={() => navigate('/quotations/new')}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Quotation
              </CButton>
            </div>
          </CCardHeader>

          <CCardBody>
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            {loading && <Loader />}
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Select</CTableHeaderCell>
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
                    <CTableRow
                      key={quotation.id}
                      onClick={() => navigate(`/quotations/${quotation.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <CTableDataCell
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <CFormCheck
                          type="radio"
                          name="selectedQuotation"
                          checked={selectedQuotationId === quotation.id}
                          onChange={() => setSelectedQuotationId(quotation.id)}
                        />
                      </CTableDataCell>
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
                    <CTableDataCell colSpan={10} className="text-center">
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

      <CModal visible={assignModalVisible} onClose={closeAssignModal}>
        <CModalHeader>
          <CModalTitle>Add Quotation to Purchase Task</CModalTitle>
        </CModalHeader>
        <form onSubmit={handleAssignSubmit}>
          <CModalBody>
            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel>Assign To (Purchase Role Employee)</CFormLabel>
                <CFormSelect
                  value={assignForm.assignedTo}
                  onChange={(e) =>
                    setAssignForm((prev) => ({ ...prev, assignedTo: e.target.value }))
                  }
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel>Select Product from Quotation</CFormLabel>
                <CFormSelect
                  value={assignForm.selectedProductIndex}
                  onChange={async (e) => {
                    const idx = e.target.value === '' ? '' : Number(e.target.value)
                    setAssignForm((prev) => ({ ...prev, selectedProductIndex: idx }))
                    if (idx === '') {
                      setAssignForm((prev) => ({ ...prev, productCategory: '', productGroup: '', subCategory: '' }))
                      return
                    }
                    const item = quotationProducts[idx]
                    if (!item) {
                      setAssignForm((prev) => ({ ...prev, productCategory: '', productGroup: '', subCategory: '' }))
                      return
                    }
                    const prodId = item.product_id || item.productId || null
                    if (!prodId) {
                      // no linked product - clear category/group/subcategory
                      setAssignForm((prev) => ({ ...prev, productCategory: '', productGroup: '', subCategory: '' }))
                      return
                    }
                    try {
                      const pres = await productService.getById(prodId)
                      const pdata = pres?.data || pres
                      const prod = pdata?.data || pdata || {}
                      const categoryName = prod?.category?.name || ''
                      const groupName = prod?.group?.name || prod?.group?.code || ''
                      const subName = prod?.subcategory?.name || ''
                      setAssignForm((prev) => ({ ...prev, productCategory: categoryName, productGroup: groupName, subCategory: subName }))
                    } catch (err) {
                      setAssignForm((prev) => ({ ...prev, productCategory: '', productGroup: '', subCategory: '' }))
                    }
                  }}
                  required
                >
                  <option value="">Select Product</option>
                  {quotationProducts.length > 0 ? (
                    quotationProducts.map((p, i) => (
                      <option key={p._id || p.id || i} value={i}>
                        {p.productName} ({p.quantity})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No products in quotation</option>
                  )}
                </CFormSelect>
              </CCol>
            </CRow>
            
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Target Rate (INR)</CFormLabel>
                <CFormInput
                  type="number"
                  min={0}
                  value={assignForm.targetRate}
                  onChange={(e) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      targetRate: e.target.value,
                    }))
                  }
                  placeholder="e.g. 25000"
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Supplier Rate Remark</CFormLabel>
                <CFormInput
                  value={assignForm.supplierRateRemark}
                  onChange={(e) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      supplierRateRemark: e.target.value,
                    }))
                  }
                  placeholder="Add any note for supplier rates"
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={closeAssignModal}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={assigning}>
              {assigning ? 'Assigning...' : 'Assign Task'}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>
    </CRow>
  )
}

export default QuotationList
