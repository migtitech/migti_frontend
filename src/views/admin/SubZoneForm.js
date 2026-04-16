import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import areaService from '../../services/areaService'
import subZoneService from '../../services/subZoneService'
import { Loader } from '../../components'
import { toastSuccess, toastError } from '../../utils/toast'
import usePermissions from '../../hooks/usePermissions'

const SubZoneForm = () => {
  const navigate = useNavigate()
  const { canCreate } = usePermissions()
  const [zones, setZones] = useState([])
  const [zoneId, setZoneId] = useState('')
  const [name, setName] = useState('')
  const [loadingZones, setLoadingZones] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoadingZones(true)
      try {
        const res = await areaService.getAll({ pageSize: 100 })
        const data = res?.data?.data || res?.data || res
        setZones(data?.areas || [])
      } catch (err) {
        setZones([])
        toastError(err?.message || 'Failed to load zones')
      } finally {
        setLoadingZones(false)
      }
    }
    load()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canCreate('sub_zones')) {
      toastError('You do not have permission to create sub-zones')
      return
    }
    if (!zoneId) {
      setError('Please select a zone')
      return
    }
    const trimmed = (name || '').trim()
    if (!trimmed) {
      setError('Sub-zone name is required')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await subZoneService.create({ zoneId, name: trimmed })
      toastSuccess('Sub-zone created successfully')
      navigate('/sub-zones')
    } catch (err) {
      toastError(err?.message || 'Failed to create sub-zone')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingZones) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading zones..." />
      </div>
    )
  }

  return (
    <>
      <CButton color="light" className="mb-3" onClick={() => navigate('/sub-zones')}>
        <CIcon icon={cilArrowLeft} className="me-1" />
        Back to sub-zones
      </CButton>
      <CCard>
        <CCardHeader>
          <strong>Add sub-zone</strong>
        </CCardHeader>
        <CCardBody>
          <CForm onSubmit={onSubmit}>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError('')}>
                {error}
              </CAlert>
            )}
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="subzone-zone">Zone *</CFormLabel>
                  <CFormSelect
                    id="subzone-zone"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                  >
                    <option value="">Select zone</option>
                    {zones.map((z) => (
                      <option key={z._id || z.id} value={z._id || z.id}>
                        {z.name}
                        {z.city ? ` - ${z.city}` : ''}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="subzone-name">Sub-zone name *</CFormLabel>
                  <CFormInput
                    id="subzone-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={200}
                    placeholder="Display name"
                  />
                </div>
              </CCol>
            </CRow>
            <CButton color="primary" type="submit" disabled={submitting || !canCreate('sub_zones')}>
              {submitting ? 'Saving…' : 'Create sub-zone'}
            </CButton>
          </CForm>
        </CCardBody>
      </CCard>
    </>
  )
}

export default SubZoneForm
