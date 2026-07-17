import React from "react";
import { FormField } from "../../../components";
import { Input } from "../../../components/ui";

const EmployeeAccountDetailsSection = ({ register, errors }) => (
  <>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        label="Account Number"
        htmlFor="accountNumber"
        error={errors.bankDetails?.accountNumber?.message}
      >
        <Input
          id="accountNumber"
          inputMode="numeric"
          pattern="\d*"
          {...register("bankDetails.accountNumber")}
          aria-invalid={!!errors.bankDetails?.accountNumber || undefined}
        />
      </FormField>
      <FormField
        label="IFSC Code"
        htmlFor="ifscCode"
        error={errors.bankDetails?.ifscCode?.message}
      >
        <Input
          id="ifscCode"
          {...register("bankDetails.ifscCode")}
          aria-invalid={!!errors.bankDetails?.ifscCode || undefined}
        />
      </FormField>

      <FormField
        label="Bank Name"
        htmlFor="bankName"
        error={errors.bankDetails?.bankName?.message}
      >
        <Input
          id="bankName"
          {...register("bankDetails.bankName")}
          aria-invalid={!!errors.bankDetails?.bankName || undefined}
        />
      </FormField>
      <FormField
        label="Account Holder Name"
        htmlFor="accountHolderName"
        error={errors.bankDetails?.accountHolderName?.message}
      >
        <Input
          id="accountHolderName"
          {...register("bankDetails.accountHolderName")}
          aria-invalid={!!errors.bankDetails?.accountHolderName || undefined}
        />
      </FormField>

      <FormField
        label="UPI Details (Optional)"
        htmlFor="upiDetails"
        error={errors.bankDetails?.upiDetails?.message}
      >
        <Input
          id="upiDetails"
          {...register("bankDetails.upiDetails")}
          aria-invalid={!!errors.bankDetails?.upiDetails || undefined}
        />
      </FormField>
    </div>
  </>
);

export default EmployeeAccountDetailsSection;
