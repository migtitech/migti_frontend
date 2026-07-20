import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import areaService from "../../services/areaService";
import companyService from "../../services/companyService";
import branchService from "../../services/branchService";
import { Loader, CrudFormPage, FormField, BackButton } from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Input,
  Select,
  Spinner,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const AreaForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    companyId: "",
    branchId: "",
    name: "",
    city: "",
    areaType: "market",
  });

  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const getId = (item) => item?.id || item?._id;

  const fetchCompanies = async () => {
    try {
      const res = await companyService.getAll({ pageNumber: 1, pageSize: 100 });
      const data = res?.data?.data || res?.data || res;
      setCompanies(data?.companies || data || []);
    } catch (err) {
      console.error("Failed to fetch companies", err);
    }
  };

  const fetchBranchesByCompany = async (companyId) => {
    if (!companyId) {
      setBranches([]);
      return;
    }
    try {
      const res = await branchService.getAll({ companyId, pageSize: 100 });
      const data = res?.data?.data || res?.data || res;
      setBranches(data?.branches || []);
    } catch (err) {
      setBranches([]);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (formData.companyId) {
      fetchBranchesByCompany(formData.companyId);
    } else {
      setBranches([]);
    }
  }, [formData.companyId]);

  useEffect(() => {
    if (!formData.companyId || branches.length === 0) return;
    const firstBranchId = getId(branches[0]);
    if (
      !formData.branchId ||
      !branches.some((b) => getId(b) === formData.branchId)
    ) {
      setFormData((prev) => ({ ...prev, branchId: firstBranchId }));
    }
  }, [formData.companyId, formData.branchId, branches]);

  useEffect(() => {
    if (!isEdit) return;
    const loadArea = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => areaService.getById(id));
        const area = res?.data?.data || res?.data || res;
        if (!area) {
          setError("Zone not found");
          return;
        }
        const companyId = area.companyId?._id || area.companyId || "";
        setFormData({
          companyId,
          branchId: area.branchId?._id || area.branchId || "",
          name: area.name || "",
          city: area.city || "",
          areaType: area.areaType || "market",
        });
        if (companyId) fetchBranchesByCompany(companyId);
      } catch (err) {
        setError(err?.message || "Failed to load zone");
        toastError(err?.message || "Failed to load zone");
      } finally {
        setLoading(false);
      }
    };
    loadArea();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "companyId") next.branchId = "";
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errs = {};
    if (!formData.companyId?.trim()) errs.companyId = "Company is required";
    if (!formData.branchId?.trim()) {
      errs.branchId = "No branch available for the selected company";
    }
    const name = (formData.name || "").trim();
    if (!name) errs.name = "Name is required";
    else if (name.length < 2) errs.name = "Name must be at least 2 characters";
    else if (name.length > 100)
      errs.name = "Name must be at most 100 characters";
    const city = (formData.city || "").trim();
    if (!city) errs.city = "City is required";
    else if (city.length < 2) errs.city = "City must be at least 2 characters";
    else if (city.length > 100)
      errs.city = "City must be at most 100 characters";
    if (!["market", "industry"].includes(formData.areaType)) {
      errs.areaType = "Zone type must be Market or Industry";
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        companyId: formData.companyId,
        branchId: formData.branchId,
        name,
        city,
        areaType: formData.areaType,
      };
      if (isEdit) {
        await areaService.update(id, payload);
        toastSuccess("Zone updated successfully");
      } else {
        await areaService.create(payload);
        toastSuccess("Zone created successfully");
      }
      navigate("/zones");
    } catch (err) {
      const msg =
        err?.response?.data?.error?.detail ||
        err?.message ||
        "Failed to save zone";
      toastError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading zone..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <BackButton fallback="/zones" />
      </div>

      <CrudFormPage title={isEdit ? "Edit Zone" : "Add Zone"}>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Company" required error={fieldErrors.companyId}>
            <Select
              name="companyId"
              value={formData.companyId}
              onChange={handleChange}
              required
              aria-invalid={!!fieldErrors.companyId}
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={getId(c)} value={getId(c)}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Name" required error={fieldErrors.name}>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Zone name"
              required
              minLength={2}
              maxLength={100}
              aria-invalid={!!fieldErrors.name}
            />
          </FormField>

          <FormField label="City" required error={fieldErrors.city}>
            <Input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
              required
              minLength={2}
              maxLength={100}
              aria-invalid={!!fieldErrors.city}
            />
          </FormField>

          <FormField label="Zone Type" required error={fieldErrors.areaType}>
            <Select
              name="areaType"
              value={formData.areaType}
              onChange={handleChange}
              required
              aria-invalid={!!fieldErrors.areaType}
            >
              <option value="market">Market</option>
              <option value="industry">Industry</option>
            </Select>
          </FormField>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/zones")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : isEdit ? (
              "Update Zone"
            ) : (
              "Create Zone"
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export default AreaForm;
