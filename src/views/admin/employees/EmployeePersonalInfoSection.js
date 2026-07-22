import React from "react";
import { FormField } from "../../../components";
import { Input, Label, Select } from "../../../components/ui";

const EmployeePersonalInfoSection = ({
  register,
  errors,
  isEdit,
  // F-EMP: state/city via the /location API (cascade). Provided by EmployeeForm.
  states = [],
  selectedState = "",
  cityOptions = [],
  onPincodeBlur,
}) => (
  <>
    <div className="mb-4">
      <h3 className="text-base font-semibold text-foreground">
        Personal Information
      </h3>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField label="Full Name" required error={errors.name?.message}>
        <Input
          id="name"
          {...register("name")}
          aria-invalid={!!errors.name || undefined}
        />
      </FormField>
      <FormField label="Email" required error={errors.email?.message}>
        <Input
          type="email"
          id="email"
          {...register("email")}
          aria-invalid={!!errors.email || undefined}
        />
      </FormField>

      <FormField label="Phone" required error={errors.phone?.message}>
        <Input
          id="phone"
          inputMode="numeric"
          pattern="\d*"
          {...register("phone")}
          aria-invalid={!!errors.phone || undefined}
        />
      </FormField>
      <FormField
        label="ID Number ( Aaadhar / Pan / DL )"
        required
        error={errors.idnumber?.message}
      >
        <Input
          id="idnumber"
          {...register("idnumber")}
          aria-invalid={!!errors.idnumber || undefined}
        />
      </FormField>

      <FormField
        label="Fathers Name"
        required
        error={errors.fatherName?.message}
      >
        <Input
          id="fatherName"
          {...register("fatherName")}
          aria-invalid={!!errors.fatherName || undefined}
        />
      </FormField>
      <FormField
        label="Mothers Name"
        required
        error={errors.motherName?.message}
      >
        <Input
          id="motherName"
          {...register("motherName")}
          aria-invalid={!!errors.motherName || undefined}
        />
      </FormField>

      <FormField label="Pincode" required error={errors.pincode?.message}>
        <Input
          id="pincode"
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
          {...register("pincode")}
          onBlur={(e) => {
            register("pincode").onBlur(e);
            onPincodeBlur?.(e.target.value);
          }}
          aria-invalid={!!errors.pincode || undefined}
        />
      </FormField>
      <FormField label="State" required error={errors.state?.message}>
        <Select
          id="state"
          {...register("state")}
          aria-invalid={!!errors.state || undefined}
        >
          <option value="">Select state</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="City" required error={errors.city?.message}>
        <Select
          id="city"
          {...register("city")}
          disabled={!selectedState}
          aria-invalid={!!errors.city || undefined}
        >
          <option value="">
            {selectedState ? "Select city" : "Select state first"}
          </option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="space-y-1.5">
        <Label className="block">Do you have a bike?</Label>
        <div className="flex items-center gap-4">
          <label
            htmlFor="hasBikeYes"
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <input
              type="radio"
              id="hasBikeYes"
              value="yes"
              className="h-4 w-4 accent-primary"
              {...register("hasBike")}
            />
            Yes
          </label>
          <label
            htmlFor="hasBikeNo"
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <input
              type="radio"
              id="hasBikeNo"
              value="no"
              className="h-4 w-4 accent-primary"
              {...register("hasBike")}
            />
            No
          </label>
        </div>
        {errors.hasBike?.message && (
          <p className="text-sm text-destructive">{errors.hasBike.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="block">Do you have a driving licence?</Label>
        <div className="flex items-center gap-4">
          <label
            htmlFor="hasDrivingLicenseYes"
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <input
              type="radio"
              id="hasDrivingLicenseYes"
              value="yes"
              className="h-4 w-4 accent-primary"
              {...register("hasDrivingLicense")}
            />
            Yes
          </label>
          <label
            htmlFor="hasDrivingLicenseNo"
            className="flex items-center gap-2 text-sm text-foreground"
          >
            <input
              type="radio"
              id="hasDrivingLicenseNo"
              value="no"
              className="h-4 w-4 accent-primary"
              {...register("hasDrivingLicense")}
            />
            No
          </label>
        </div>
        {errors.hasDrivingLicense?.message && (
          <p className="text-sm text-destructive">
            {errors.hasDrivingLicense.message}
          </p>
        )}
      </div>

      {!isEdit && (
        <FormField label="Password" required error={errors.password?.message}>
          <Input
            type="password"
            id="password"
            {...register("password")}
            aria-invalid={!!errors.password || undefined}
          />
        </FormField>
      )}
      <div className={isEdit ? "md:col-span-2" : undefined}>
        <FormField label="Address" required error={errors.address?.message}>
          <Input
            id="address"
            {...register("address")}
            aria-invalid={!!errors.address || undefined}
          />
        </FormField>
      </div>
    </div>
  </>
);

export default EmployeePersonalInfoSection;
