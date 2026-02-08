import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CBadge,
  CListGroup,
  CListGroupItem,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil, cilPlus } from '@coreui/icons'
import categoryService from '../../services/categoryService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const CategoryView = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => categoryService.getById(id))
        const payload = res?.data?.data || res?.data || res
        setCategory(payload)
      } catch (err) {
        setError(err?.message || 'Failed to load category')
        toastError(err?.message || 'Failed to load category')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  if (loading) {
    return (
      <CCard>
        <CCardBody>
          <Loader message="Loading category..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error}</p>
          <CButton color="primary" onClick={() => navigate('/categories')}>
            Back to Categories
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  if (!category) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Category not found</h4>
          <CButton color="primary" onClick={() => navigate('/categories')}>
            Back to Categories
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  const subcategories = category.subcategories || []

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/categories')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Categories
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Category Details</strong>
              <CButton color="warning" size="sm" onClick={() => navigate(`/categories/edit/${id}`)}>
                <CIcon icon={cilPencil} className="me-2" />
                Edit
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Category Code:</strong>
                  <span>
                    <code>{category.categoryCode || '—'}</code>
                  </span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Name:</strong>
                  <span>{category.name}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Parent:</strong>
                  <span>{category.parent?.name || 'None (Root)'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Description:</strong>
                  <span>{category.description || '—'}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Sort Order:</strong>
                  <span>{category.sortOrder ?? 0}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <strong>Status:</strong>
                  <CBadge color={category.status === 'active' ? 'success' : 'secondary'}>
                    {category.status || 'active'}
                  </CBadge>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={4}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Subcategories ({subcategories.length})</strong>
              {!category.parent && (
                <CButton
                  color="primary"
                  size="sm"
                  onClick={() => navigate(`/categories/new?parent=${id}`)}
                >
                  <CIcon icon={cilPlus} className="me-2" />
                  Add
                </CButton>
              )}
            </CCardHeader>
            <CCardBody>
              {subcategories.length > 0 ? (
                <CListGroup>
                  {subcategories.map((sub) => (
                    <CListGroupItem
                      key={sub._id}
                      className="d-flex justify-content-between align-items-center"
                      action
                      onClick={() => navigate(`/categories/${sub._id}`)}
                    >
                      <div>
                        <code className="text-primary">{sub.categoryCode || '—'}</code>
                        <br />
                        <strong>{sub.name}</strong>
                      </div>
                      <CIcon icon={cilPencil} size="sm" />
                    </CListGroupItem>
                  ))}
                </CListGroup>
              ) : (
                <p className="text-muted text-center mb-0">
                  {category.parent
                    ? 'No subcategories'
                    : 'No subcategories yet. Add one to get codes like MIG01SUB01, MIG01SUB02...'}
                </p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {subcategories.length > 0 && (
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Subcategories with Codes</strong>
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Code</CTableHeaderCell>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {subcategories.map((sub) => (
                  <CTableRow key={sub._id}>
                    <CTableDataCell>
                      <code>{sub.categoryCode || '—'}</code>
                    </CTableDataCell>
                    <CTableDataCell>{sub.name}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={sub.status === 'active' ? 'success' : 'secondary'}>
                        {sub.status}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        color="info"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/categories/${sub._id}`)}
                      >
                        View
                      </CButton>
                      <CButton
                        color="warning"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/categories/edit/${sub._id}`)}
                      >
                        Edit
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      )}
    </>
  )
}

export default CategoryView
