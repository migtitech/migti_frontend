import React, { useEffect, useRef, useState } from 'react'
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
import { toastSuccess, toastError } from '../../utils/toast'
import supplierService from '../../services/supplierService'

const RawQueryCreate = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    companyInfo: '',
    priority: 'medium',
    description: '',
  })
  const [companySearch, setCompanySearch] = useState('')
  const [companyMode, setCompanyMode] = useState('supplier')
  const [manualCompanyInfo, setManualCompanyInfo] = useState('')
  const [supplierOptions, setSupplierOptions] = useState([])
  const [supplierLoading, setSupplierLoading] = useState(false)
  const [supplierError, setSupplierError] = useState('')
  const [showSupplierOptions, setShowSupplierOptions] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
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

  useEffect(() => {
    audioClipsRef.current = audioClips
  }, [audioClips])

  useEffect(() => {
    const term = companySearch.trim()
    const timer = setTimeout(() => {
      if (companyMode === 'supplier') {
        fetchSuppliers(term)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [companySearch, companyMode])

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

  const getSupplierLabel = (supplier) => {
    const name = supplier?.name || 'Unnamed supplier'
    const shopname = supplier?.shopname ? ` (${supplier.shopname})` : ''
    return `${name}${shopname}`
  }

  const fetchSuppliers = async (search = '') => {
    setSupplierLoading(true)
    setSupplierError('')
    try {
      const response = await supplierService.search({ search, limit: 5 })
      const payload = response?.data || response
      setSupplierOptions(payload?.suppliers || [])
    } catch (err) {
      setSupplierError(err?.message || 'Failed to fetch suppliers')
      setSupplierOptions([])
    } finally {
      setSupplierLoading(false)
    }
  }

  const handleSupplierSelect = (supplier) => {
    const label = getSupplierLabel(supplier)
    setSelectedSupplier(supplier)
    setCompanySearch(label)
    setFormData({ ...formData, companyInfo: label })
    setCompanyMode('supplier')
    setShowSupplierOptions(false)
  }

  const handleOtherSelect = () => {
    setCompanyMode('other')
    setSelectedSupplier(null)
    setCompanySearch('')
    setSupplierOptions([])
    setShowSupplierOptions(false)
    setFormData({ ...formData, companyInfo: manualCompanyInfo })
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const createdBy = user?.id || user?._id
    if (!createdBy) {
      toastError('Unable to determine current user. Please log in again.')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      const files = audioClips.map((clip) => clip.dataUrl).filter(Boolean)
      await rawQueryService.create({
        ...formData,
        created_by: createdBy,
        files,
        supplierId: companyMode === 'supplier' ? selectedSupplier?._id : null,
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
                  <div className="mb-3">
                    <CFormLabel htmlFor="companyInfo">Company</CFormLabel>
                    <div className="position-relative">
                      <CFormInput
                        id="companyInfo"
                        value={companySearch}
                        onChange={(e) => {
                          setCompanySearch(e.target.value)
                          setFormData({ ...formData, companyInfo: e.target.value })
                          setSelectedSupplier(null)
                          setShowSupplierOptions(true)
                          setCompanyMode('supplier')
                        }}
                        onFocus={() => {
                          setShowSupplierOptions(true)
                          if (!supplierOptions.length && companyMode === 'supplier') {
                            fetchSuppliers(companySearch.trim())
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowSupplierOptions(false), 150)
                        }}
                        placeholder="Search supplier or company..."
                        required={companyMode === 'supplier'}
                        disabled={companyMode === 'other'}
                      />
                      {showSupplierOptions && (
                        <div
                          className="position-absolute w-100 bg-white border rounded mt-1"
                          style={{ zIndex: 10, maxHeight: 240, overflowY: 'auto' }}
                        >
                          {supplierLoading && (
                            <div className="px-3 py-2 text-muted">Searching suppliers...</div>
                          )}
                          {supplierError && !supplierLoading && (
                            <div className="px-3 py-2 text-danger">{supplierError}</div>
                          )}
                          {!supplierLoading && !supplierError && supplierOptions.length === 0 && (
                            <div className="px-3 py-2 text-muted">No suppliers found.</div>
                          )}
                          {!supplierLoading && !supplierError && supplierOptions.length > 0 && (
                            <CListGroup flush>
                              <CListGroupItem
                                component="button"
                                type="button"
                                className="text-start fw-semibold"
                                onMouseDown={handleOtherSelect}
                              >
                                Other (manual entry)
                              </CListGroupItem>
                              {supplierOptions.map((supplier) => (
                                <CListGroupItem
                                  key={supplier._id || supplier.id}
                                  component="button"
                                  type="button"
                                  className="text-start"
                                  onMouseDown={() => handleSupplierSelect(supplier)}
                                >
                                  <div className="fw-semibold">{getSupplierLabel(supplier)}</div>
                                  <div className="text-muted small">
                                    {supplier.email || supplier.phone_1 || supplier.phone_2 || ''}
                                  </div>
                                </CListGroupItem>
                              ))}
                            </CListGroup>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedSupplier && (
                      <div className="mt-2 text-muted small">
                        Selected: {getSupplierLabel(selectedSupplier)}
                      </div>
                    )}
                    {companyMode === 'other' && (
                      <div className="mt-3">
                        <CFormLabel htmlFor="manualCompanyInfo">Company Info</CFormLabel>
                        <CFormTextarea
                          id="manualCompanyInfo"
                          rows={2}
                          value={manualCompanyInfo}
                          onChange={(e) => {
                            setManualCompanyInfo(e.target.value)
                            setFormData({ ...formData, companyInfo: e.target.value })
                          }}
                          placeholder="Company name, contact details, address, etc."
                          required
                        />
                        <div className="mt-2">
                          <CButton
                            color="link"
                            type="button"
                            onClick={() => {
                              setCompanyMode('supplier')
                              setManualCompanyInfo('')
                              setFormData({ ...formData, companyInfo: '' })
                            }}
                          >
                            Search supplier instead
                          </CButton>
                        </div>
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>
              <CRow>
                <CCol xs={12}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="description">Description</CFormLabel>
                    <CFormTextarea
                      id="description"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    />
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
