import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import { useData } from '../../context/DataContext'

const GroupView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { initialGroups } = useData()

  const group = initialGroups?.find(
    (g) => g.id === parseInt(id)
  )

  if (!group) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Group not found</h4>
          <CButton color="primary" onClick={() => navigate('/groups')}>
            Back to Groups
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex justify-content-between align-items-center">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate('/groups')}
          >
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Groups
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        {/* Left Section */}
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>
                Group #{String(group.id).padStart(4, '0')}
              </strong>
            </CCardHeader>

            <CCardBody>
              <CRow className="mb-4">
                <CCol md={6}>
                  <h6 className="text-muted">Group Name</h6>
                  <p className="mb-1 fw-bold">{group.groupname}</p>
                </CCol>

                <CCol md={6}>
                  <h6 className="text-muted">SKU</h6>
                  <p className="mb-1">{group.sku}</p>
                </CCol>
              </CRow>

              <hr />

              <h6>Description</h6>
              <div className="bg-light p-3 rounded">
                {group.description || 'No description provided'}
              </div>

              <CRow className="mt-4">
                <CCol md={6}></CCol>
                <CCol md={6}>
                  <CTable borderless small>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell>
                          <strong>Created At:</strong>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {group.createdAt
                            ? new Date(group.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </CTableDataCell>
                      </CTableRow>
                    </CTableBody>
                  </CTable>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default GroupView
