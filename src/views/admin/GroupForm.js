import {
    CButton, CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CForm,
    CFormFeedback,
    CFormInput,
    CFormLabel,
    CFormTextarea,
    CRow
} from "@coreui/react"
import { useNavigate } from "react-router-dom"
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useForm } from "react-hook-form"
import { useParams } from "react-router-dom"
import { useEffect } from "react"
import { useData } from '../../context/DataContext'



const groupSchema = yup.object({
    groupname: yup.string().required('Group name is required').min(2).max(50),
    sku: yup.string().required('Sku is required').min(2).max(20),
    description: yup.string(),
})

const defaultValues = {
    groupname: '',
    sku: '',
    description: '',
}

const GroupForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const { initialGroups } = useData()
    const isEdit = Boolean(id)
    console.log("id", id)


    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        defaultValues,
        resolver: yupResolver(groupSchema)
    })

    const onSubmit = (data) => {
        console.log(data)
        navigate("/groups")
    }

    useEffect(() => {
        if (id && initialGroups?.length) {
            const existingGroup = initialGroups.find(
                g => g.id === Number(id)
                //   console.log("existingGroup", existingGroup)

            )

            if (existingGroup) {
                reset({
                    groupname: existingGroup.groupname,
                    sku: existingGroup.sku,
                    description: existingGroup.description,
                })
            }
        }
    }, [id, initialGroups, reset])


    return (
        <>
            <CRow>
                <CCol>
                    <CCard>
                        <CCardHeader>
                            <strong>Add Group</strong>
                        </CCardHeader>
                        <CCardBody>
                            <CForm onSubmit={handleSubmit(onSubmit)}>
                                <CRow className="mb-3">
                                    <CCol md={6}>
                                        <CFormLabel>Group Name *</CFormLabel>
                                        <CFormInput name="groupname"
                                            {...register('groupname')}
                                            invalid={!!errors.groupname}
                                            placeholder="Enter group name"
                                        />
                                        <CFormFeedback invalid>
                                            {errors.groupname?.message}
                                        </CFormFeedback>
                                    </CCol>
                                    <CCol md={6}>
                                        <CFormLabel>Sku *</CFormLabel>
                                        <CFormInput name="sku"
                                            {...register('sku')}
                                            invalid={!!errors.sku}
                                            placeholder="Enter group sku"
                                        />
                                        <CFormFeedback invalid>
                                            {errors.sku?.message}
                                        </CFormFeedback>
                                    </CCol>
                                </CRow>
                                <CRow className="mt-3">
                                    <CCol>
                                        <CFormLabel>Description</CFormLabel>
                                        <CFormTextarea name="description"
                                            {...register('description')}
                                            invalid={!!errors.description}
                                            placeholder="Enter group description" />
                                        <CFormFeedback invalid>
                                            {errors.description?.message}
                                        </CFormFeedback>

                                    </CCol>
                                </CRow>
                                <div className="d-flex justify-content-end gap-2 pt-2 mt-3" >
                                    <CButton color="secondary" onClick={() => navigate("/groups")}>Cancle</CButton>
                                    <CButton color="primary" type="submit">Submit</CButton>
                                </div>
                            </CForm>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>
        </>
    )
}
export default GroupForm