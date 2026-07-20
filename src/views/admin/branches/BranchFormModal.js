import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "../../../components/ui";
import {
  phoneRequired,
  gstinRequired,
  stringRequired,
  stringOptional,
  urlOptional,
  MSG,
} from "../../../utils/validation";
import AuthImage from "../../../components/AuthImage/AuthImage";
import { getAssetsUrl } from "../../../api/endpoints";

const BranchFormModal = ({
  visible,
  onClose,
  onSubmit,
  submitting,
  companies,
  editingBranch,
  defaultValues,
}) => {
  const schema = useMemo(
    () =>
      yup.object({
        name: stringRequired(2, 100).label("Branch name"),
        companyId: yup.string().required("Company is required"),
        email: yup
          .string()
          .trim()
          .email(MSG.email)
          .required("Email is required"),
        phone: phoneRequired().label("Phone"),
        branchcode: yup
          .string()
          .trim()
          .required("Branch code is required")
          .min(1, MSG.minLength(1))
          .max(50, MSG.maxLength(50)),
        gstNumber: gstinRequired().label("GST number"),
        address: stringRequired(2, 200).label("Address"),
        fullAddress: stringRequired(5, 500).label("Full address"),
        location: stringOptional(200),
        mapLocationUrl: urlOptional(500),
      }),
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const selectedSignature = watch("signatureFile");
  const selectedFileName =
    selectedSignature && selectedSignature.length > 0
      ? selectedSignature[0]?.name || ""
      : "";
  const existingSignature = editingBranch?.signature;
  const existingSignatureId =
    typeof existingSignature === "object"
      ? existingSignature?._id || existingSignature?.id
      : existingSignature;
  const existingSignaturePath =
    typeof existingSignature === "object" && existingSignature?.path
      ? existingSignature.path.startsWith("http")
        ? existingSignature.path
        : getAssetsUrl(existingSignature.path)
      : "";

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingBranch ? "Edit Branch" : "Add New Branch"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="companyId">Company *</Label>
                <Select
                  id="companyId"
                  {...register("companyId")}
                  aria-invalid={!!errors.companyId}
                  required
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </Select>
                {errors.companyId && (
                  <p className="text-sm text-destructive">
                    {errors.companyId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Branch Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  aria-invalid={!!errors.name}
                  required
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  type="email"
                  id="email"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  inputMode="numeric"
                  pattern="\d*"
                  {...register("phone")}
                  aria-invalid={!!errors.phone}
                  required
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="branchcode">Branch Code *</Label>
                <Input
                  id="branchcode"
                  {...register("branchcode")}
                  aria-invalid={!!errors.branchcode}
                  required
                />
                {errors.branchcode && (
                  <p className="text-sm text-destructive">
                    {errors.branchcode.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="gstNumber">GST Number *</Label>
                <Input
                  id="gstNumber"
                  {...register("gstNumber")}
                  aria-invalid={!!errors.gstNumber}
                  required
                />
                {errors.gstNumber && (
                  <p className="text-sm text-destructive">
                    {errors.gstNumber.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mapLocationUrl">Map Location URL</Label>
                <Input
                  id="mapLocationUrl"
                  type="url"
                  {...register("mapLocationUrl")}
                  aria-invalid={!!errors.mapLocationUrl}
                  placeholder="https://maps.google.com/…"
                />
                {errors.mapLocationUrl && (
                  <p className="text-sm text-destructive">
                    {errors.mapLocationUrl.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  {...register("address")}
                  aria-invalid={!!errors.address}
                  required
                />
                {errors.address && (
                  <p className="text-sm text-destructive">
                    {errors.address.message}
                  </p>
                )}
              </div>
              <div />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signatureFile">Authorised Signature</Label>
              <Input
                id="signatureFile"
                type="file"
                accept="image/*"
                {...register("signatureFile")}
              />
              <p className="text-sm text-muted-foreground">
                Upload PNG/JPG signature image (stored in S3 and saved as
                document id).
              </p>
              {selectedFileName ? (
                <div className="text-sm">Selected: {selectedFileName}</div>
              ) : null}
              {!selectedFileName && existingSignatureId ? (
                <div className="mt-2">
                  <AuthImage
                    documentId={existingSignatureId}
                    fallbackUrl={existingSignaturePath}
                    alt="Current branch signature"
                    style={{
                      maxHeight: 60,
                      maxWidth: 180,
                      objectFit: "contain",
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullAddress">Full Address *</Label>
              <Textarea
                id="fullAddress"
                rows={3}
                {...register("fullAddress")}
                aria-invalid={!!errors.fullAddress}
                placeholder="Enter complete address…"
                required
              />
              {errors.fullAddress && (
                <p className="text-sm text-destructive">
                  {errors.fullAddress.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingBranch ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BranchFormModal;
