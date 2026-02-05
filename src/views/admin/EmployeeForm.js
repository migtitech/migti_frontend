import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
} from '@coreui/react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import employeeService from '../../services/employeeService'
import branchService from '../../services/branchService'
import { Loader } from '../../components'
import { withMinimumDelay } from '../../utils/withMinimumDelay'
import EmployeePersonalInfoSection from './employees/EmployeePersonalInfoSection'
import EmployeeCompanyInfoSection from './employees/EmployeeCompanyInfoSection'
import EmployeeAssetsSection from './employees/EmployeeAssetsSection'
import EmployeeFormActions from './employees/EmployeeFormActions'
import EmployeeAccountDetailsSection from './employees/EmployeeAccountDetailsSection'

const EmployeeForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const roleOptions = useMemo(
    () => ['hod', 'sales', 'purchase', 'finance', 'delivery'],
    []
  )

  const schema = useMemo(
    () =>
      yup.object({
        name: yup.string().required('Name is required').min(2).max(100),
        email: yup.string().email('Enter a valid email').required('Email is required'),
        phone: yup
          .string()
          .required('Phone is required')
          .matches(/^\d{5,20}$/, 'Phone must be 5-20 digits'),
        fatherName: yup.string().required("Father's name is required").min(2).max(100),
        motherName: yup.string().required("Mother's name is required").min(2).max(100),
        pincode: yup
          .string()
          .required('Pincode is required')
          .matches(/^\d{4,10}$/, 'Pincode must be 4-10 digits'),
        hasBike: yup.string().oneOf(['yes', 'no']).required('Please select an option'),
        hasDrivingLicense: yup.string().oneOf(['yes', 'no']).required('Please select an option'),
        companyEmail: yup.string().email('Enter a valid email').required('Company email is required'),
        companyPhone: yup
          .string()
          .required('Company phone is required')
          .matches(/^\d{5,20}$/, 'Phone must be 5-20 digits'),
        role: yup.string().required('Role is required'),
        designation: yup.string().required('Designation is required').min(2).max(100),
        address: yup.string().required('Address is required').min(2).max(500),
        idnumber: yup.string().required('ID number is required').min(2).max(50),
        salaryType: yup.string().required('Salary type is required'),
        salary: yup
          .number()
          .typeError('Salary is required')
          .min(0, 'Salary must be 0 or more')
          .required('Salary is required'),
        bankDetails: yup.object({
          accountNumber: yup
            .string()
            .required('Account number is required')
            .matches(/^\d{6,20}$/, 'Account number must be 6-20 digits'),
          ifscCode: yup
            .string()
            .required('IFSC code is required')
            .matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, 'Enter a valid IFSC code'),
          bankName: yup.string().required('Bank name is required').min(2).max(100),
          accountHolderName: yup.string().required('Account holder name is required').min(2).max(100),
          upiDetails: yup.string().trim().nullable(),
        }),
        password: isEdit
          ? yup.string().min(6, 'Password must be at least 6 characters')
          : yup.string().required('Password is required').min(6),
        branchId: yup.string().required('Branch is required'),
        assets: yup.object({
          bike: yup.object({
            enabled: yup.boolean().default(false),
            model: yup.string().trim(),
            vehicleNumber: yup.string().trim(),
            providedDate: yup.string().trim(),
          }),
          laptop: yup.object({
            enabled: yup.boolean().default(false),
            modelNumber: yup.string().trim(),
            companyName: yup.string().trim(),
            configurationRam: yup.string().trim(),
            configurationRom: yup.string().trim(),
            storageType: yup.string().oneOf(['ssd', 'hdd', '']).default(''),
            providedDate: yup.string().trim(),
          }),
          mobile: yup.object({
            enabled: yup.boolean().default(false),
            companyName: yup.string().trim(),
            phoneType: yup.string().oneOf(['android', 'keypad', '']).default(''),
            imeiNumber: yup.string().trim(),
            modelNumber: yup.string().trim(),
            providedDate: yup.string().trim(),
          }),
          simCard: yup.object({
            enabled: yup.boolean().default(false),
            companyName: yup.string().trim(),
            number: yup.string().trim(),
            providedDate: yup.string().trim(),
          }),
        }),
      }),
    [isEdit],
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      fatherName: '',
      motherName: '',
      pincode: '',
      hasBike: 'no',
      hasDrivingLicense: 'no',
      companyEmail: '',
      companyPhone: '',
      role: '',
      branchId: '',
      designation: '',
      address: '',
      idnumber: '',
      salaryType: 'monthly',
      salary: '',
      password: '',
      bankDetails: {
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        accountHolderName: '',
        upiDetails: '',
      },
      assets: {
        bike: {
          enabled: false,
          model: '',
          vehicleNumber: '',
          providedDate: '',
        },
        laptop: {
          enabled: false,
          modelNumber: '',
          companyName: '',
          configurationRam: '',
          configurationRom: '',
          storageType: '',
          providedDate: '',
        },
        mobile: {
          enabled: false,
          companyName: '',
          phoneType: '',
          imeiNumber: '',
          modelNumber: '',
          providedDate: '',
        },
        simCard: {
          enabled: false,
          companyName: '',
          number: '',
          providedDate: '',
        },
      },
    },
  })

  const bikeEnabled = !!watch('assets.bike.enabled')
  const laptopEnabled = !!watch('assets.laptop.enabled')
  const mobileEnabled = !!watch('assets.mobile.enabled')
  const simCardEnabled = !!watch('assets.simCard.enabled')

  const normalizeId = (item) => ({
    ...item,
    id: item?.id || item?._id,
  })

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await branchService.getAll()
        const list = response?.data?.branches || response?.data || []
        const normalized = list.map(normalizeId)
        setBranches(normalized)
        if (!isEdit && normalized.length > 0) {
          reset((prev) => ({
            ...prev,
            branchId: prev.branchId || normalized[0].id,
          }))
        }
      } catch (err) {
        setError(err?.message || 'Failed to load branches')
      }
    }

    loadBranches()
  }, [isEdit, reset])

  useEffect(() => {
    const loadEmployee = async () => {
      if (!isEdit) {
        return
      }
      setLoading(true)
      setError('')
      try {
        const response = await withMinimumDelay(
          () => employeeService.getById(id),
          2000
        )
        const payload =
          response?.data?.employee ||
          response?.data?.data ||
          response?.data ||
          null
        const employee = payload ? normalizeId(payload) : null
        if (!employee) {
          setError('Employee not found')
          return
        }
        reset({
          name: employee.name || '',
          email: employee.email || '',
          phone: employee.phone || '',
          fatherName: employee.fatherName || '',
          motherName: employee.motherName || '',
          pincode: employee.pincode || '',
          hasBike: employee.hasBike || 'no',
          hasDrivingLicense: employee.hasDrivingLicense || 'no',
          companyEmail: employee.companyEmail || '',
          companyPhone: employee.companyPhone || '',
          role: employee.role || '',
          branchId: employee.branchId || '',
          designation: employee.designation || '',
          address: employee.address || '',
          idnumber: employee.idnumber || '',
          salaryType: employee.salaryType || 'monthly',
          salary: employee.salary ?? '',
          password: '',
          bankDetails: {
            accountNumber: employee?.bankDetails?.accountNumber || '',
            ifscCode: employee?.bankDetails?.ifscCode || '',
            bankName: employee?.bankDetails?.bankName || '',
            accountHolderName: employee?.bankDetails?.accountHolderName || '',
            upiDetails: employee?.bankDetails?.upiDetails || '',
          },
          assets: {
            bike: {
              enabled: employee?.assets?.bike?.enabled || false,
              model: employee?.assets?.bike?.model || '',
              vehicleNumber: employee?.assets?.bike?.vehicleNumber || '',
              providedDate: employee?.assets?.bike?.providedDate || '',
            },
            laptop: {
              enabled: employee?.assets?.laptop?.enabled || false,
              modelNumber: employee?.assets?.laptop?.modelNumber || '',
              companyName: employee?.assets?.laptop?.companyName || '',
              configurationRam: employee?.assets?.laptop?.configurationRam || '',
              configurationRom: employee?.assets?.laptop?.configurationRom || '',
              storageType: employee?.assets?.laptop?.storageType || '',
              providedDate: employee?.assets?.laptop?.providedDate || '',
            },
            mobile: {
              enabled: employee?.assets?.mobile?.enabled || false,
              companyName: employee?.assets?.mobile?.companyName || '',
              phoneType: employee?.assets?.mobile?.phoneType || '',
              imeiNumber: employee?.assets?.mobile?.imeiNumber || '',
              modelNumber: employee?.assets?.mobile?.modelNumber || '',
              providedDate: employee?.assets?.mobile?.providedDate || '',
            },
            simCard: {
              enabled: employee?.assets?.simCard?.enabled || false,
              companyName: employee?.assets?.simCard?.companyName || '',
              number: employee?.assets?.simCard?.number || '',
              providedDate: employee?.assets?.simCard?.providedDate || '',
            },
          },
        })
      } catch (err) {
        setError(err?.message || 'Failed to load employee')
      } finally {
        setLoading(false)
      }
    }

    loadEmployee()
  }, [id, isEdit, reset])

  const onSubmit = async (data) => {
    setSubmitting(true)
    setError('')
    try {
      const payload = { ...data }
      if (isEdit && !payload.password) {
        delete payload.password
      }
      if (isEdit) {
        await employeeService.update(id, payload)
      } else {
        await employeeService.create(payload)
      }
      console.log("form data", payload)
      navigate('/employees')
    } catch (err) {
      setError(err?.message || 'Failed to save employee')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading employee..." />
      </div>
    )
  }

  return (
    <CForm onSubmit={handleSubmit(onSubmit)}>
      {error && (
        <CAlert color="danger" dismissible onClose={() => setError('')}>
          {error}
        </CAlert>
      )}

      <CCard className="mb-4">
        {/* <EmployeeFormActions
        // submitting={submitting}
        // isEdit={isEdit}
        onCancel={() => navigate('/employees')}
      /> */}
      <CButton onClick={() => navigate('/employees')}>
        Back to Employee</CButton>
        <CCardHeader>
          <strong>{isEdit ? 'Edit Employee' : 'Add Employee'}</strong>
        </CCardHeader>
        <CCardBody>
          <EmployeePersonalInfoSection register={register} errors={errors} isEdit={isEdit} />
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Company Information</strong>
        </CCardHeader>
        <CCardBody>
          <EmployeeCompanyInfoSection
            register={register}
            errors={errors}
            roleOptions={roleOptions}
            branches={branches}
          />
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Company Assets</strong>
        </CCardHeader>
        <CCardBody>
          <EmployeeAssetsSection
            register={register}
            bikeEnabled={bikeEnabled}
            laptopEnabled={laptopEnabled}
            mobileEnabled={mobileEnabled}
            simCardEnabled={simCardEnabled}
          />
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader>
          <strong> Bank Account Details</strong>
        </CCardHeader>
        <CCardBody>
          <EmployeeAccountDetailsSection register={register} errors={errors} />
        </CCardBody>
      </CCard>

      <EmployeeFormActions
        submitting={submitting}
        isEdit={isEdit}
        onCancel={() => navigate('/employees')}
      />
    </CForm>
  )
}

export default EmployeeForm
