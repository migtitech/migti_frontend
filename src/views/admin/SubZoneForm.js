import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import areaService from "../../services/areaService";
import subZoneService from "../../services/subZoneService";
import { Loader, CrudFormPage, FormField, BackButton } from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Input,
  Select,
  Spinner,
} from "../../components/ui";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const SubZoneForm = () => {
  const navigate = useNavigate();
  const { canCreate } = usePermissions();
  const canCreateSubZones = canCreate("sub_zones");
  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState("");
  const [name, setName] = useState("");
  const [loadingZones, setLoadingZones] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoadingZones(true);
      try {
        const res = await areaService.getAll({ pageSize: 100 });
        const data = res?.data?.data || res?.data || res;
        setZones(data?.areas || []);
      } catch (err) {
        setZones([]);
        toastError(err?.message || "Failed to load zones");
      } finally {
        setLoadingZones(false);
      }
    };
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!zoneId) {
      setError("Please select a zone");
      return;
    }
    const trimmed = (name || "").trim();
    if (!trimmed) {
      setError("Sub-zone name is required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await subZoneService.create({ zoneId, name: trimmed });
      toastSuccess("Sub-zone created successfully");
      navigate("/sub-zones");
    } catch (err) {
      toastError(err?.message || "Failed to create sub-zone");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingZones) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading zones..." />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-4">
        <BackButton fallback="/sub-zones" />
      </div>

      <CrudFormPage title="Add sub-zone">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Zone" required htmlFor="subzone-zone">
            <Select
              id="subzone-zone"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="">Select zone</option>
              {zones.map((z) => (
                <option key={z._id || z.id} value={z._id || z.id}>
                  {z.name}
                  {z.city ? ` - ${z.city}` : ""}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Sub-zone name" required htmlFor="subzone-name">
            <Input
              id="subzone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="Display name"
            />
          </FormField>
        </div>

        {canCreateSubZones ? (
          <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/sub-zones")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : "Create sub-zone"}
            </Button>
          </div>
        ) : null}
      </CrudFormPage>
    </form>
  );
};

export default SubZoneForm;
