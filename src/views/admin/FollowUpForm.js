import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
    CFormFeedback,
} from '@coreui/react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import queryService from '../../services/queryService'

const schema = yup.object({
    title: yup.string().trim().required('Title is required'),
    dueDate: yup.string().required('Due date is required'),
    type: yup.string().required(),
    priority: yup.string().required(),
    status: yup.string().required(),
    description: yup.string().nullable(),
})

const FollowUpForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)

    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            title: '',
            dueDate: '',
            type: 'query',
            referenceId: '',
            priority: 'normal',
            status: 'pending',
            description: '',
        },
    })


    useEffect(() => {
        const fetchData = async () => {
            if (!isEdit) return

            try {
                setLoading(true)

                const response = await queryService.getById(id)

                console.log("Full API Response:", response)
                const data = response.data?.data || response.data

                reset({
                    title: data?.companyInfo.name || '',
                    dueDate: data?.createdAt
                        ? new Date(data?.createdAt).toLocaleDateString()
                  : '-',
                    type: data?.type || 'query',
                    referenceId: data?.referenceId || '',
                    priority: data?.priority || 'normal',
                    status: data?.status || 'pending',
                    description: data?.description || '',
                })

            } catch (error) {
                console.error('Failed to fetch data', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id, isEdit, reset])


    const onSubmit = async (data) => {
        try {
            const payload = {
                ...data,
                referenceId: data.referenceId
                    ? parseInt(data.referenceId)
                    : null,
                dueDate: new Date(data.dueDate).toISOString(),
            }

            if (isEdit) {
                await queryService.update(id, payload)
            } else {
                await queryService.create(payload)
            }

            navigate('/follow-up')

        } catch (error) {
            console.error(error)
        }
    }

    return (
        <CRow>
            <CCol xs={12}>
                <CCard>
                    <CCardHeader className="d-flex justify-content-between">
                        <strong>{isEdit ? 'Edit' : 'Add'} Follow-up</strong>
                        <CButton
                            color="secondary"
                            onClick={() => navigate('/follow-up')}
                        >
                            Back
                        </CButton>
                    </CCardHeader>

                    <CCardBody>
                        <CForm onSubmit={handleSubmit(onSubmit)}>
                            <CRow>
                                <CCol md={6}>
                                    <CFormLabel>Title *</CFormLabel>
                                    <CFormInput
                                        {...register('title')}
                                        invalid={!!errors.title}
                                    />
                                    <CFormFeedback invalid>
                                        {errors.title?.message}
                                    </CFormFeedback>
                                </CCol>

                                <CCol md={6}>
                                    <CFormLabel>Due Date *</CFormLabel>
                                    <CFormInput
                                        type="date"
                                        {...register('dueDate')}
                                        invalid={!!errors.dueDate}
                                    />
                                    <CFormFeedback invalid>
                                        {errors.dueDate?.message}
                                    </CFormFeedback>
                                </CCol>
                            </CRow>

                            <CRow className="mt-3">
                                <CCol md={6}>
                                    <CFormLabel>Type</CFormLabel>
                                    <CFormSelect {...register('type')}>
                                        <option value="query">Query</option>
                                        <option value="quotation">Quotation</option>
                                        <option value="purchase_order">Purchase Order</option>
                                        <option value="general">General</option>
                                    </CFormSelect>
                                </CCol>

                                <CCol md={6}>
                                    <CFormLabel>Priority</CFormLabel>
                                    <CFormSelect {...register('priority')}>
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                    </CFormSelect>
                                </CCol>
                            </CRow>

                            {isEdit && (
                                <div className="mt-3">
                                    <CFormLabel>Status</CFormLabel>
                                    <CFormSelect {...register('status')}>
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                    </CFormSelect>
                                </div>
                            )}

                            <div className="mt-3">
                                <CFormLabel>Description</CFormLabel>
                                <CFormTextarea
                                    rows={3}
                                    {...register('description')}
                                />
                            </div>

                            <div className="d-flex gap-2 mt-4">
                                <CButton
                                    type="button"
                                    color="secondary"
                                    onClick={() => navigate('/follow-up')}
                                >
                                    Cancel
                                </CButton>
                                <CButton type="submit" color="primary">
                                    {isEdit ? 'Update' : 'Create'}
                                </CButton>
                            </div>
                        </CForm>
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    )
}

export default FollowUpForm
