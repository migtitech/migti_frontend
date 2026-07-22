import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Alert,
  AlertDescription,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { OBJECT_ID_PATTERN } from "../../utils/validation";
import {
  getEmployeeSchema,
  EMPLOYEE_FORM_DEFAULT_VALUES,
} from "../../validation/employeeSchema";
import employeeService from "../../services/employeeService";
import groupService from "../../services/groupService";
import branchService from "../../services/branchService";
import areaService from "../../services/areaService";
import subZoneService from "../../services/subZoneService";
import locationService from "../../services/locationService";
import { Loader, BackButton } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import EmployeePersonalInfoSection from "./employees/EmployeePersonalInfoSection";
import EmployeeCompanyInfoSection from "./employees/EmployeeCompanyInfoSection";
import EmployeeGroupMappingSection from "./employees/EmployeeGroupMappingSection";
import EmployeeAssetsSection from "./employees/EmployeeAssetsSection";
import EmployeeFormActions from "./employees/EmployeeFormActions";
import EmployeeAccountDetailsSection from "./employees/EmployeeAccountDetailsSection";
// F-EMP: access permissions parked — see F-RBAC.
// import EmployeePermissionsSection from "./employees/EmployeePermissionsSection";
// import { FULL_ACCESS_ROLES } from "../../context/AuthContext";
import useBranchContext from "../../hooks/useBranchContext";
import {
  shouldShowEmployeeZoneFields,
  shouldShowEmployeeGroupFields,
} from "../../utils/employeeZoneEligibility";
import {
  EMPLOYEE_ROLE_OPTIONS,
  getDesignationsForRole,
} from "../../constants/employeeRoleDesignations";

const EmployeeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { branchId: userBranchId } = useBranchContext();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // F-EMP: access permissions parked — see F-RBAC.
  // const [permissions, setPermissions] = useState([]);
  const [zones, setZones] = useState([]);
  const [subZones, setSubZones] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [mapProductGroups, setMapProductGroups] = useState(false);
  const [groupMappingSectionKey, setGroupMappingSectionKey] = useState(0);
  const prevZoneIdRef = useRef("");
  // F-EMP: state/city via the /location API (same cascade as SupplierForm).
  const [states, setStates] = useState([]);
  const [citiesByState, setCitiesByState] = useState({});
  const citiesByStateRef = useRef({});
  const prevStateRef = useRef("");

  useEffect(() => {
    if (!isEdit) {
      setGroupMappingSectionKey(0);
      setMapProductGroups(false);
    }
  }, [isEdit, id]);

  const roleOptions = EMPLOYEE_ROLE_OPTIONS;

  const schema = useMemo(() => getEmployeeSchema({ isEdit }), [isEdit]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: EMPLOYEE_FORM_DEFAULT_VALUES,
  });

  const bikeEnabled = !!watch("assets.bike.enabled");
  const laptopEnabled = !!watch("assets.laptop.enabled");
  const mobileEnabled = !!watch("assets.mobile.enabled");
  const simCardEnabled = !!watch("assets.simCard.enabled");
  const selectedRole = watch("role");
  const selectedDesignation = watch("designation");
  const designationOptions = useMemo(
    () => getDesignationsForRole(selectedRole),
    [selectedRole],
  );
  const showZoneFields = shouldShowEmployeeZoneFields(
    selectedRole,
    selectedDesignation,
  );
  // F-EMP / D27: group mapping is shown + REQUIRED only for procurement/purchase roles.
  const showGroupFields = shouldShowEmployeeGroupFields(selectedRole);
  const selectedZoneIds = watch("zoneIds") || [];
  const selectedSingleZoneId =
    selectedZoneIds.length === 1 ? selectedZoneIds[0] : "";
  const selectedState = watch("state");

  useEffect(() => {
    if (!selectedRole) {
      if (getValues("designation")) {
        setValue("designation", "", {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
      return;
    }

    const allowedDesignations = getDesignationsForRole(selectedRole);
    const currentDesignation = getValues("designation");

    if (
      currentDesignation &&
      !allowedDesignations.includes(currentDesignation)
    ) {
      setValue(
        "designation",
        allowedDesignations.length === 1 ? allowedDesignations[0] : "",
        { shouldValidate: true, shouldDirty: true },
      );
      return;
    }

    if (!currentDesignation && allowedDesignations.length === 1) {
      setValue("designation", allowedDesignations[0], {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [selectedRole, getValues, setValue]);

  const normalizeId = (item) => ({
    ...item,
    id: item?.id || item?._id,
  });

  // --- F-EMP: state/city location cascade (mirrors SupplierForm) ---
  useEffect(() => {
    citiesByStateRef.current = citiesByState;
  }, [citiesByState]);

  const ensureCitiesForState = async (state) => {
    if (!state || citiesByStateRef.current[state]) return;
    try {
      const res = await locationService.getCitiesByState(state);
      const data = res?.data || res;
      setCitiesByState((prev) => ({ ...prev, [state]: data?.cities || [] }));
    } catch (err) {
      toastError(err?.message || "Failed to load cities for this state");
      setCitiesByState((prev) => ({ ...prev, [state]: [] }));
    }
  };

  const cityOptionsFor = (state, currentCity) => {
    const list = citiesByState[state] || [];
    if (currentCity && !list.includes(currentCity)) {
      return [currentCity, ...list];
    }
    return list;
  };

  const lookupPincode = async (pincode) => {
    if (!/^\d{6}$/.test(pincode || "")) return;
    try {
      const res = await locationService.getByPincode(pincode);
      const data = res?.data || res;
      if (data?.state) {
        setValue("state", data.state, { shouldValidate: true });
        await ensureCitiesForState(data.state);
      }
      if (data?.city) {
        setValue("city", data.city, { shouldValidate: true });
      }
    } catch (err) {
      toastError(err?.message || "Could not find location for this pincode");
    }
  };

  useEffect(() => {
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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedState) {
      prevStateRef.current = "";
      return;
    }
    if (prevStateRef.current && prevStateRef.current !== selectedState) {
      setValue("city", "", { shouldValidate: true });
    }
    prevStateRef.current = selectedState;
    ensureCitiesForState(selectedState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  useEffect(() => {
    let cancelled = false;
    const loadGroups = async () => {
      try {
        const response = await groupService.getAll({
          pageNumber: 1,
          pageSize: 100,
        });
        const data = response?.data?.data || response?.data || response;
        const list = data?.groups || [];
        if (!cancelled) {
          setProductGroups(
            (list || []).map((g) => ({
              ...g,
              id: g?.id || g?._id,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setProductGroups([]);
        }
      }
    };
    loadGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await branchService.getAll();
        const list = response?.data?.branches || response?.data || [];
        const normalized = list.map(normalizeId);
        setBranches(normalized);
        if (!isEdit && normalized.length > 0) {
          const defaultBranchId = userBranchId || normalized[0].id;
          const effectiveDefault = normalized.some(
            (b) => (b.id || b._id) === defaultBranchId,
          )
            ? defaultBranchId
            : normalized[0].id;
          reset((prev) => ({
            ...prev,
            branchId: prev.branchId || effectiveDefault,
          }));
        }
      } catch (err) {
        toastError(err?.message || "Failed to load branches");
      }
    };

    loadBranches();
  }, [isEdit, reset, userBranchId]);

  useEffect(() => {
    if (showZoneFields) {
      return;
    }
    setSubZones([]);
    setValue("zoneIds", [], { shouldValidate: true, shouldDirty: true });
    setValue("subZoneId", "", { shouldValidate: true, shouldDirty: true });
    prevZoneIdRef.current = "";
  }, [showZoneFields, setValue]);

  // F-EMP / D27: for procurement/purchase roles the group section is always
  // active (mandatory); for any other role, clear groups entirely.
  useEffect(() => {
    if (showGroupFields) {
      setMapProductGroups(true);
    } else {
      setMapProductGroups(false);
      setValue("assigned_groups", [], {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [showGroupFields, setValue]);

  useEffect(() => {
    if (!showZoneFields) {
      return;
    }
    const loadZones = async () => {
      try {
        const response = await areaService.getAll({
          pageSize: 100,
        });
        const data = response?.data?.data || response?.data || response;
        const list = data?.areas || data || [];
        const normalized = list.map(normalizeId);
        setZones(normalized);
      } catch (err) {
        setZones([]);
        toastError(err?.message || "Failed to load zones");
      }
    };

    loadZones();
  }, [showZoneFields]);

  useEffect(() => {
    let cancelled = false;
    const loadSubZones = async () => {
      if (!showZoneFields || !selectedSingleZoneId) {
        setSubZones([]);
        if (!showZoneFields) {
          setValue("subZoneId", "");
          prevZoneIdRef.current = "";
        }
        return;
      }
      if (
        prevZoneIdRef.current &&
        prevZoneIdRef.current !== selectedSingleZoneId
      ) {
        setValue("subZoneId", "");
      }
      prevZoneIdRef.current = selectedSingleZoneId;
      try {
        const response = await subZoneService.listByZone(selectedSingleZoneId);
        const data = response?.data?.data || response?.data || response;
        const list = data?.subZones || [];
        if (!cancelled) setSubZones(list);
      } catch {
        if (!cancelled) {
          setSubZones([]);
          setValue("subZoneId", "");
        }
      }
    };
    loadSubZones();
    return () => {
      cancelled = true;
    };
  }, [selectedSingleZoneId, setValue, showZoneFields]);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!isEdit) {
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await withMinimumDelay(() =>
          employeeService.getById(id),
        );
        const payload =
          response?.data?.employee ||
          response?.data?.data ||
          response?.data ||
          null;
        const employee = payload ? normalizeId(payload) : null;
        if (!employee) {
          toastError("Employee not found");
          return;
        }
        // F-EMP: access permissions parked — see F-RBAC.
        // setPermissions(employee.permissions || []);
        const rawAssigned = employee.assigned_groups;
        const normAssigned = Array.isArray(rawAssigned)
          ? rawAssigned
              .map((x) => (x && typeof x === "object" && x._id ? x._id : x))
              .map((id) => String(id).trim())
              .filter((id) => /^[a-fA-F0-9]{24}$/i.test(id))
          : [];
        setMapProductGroups(normAssigned.length > 0);
        reset({
          name: employee.name || "",
          email: employee.email || "",
          phone: employee.phone || "",
          fatherName: employee.fatherName || "",
          motherName: employee.motherName || "",
          pincode: employee.pincode || "",
          state: employee.state || "",
          city: employee.city || "",
          hasBike: employee.hasBike || "no",
          hasDrivingLicense: employee.hasDrivingLicense || "no",
          companyEmail: employee.companyEmail || "",
          companyPhone: employee.companyPhone || "",
          role: employee.role || "",
          branchId: employee.branchId || "",
          zoneIds: Array.isArray(employee.zoneIds)
            ? employee.zoneIds
            : employee.zoneId
              ? [employee.zoneId]
              : [],
          subZoneId: employee.subZoneId || "",
          assigned_groups: normAssigned,
          designation: employee.designation || "",
          address: employee.address || "",
          idnumber: employee.idnumber || "",
          salaryType: employee.salaryType || "monthly",
          salary: employee.salary ?? "",
          bankDetails: {
            accountNumber: employee?.bankDetails?.accountNumber || "",
            ifscCode: employee?.bankDetails?.ifscCode || "",
            bankName: employee?.bankDetails?.bankName || "",
            accountHolderName: employee?.bankDetails?.accountHolderName || "",
            upiDetails: employee?.bankDetails?.upiDetails || "",
          },
          assets: {
            bike: {
              enabled: employee?.assets?.bike?.enabled || false,
              model: employee?.assets?.bike?.model || "",
              vehicleNumber: employee?.assets?.bike?.vehicleNumber || "",
              providedDate: employee?.assets?.bike?.providedDate || "",
            },
            laptop: {
              enabled: employee?.assets?.laptop?.enabled || false,
              modelNumber: employee?.assets?.laptop?.modelNumber || "",
              companyName: employee?.assets?.laptop?.companyName || "",
              configurationRam:
                employee?.assets?.laptop?.configurationRam || "",
              configurationRom:
                employee?.assets?.laptop?.configurationRom || "",
              storageType: employee?.assets?.laptop?.storageType || "",
              providedDate: employee?.assets?.laptop?.providedDate || "",
            },
            mobile: {
              enabled: employee?.assets?.mobile?.enabled || false,
              companyName: employee?.assets?.mobile?.companyName || "",
              phoneType: employee?.assets?.mobile?.phoneType || "",
              imeiNumber: employee?.assets?.mobile?.imeiNumber || "",
              modelNumber: employee?.assets?.mobile?.modelNumber || "",
              providedDate: employee?.assets?.mobile?.providedDate || "",
            },
            simCard: {
              enabled: employee?.assets?.simCard?.enabled || false,
              companyName: employee?.assets?.simCard?.companyName || "",
              number: employee?.assets?.simCard?.number || "",
              providedDate: employee?.assets?.simCard?.providedDate || "",
            },
          },
        });
      } catch (err) {
        toastError(err?.message || "Failed to load employee");
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError("");
    try {
      const payload = { ...data };
      const assignZones = shouldShowEmployeeZoneFields(
        payload.role,
        payload.designation,
      );
      if (assignZones) {
        payload.zoneIds = Array.isArray(payload.zoneIds)
          ? payload.zoneIds.filter(Boolean)
          : [];
        if (payload.zoneIds.length !== 1) {
          payload.subZoneId = "";
        }
      } else {
        payload.zoneIds = [];
        payload.subZoneId = "";
      }
      if (isEdit) {
        delete payload.password;
      }
      // F-EMP / D27: groups apply ONLY to procurement/purchase roles; the backend
      // auto-derives assigned_categories from them.
      if (shouldShowEmployeeGroupFields(payload.role)) {
        const ids = Array.isArray(payload.assigned_groups)
          ? payload.assigned_groups
              .map((x) => String(x || "").trim())
              .filter((id) => OBJECT_ID_PATTERN.test(id))
          : [];
        payload.assigned_groups = [...new Set(ids)];
      } else {
        payload.assigned_groups = [];
      }
      // F-EMP: access permissions parked — see F-RBAC. Do not send `permissions`.
      delete payload.permissions;
      // F-EMP / D27: `categories` CSV retired from the form; never sent.
      delete payload.categories;
      if (isEdit) {
        await employeeService.update(id, payload);
        toastSuccess("Employee updated successfully");
      } else {
        await employeeService.create(payload);
        toastSuccess("Employee created successfully");
      }
      navigate("/employees");
    } catch (err) {
      toastError(err?.message || "Failed to save employee");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading employee..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <BackButton fallback="/employees" />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <Card>
          {/* <EmployeeFormActions
          // submitting={submitting}
          // isEdit={isEdit}
          onCancel={() => navigate('/employees')}
        /> */}
          <CardHeader>
            <CardTitle>{isEdit ? "Edit Employee" : "Add Employee"}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <EmployeePersonalInfoSection
              register={register}
              errors={errors}
              isEdit={isEdit}
              states={states}
              selectedState={selectedState}
              cityOptions={cityOptionsFor(selectedState, watch("city"))}
              onPincodeBlur={lookupPincode}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <EmployeeCompanyInfoSection
              register={register}
              errors={errors}
              roleOptions={roleOptions}
              zones={zones}
              selectedZoneIds={selectedZoneIds}
              onZoneIdsChange={(ids) =>
                setValue("zoneIds", ids, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              subZones={subZones}
              designationOptions={designationOptions}
              designationDisabled={!selectedRole}
              showZoneFields={showZoneFields}
            />
          </CardContent>
        </Card>

        {/* F-EMP / D27: group mapping is shown + required only for procurement/purchase roles. */}
        {showGroupFields && (
          <Card>
            <CardHeader>
              <CardTitle>Group mapping</CardTitle>
              <p className="text-sm text-muted-foreground">
                Required: assign this employee to one or more product groups.
                Categories are derived automatically from the selected groups.
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <EmployeeGroupMappingSection
                key={groupMappingSectionKey}
                groups={productGroups}
                value={watch("assigned_groups") || []}
                onChange={(ids) =>
                  setValue("assigned_groups", ids, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                mapEnabled={mapProductGroups}
                onMapEnabledChange={setMapProductGroups}
                required
                errors={errors}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Company Assets</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <EmployeeAssetsSection
              register={register}
              errors={errors}
              bikeEnabled={bikeEnabled}
              laptopEnabled={laptopEnabled}
              mobileEnabled={mobileEnabled}
              simCardEnabled={simCardEnabled}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Account Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <EmployeeAccountDetailsSection
              register={register}
              errors={errors}
            />
          </CardContent>
        </Card>

        {/* F-EMP: access permissions parked — see F-RBAC.
        <Card>
          <CardHeader>
            <CardTitle>Access Permissions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Control what this employee can access
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <EmployeePermissionsSection
              selectedRole={selectedRole}
              permissions={permissions}
              onChange={setPermissions}
            />
          </CardContent>
        </Card>
        */}

        <EmployeeFormActions
          submitting={submitting}
          isEdit={isEdit}
          onCancel={() => navigate("/employees")}
        />
      </div>
    </form>
  );
};

export default EmployeeForm;
