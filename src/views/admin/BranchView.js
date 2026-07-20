import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import branchService from "../../services/branchService";
import companyService from "../../services/companyService";
import employeeService from "../../services/employeeService";
import { Loader, PageHeader, StatusBadge, BackButton } from "../../components";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
  Label,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";
import AuthImage from "../../components/AuthImage/AuthImage";
import { getAssetsUrl } from "../../api/endpoints";
import documentService from "../../services/documentService";

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

const BranchView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [error, setError] = useState("");

  const normalizeId = (item) => ({
    ...item,
    id: item?.id || item?._id,
  });

  const getSignatureDisplay = (signature) => {
    if (!signature) return { id: "", path: "" };
    if (typeof signature === "object") {
      const id = signature?._id || signature?.id || "";
      const rawPath = signature?.path || "";
      const path = rawPath
        ? rawPath.startsWith("http")
          ? rawPath
          : getAssetsUrl(rawPath)
        : "";
      return { id, path };
    }
    return { id: signature, path: "" };
  };

  const loadBranchDetails = async (branchId) => {
    const branchResponse = await withMinimumDelay(() =>
      branchService.getById(branchId),
    );
    const branchPayload =
      branchResponse?.data?.branch ||
      branchResponse?.data?.data?.branch ||
      branchResponse?.data?.data ||
      branchResponse?.data ||
      null;
    const normalizedBranch = branchPayload ? normalizeId(branchPayload) : null;
    setBranch(normalizedBranch);
    return normalizedBranch;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const normalizedBranch = await loadBranchDetails(id);

        if (normalizedBranch?.companyId) {
          const companyResponse = await companyService.getById(
            normalizedBranch.companyId,
          );
          const companyPayload =
            companyResponse?.data?.company ||
            companyResponse?.data?.data ||
            companyResponse?.data ||
            null;
          setCompany(companyPayload ? normalizeId(companyPayload) : null);
        } else {
          setCompany(null);
        }

        const employeesResponse = await employeeService.getAll({
          branchId: id,
        });
        const list =
          employeesResponse?.data?.employees || employeesResponse?.data || [];
        const normalizedEmployees = Array.isArray(list)
          ? list.map(normalizeId)
          : [];
        const filteredEmployees = normalizedEmployees.filter(
          (employee) =>
            String(employee.branchId) === String(normalizedBranch?.id || id),
        );
        setEmployees(filteredEmployees);
      } catch (err) {
        toastError(err?.message || "Failed to load branch");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleSignatureUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file || !branch?.id) return;

    setUploadingSignature(true);
    try {
      const uploadRes = await documentService.uploadImages([file]);
      const uploadedDocs = uploadRes?.data?.documents || [];
      const uploadedId = uploadedDocs[0]?._id;
      if (!uploadedId) {
        throw new Error("Signature upload failed, please try again.");
      }

      const updateRes = await branchService.update(branch.id, {
        signature: uploadedId,
      });
      const updatedBranchPayload =
        updateRes?.data?.data ||
        updateRes?.data?.branch ||
        updateRes?.data ||
        null;
      const normalizedUpdatedBranch = updatedBranchPayload
        ? normalizeId(updatedBranchPayload)
        : null;
      setBranch(
        (prev) =>
          normalizedUpdatedBranch || { ...(prev || {}), signature: uploadedId },
      );
      await loadBranchDetails(branch.id);
      toastSuccess("Signature uploaded successfully");
    } catch (err) {
      toastError(err?.message || "Failed to upload signature");
    } finally {
      event.target.value = "";
      setUploadingSignature(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader message="Loading branch..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => navigate("/branches")}>
            Back to Branches
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!branch) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Branch not found</h4>
          <Button onClick={() => navigate("/branches")}>
            Back to Branches
          </Button>
        </CardContent>
      </Card>
    );
  }
  const signature = getSignatureDisplay(branch.signature);

  return (
    <div>
      <div className="mb-4">
        <BackButton fallback="/branches" />
      </div>

      <PageHeader title={branch.name || "Branch"} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Branch Details</CardTitle>
              <StatusBadge status="Active" />
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="divide-y divide-border">
                <DetailRow label="Branch Name">{branch.name || "-"}</DetailRow>
                <DetailRow label="Company">{company?.name || "-"}</DetailRow>
                <DetailRow label="Email">{branch.email || "-"}</DetailRow>
                <DetailRow label="Phone">{branch.phone || "-"}</DetailRow>
                <DetailRow label="Branch Code">
                  {branch.branchcode || "-"}
                </DetailRow>
                <DetailRow label="GST Number">
                  {branch.gstNumber || "-"}
                </DetailRow>
                <DetailRow label="Address" stacked>
                  <span className="text-foreground">
                    {branch.address || "-"}
                  </span>
                </DetailRow>
                <DetailRow label="Full Address" stacked>
                  <span className="text-foreground">
                    {branch.fullAddress || "-"}
                  </span>
                </DetailRow>
                {branch.mapLocationUrl && (
                  <DetailRow label="Map Location">
                    <a
                      href={branch.mapLocationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary! hover:underline"
                    >
                      View on Map
                    </a>
                  </DetailRow>
                )}
                <DetailRow label="Created At">
                  {dateFormatter(branch?.createdAt ?? branch?.created_at, "-")}
                </DetailRow>
                <DetailRow label="Signature" stacked>
                  <div className="mt-1">
                    {signature.id || signature.path ? (
                      <AuthImage
                        documentId={signature.id || null}
                        fallbackUrl={signature.path}
                        alt="Branch signature"
                        style={{
                          maxHeight: 60,
                          maxWidth: 180,
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="branchSignatureUpload" className="text-xs">
                      Upload / Replace Signature
                    </Label>
                    <Input
                      id="branchSignatureUpload"
                      type="file"
                      accept="image/*"
                      disabled={uploadingSignature}
                      onChange={handleSignatureUpload}
                    />
                    <p className="text-xs text-muted-foreground">
                      You can upload any image format (max 10MB).
                    </p>
                  </div>
                </DetailRow>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Employees ({employees.length})</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/employees")}
                title="View Employees"
              >
                <Users className="h-4 w-4" />
                View
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {employees.length > 0 ? (
                <div className="divide-y divide-border">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {employee.name || "Employee"}
                        </div>
                        <div className="truncate text-sm text-muted-foreground">
                          {employee.designation || employee.role || ""}
                        </div>
                        <div className="truncate text-sm text-muted-foreground">
                          Phone: {employee.phone || "-"}
                        </div>
                      </div>
                      <Badge variant="info" className="shrink-0">
                        {employee.email || "-"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No employees yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BranchView;
