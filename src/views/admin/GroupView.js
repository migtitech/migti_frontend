import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CListGroup,
  CListGroupItem,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil } from '@coreui/icons'
import groupService from '../../services/groupService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import { toastError } from '../../utils/toast'

const GroupView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await withMinimumDelay(() => groupService.getById(id))
        const data = res?.data?.data || res?.data || res
        setGroup(data)
      } catch (err) {
        setError(err?.message || 'Failed to load group')
        toastError(err?.message || 'Failed to load group')
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
          <Loader message="Loading group..." />
        </CCardBody>
      </CCard>
    )
  }

  if (error || !group) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error || 'Group not found'}</p>
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
        <CCol>
          <CButton color="secondary" variant="outline" onClick={() => navigate('/groups')}>
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Groups
          </CButton>
        </CCol>
        <CCol className="text-end">
          <CButton color="primary" onClick={() => navigate(`/groups/edit/${id}`)}>
            <CIcon icon={cilPencil} className="me-2" />
            Edit Group
          </CButton>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardHeader>
              <strong>Group Details</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span>Name</span>
                  <strong>{group.name || "-"}</strong>
                </CListGroupItem>

                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span>Code</span>
                  <span>{group.code?? '—'}</span>
                </CListGroupItem>

                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span>Description</span>
                  <span>{group.description ?? '—'}</span>
                </CListGroupItem>

                {group.createdAt && (
                  <CListGroupItem className="d-flex justify-content-between align-items-center">
                    <span>Created Date</span>
                    <span>
                      {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                  </CListGroupItem>
                )}

                <CListGroupItem className="d-flex justify-content-between align-items-center">
                  <span>Status</span>
                  <CBadge color={group.isActive ? 'success' : 'danger'}>
                    {group.isActive ? 'Active' : 'Draft'}
                  </CBadge>
                </CListGroupItem>

              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default GroupView