import React from 'react'
import {
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'

const EmployeeAssetsSection = ({
  register,
  bikeEnabled,
  laptopEnabled,
  mobileEnabled,
  simCardEnabled,
}) => (
  <>
    <CRow className="mb-3">
      <CCol md={3}>
        <CFormCheck
          id="assetBike"
          label="Bike"
          type="checkbox"
          {...register('assets.bike.enabled')}
        />
      </CCol>
      <CCol md={3}>
        <CFormCheck
          id="assetLaptop"
          label="Laptop"
          type="checkbox"
          {...register('assets.laptop.enabled')}
        />
      </CCol>
      <CCol md={3}>
        <CFormCheck
          id="assetMobile"
          label="Mobile"
          type="checkbox"
          {...register('assets.mobile.enabled')}
        />
      </CCol>
      <CCol md={3}>
        <CFormCheck
          id="assetSimCard"
          label="Sim Card"
          type="checkbox"
          {...register('assets.simCard.enabled')}
        />
      </CCol>
    </CRow>

    {bikeEnabled && (
      <>
        <div className="mb-2">
          <strong>Bike Details</strong>
        </div>
        <CRow>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="bikeModel">Model</CFormLabel>
              <CFormInput id="bikeModel" {...register('assets.bike.model')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="bikeVehicleNumber">Vehicle Number</CFormLabel>
              <CFormInput id="bikeVehicleNumber" {...register('assets.bike.vehicleNumber')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="bikeProvidedDate">Provided Date</CFormLabel>
              <CFormInput type="date" id="bikeProvidedDate" {...register('assets.bike.providedDate')} />
            </div>
          </CCol>
        </CRow>
      </>
    )}

    {laptopEnabled && (
      <>
        <div className="mb-2">
          <strong>Laptop Details</strong>
        </div>
        <CRow>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="laptopModel">Model Number</CFormLabel>
              <CFormInput id="laptopModel" {...register('assets.laptop.modelNumber')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="laptopCompany">Company Name</CFormLabel>
              <CFormInput id="laptopCompany" {...register('assets.laptop.companyName')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="laptopProvidedDate">Provided Date</CFormLabel>
              <CFormInput type="date" id="laptopProvidedDate" {...register('assets.laptop.providedDate')} />
            </div>
          </CCol>
        </CRow>
        <CRow>
          <CCol md={3}>
            <div className="mb-3">
              <CFormLabel htmlFor="laptopRam">RAM</CFormLabel>
              <CFormInput id="laptopRam" {...register('assets.laptop.configurationRam')} />
            </div>
          </CCol>
          <CCol md={3}>
            <div className="mb-3">
              <CFormLabel htmlFor="laptopRom">ROM</CFormLabel>
              <CFormInput id="laptopRom" {...register('assets.laptop.configurationRom')} />
            </div>
          </CCol>
          <CCol md={3}>
            <div className="mb-3">
              <CFormLabel htmlFor="laptopStorage">SSD/HDD</CFormLabel>
              <CFormSelect id="laptopStorage" {...register('assets.laptop.storageType')}>
                <option value="">Select</option>
                <option value="ssd">SSD</option>
                <option value="hdd">HDD</option>
              </CFormSelect>
            </div>
          </CCol>
        </CRow>
      </>
    )}

    {mobileEnabled && (
      <>
        <div className="mb-2">
          <strong>Mobile Details</strong>
        </div>
        <CRow>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="mobileCompany">Company Name</CFormLabel>
              <CFormInput id="mobileCompany" {...register('assets.mobile.companyName')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="mobileType">Type</CFormLabel>
              <CFormSelect id="mobileType" {...register('assets.mobile.phoneType')}>
                <option value="">Select</option>
                <option value="android">Android</option>
                <option value="keypad">Keypad</option>
              </CFormSelect>
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="mobileProvidedDate">Provided Date</CFormLabel>
              <CFormInput type="date" id="mobileProvidedDate" {...register('assets.mobile.providedDate')} />
            </div>
          </CCol>
        </CRow>
        <CRow>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="mobileImei">IMEI Number</CFormLabel>
              <CFormInput id="mobileImei" {...register('assets.mobile.imeiNumber')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="mobileModel">Model Number</CFormLabel>
              <CFormInput id="mobileModel" {...register('assets.mobile.modelNumber')} />
            </div>
          </CCol>
        </CRow>
      </>
    )}

    {simCardEnabled && (
      <>
        <div className="mb-2">
          <strong>Sim Card Details</strong>
        </div>
        <CRow>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="simCompany">Company Name</CFormLabel>
              <CFormInput id="simCompany" {...register('assets.simCard.companyName')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="simNumber">Number</CFormLabel>
              <CFormInput id="simNumber" {...register('assets.simCard.number')} />
            </div>
          </CCol>
          <CCol md={4}>
            <div className="mb-3">
              <CFormLabel htmlFor="simProvidedDate">Provided Date</CFormLabel>
              <CFormInput type="date" id="simProvidedDate" {...register('assets.simCard.providedDate')} />
            </div>
          </CCol>
        </CRow>
      </>
    )}
  </>
)

export default EmployeeAssetsSection
