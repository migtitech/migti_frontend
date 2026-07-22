import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import areaService from "../../services/areaService";
import { Loader, PageHeader, BackButton, StatusBadge } from "../../components";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";

const DetailRow = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-sm text-foreground">{children}</span>
  </div>
);

const AreaView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [area, setArea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => areaService.getById(id));
        const data = res?.data?.data || res?.data || res;
        setArea(data);
      } catch (err) {
        setError(err?.message || "Failed to load zone");
        toastError(err?.message || "Failed to load zone");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader message="Loading zone..." />
        </CardContent>
      </Card>
    );
  }

  if (error || !area) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-destructive">{error || "Zone not found"}</p>
          <Button onClick={() => navigate("/zones")}>Back to Zones</Button>
        </CardContent>
      </Card>
    );
  }

  const areaTypeLabel = area.areaType === "market" ? "Market" : "Industry";

  return (
    <div>
      <div className="mb-4">
        <BackButton fallback="/zones" />
      </div>

      <PageHeader
        title={area.name}
        description={area.city || undefined}
        actions={
          <Button onClick={() => navigate(`/zones/edit/${id}`)}>
            <Pencil className="h-4 w-4" />
            Edit Zone
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Zone Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="divide-y divide-border">
            <DetailRow label="Name">{area.name}</DetailRow>
            <DetailRow label="State">{area.state || "—"}</DetailRow>
            <DetailRow label="City">{area.city}</DetailRow>
            <DetailRow label="Zone Type">
              <Badge
                variant={area.areaType === "market" ? "info" : "secondary"}
              >
                {areaTypeLabel}
              </Badge>
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge
                status={area.isActive !== false ? "Active" : "Inactive"}
              />
            </DetailRow>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};

export default AreaView;
