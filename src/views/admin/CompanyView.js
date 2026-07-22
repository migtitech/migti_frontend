import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import companyService from "../../services/companyService";
import branchService from "../../services/branchService";
import {
  Loader,
  PageHeader,
  StatusBadge,
  BackButton,
  LocationValue,
} from "../../components";
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

const CompanyView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizeId = (item) => ({
    ...item,
    id: item?.id || item?._id,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [companyResponse, branchesResponse] = await withMinimumDelay(() =>
          Promise.all([
            companyService.getById(id),
            branchService.getAll({ companyId: id }),
          ]),
        );

        const companyPayload =
          companyResponse?.data?.company ||
          companyResponse?.data?.data ||
          companyResponse?.data ||
          null;
        const normalizedCompany = companyPayload
          ? normalizeId(companyPayload)
          : null;
        setCompany(normalizedCompany);

        const list =
          branchesResponse?.data?.branches || branchesResponse?.data || [];
        const normalizedBranches = Array.isArray(list)
          ? list.map(normalizeId)
          : [];
        const filteredBranches = normalizedBranches.filter(
          (branch) => String(branch.companyId) === String(id),
        );
        setBranches(filteredBranches);
      } catch (err) {
        toastError(err?.message || "Failed to load company");
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
          <Loader message="Loading company..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => navigate("/companies")}>
            Back to Companies
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Company not found</h4>
          <Button onClick={() => navigate("/companies")}>
            Back to Companies
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <BackButton fallback="/companies" />
      </div>

      <PageHeader
        title={company.name}
        description={company.brandName || undefined}
        actions={
          <Button onClick={() => navigate(`/companies/edit/${id}`)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {(company.logoDisplayUrl || company.logoUrl || company.logo) && (
                <div className="mb-4 flex justify-center rounded-lg border border-border bg-muted p-4">
                  <img
                    src={
                      company.logoDisplayUrl || company.logoUrl || company.logo
                    }
                    alt="Company logo"
                    style={{
                      maxHeight: 100,
                      maxWidth: 200,
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
              <dl className="divide-y divide-border">
                <DetailRow label="Company Name">{company.name}</DetailRow>
                <DetailRow label="Company Code">
                  {company.code || "-"}
                </DetailRow>
                <DetailRow label="Brand Name">
                  {company.brandName || "-"}
                </DetailRow>
                <DetailRow label="Email">{company.email}</DetailRow>
                <DetailRow label="Mobile">{company.mobile || "-"}</DetailRow>
                <DetailRow label="Website">
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary! hover:underline"
                    >
                      {company.website}
                    </a>
                  ) : (
                    "-"
                  )}
                </DetailRow>
                <DetailRow label="Status">
                  <StatusBadge
                    status={company.isActive !== false ? "Active" : "Inactive"}
                  />
                </DetailRow>
                <DetailRow label="GST Number">{company.gst || "-"}</DetailRow>
                <DetailRow label="Address" stacked>
                  <span className="text-foreground">
                    {company.address || "-"}
                  </span>
                </DetailRow>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Branches ({branches.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {branches.length > 0 ? (
                <div className="divide-y divide-border">
                  {branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {branch.name}
                        </div>
                        <div className="truncate text-sm text-muted-foreground">
                          <LocationValue
                            value={branch.location}
                            placeholder=""
                          />
                        </div>
                      </div>
                      <Badge variant="info" className="shrink-0">
                        {branch.email}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No branches yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompanyView;
