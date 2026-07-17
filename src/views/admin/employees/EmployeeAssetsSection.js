import React from "react";
import { FormField } from "../../../components";
import { Input, Select } from "../../../components/ui";

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
    <FormField label={label} htmlFor={id} error={error?.message}>
      <Input
        id={id}
        type={type}
        {...register(registerPath)}
        aria-invalid={!!error || undefined}
      />
    </FormField>
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
    <FormField label={label} htmlFor={id} error={error?.message}>
      <Select
        id={id}
        {...register(registerPath)}
        aria-invalid={!!error || undefined}
      >
        {children}
      </Select>
    </FormField>
  );
};

const AssetToggle = ({ id, label, registerPath, register }) => (
  <label
    htmlFor={id}
    className="flex items-center gap-2 text-sm text-foreground"
  >
    <input
      type="checkbox"
      id={id}
      className="h-4 w-4 rounded accent-primary"
      {...register(registerPath)}
    />
    {label}
  </label>
);

const EmployeeAssetsSection = ({
  register,
  errors = {},
  bikeEnabled,
  laptopEnabled,
  mobileEnabled,
  simCardEnabled,
}) => (
  <>
    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <AssetToggle
        id="assetBike"
        label="Bike"
        registerPath="assets.bike.enabled"
        register={register}
      />
      <AssetToggle
        id="assetLaptop"
        label="Laptop"
        registerPath="assets.laptop.enabled"
        register={register}
      />
      <AssetToggle
        id="assetMobile"
        label="Mobile"
        registerPath="assets.mobile.enabled"
        register={register}
      />
      <AssetToggle
        id="assetSimCard"
        label="Sim Card"
        registerPath="assets.simCard.enabled"
        register={register}
      />
    </div>

    {bikeEnabled && (
      <>
        <div className="mb-2">
          <h4 className="text-sm font-semibold text-foreground">
            Bike Details
          </h4>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <AssetField
            id="bikeModel"
            label="Model"
            registerPath="assets.bike.model"
            register={register}
            errors={errors}
          />
          <AssetField
            id="bikeVehicleNumber"
            label="Vehicle Number"
            registerPath="assets.bike.vehicleNumber"
            register={register}
            errors={errors}
          />
          <AssetField
            id="bikeProvidedDate"
            label="Provided Date"
            registerPath="assets.bike.providedDate"
            register={register}
            errors={errors}
            type="date"
          />
        </div>
      </>
    )}

    {laptopEnabled && (
      <>
        <div className="mb-2">
          <h4 className="text-sm font-semibold text-foreground">
            Laptop Details
          </h4>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <AssetField
            id="laptopModel"
            label="Model Number"
            registerPath="assets.laptop.modelNumber"
            register={register}
            errors={errors}
          />
          <AssetField
            id="laptopCompany"
            label="Company Name"
            registerPath="assets.laptop.companyName"
            register={register}
            errors={errors}
          />
          <AssetField
            id="laptopProvidedDate"
            label="Provided Date"
            registerPath="assets.laptop.providedDate"
            register={register}
            errors={errors}
            type="date"
          />
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <AssetField
            id="laptopRam"
            label="RAM"
            registerPath="assets.laptop.configurationRam"
            register={register}
            errors={errors}
          />
          <AssetField
            id="laptopRom"
            label="ROM"
            registerPath="assets.laptop.configurationRom"
            register={register}
            errors={errors}
          />
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
        </div>
      </>
    )}

    {mobileEnabled && (
      <>
        <div className="mb-2">
          <h4 className="text-sm font-semibold text-foreground">
            Mobile Details
          </h4>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <AssetField
            id="mobileCompany"
            label="Company Name"
            registerPath="assets.mobile.companyName"
            register={register}
            errors={errors}
          />
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
          <AssetField
            id="mobileProvidedDate"
            label="Provided Date"
            registerPath="assets.mobile.providedDate"
            register={register}
            errors={errors}
            type="date"
          />
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <AssetField
            id="mobileImei"
            label="IMEI Number"
            registerPath="assets.mobile.imeiNumber"
            register={register}
            errors={errors}
          />
          <AssetField
            id="mobileModel"
            label="Model Number"
            registerPath="assets.mobile.modelNumber"
            register={register}
            errors={errors}
          />
        </div>
      </>
    )}

    {simCardEnabled && (
      <>
        <div className="mb-2">
          <h4 className="text-sm font-semibold text-foreground">
            Sim Card Details
          </h4>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <AssetField
            id="simCompany"
            label="Company Name"
            registerPath="assets.simCard.companyName"
            register={register}
            errors={errors}
          />
          <AssetField
            id="simNumber"
            label="Number"
            registerPath="assets.simCard.number"
            register={register}
            errors={errors}
          />
          <AssetField
            id="simProvidedDate"
            label="Provided Date"
            registerPath="assets.simCard.providedDate"
            register={register}
            errors={errors}
            type="date"
          />
        </div>
      </>
    )}
  </>
);

export default EmployeeAssetsSection;
