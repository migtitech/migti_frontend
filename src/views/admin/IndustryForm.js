import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CSpinner,
  CFormCheck,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilPlus, cilTrash } from "@coreui/icons";
import {
  phoneOptional,
  gstinOptional,
  gstinRequired,
  MSG,
} from "../../utils/validation";
import industryService from "../../services/industryService";
import areaService from "../../services/areaService";
import subZoneService from "../../services/subZoneService";
import branchService from "../../services/branchService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import useBranchContext from "../../hooks/useBranchContext";

const purchaseManagerSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Name is required")
    .min(1, MSG.minLength(1))
    .max(100, MSG.maxLength(100)),
  phone: yup
    .string()
    .trim()
    .optional()
    .max(20)
    .nullable()
    .transform((v, o) => (o === "" ? "" : v))
    .test(
      "phone",
      "Phone must be 5–20 digits",
      (v) => !v || /^\d{5,20}$/.test(v),
    ),
  email: yup
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? "" : v)),
});

const industrySchema = yup.object({
  name: yup.string().required("Client name is required").min(2).max(100),
  category: yup
    .string()
    .oneOf(["A", "B", "C", "D", ""], "Invalid category")
    .optional()
    .nullable(),
  area: yup.string().optional().nullable(),
  subZoneId: yup.string().optional().nullable(),
  location: yup.string().optional().max(200),
  address: yup.string().optional().max(500),
  gstNumber: gstinRequired(),
  purchase_manager_name: yup
    .string()
    .trim()
    .optional()
    .max(100)
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  purchase_manager_phone: phoneOptional(),
  email: yup
    .string()
    .email("Enter a valid email")
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  purchaseManagers: yup
    .array()
    .of(purchaseManagerSchema)
    .optional()
    .default([]),
  branchId: yup.string().optional().nullable(),
});

const defaultValues = {
  name: "",
  category: "",
  area: "",
  subZoneId: "",
  location: "",
  address: "",
  gstNumber: "",
  purchase_manager_name: "",
  purchase_manager_phone: "",
  email: "",
  purchaseManagers: [],
  branchId: "",
};

const IndustryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { branchId: userBranchId, canSelectBranch } = useBranchContext();

  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [areas, setAreas] = useState([]);
  const [subZones, setSubZones] = useState([]);
  const prevAreaRef = useRef("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(industrySchema),
    context: { isEdit },
    defaultValues,
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "purchaseManagers",
  });

  const selectedAreaId = watch("area");

  useEffect(() => {
    fetchAreas();
    if (isEdit) {
      fetchIndustry();
    } else {
      reset(defaultValues);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const loadBranches = async () => {
      try {
        const response = await branchService.getAll({
          pageNumber: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        const list =
          response?.data?.branches ??
          response?.data?.data?.branches ??
          response?.branches ??
          (Array.isArray(response?.data) ? response.data : []);
        const arr = Array.isArray(list) ? list : [];
        setBranches(arr.map((b) => ({ ...b, id: b.id || b._id })));
      } catch (err) {
        if (!cancelled) {
          setBranches([]);
          toastError(err?.message || "Failed to load branches");
        }
      }
    };
    loadBranches();
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  const currentBranchId = watch("branchId");
  useEffect(() => {
    if (isEdit || branches.length === 0 || currentBranchId) return;
    const defaultId =
      userBranchId && branches.some((b) => (b.id || b._id) === userBranchId)
        ? userBranchId
        : (branches[0] && (branches[0].id || branches[0]._id)) || "";
    if (defaultId) setValue("branchId", defaultId);
  }, [branches, isEdit, userBranchId, setValue, currentBranchId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedAreaId) {
        setSubZones([]);
        setValue("subZoneId", "");
        prevAreaRef.current = "";
        return;
      }
      if (prevAreaRef.current && prevAreaRef.current !== selectedAreaId) {
        setValue("subZoneId", "");
      }
      prevAreaRef.current = selectedAreaId;
      try {
        const res = await subZoneService.listByZone(selectedAreaId);
        const data = res?.data?.data || res?.data || res;
        const list = data?.subZones || [];
        if (!cancelled) setSubZones(list || []);
      } catch {
        if (!cancelled) {
          setSubZones([]);
          setValue("subZoneId", "");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedAreaId, setValue]);

  const fetchAreas = async () => {
    try {
      const res = await areaService.getAll({ pageSize: 100 });
      const data = res?.data || res;
      setAreas(data?.areas || []);
    } catch (err) {
      console.error("Failed to fetch areas", err);
    }
  };

  const fetchIndustry = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() => industryService.getById(id));
      const data = res?.data || res;
      const purchaseManagers = (data?.purchaseManagers || []).map((pm) => ({
        name: pm.name || "",
        phone: pm.phone || "",
        email: pm.email || "",
      }));
      const branchId =
        data?.branchId ||
        (data?.branch && (data.branch._id || data.branch.id)) ||
        "";
      reset({
        name: data?.name || "",
        category: data?.category || "",
        area:
          typeof data?.area === "object"
            ? data?.area?._id || ""
            : data?.area || "",
        subZoneId:
          typeof data?.subZoneId === "object"
            ? data?.subZoneId?._id || ""
            : data?.subZoneId || "",
        location: data?.location || "",
        address: data?.address || "",
        gstNumber: data?.gstNumber || "",
        purchase_manager_name: data?.purchase_manager_name || "",
        purchase_manager_phone: data?.purchase_manager_phone || "",
        email: data?.email || "",
        purchaseManagers: purchaseManagers.length ? purchaseManagers : [],
        branchId: branchId || "",
      });
      prevAreaRef.current =
        typeof data?.area === "object"
          ? data?.area?._id || ""
          : data?.area || "";
    } catch (err) {
      toastError(err?.message || "Failed to fetch client");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values) => {
    if (!isEdit && !values.branchId) {
      setError("Please select a branch for the client.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (isEdit) {
        const payload = {
          location: values.location || "",
          address: values.address || "",
          gstNumber: (values.gstNumber || "").trim().toUpperCase(),
          subZoneId:
            (values.subZoneId && String(values.subZoneId).trim()) || null,
          purchaseManagers: (values.purchaseManagers || [])
            .filter((pm) => (pm.name || "").trim())
            .map((pm) => ({
              name: (pm.name || "").trim(),
              phone: (pm.phone || "").trim(),
              email: (pm.email || "").trim(),
            })),
        };
        await industryService.update(id, payload);
        toastSuccess("Client updated successfully");
      } else {
        const payload = {
          ...values,
          area: values.area || null,
          gstNumber: (values.gstNumber || "").trim().toUpperCase(),
          branchId: values.branchId || undefined,
          purchaseManagers: (values.purchaseManagers || [])
            .filter((pm) => (pm.name || "").trim())
            .map((pm) => ({
              name: (pm.name || "").trim(),
              phone: (pm.phone || "").trim(),
              email: (pm.email || "").trim(),
            })),
        };
        await industryService.create(payload);
        toastSuccess("Client created successfully");
      }
      navigate("/industries");
    } catch (err) {
      toastError(err?.message || "Failed to save client");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading client..." />
      </div>
    );
  }

  return (
    <CForm onSubmit={handleSubmit(onSubmit)}>
      <CRow className="mb-3">
        <CCol>
          <CButton
            color="light"
            onClick={() => navigate("/industries")}
            className="me-2"
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to clients
          </CButton>
        </CCol>
      </CRow>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError("")}>
          {error}
        </CAlert>
      )}

      <CCard className="mb-4">
        <CCardHeader>
          <strong>{isEdit ? "Edit client" : "Add client"}</strong>
          <small className="text-muted d-block mt-1">
            {isEdit
              ? "You can update branch, location, purchase managers and address."
              : "Select the branch this client belongs to."}
          </small>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Branch {!isEdit ? "*" : ""}</CFormLabel>
                <CFormSelect
                  {...register("branchId")}
                  disabled={isEdit || (!canSelectBranch && !!userBranchId)}
                  className={
                    isEdit || (!canSelectBranch && userBranchId)
                      ? "bg-light"
                      : ""
                  }
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.name || b.branchcode || b.id}
                    </option>
                  ))}
                </CFormSelect>
                {!isEdit && !canSelectBranch && userBranchId && (
                  <small className="text-muted">
                    Your branch is pre-selected.
                  </small>
                )}
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Client name *</CFormLabel>
                <CFormInput
                  {...register("name")}
                  readOnly={isEdit}
                  disabled={isEdit}
                  className={isEdit ? "bg-light" : ""}
                />
                {errors.name && (
                  <div className="text-danger small mt-1">
                    {errors.name.message}
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>GST Number *</CFormLabel>
                <CFormInput
                  {...register("gstNumber")}
                  placeholder="e.g. 27AABCU9603R1ZM"
                />
                {errors.gstNumber && (
                  <div className="text-danger small mt-1">
                    {errors.gstNumber.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Company Category</CFormLabel>
                <div className="d-flex gap-3">
                  {["A", "B", "C", "D"].map((cat) => (
                    <CFormCheck
                      key={cat}
                      type="radio"
                      id={`category-${cat}`}
                      label={cat}
                      value={cat}
                      className="cursor-pointer"
                      style={{ cursor: "pointer" }}
                      {...register("category")}
                      disabled={isEdit}
                    />
                  ))}
                </div>
                {errors.category && (
                  <div className="text-danger small mt-1">
                    {errors.category.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Zone</CFormLabel>
                <CFormSelect
                  {...register("area")}
                  disabled={isEdit}
                  className={isEdit ? "bg-light" : ""}
                >
                  <option value="">Select Zone</option>
                  {areas.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} {a.city ? `- ${a.city}` : ""}
                    </option>
                  ))}
                </CFormSelect>
                {errors.area && (
                  <div className="text-danger small mt-1">
                    {errors.area.message}
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Sub-zone</CFormLabel>
                <CFormSelect
                  {...register("subZoneId")}
                  disabled={!subZones.length}
                >
                  <option value="">
                    {subZones.length
                      ? "Optional"
                      : "No sub-zones for this zone"}
                  </option>
                  {subZones.map((sz) => {
                    const sid = sz._id || sz.id;
                    return (
                      <option key={sid} value={sid}>
                        {(sz.subZoneCode ? `${sz.subZoneCode} — ` : "") +
                          (sz.name || "")}
                      </option>
                    );
                  })}
                </CFormSelect>
              </div>
            </CCol>
          </CRow>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Location ( Google Map URL )</CFormLabel>
                <CFormInput {...register("location")} />
                {errors.location && (
                  <div className="text-danger small mt-1">
                    {errors.location.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <CFormLabel className="mb-0">Purchase Managers</CFormLabel>
                  <CButton
                    type="button"
                    color="primary"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: "", phone: "", email: "" })}
                  >
                    <CIcon icon={cilPlus} className="me-1" />
                    Add Purchase Manager
                  </CButton>
                </div>
                {fields.length === 0 ? (
                  <p className="text-muted small mb-0">
                    No purchase managers added. Click &quot;Add Purchase
                    Manager&quot; to add.
                  </p>
                ) : (
                  fields.map((field, index) => (
                    <CCard key={field.id} className="mb-2">
                      <CCardBody className="py-2 px-3">
                        <CRow className="g-2 align-items-end">
                          <CCol md={4}>
                            <CFormLabel className="small">Name *</CFormLabel>
                            <CFormInput
                              {...register(`purchaseManagers.${index}.name`)}
                              placeholder="Name"
                            />
                            {errors.purchaseManagers?.[index]?.name && (
                              <div className="text-danger small">
                                {errors.purchaseManagers[index].name.message}
                              </div>
                            )}
                          </CCol>
                          <CCol md={3}>
                            <CFormLabel className="small">Phone</CFormLabel>
                            <CFormInput
                              {...register(`purchaseManagers.${index}.phone`)}
                              placeholder="Phone"
                            />
                            {errors.purchaseManagers?.[index]?.phone && (
                              <div className="text-danger small">
                                {errors.purchaseManagers[index].phone.message}
                              </div>
                            )}
                          </CCol>
                          <CCol md={4}>
                            <CFormLabel className="small">Email</CFormLabel>
                            <CFormInput
                              type="email"
                              {...register(`purchaseManagers.${index}.email`)}
                              placeholder="Email"
                            />
                            {errors.purchaseManagers?.[index]?.email && (
                              <div className="text-danger small">
                                {errors.purchaseManagers[index].email.message}
                              </div>
                            )}
                          </CCol>
                          <CCol md={1}>
                            <CButton
                              type="button"
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              title="Remove"
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CCol>
                        </CRow>
                      </CCardBody>
                    </CCard>
                  ))
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Address</CFormLabel>
                <CFormTextarea rows={3} {...register("address")} />
                {errors.address && (
                  <div className="text-danger small mt-1">
                    {errors.address.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardBody className="d-flex justify-content-end gap-2">
          <CButton color="secondary" onClick={() => navigate("/industries")}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? (
              <CSpinner size="sm" />
            ) : isEdit ? (
              "Update client"
            ) : (
              "Create client"
            )}
          </CButton>
        </CCardBody>
      </CCard>
    </CForm>
  );
};

export default IndustryForm;
