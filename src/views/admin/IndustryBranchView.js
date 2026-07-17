import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import industryBranchService from "../../services/industryBranchService";
import { Loader, PageHeader } from "../../components";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  AlertDescription,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

const DetailRow = ({ label, children, stacked = false }) => (
  <div
    className={
      stacked
        ? "flex flex-col gap-1 py-3"
        : "flex items-start justify-between gap-4 py-3"
    }
  >
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-sm text-foreground">{children}</span>
  </div>
);

const IndustryBranchView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBranch = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() =>
          industryBranchService.getById(id),
        );
        const data = res?.data?.data || res?.data || res;
        setBranch(data);
      } catch (err) {
        toastError(err?.message || "Failed to fetch client branch");
      } finally {
        setLoading(false);
      }
    };
    fetchBranch();
  }, [id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader message="Loading client branch..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-wrap items-center gap-2">
          {error}
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => navigate("/industry-branches")}
          >
            Back to client branches
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!branch) {
    return (
      <Alert variant="warning">
        <AlertDescription className="flex flex-wrap items-center gap-2">
          Client branch not found.
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => navigate("/industry-branches")}
          >
            Back to client branches
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const industryName =
    typeof branch.industryId === "object" ? branch.industryId?.name : "-";

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/industry-branches")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <PageHeader
        title={branch.name}
        description={industryName !== "-" ? industryName : undefined}
        actions={
          <Button onClick={() => navigate(`/industry-branches/edit/${id}`)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Branch Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="divide-y divide-border">
                <DetailRow label="Client">{industryName}</DetailRow>
                <DetailRow label="Location">{branch.location || "-"}</DetailRow>
                <DetailRow label="GST Number">{branch.gst || "-"}</DetailRow>
                <DetailRow label="Address" stacked>
                  <span className="text-foreground">
                    {branch.address || "No address provided"}
                  </span>
                </DetailRow>
                <DetailRow label="Created At">
                  {dateFormatter(branch.createdAt, "-")}
                </DetailRow>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IndustryBranchView;
