import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import { useAuth } from '../../context/AuthContext'
import rawQueryService from '../../services/rawQueryService'
import industryService from '../../services/industryService'
import areaService from '../../services/areaService'
import { toastSuccess, toastError } from '../../utils/toast'

const INITIAL_INDUSTRY_EDIT = {
  name: '',
  area: '',
  location: '',
  address: '',
  purchase_manager_name: '',
  purchase_manager_phone: '',
  email: '',
}

const RawQueryCreate = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    priority: 'medium',
    description: '',
  })
  const [industrySearch, setIndustrySearch] = useState('')
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false)
  const [industrySearchResults, setIndustrySearchResults] = useState([])
  const [industrySearchLoading, setIndustrySearchLoading] = useState(false)
  const [industryId, setIndustryId] = useState('')
  const [createNewIndustry, setCreateNewIndustry] = useState(false)
  const [industryDetails, setIndustryDetails] = useState(null)
  const [industryEditForm, setIndustryEditForm] = useState(INITIAL_INDUSTRY_EDIT)
  const [areas, setAreas] = useState([])
  const [savingIndustry, setSavingIndustry] = useState(false)
  const [creatingIndustry, setCreatingIndustry] = useState(false)
  const dropdownRef = useRef(null)
  const [audioClips, setAudioClips] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioError, setAudioError] = useState('')
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const chunksRef = useRef([])
  const recordingStartRef = useRef(null)
  const timerRef = useRef(null)
  const audioClipsRef = useRef([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [descriptionError, setDescriptionError] = useState('')
  const [descriptionTouched, setDescriptionTouched] = useState(false)

  useEffect(() => {
    audioClipsRef.current = audioClips
  }, [audioClips])

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await areaService.getAll({ pageSize: 100 })
        const data = res?.data || res
        setAreas(data?.areas || [])
      } catch {
        setAreas([])
      }
    }
    fetchAreas()
  }, [])

  const fetchIndustrySearch = useCallback(async (term) => {
    if (term.trim().length === 0) {
      setIndustrySearchResults([])
      return
    }
    setIndustrySearchLoading(true)
    try {
      const response = await industryService.getAll({ search: term.trim(), pageSize: 5 })
      const payload = response?.data || response
      setIndustrySearchResults(payload?.industries || [])
    } catch {
      setIndustrySearchResults([])
    } finally {
      setIndustrySearchLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIndustrySearch(industrySearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [industrySearch, fetchIndustrySearch])

  const handleSelectIndustry = async (industry) => {
    setIndustryId(industry._id || industry.id)
    setIndustrySearch((industry.name || '') + (industry.location ? ` (${industry.location})` : ''))
    setIndustryDropdownOpen(false)
    setCreateNewIndustry(false)
    try {
      const res = await industryService.getById(industry._id || industry.id)
      const data = res?.data || res
      setIndustryDetails(data)
      setIndustryEditForm({
        name: data?.name || '',
        area: typeof data?.area === 'object' ? data?.area?._id || '' : data?.area || '',
        location: data?.location || '',
        address: data?.address || '',
        purchase_manager_name: data?.purchase_manager_name || '',
        purchase_manager_phone: data?.purchase_manager_phone || '',
        email: data?.email || '',
      })
    } catch {
      setIndustryDetails(industry)
      setIndustryEditForm({
        name: industry?.name || '',
        area: typeof industry?.area === 'object' ? industry?.area?._id || '' : industry?.area || '',
        location: industry?.location || '',
        address: industry?.address || '',
        purchase_manager_name: industry?.purchase_manager_name || '',
        purchase_manager_phone: industry?.purchase_manager_phone || '',
        email: industry?.email || '',
      })
    }
  }

  const handleCreateNewIndustry = () => {
    setIndustryDropdownOpen(false)
    setCreateNewIndustry(true)
    setIndustryId('')
    setIndustrySearch('')
    setIndustryDetails(null)
    setIndustryEditForm(INITIAL_INDUSTRY_EDIT)
  }

  const handleSaveIndustryDetails = async (e) => {
    e.preventDefault()
    if (!industryId) return
    setSavingIndustry(true)
    try {
      const payload = {
        ...industryEditForm,
        area: industryEditForm.area || null,
      }
      const res = await industryService.update(industryId, payload)
      const data = res?.data || res
      setIndustryDetails(data)
      toastSuccess('Industry updated successfully')
    } catch (err) {
      toastError(err?.message || 'Failed to update industry')
    } finally {
      setSavingIndustry(false)
    }
  }

  const handleCreateIndustry = async (e) => {
    e.preventDefault()
    if (!industryEditForm.name?.trim()) {
      toastError('Industry name is required')
      return
    }
    setCreatingIndustry(true)
    try {
      const payload = {
        ...industryEditForm,
        area: industryEditForm.area || null,
      }
      const res = await industryService.create(payload)
      const data = res?.data || res
      const newIndustry = data
      setIndustryId(newIndustry._id || newIndustry.id)
      setIndustryDetails(newIndustry)
      setIndustryEditForm({
        name: newIndustry?.name || '',
        area: typeof newIndustry?.area === 'object' ? newIndustry?.area?._id || '' : newIndustry?.area || '',
        location: newIndustry?.location || '',
        address: newIndustry?.address || '',
        purchase_manager_name: newIndustry?.purchase_manager_name || '',
        purchase_manager_phone: newIndustry?.purchase_manager_phone || '',
        email: newIndustry?.email || '',
      })
      setCreateNewIndustry(false)
      setIndustrySearch((newIndustry?.name || '') + (newIndustry?.location ? ` (${newIndustry.location})` : ''))
      toastSuccess('Industry created successfully')
    } catch (err) {
      toastError(err?.message || 'Failed to create industry')
    } finally {
      setCreatingIndustry(false)
    }
  }

  const handleClearIndustry = () => {
    setIndustryId('')
    setIndustrySearch('')
    setIndustryDetails(null)
    setCreateNewIndustry(false)
    setIndustryEditForm(INITIAL_INDUSTRY_EDIT)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      audioClipsRef.current.forEach((clip) => {
        if (clip.url) {
          URL.revokeObjectURL(clip.url)
        }
      })
    }
  }, [])

  const formatDuration = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const readBlobAsDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Failed to read audio file'))
      reader.readAsDataURL(blob)
    })

  const addAudioClip = async (blob, namePrefix = 'voice-note') => {
    if (!blob || blob.size === 0) {
      return
    }
    const extension = blob.type && blob.type.includes('/') ? blob.type.split('/')[1] : 'webm'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const url = URL.createObjectURL(blob)
    const durationSec = Math.max(
      1,
      Math.round((Date.now() - (recordingStartRef.current || Date.now())) / 1000),
    )
    try {
      const dataUrl = await readBlobAsDataUrl(blob)
      setAudioClips((prev) => [
        ...prev,
        {
          id: `${namePrefix}-${timestamp}`,
          name: `${namePrefix}-${timestamp}.${extension}`,
          url,
          type: blob.type || 'audio/webm',
          size: blob.size,
          durationSec,
          dataUrl,
          createdAt: new Date().toISOString(),
        },
      ])
    } catch (err) {
      URL.revokeObjectURL(url)
      setAudioError(err?.message || 'Unable to prepare audio clip.')
    }
  }

  const stopTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }

  const startRecording = async () => {
    setAudioError('')
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioError('Audio recording is not supported in this browser.')
      return
    }
    if (!window.MediaRecorder) {
      setAudioError('MediaRecorder is not available in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      recordingStartRef.current = Date.now()
      setRecordingSeconds(0)
      setIsRecording(true)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
        addAudioClip(blob)
        chunksRef.current = []
        stopTracks()
      }

      mediaRecorder.start()
      timerRef.current = setInterval(() => {
        if (recordingStartRef.current) {
          const elapsed = Math.floor((Date.now() - recordingStartRef.current) / 1000)
          setRecordingSeconds(elapsed)
        }
      }, 500)
    } catch (err) {
      setAudioError('Microphone permission denied or unavailable.')
      stopTracks()
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRecording(false)
  }

  const handleAudioUpload = async (e) => {
    const input = e.target
    const files = Array.from(input.files || [])
    if (files.length === 0) {
      return
    }
    try {
      for (const file of files) {
        const url = URL.createObjectURL(file)
        const dataUrl = await readBlobAsDataUrl(file)
        setAudioClips((prev) => [
          ...prev,
          {
            id: `${file.name}-${file.size}-${file.lastModified}`,
            name: file.name,
            url,
            type: file.type || 'audio/*',
            size: file.size,
            durationSec: 0,
            dataUrl,
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } catch (err) {
      setAudioError(err?.message || 'Failed to upload audio file.')
    } finally {
      input.value = ''
    }
  }

  const handleRemoveClip = (clipId) => {
    setAudioClips((prev) => {
      const clip = prev.find((item) => item.id === clipId)
      if (clip && clip.url) {
        URL.revokeObjectURL(clip.url)
      }
      return prev.filter((item) => item.id !== clipId)
    })
  }

  const DESCRIPTION_MIN_LENGTH = 5

  const handleSubmit = async (e) => {
    e.preventDefault()
    const storedUserJson = localStorage.getItem('migticrm_user')
    const storedUser = storedUserJson ? JSON.parse(storedUserJson) : null
    const createdBy = storedUser?._id ?? user?.id ?? user?._id
    if (!createdBy) {
      toastError('Unable to determine current user. Please log in again.')
      return
    }
    if (!industryId) {
      toastError('Please select or create an industry.')
      return
    }
    const desc = (formData.description || '').trim()
    if (desc.length < DESCRIPTION_MIN_LENGTH) {
      setDescriptionError(`Description must be at least ${DESCRIPTION_MIN_LENGTH} characters long.`)
      setDescriptionTouched(true)
      toastError(`Description must be at least ${DESCRIPTION_MIN_LENGTH} characters long.`)
      return
    }
    setDescriptionError('')
    try {
      setSubmitting(true)
      setError('')
      const files = audioClips.map((clip) => clip.dataUrl).filter(Boolean)
      await rawQueryService.create({
        ...formData,
        industryId: industryId,
        created_by: createdBy,
        files,
      })
      toastSuccess('Raw query created successfully')
      navigate('/raw-query')
    } catch (err) {
      toastError(err?.message || 'Failed to create raw query')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Add Raw Query</strong>
          </CCardHeader>
          <CCardBody>
            <CForm onSubmit={handleSubmit}>
              <CRow>
                <CCol xs={12} md={6}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="title">Title</CFormLabel>
                    <CFormInput
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Short title for the raw query"
                      required
                    />
                  </div>
                </CCol>
                <CCol xs={12} md={6}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="priority">Priority</CFormLabel>
                    <CFormSelect
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </CFormSelect>
                  </div>
                </CCol>
              </CRow>
              <CRow>
                <CCol xs={12}>
                  <div className="mb-3 position-relative" ref={dropdownRef}>
                    <CFormLabel htmlFor="industrySearch">Industry</CFormLabel>
                    <CFormInput
                      id="industrySearch"
                      type="text"
                      value={industrySearch}
                      onChange={(e) => setIndustrySearch(e.target.value)}
                      onFocus={() => setIndustryDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIndustryDropdownOpen(false), 200)}
                      placeholder="Search industry or create new..."
                      required={!industryId && !createNewIndustry}
                      disabled={!!industryId && !createNewIndustry}
                      autoComplete="off"
                    />
                    {industryId && !createNewIndustry && (
                      <div className="mt-2">
                        <CButton color="link" size="sm" type="button" onClick={handleClearIndustry}>
                          Change industry
                        </CButton>
                      </div>
                    )}
                    {industryDropdownOpen && (
                      <div
                        className="position-absolute w-100 bg-white border rounded mt-1 shadow-sm"
                        style={{ zIndex: 10, maxHeight: 280, overflowY: 'auto' }}
                      >
                        <CListGroup flush>
                          <CListGroupItem
                            component="button"
                            type="button"
                            className="text-start fw-semibold text-primary"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handleCreateNewIndustry()
                            }}
                          >
                            + Create new industry
                          </CListGroupItem>
                          {industrySearchLoading && (
                            <CListGroupItem className="text-muted">Searching...</CListGroupItem>
                          )}
                          {!industrySearchLoading && industrySearchResults.length === 0 && industrySearch.trim() && (
                            <CListGroupItem className="text-muted">No industries found. Try "Create new".</CListGroupItem>
                          )}
                          {!industrySearchLoading &&
                            industrySearchResults.map((industry) => (
                              <CListGroupItem
                                key={industry._id || industry.id}
                                component="button"
                                type="button"
                                className="text-start"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  handleSelectIndustry(industry)
                                }}
                              >
                                <div className="fw-semibold">{industry.name}</div>
                                {(industry.location || industry.email) && (
                                  <div className="text-muted small">
                                    {[industry.location, industry.email].filter(Boolean).join(' • ')}
                                  </div>
                                )}
                              </CListGroupItem>
                            ))}
                        </CListGroup>
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>

              {/* Editable industry details when an industry is selected */}
              {industryId && industryDetails && !createNewIndustry && (
                <CRow>
                  <CCol xs={12}>
                    <CCard className="mb-4">
                      <CCardHeader className="d-flex justify-content-between align-items-center">
                        <strong>Industry details (editable)</strong>
                        <CButton color="primary" size="sm" onClick={handleSaveIndustryDetails} disabled={savingIndustry}>
                          {savingIndustry ? 'Saving...' : 'Save changes'}
                        </CButton>
                      </CCardHeader>
                      <CCardBody>
                        <CForm onSubmit={handleSaveIndustryDetails}>
                          <CRow>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Industry Name</CFormLabel>
                                <CFormInput
                                  value={industryEditForm.name}
                                  onChange={(e) => setIndustryEditForm((f) => ({ ...f, name: e.target.value }))}
                                  placeholder="Industry name"
                                />
                              </div>
                            </CCol>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Zone</CFormLabel>
                                <CFormSelect
                                  value={industryEditForm.area}
                                  onChange={(e) => setIndustryEditForm((f) => ({ ...f, area: e.target.value }))}
                                >
                                  <option value="">Select zone</option>
                                  {areas.map((a) => (
                                    <option key={a._id || a.id} value={a._id || a.id}>
                                      {a.name}
                                      {a.city ? ` - ${a.city}` : ''}
                                    </option>
                                  ))}
                                </CFormSelect>
                              </div>
                            </CCol>
                          </CRow>
                          <CRow>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Location</CFormLabel>
                                <CFormInput
                                  value={industryEditForm.location}
                                  onChange={(e) => setIndustryEditForm((f) => ({ ...f, location: e.target.value }))}
                                  placeholder="Location"
                                />
                              </div>
                            </CCol>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Email</CFormLabel>
                                <CFormInput
                                  type="email"
                                  value={industryEditForm.email}
                                  onChange={(e) => setIndustryEditForm((f) => ({ ...f, email: e.target.value }))}
                                  placeholder="Email"
                                />
                              </div>
                            </CCol>
                          </CRow>
                          <CRow>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Purchase Manager Name</CFormLabel>
                                <CFormInput
                                  value={industryEditForm.purchase_manager_name}
                                  onChange={(e) =>
                                    setIndustryEditForm((f) => ({ ...f, purchase_manager_name: e.target.value }))
                                  }
                                  placeholder="Name"
                                />
                              </div>
                            </CCol>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Purchase Manager Phone</CFormLabel>
                                <CFormInput
                                  value={industryEditForm.purchase_manager_phone}
                                  onChange={(e) =>
                                    setIndustryEditForm((f) => ({ ...f, purchase_manager_phone: e.target.value }))
                                  }
                                  placeholder="Phone"
                                />
                              </div>
                            </CCol>
                          </CRow>
                          <CRow>
                            <CCol xs={12}>
                              <div className="mb-3">
                                <CFormLabel>Address</CFormLabel>
                                <CFormTextarea
                                  rows={2}
                                  value={industryEditForm.address}
                                  onChange={(e) => setIndustryEditForm((f) => ({ ...f, address: e.target.value }))}
                                  placeholder="Address"
                                />
                              </div>
                            </CCol>
                          </CRow>
                        </CForm>
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>
              )}

              {/* Create new industry form */}
              {createNewIndustry && (
                <CRow>
                  <CCol xs={12}>
                    <CCard className="mb-4 border-primary">
                      <CCardHeader>
                        <strong>Create new industry</strong>
                      </CCardHeader>
                      <CCardBody>
                        <CForm onSubmit={handleCreateIndustry}>
                          <CRow>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Industry Name *</CFormLabel>
                                <CFormInput
                                  value={industryEditForm.name}
                                  onChange={(e) => setIndustryEditForm((f) => ({ ...f, name: e.target.value }))}
                                  placeholder="Industry name"
                                  required
                                />
                              </div>
                            </CCol>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Zone</CFormLabel>
                                <CFormSelect
                                  value={industryEditForm.area}
                                  onChange={(e) => setIndustryEditForm((f) => ({ ...f, area: e.target.value }))}
                                >
                                  <option value="">Select zone</option>
                                  {areas.map((a) => (
                                    <option key={a._id || a.id} value={a._id || a.id}>
                                      {a.name}
                                      {a.city ? ` - ${a.city}` : ''}
                                    </option>
                                  ))}
                                </CFormSelect>
                              </div>
                            </CCol>
                          </CRow>
                          <CRow>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Location</CFormLabel>
                                <CFormInput
                                  value={industryEditForm.location}
                                  onChange={(e) => setIndustryEditForm((f) => ({ ...f, location: e.target.value }))}
                                  placeholder="Location"
                                />
                              </div>
                            </CCol>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Email</CFormLabel>
                                <CFormInput
                                  type="email"
                                  value={industryEditForm.email}
                                  onChange={(e) => setIndustryEditForm((f) => ({ ...f, email: e.target.value }))}
                                  placeholder="Email"
                                />
                              </div>
                            </CCol>
                          </CRow>
                          <CRow>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Purchase Manager Name</CFormLabel>
                                <CFormInput
                                  value={industryEditForm.purchase_manager_name}
                                  onChange={(e) =>
                                    setIndustryEditForm((f) => ({ ...f, purchase_manager_name: e.target.value }))
                                  }
                                  placeholder="Name"
                                />
                              </div>
                            </CCol>
                            <CCol md={6}>
                              <div className="mb-3">
                                <CFormLabel>Purchase Manager Phone</CFormLabel>
                                <CFormInput
                                  value={industryEditForm.purchase_manager_phone}
                                  onChange={(e) =>
                                    setIndustryEditForm((f) => ({ ...f, purchase_manager_phone: e.target.value }))
                                  }
                                  placeholder="Phone"
                                />
                              </div>
                            </CCol>
                          </CRow>
                          <CRow>
                            <CCol xs={12}>
                              <div className="mb-3">
                                <CFormLabel>Address</CFormLabel>
                                <CFormTextarea
                                  rows={2}
                                  value={industryEditForm.address}
                                  onChange={(e) => setIndustryEditForm((f) => ({ ...f, address: e.target.value }))}
                                  placeholder="Address"
                                />
                              </div>
                            </CCol>
                          </CRow>
                          <div className="d-flex gap-2">
                            <CButton
                              color="secondary"
                              type="button"
                              onClick={() => {
                                setCreateNewIndustry(false)
                                setIndustryEditForm(INITIAL_INDUSTRY_EDIT)
                              }}
                            >
                              Cancel
                            </CButton>
                            <CButton color="primary" type="submit" disabled={creatingIndustry}>
                              {creatingIndustry ? 'Creating...' : 'Create industry'}
                            </CButton>
                          </div>
                        </CForm>
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>
              )}
              <CRow>
                <CCol xs={12}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="description">Description</CFormLabel>
                    <CFormTextarea
                      id="description"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => {
                        setFormData({ ...formData, description: e.target.value })
                        setDescriptionError('')
                      }}
                      onBlur={() => {
                        setDescriptionTouched(true)
                        const trimmed = (formData.description || '').trim()
                        if (trimmed.length > 0 && trimmed.length < DESCRIPTION_MIN_LENGTH) {
                          setDescriptionError(`Description must be at least ${DESCRIPTION_MIN_LENGTH} characters long.`)
                        } else {
                          setDescriptionError('')
                        }
                      }}
                      placeholder="Enter description (at least 5 characters)"
                      required
                      className={descriptionError ? 'is-invalid' : ''}
                    />
                    {descriptionError && (
                      <div className="invalid-feedback d-block">{descriptionError}</div>
                    )}
                    {descriptionTouched && !descriptionError && (formData.description || '').trim().length > 0 && (
                      <div className="form-text">
                        {(formData.description || '').trim().length} characters
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>
              <CRow>
                <CCol xs={12}>
                  <div className="mb-3">
                    <CFormLabel>Voice Note (WhatsApp style)</CFormLabel>
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                      <CButton
                        color={isRecording ? 'danger' : 'primary'}
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                      </CButton>
                      <span className="text-muted">
                        {isRecording ? `Recording ${formatDuration(recordingSeconds)}` : 'Ready to record'}
                      </span>
                      <CFormInput
                        type="file"
                        accept="audio/*"
                        multiple
                        onChange={handleAudioUpload}
                      />
                    </div>
                    {audioError && <p className="text-danger mb-2">{audioError}</p>}
                    {audioClips.length > 0 ? (
                      <div className="border rounded p-3">
                        {audioClips.map((clip) => (
                          <div key={clip.id} className="d-flex flex-wrap align-items-center gap-3 mb-2">
                            <audio controls src={clip.url} />
                            <div className="text-muted">
                              {clip.name}
                              {clip.durationSec ? ` • ${formatDuration(clip.durationSec)}` : ''}
                            </div>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => handleRemoveClip(clip.id)}
                            >
                              Remove
                            </CButton>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted mb-0">No voice notes attached yet.</p>
                    )}
                  </div>
                </CCol>
              </CRow>
              {error && <div className="text-danger mb-3">{error}</div>}
              <div className="d-flex gap-2">
                <CButton color="secondary" type="button" onClick={() => navigate('/raw-query')}>
                  Cancel
                </CButton>
                <CButton color="primary" type="submit" disabled={submitting || isRecording}>
                  {submitting ? 'Creating...' : 'Create'}
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default RawQueryCreate
