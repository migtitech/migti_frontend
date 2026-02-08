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
} from '@coreui/react'
import { useAuth } from '../../context/AuthContext'
import rawQueryService from '../../services/rawQueryService'
import industryService from '../../services/industryService'
import { toastSuccess, toastError } from '../../utils/toast'

const RawQueryCreate = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    priority: 'medium',
    description: '',
  })
  const [industries, setIndustries] = useState([])
  const [industriesLoading, setIndustriesLoading] = useState(false)
  const [industryId, setIndustryId] = useState('')
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
    const fetchIndustries = async () => {
      setIndustriesLoading(true)
      try {
        const response = await industryService.getAll({ pageSize: 100 })
        const payload = response?.data || response
        setIndustries(payload?.industries || [])
      } catch (err) {
        toastError(err?.message || 'Failed to load industries')
        setIndustries([])
      } finally {
        setIndustriesLoading(false)
      }
    }
    fetchIndustries()
  }, [])

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const createdBy = user?.id || user?._id
    if (!createdBy) {
      toastError('Unable to determine current user. Please log in again.')
      return
    }
    if (!industryId) {
      toastError('Please select an industry.')
      return
    }
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
                  <div className="mb-3">
                    <CFormLabel htmlFor="industryId">Industry</CFormLabel>
                    <CFormSelect
                      id="industryId"
                      value={industryId}
                      onChange={(e) => setIndustryId(e.target.value)}
                      required
                      disabled={industriesLoading}
                    >
                      <option value="">
                        {industriesLoading ? 'Loading industries...' : 'Select industry'}
                      </option>
                      {industries.map((industry) => (
                        <option key={industry._id || industry.id} value={industry._id || industry.id}>
                          {industry.name}
                          {industry.location ? ` (${industry.location})` : ''}
                        </option>
                      ))}
                    </CFormSelect>
                    {industryId && (
                      <div className="mt-2 text-muted small">
                        Selected: {industries.find((i) => (i._id || i.id) === industryId)?.name || industryId}
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
