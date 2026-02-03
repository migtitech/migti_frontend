import React, { useEffect, useMemo } from 'react'
import {
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const EmployeeFormModal = ({
  visible,
  onClose,
  onSubmit,
  submitting,
  branches,
  roleOptions,
  isEditing,
  defaultValues,
}) => {
  const schema = useMemo(
    () =>
      yup.object({
        name: yup.string().required('Name is required').min(2).max(100),
        email: yup.string().email('Enter a valid email').required('Email is required'),
        phone: yup
          .string()
          .required('Phone is required')
          .matches(/^\d{5,20}$/, 'Phone must be 5-20 digits'),
        role: yup.string().required('Role is required'),
        designation: yup.string().required('Designation is required').min(2).max(100),
        address: yup.string().required('Address is required').min(2).max(500),
        idnumber: yup.string().required('ID number is required').min(2).max(50),
        password: isEditing
          ? yup.string().min(6, 'Password must be at least 6 characters')
          : yup.string().required('Password is required').min(6),
        branchId: yup.string().required('Branch is required'),
      }),
    [isEditing]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit(onSubmit)}>
        <CModalBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="name">Full Name *</CFormLabel>
                <CFormInput id="name" {...register('name')} invalid={!!errors.name} required />
                {errors.name && <div className="text-danger small">{errors.name.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="email">Email *</CFormLabel>
                <CFormInput
                  type="email"
                  id="email"
                  {...register('email')}
                  invalid={!!errors.email}
                  required
                />
                {errors.email && <div className="text-danger small">{errors.email.message}</div>}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="phone">Phone *</CFormLabel>
                <CFormInput
                  id="phone"
                  inputMode="numeric"
                  pattern="\d*"
                  {...register('phone')}
                  invalid={!!errors.phone}
                  required
                />
                {errors.phone && <div className="text-danger small">{errors.phone.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="role">Role *</CFormLabel>
                <CFormSelect id="role" {...register('role')} invalid={!!errors.role} required>
                  <option value="">Select Role</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </CFormSelect>
                {errors.role && <div className="text-danger small">{errors.role.message}</div>}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="branchId">Branch *</CFormLabel>
                <CFormSelect id="branchId" {...register('branchId')} invalid={!!errors.branchId} required>
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </CFormSelect>
                {errors.branchId && <div className="text-danger small">{errors.branchId.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="designation">Designation *</CFormLabel>
                <CFormInput
                  id="designation"
                  {...register('designation')}
                  invalid={!!errors.designation}
                  required
                />
                {errors.designation && (
                  <div className="text-danger small">{errors.designation.message}</div>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="idnumber">ID Number *</CFormLabel>
                <CFormInput id="idnumber" {...register('idnumber')} invalid={!!errors.idnumber} required />
                {errors.idnumber && <div className="text-danger small">{errors.idnumber.message}</div>}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel htmlFor="password">
                  Password {isEditing ? '(leave blank to keep)' : '*'}
                </CFormLabel>
                <CFormInput
                  type="password"
                  id="password"
                  {...register('password')}
                  invalid={!!errors.password}
                  required={!isEditing}
                />
                {errors.password && <div className="text-danger small">{errors.password.message}</div>}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel htmlFor="address">Address *</CFormLabel>
                <CFormInput id="address" {...register('address')} invalid={!!errors.address} required />
                {errors.address && <div className="text-danger small">{errors.address.message}</div>}
              </div>
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={onClose}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

export default EmployeeFormModal
