import React from "react";
import {
  CCol,
  CFormCheck,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from "@coreui/react";

const fieldError = (errors, path) => {
  const segments = path.split(".");
  let current = errors;
  for (const segment of segments) {
    if (!current?.[segment]) return undefined;
    current = current[segment];
  }
  return current;
};

const AssetField = ({ id, label, registerPath, register, errors, type }) => {
  const error = fieldError(errors, registerPath);
  return (
    <div className="mb-3">
      <CFormLabel htmlFor={id}>{label}</CFormLabel>
      <CFormInput
        id={id}
        type={type}
        {...register(registerPath)}
        invalid={!!error}
      />
      <CFormFeedback invalid>{error?.message}</CFormFeedback>
    </div>
  );
};

const AssetSelect = ({
  id,
  label,
  registerPath,
  register,
  errors,
  children,
}) => {
  const error = fieldError(errors, registerPath);
  return (
    <div className="mb-3">
      <CFormLabel htmlFor={id}>{label}</CFormLabel>
      <CFormSelect id={id} {...register(registerPath)} invalid={!!error}>
        {children}
      </CFormSelect>
      <CFormFeedback invalid>{error?.message}</CFormFeedback>
    </div>
  );
};

const EmployeeAssetsSection = ({
  register,
  errors = {},
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
          {...register("assets.bike.enabled")}
        />
      </CCol>
      <CCol md={3}>
        <CFormCheck
          id="assetLaptop"
          label="Laptop"
          type="checkbox"
          {...register("assets.laptop.enabled")}
        />
      </CCol>
      <CCol md={3}>
        <CFormCheck
          id="assetMobile"
          label="Mobile"
          type="checkbox"
          {...register("assets.mobile.enabled")}
        />
      </CCol>
      <CCol md={3}>
        <CFormCheck
          id="assetSimCard"
          label="Sim Card"
          type="checkbox"
          {...register("assets.simCard.enabled")}
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
            <AssetField
              id="bikeModel"
              label="Model"
              registerPath="assets.bike.model"
              register={register}
              errors={errors}
            />
          </CCol>
          <CCol md={4}>
            <AssetField
              id="bikeVehicleNumber"
              label="Vehicle Number"
              registerPath="assets.bike.vehicleNumber"
              register={register}
              errors={errors}
            />
          </CCol>
          <CCol md={4}>
            <AssetField
              id="bikeProvidedDate"
              label="Provided Date"
              registerPath="assets.bike.providedDate"
              register={register}
              errors={errors}
              type="date"
            />
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
            <AssetField
              id="laptopModel"
              label="Model Number"
              registerPath="assets.laptop.modelNumber"
              register={register}
              errors={errors}
            />
          </CCol>
          <CCol md={4}>
            <AssetField
              id="laptopCompany"
              label="Company Name"
              registerPath="assets.laptop.companyName"
              register={register}
              errors={errors}
            />
          </CCol>
          <CCol md={4}>
            <AssetField
              id="laptopProvidedDate"
              label="Provided Date"
              registerPath="assets.laptop.providedDate"
              register={register}
              errors={errors}
              type="date"
            />
          </CCol>
        </CRow>
        <CRow>
          <CCol md={3}>
            <AssetField
              id="laptopRam"
              label="RAM"
              registerPath="assets.laptop.configurationRam"
              register={register}
              errors={errors}
            />
          </CCol>
          <CCol md={3}>
            <AssetField
              id="laptopRom"
              label="ROM"
              registerPath="assets.laptop.configurationRom"
              register={register}
              errors={errors}
            />
          </CCol>
          <CCol md={3}>
            <AssetSelect
              id="laptopStorage"
              label="SSD/HDD"
              registerPath="assets.laptop.storageType"
              register={register}
              errors={errors}
            >
              <option value="">Select</option>
              <option value="ssd">SSD</option>
              <option value="hdd">HDD</option>
            </AssetSelect>
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
            <AssetField
              id="mobileCompany"
              label="Company Name"
              registerPath="assets.mobile.companyName"
              register={register}
              errors={errors}
            />
          </CCol>
          <CCol md={4}>
            <AssetSelect
              id="mobileType"
              label="Type"
              registerPath="assets.mobile.phoneType"
              register={register}
              errors={errors}
            >
              <option value="">Select</option>
              <option value="android">Android</option>
              <option value="keypad">Keypad</option>
            </AssetSelect>
          </CCol>
          <CCol md={4}>
            <AssetField
              id="mobileProvidedDate"
              label="Provided Date"
              registerPath="assets.mobile.providedDate"
              register={register}
              errors={errors}
              type="date"
            />
          </CCol>
        </CRow>
        <CRow>
          <CCol md={4}>
            <AssetField
              id="mobileImei"
              label="IMEI Number"
              registerPath="assets.mobile.imeiNumber"
              register={register}
              errors={errors}
            />
          </CCol>
          <CCol md={4}>
            <AssetField
              id="mobileModel"
              label="Model Number"
              registerPath="assets.mobile.modelNumber"
              register={register}
              errors={errors}
            />
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
            <AssetField
              id="simCompany"
              label="Company Name"
              registerPath="assets.simCard.companyName"
              register={register}
              errors={errors}
            />
          </CCol>
          <CCol md={4}>
            <AssetField
              id="simNumber"
              label="Number"
              registerPath="assets.simCard.number"
              register={register}
              errors={errors}
            />
          </CCol>
          <CCol md={4}>
            <AssetField
              id="simProvidedDate"
              label="Provided Date"
              registerPath="assets.simCard.providedDate"
              register={register}
              errors={errors}
              type="date"
            />
          </CCol>
        </CRow>
      </>
    )}
  </>
);

export default EmployeeAssetsSection;
