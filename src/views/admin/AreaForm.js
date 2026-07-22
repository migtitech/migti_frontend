import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import areaService from "../../services/areaService";
import locationService from "../../services/locationService";
import {
  Loader,
  CrudFormPage,
  FormField,
  BackButton,
  StatusToggle,
} from "../../components";
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
    name: "",
    state: "",
    city: "",
    areaType: "market",
    isActive: true,
  });

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Load the list of states once (cascading state -> city, like SupplierForm).
  useEffect(() => {
    const loadStates = async () => {
      try {
        const res = await locationService.getStates();
        const data = res?.data?.data || res?.data || res;
        setStates(data?.states || []);
      } catch (err) {
        toastError(err?.message || "Failed to load states");
      }
    };
    loadStates();
  }, []);

  const fetchCitiesForState = async (state) => {
    if (!state) {
      setCities([]);
      return;
    }
    try {
      const res = await locationService.getCitiesByState(state);
      const data = res?.data?.data || res?.data || res;
      setCities(data?.cities || []);
    } catch (err) {
      setCities([]);
      toastError(err?.message || "Failed to load cities for this state");
    }
  };

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
        setFormData({
          name: area.name || "",
          state: area.state || "",
          city: area.city || "",
          areaType: area.areaType || "market",
          isActive: area.isActive !== false,
        });
        if (area.state) fetchCitiesForState(area.state);
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
      // Cascading: changing state clears the city and reloads its options.
      if (name === "state") {
        next.city = "";
        fetchCitiesForState(value);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errs = {};
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
        name,
        state: (formData.state || "").trim(),
        city,
        areaType: formData.areaType,
        isActive: formData.isActive !== false,
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

          <FormField label="State" error={fieldErrors.state}>
            <Select
              name="state"
              value={formData.state}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.state}
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="City" required error={fieldErrors.city}>
            <Select
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              disabled={!formData.state}
              aria-invalid={!!fieldErrors.city}
            >
              <option value="">
                {formData.state ? "Select City" : "Select a state first"}
              </option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
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

          <FormField label="Status">
            <StatusToggle
              id="zone-isActive"
              checked={Boolean(formData.isActive)}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
              aria-label="Zone status"
              className="h-9 gap-3"
            />
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
