import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import industryBranchService from "../../services/industryBranchService";
import industryService from "../../services/industryService";
import locationService from "../../services/locationService";
import { BackButton, Loader, CrudFormPage, FormField } from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Input,
  Textarea,
  Select,
  Spinner,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const schema = yup.object({
  industryId: yup.string().required("Please select a client"),
  name: yup.string().required("Branch name is required").min(1).max(100),
  location: yup.string().optional().max(200),
  address: yup.string().optional().max(500),
  state: yup.string().trim().optional(),
  city: yup.string().trim().optional(),
  pincode: yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .test(
      "pincode",
      "Pincode must be 6 digits",
      (v) => !v || /^\d{6}$/.test(v),
    ),
  gst: yup
    .string()
    .optional()
    .transform((v) =>
      typeof v === "string" ? v.trim().toUpperCase() : v || "",
    )
    .test(
      "gst",
      "Enter a valid 15-character GSTIN (e.g. 22AABCU9603R1ZX)",
      (v) =>
        !v ||
        v === "" ||
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v),
    ),
});

const defaultValues = {
  industryId: "",
  name: "",
  location: "",
  address: "",
  state: "",
  city: "",
  pincode: "",
  gst: "",
};

const IndustryBranchForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [industries, setIndustries] = useState([]);
  const [states, setStates] = useState([]);
  const [citiesByState, setCitiesByState] = useState({});

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  const selectedState = watch("state");

  const ensureCitiesForState = async (state) => {
    if (!state || citiesByState[state]) return;
    try {
      const res = await locationService.getCitiesByState(state);
      const data = res?.data || res;
      setCitiesByState((prev) => ({ ...prev, [state]: data?.cities || [] }));
    } catch (err) {
      toastError(err?.message || "Failed to load cities for this state");
      setCitiesByState((prev) => ({ ...prev, [state]: [] }));
    }
  };

  const cityOptions = (() => {
    const list = citiesByState[selectedState] || [];
    const currentCity = watch("city");
    if (currentCity && !list.includes(currentCity)) {
      return [currentCity, ...list];
    }
    return list;
  })();

  useEffect(() => {
    fetchIndustries();
    let cancelled = false;
    (async () => {
      try {
        const res = await locationService.getStates();
        const data = res?.data || res;
        if (!cancelled) setStates(data?.states || []);
      } catch (err) {
        if (!cancelled) {
          setStates([]);
          toastError(err?.message || "Failed to load states");
        }
      }
    })();
    if (isEdit) {
      fetchBranch();
    } else {
      reset(defaultValues);
    }
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Refetch industries when form becomes visible (e.g. after adding industry in another tab)
  useEffect(() => {
    const onFocus = () => {
      if (!isEdit) fetchIndustries();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isEdit]);

  const fetchIndustries = async () => {
    try {
      const res = await industryService.getAll({
        pageNumber: 1,
        pageSize: 100,
      });
      const data = res?.data ?? res;
      const list = data?.industries ?? data?.data?.industries ?? [];
      setIndustries(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch industries", err);
      toastError(err?.message || "Failed to load industries for dropdown");
    }
  };

  const fetchBranch = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        industryBranchService.getById(id),
      );
      const data = res?.data?.data || res?.data || res;
      const industryId =
        typeof data?.industryId === "object"
          ? data?.industryId?._id
          : data?.industryId || "";
      reset({
        industryId: industryId || "",
        name: data?.name || "",
        location: data?.location || "",
        address: data?.address || "",
        state: data?.state || "",
        city: data?.city || "",
        pincode: data?.pincode || "",
        gst: data?.gst || "",
      });
      if (data?.state) ensureCitiesForState(data.state);
    } catch (err) {
      toastError(err?.message || "Failed to load client branch");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        industryId: values.industryId || null,
        name: values.name?.trim() || "",
        location: values.location?.trim() || "",
        address: values.address?.trim() || "",
        state: values.state || "",
        city: values.city || "",
        pincode: values.pincode || "",
        gst: values.gst?.trim() || "",
      };
      if (isEdit) {
        await industryBranchService.update(id, payload);
        toastSuccess("Client branch updated successfully");
      } else {
        await industryBranchService.create(payload);
        toastSuccess("Client branch created successfully");
      }
      navigate("/industry-branches");
    } catch (err) {
      toastError(err?.message || "Failed to save client branch");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading client branch..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <BackButton fallback="/industry-branches" />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CrudFormPage
        title={isEdit ? "Edit client branch" : "Add client branch"}
        description={
          isEdit
            ? "Update this client branch's details."
            : "Create a new client branch."
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Client" required error={errors.industryId?.message}>
            <Select {...register("industryId")} disabled={isEdit}>
              <option value="">Select client</option>
              {industries.map((ind) => {
                const industryId = ind._id ?? ind.id;
                return (
                  <option key={industryId} value={industryId}>
                    {ind.name ?? "-"}
                  </option>
                );
              })}
            </Select>
          </FormField>

          <FormField label="Branch Name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Branch name" />
          </FormField>

          <FormField label="Location" error={errors.location?.message}>
            <Input {...register("location")} placeholder="Location" />
          </FormField>

          <FormField label="GST Number" error={errors.gst?.message}>
            <Input {...register("gst")} placeholder="e.g. 22AABCU9603R1ZX" />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Address" error={errors.address?.message}>
              <Textarea
                rows={3}
                {...register("address")}
                placeholder="Address"
              />
            </FormField>
          </div>

          <FormField label="Pincode" error={errors.pincode?.message}>
            <Input
              {...register("pincode")}
              maxLength={6}
              onBlur={async (e) => {
                const pincode = e.target.value;
                if (!/^\d{6}$/.test(pincode)) return;
                try {
                  const res = await locationService.getByPincode(pincode);
                  const data = res?.data || res;
                  if (data?.state) {
                    setValue("state", data.state);
                    await ensureCitiesForState(data.state);
                  }
                  if (data?.city) setValue("city", data.city);
                } catch (err) {
                  toastError(
                    err?.message || "Could not find location for this pincode",
                  );
                }
              }}
            />
          </FormField>

          <FormField label="State">
            <Select
              {...register("state")}
              onChange={(e) => {
                setValue("state", e.target.value);
                setValue("city", "");
                ensureCitiesForState(e.target.value);
              }}
            >
              <option value="">Select state</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="City">
            <Select {...register("city")} disabled={!selectedState}>
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
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/industry-branches")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : isEdit ? (
              "Update client branch"
            ) : (
              "Create client branch"
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export default IndustryBranchForm;
