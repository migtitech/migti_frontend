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

const formatDate = (value) => {
  if (value == null || value === '') return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

// DD/MM/YY HH:MM:SS
const formatCreatedAt = (value) => {
  if (value == null || value === '') return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yy} ${hh}:${min}:${ss}`
}

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
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>{supplier.name}</strong>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol xs={12} md={4}>
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
                  </CListGroup>
                </CCol>

                <CCol xs={12} md={4}>
                  <CListGroup flush>
                    <CListGroupItem className="d-flex justify-content-between">
                      <strong>Shop Location:</strong>
                      <span>{supplier.shop_location || '-'}</span>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <strong>GST Number:</strong>
                      <span>{supplier.gst || '-'}</span>
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
                  </CListGroup>
                </CCol>

                <CCol xs={12} md={4}>
                  <CListGroup flush>
                    <CListGroupItem>
                      <strong>Address:</strong>
                      <p className="mb-0 mt-2">{supplier.address || 'No address provided'}</p>
                    </CListGroupItem>
                    <CListGroupItem>
                      <strong>Remark:</strong>
                      <p className="mb-0 mt-2">{supplier.remark || 'No remark provided'}</p>
                    </CListGroupItem>
                    <CListGroupItem>
                      <strong>Catalog:</strong>
                      {supplier.catalog?.url ? (
                        <div className="mt-2">
                          <div className="mb-1 text-break">
                            {supplier.catalog.fileName || 'Catalog file'}
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            <a
                              href={supplier.catalog.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-primary"
                            >
                              View
                            </a>
                            <a
                              href={supplier.catalog.url}
                              download={supplier.catalog.fileName || true}
                              className="btn btn-sm btn-outline-secondary"
                            >
                              Download
                            </a>
                          </div>
                          {supplier.catalog.uploadedAt && (
                            <small className="d-block text-muted mt-2">
                              Uploaded:{' '}
                              {new Date(supplier.catalog.uploadedAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </small>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">No catalog uploaded</span>
                      )}
                    </CListGroupItem>
                  </CListGroup>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default SupplierView
