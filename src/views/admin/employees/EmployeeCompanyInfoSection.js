import React from "react";
import { FormField } from "../../../components";
import { Input, Select } from "../../../components/ui";

const EmployeeCompanyInfoSection = ({
  register,
  errors,
  roleOptions,
  zones = [],
  selectedZoneIds = [],
  onZoneIdsChange,
  subZones = [],
  designationOptions = [],
  designationDisabled = false,
  showZoneFields = false,
}) => (
  <>
    <input type="hidden" {...register("branchId")} />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField label="Company Email" error={errors.companyEmail?.message}>
        <Input
          type="email"
          id="companyEmail"
          {...register("companyEmail")}
          aria-invalid={!!errors.companyEmail || undefined}
        />
      </FormField>
      <FormField label="Company Phone" error={errors.companyPhone?.message}>
        <Input
          id="companyPhone"
          inputMode="numeric"
          pattern="\d*"
          {...register("companyPhone")}
          aria-invalid={!!errors.companyPhone || undefined}
        />
      </FormField>

      <FormField label="Role" required error={errors.role?.message}>
        <Select
          id="role"
          {...register("role")}
          aria-invalid={!!errors.role || undefined}
        >
          <option value="">Select Role</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        label="Designation"
        required
        error={errors.designation?.message}
      >
        <Select
          id="designation"
          {...register("designation")}
          aria-invalid={!!errors.designation || undefined}
          disabled={designationDisabled || designationOptions.length === 0}
        >
          <option value="">
            {designationDisabled
              ? "Select role first"
              : designationOptions.length === 0
                ? "No designation for this role"
                : "Select Designation"}
          </option>
          {designationOptions.map((designation) => (
            <option key={designation} value={designation}>
              {designation}
            </option>
          ))}
        </Select>
      </FormField>
    </div>

    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
      <FormField label="Salary Type" error={errors.salaryType?.message}>
        <Select
          id="salaryType"
          {...register("salaryType")}
          aria-invalid={!!errors.salaryType || undefined}
        >
          <option value="monthly">Monthly</option>
          <option value="daily">Daily</option>
          <option value="hourly">Hourly</option>
        </Select>
      </FormField>
      <FormField label="Salary" error={errors.salary?.message}>
        <Input
          type="number"
          id="salary"
          min="0"
          step="0.01"
          {...register("salary")}
          aria-invalid={!!errors.salary || undefined}
        />
      </FormField>
    </div>

    {showZoneFields ? (
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Zones" error={errors.zoneIds?.message}>
          <Select
            id="zoneIds"
            multiple
            className="h-28"
            value={selectedZoneIds}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions || [])
                .map((opt) => opt.value)
                .filter(Boolean);
              onZoneIdsChange(values);
            }}
            aria-invalid={!!errors.zoneIds || undefined}
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Sub-zone" error={errors.subZoneId?.message}>
          <Select
            id="subZoneId"
            {...register("subZoneId")}
            aria-invalid={!!errors.subZoneId || undefined}
            disabled={selectedZoneIds.length !== 1 || !subZones.length}
          >
            <option value="">
              {selectedZoneIds.length !== 1
                ? "Select exactly one zone to choose sub-zone"
                : subZones.length
                  ? "Select sub-zone (optional)"
                  : "No sub-zones for this zone"}
            </option>
            {subZones.map((sz) => {
              const sid = sz._id || sz.id;
              return (
                <option key={sid} value={sid}>
                  {sz.subZoneCode ? `${sz.subZoneCode} — ` : ""}
                  {sz.name}
                </option>
              );
            })}
          </Select>
        </FormField>
      </div>
    ) : null}
  </>
);

export default EmployeeCompanyInfoSection;
