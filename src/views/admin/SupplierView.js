import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CAlert,
  CListGroup,
  CListGroupItem,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil } from '@coreui/icons'
import supplierService from '../../services/supplierService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const SupplierView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSupplier = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => supplierService.getById(id))
        const data = res?.data || res
        setSupplier(data)
      } catch (err) {
        toastError(err?.message || 'Failed to fetch supplier')
      } finally {
        setLoading(false)
      }
    }
    fetchSupplier()
  }, [id])

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading supplier..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CAlert color="danger">
        {error}
        <CButton color="link" onClick={() => navigate('/suppliers')}>
          Back to Suppliers
        </CButton>
      </CAlert>
    )
  }

  if (!supplier) {
    return (
      <CAlert color="warning">
        Supplier not found.
        <CButton color="link" onClick={() => navigate('/suppliers')}>
          Back to Suppliers
        </CButton>
      </CAlert>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex gap-2">
          <CButton color="light" onClick={() => navigate('/suppliers')}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back
          </CButton>
          <CButton color="warning" onClick={() => navigate(`/suppliers/edit/${id}`)}>
            <CIcon icon={cilPencil} className="me-1" />
            Edit
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>{supplier.name}</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Shop Name:</strong>
                  <span>{supplier.shopname || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Email:</strong>
                  <span>{supplier.email || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Phone 1:</strong>
                  <span>{supplier.phone_1 || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Phone 2:</strong>
                  <span>{supplier.phone_2 || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Other Contact:</strong>
                  <span>{supplier.other_contact || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Label:</strong>
                  <span>{supplier.label || '-'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Shop Location:</strong>
                  <span>{supplier.shop_location || '-'}</span>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Categories:</strong>
                  <div className="mt-2 d-flex flex-wrap gap-2">
                    {supplier.categories?.length ? (
                      supplier.categories.map((cat) => (
                        <CBadge color="info" key={cat._id || cat}>
                          {typeof cat === 'string' ? cat : cat?.name}
                        </CBadge>
                      ))
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </div>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Address:</strong>
                  <p className="mb-0 mt-2">{supplier.address || 'No address provided'}</p>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Remark:</strong>
                  <p className="mb-0 mt-2">{supplier.remark || 'No remark provided'}</p>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Created At:</strong>
                  <span>{new Date(supplier.createdAt).toLocaleDateString()}</span>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default SupplierView
