import React, { use, useEffect } from 'react'
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
import { useData } from '../../context/DataContext'
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

    const { followUps, addFollowUp, updateFollowUp, queries, quotations, purchaseOrders } =
        useData()

    const handleSaveQuery = async (data) => {
        try {
            if (isEdit) {
                await queryService.update(id, data)
            } else {
                await queryService.create(data)
            }

            console.log('Query saved successfully', data)
            // navigate('/queries')

        } catch (error) {
            console.error(error)
        }
    }



    const followUp = isEdit
        ? followUps?.find((f) => f.id === parseInt(id))
        : null

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
        if (isEdit && followUp) {
            reset({
                ...followUp,
                dueDate: followUp.dueDate
                    ? followUp.dueDate.split('T')[0]
                    : '',
            })
        }
    }, [isEdit, followUp, reset])


    const onSubmit = (data) => {
        const payload = {
            ...data,
            referenceId: data.referenceId
                ? parseInt(data.referenceId)
                : null,
            dueDate: new Date(data.dueDate).toISOString(),
        }

        isEdit
            ? updateFollowUp(followUp.id, payload)
            : addFollowUp(payload)

        navigate('/follow-up')
    }


    const getReferenceOptions = (type) => {
        switch (type) {
            case 'query':
                return queries?.map((q) => ({
                    id: q.id,
                    label: `Query: ${q.subject}`,
                }))
            case 'quotation':
                return quotations?.map((q) => ({
                    id: q.id,
                    label: `QT-${String(q.id).padStart(4, '0')}`,
                }))
            case 'purchase_order':
                return purchaseOrders?.map((o) => ({
                    id: o.id,
                    label: `PO-${String(o.id).padStart(4, '0')}`,
                }))
            default:
                return []
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

                        <CForm onSubmit={handleSubmit(handleSaveQuery)}>

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

                            {/* TYPE + PRIORITY */}
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

                            {/* STATUS (only edit) */}
                            {isEdit && (
                                <div className="mt-3">
                                    <CFormLabel>Status</CFormLabel>
                                    <CFormSelect {...register('status')}>
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                    </CFormSelect>
                                </div>
                            )}

                            {/* DESCRIPTION */}
                            <div className="mt-3">
                                <CFormLabel>Description</CFormLabel>
                                <CFormTextarea rows={3} {...register('description')} />
                            </div>

                            {/* BUTTONS */}
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
