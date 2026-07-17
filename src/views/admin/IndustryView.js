import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  CreditCard,
  Users,
  Hash,
  Briefcase,
  Landmark,
  Paperclip,
  StickyNote,
  FileBadge,
} from "lucide-react";
import { CChartBar } from "@coreui/react-chartjs";
import {
  Button,
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import industryService from "../../services/industryService";
import queryService from "../../services/queryService";
import quotationService from "../../services/quotationService";
import poBillingService from "../../services/poBillingService";
import bpDummy from "../../data/businessPartnerDummy";
import { EyeIcon, Loader, TablePagination } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { dateTimeFormatter } from "../../utils/dateFormatter";
import { openAttachmentPreview } from "../../utils/attachmentPreview";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";
import { formatAreaDisplayOrDash } from "../../utils/areaDisplay";

// Fallback sample values shown when a field has no real/overlay data yet, so
// the redesigned Company Information tab always demonstrates its full layout.
const DUMMY_FALLBACK = {
  clientType: "Customer",
  industrySector: "Manufacturing",
  registrationNumber: "REG-2024-00123",
  pan: "ABCPL4321F",
  website: "https://www.acmeindustries.com",
  companyEmail: "contact@acmeindustries.com",
  companyPhone: "+91 98765 43210",
  numberOfEmployees: 250,
  annualRevenue: 50000000,
  registeredAddress: "Plot 45, Industrial Area, Phase II, MIDC",
  country: "India",
  state: "Maharashtra",
  city: "Mumbai",
  pincode: "400001",
  currency: "INR",
  paymentTerms: "Net 30",
  creditLimit: 500000,
  remarks: "Key account with steady quarterly orders.",
  internalComments: "Prefers email communication over phone calls.",
};

const DUMMY_PURCHASE_MANAGER = {
  name: "Rahul Sharma",
  department: "Procurement",
  phone: "9876543210",
  email: "rahul.sharma@acmeindustries.com",
};

const DUMMY_BRANCH = {
  name: "Pune Branch",
  address: "Plot 12, Hinjewadi Phase I",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411057",
};

const DUMMY_ATTACHMENTS = [
  { id: "dummy_att_1", fileName: "company_registration_certificate.pdf" },
  { id: "dummy_att_2", fileName: "gst_document.pdf" },
];

const overlayOr = (overlay, key) => {
  const value = overlay?.[key];
  if (value === "" || value === null || value === undefined) {
    return DUMMY_FALLBACK[key];
  }
  return value;
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2">
    {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
    <div className="min-w-0 flex-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-medium text-foreground">
        {value || value === 0 ? String(value) : "-"}
      </div>
    </div>
  </div>
);

const InfoCard = ({ icon, title, children }) => (
  <Card>
    <CardHeader className="flex flex-row items-center gap-2 pb-2">
      {icon &&
        React.createElement(icon, {
          className: "h-4 w-4 text-primary!",
        })}
      <CardTitle className="text-sm">{title}</CardTitle>
    </CardHeader>
    <CardContent className="divide-y divide-border pt-0">
      {children}
    </CardContent>
  </Card>
);

const formatStatus = (value) => {
  if (!value) return "-";
  const normalized = String(value)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const formatINRCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "-";
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
};

const PAGE_SIZE = 10;

const unwrapPayload = (res) => {
  const data = res?.data || res || {};
  return data?.data || data;
};

const IndustryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatAreaOrDash } = useAreaNameLookup();
  const [industry, setIndustry] = useState(null);
  const [queries, setQueries] = useState([]);
  const [queryPagination, setQueryPagination] = useState(null);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [quotations, setQuotations] = useState([]);
  const [quotationPagination, setQuotationPagination] = useState(null);
  const [quotationTotalAmountSum, setQuotationTotalAmountSum] = useState(null);
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poPagination, setPoPagination] = useState(null);
  const [poAmount, setPoAmount] = useState(null);
  const [poLoading, setPoLoading] = useState(false);
  const [billings, setBillings] = useState([]);
  const [billingPagination, setBillingPagination] = useState(null);
  const [billingAmount, setBillingAmount] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("company");
  const [loadingIndustry, setLoadingIndustry] = useState(true);
  const [error, setError] = useState("");
  const [queryPage, setQueryPage] = useState(1);
  const [quotationPage, setQuotationPage] = useState(1);
  const [poPage, setPoPage] = useState(1);
  const [billingPage, setBillingPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const loadIndustry = async () => {
      setLoadingIndustry(true);
      setError("");
      try {
        const industryRes = await withMinimumDelay(() =>
          industryService.getById(id),
        );
        if (cancelled) return;
        setIndustry(industryRes?.data || industryRes);
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || "Failed to fetch client";
          setError(message);
          toastError(message);
          setIndustry(null);
        }
      } finally {
        if (!cancelled) setLoadingIndustry(false);
      }
    };
    loadIndustry();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setQueryPage(1);
    setQuotationPage(1);
    setPoPage(1);
    setBillingPage(1);
    setQuotationTotalAmountSum(null);
    setPoAmount(null);
    setBillingAmount(null);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadQueries = async () => {
      setQueriesLoading(true);
      try {
        const res = await queryService.getByIndustry({
          industryId: id,
          pageNumber: queryPage,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        const result = unwrapPayload(res);
        setQueries(result?.queries || []);
        setQueryPagination(result?.pagination || null);
      } catch (err) {
        if (!cancelled) {
          toastError(err?.message || "Failed to load queries");
          setQueries([]);
          setQueryPagination(null);
        }
      } finally {
        if (!cancelled) setQueriesLoading(false);
      }
    };
    loadQueries();
    return () => {
      cancelled = true;
    };
  }, [id, queryPage]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadQuotations = async () => {
      setQuotationsLoading(true);
      try {
        const res = await quotationService.getByIndustry({
          industryId: id,
          pageNumber: quotationPage,
          pageSize: PAGE_SIZE,
          includeTotalAmountSum: quotationPage === 1,
        });
        if (cancelled) return;
        const result = unwrapPayload(res);
        setQuotations(result?.quotations || []);
        setQuotationPagination(result?.pagination || null);
        if (
          result?.totalAmountSum !== undefined &&
          result?.totalAmountSum !== null
        ) {
          setQuotationTotalAmountSum(result.totalAmountSum);
        }
      } catch (err) {
        if (!cancelled) {
          toastError(err?.message || "Failed to load quotations");
          setQuotations([]);
          setQuotationPagination(null);
        }
      } finally {
        if (!cancelled) setQuotationsLoading(false);
      }
    };
    loadQuotations();
    return () => {
      cancelled = true;
    };
  }, [id, quotationPage]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadPo = async () => {
      setPoLoading(true);
      try {
        const res = await poBillingService.getAnalytics({
          tab: "po",
          industryId: id,
          pageNumber: poPage,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        const result = unwrapPayload(res);
        setPurchaseOrders(result?.table?.rows || []);
        setPoPagination(result?.table?.pagination || null);
        if (
          result?.metrics?.poAmount !== undefined &&
          result?.metrics?.poAmount !== null
        ) {
          setPoAmount(Number(result.metrics.poAmount) || 0);
        }
      } catch (err) {
        if (!cancelled) {
          toastError(err?.message || "Failed to load Sales Order entries");
          setPurchaseOrders([]);
          setPoPagination(null);
        }
      } finally {
        if (!cancelled) setPoLoading(false);
      }
    };
    loadPo();
    return () => {
      cancelled = true;
    };
  }, [id, poPage]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadBilling = async () => {
      setBillingLoading(true);
      try {
        const res = await poBillingService.getAnalytics({
          tab: "billing",
          industryId: id,
          pageNumber: billingPage,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        const result = unwrapPayload(res);
        setBillings(result?.table?.rows || []);
        setBillingPagination(result?.table?.pagination || null);
        if (
          result?.metrics?.billingAmount !== undefined &&
          result?.metrics?.billingAmount !== null
        ) {
          setBillingAmount(Number(result.metrics.billingAmount) || 0);
        }
      } catch (err) {
        if (!cancelled) {
          toastError(err?.message || "Failed to load billing entries");
          setBillings([]);
          setBillingPagination(null);
        }
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    };
    loadBilling();
    return () => {
      cancelled = true;
    };
  }, [id, billingPage]);

  const purchaseManagers = useMemo(() => {
    const list = industry?.purchaseManagers || [];
    if (list.length > 0) return list;
    if (
      industry?.purchase_manager_name ||
      industry?.purchase_manager_phone ||
      industry?.email
    ) {
      return [
        {
          name: industry?.purchase_manager_name || "",
          phone: industry?.purchase_manager_phone || "",
          email: industry?.email || "",
        },
      ];
    }
    return [];
  }, [industry]);

  const queryTotalPages = Math.max(1, queryPagination?.totalPages ?? 1);
  const quotationTotalPages = Math.max(1, quotationPagination?.totalPages ?? 1);
  const poTotalPages = Math.max(1, poPagination?.totalPages ?? 1);
  const billingTotalPages = Math.max(1, billingPagination?.totalPages ?? 1);
  const queryListPage = queryPagination?.currentPage ?? queryPage;
  const quotationListPage = quotationPagination?.currentPage ?? quotationPage;
  const poListPage = poPagination?.currentPage ?? poPage;
  const billingListPage = billingPagination?.currentPage ?? billingPage;

  const totalQuotationValue = useMemo(() => {
    if (
      quotationTotalAmountSum != null &&
      !Number.isNaN(Number(quotationTotalAmountSum))
    ) {
      return Number(quotationTotalAmountSum);
    }
    return quotations.reduce((sum, q) => {
      const amount = Number(q?.totalAmount);
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);
  }, [quotationTotalAmountSum, quotations]);

  const totalPoAmount = useMemo(() => {
    if (poAmount != null && !Number.isNaN(Number(poAmount))) {
      return Number(poAmount);
    }
    return purchaseOrders.reduce((sum, po) => {
      const amount = Number(po?.amount);
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);
  }, [poAmount, purchaseOrders]);

  const totalBillingAmount = useMemo(() => {
    if (billingAmount != null && !Number.isNaN(Number(billingAmount))) {
      return Number(billingAmount);
    }
    return billings.reduce((sum, billing) => {
      const amount = Number(billing?.amount);
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);
  }, [billingAmount, billings]);

  const overlay = useMemo(
    () => (id ? bpDummy.getOverlay("industry", id) : bpDummy.defaultOverlay()),
    [id, industry],
  );

  const clientCode = useMemo(
    () => (id ? bpDummy.getOrCreateCode("industry", id) : ""),
    [id, industry],
  );

  const displayPurchaseManagers =
    purchaseManagers.length > 0 ? purchaseManagers : [DUMMY_PURCHASE_MANAGER];

  const displayBranches =
    (overlay?.branches || []).length > 0 ? overlay.branches : [DUMMY_BRANCH];

  const displayAttachments =
    (overlay?.attachments || []).length > 0
      ? overlay.attachments
      : DUMMY_ATTACHMENTS;

  if (loadingIndustry) {
    return (
      <Card>
        <CardContent className="p-6">
          <Loader message="Loading client..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/industries")}
          >
            Back to clients
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!industry) {
    return (
      <Alert variant="warning">
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Client not found.</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/industries")}
          >
            Back to clients
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/industries")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Button>
        <Button
          type="button"
          onClick={() => navigate(`/industries/edit/${id}`)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <Card className="mb-4">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{industry.name || "Client details"}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge>Queries: {queryPagination?.totalItems ?? 0}</Badge>
            <Badge variant="info">
              Quotations: {quotationPagination?.totalItems ?? 0}
            </Badge>
            <Badge variant="success">
              Sales Order: {poPagination?.totalItems ?? 0}
            </Badge>
            <Badge variant="secondary">
              Billing: {billingPagination?.totalItems ?? 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-3 flex-wrap">
              <TabsTrigger value="company">Company Information</TabsTrigger>
              <TabsTrigger value="queries">Queries</TabsTrigger>
              <TabsTrigger value="quotations">Quotations</TabsTrigger>
              <TabsTrigger value="po">Sales Order</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="space-y-4">
              {/* Header summary */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        {overlay?.companyLogoBase64 && (
                          <AvatarImage
                            src={overlay.companyLogoBase64}
                            alt={industry.name}
                          />
                        )}
                        <AvatarFallback className="text-lg">
                          {(industry.name || "CL").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-semibold leading-tight">
                          {industry.name || "-"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {clientCode || "Client code pending"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="info">
                        {overlayOr(overlay, "clientType")}
                      </Badge>
                      <Badge variant="secondary">
                        {overlayOr(overlay, "industrySector")}
                      </Badge>
                      {industry.category && (
                        <Badge variant="outline">
                          Category {industry.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info card grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard icon={Building2} title="Basic Details">
                  <InfoRow
                    icon={Hash}
                    label="Client Code"
                    value={clientCode || "Pending"}
                  />
                  <InfoRow
                    icon={Briefcase}
                    label="Registration Number"
                    value={overlayOr(overlay, "registrationNumber")}
                  />
                  <InfoRow
                    icon={FileBadge}
                    label="PAN"
                    value={overlayOr(overlay, "pan")}
                  />
                  <InfoRow
                    icon={FileBadge}
                    label="GST Number"
                    value={industry.gstNumber}
                  />
                  <InfoRow
                    icon={MapPin}
                    label="Zone"
                    value={formatAreaOrDash(industry.area)}
                  />
                  <InfoRow
                    icon={MapPin}
                    label="Location"
                    value={industry.location}
                  />
                </InfoCard>

                <InfoCard icon={Mail} title="Contact & Business">
                  <InfoRow
                    icon={Globe}
                    label="Website"
                    value={overlayOr(overlay, "website")}
                  />
                  <InfoRow
                    icon={Mail}
                    label="Company Email"
                    value={overlayOr(overlay, "companyEmail")}
                  />
                  <InfoRow
                    icon={Phone}
                    label="Company Phone"
                    value={overlayOr(overlay, "companyPhone")}
                  />
                  <InfoRow
                    icon={Users}
                    label="Number of Employees"
                    value={overlayOr(overlay, "numberOfEmployees")}
                  />
                  <InfoRow
                    icon={Landmark}
                    label="Annual Revenue"
                    value={formatINRCurrency(
                      overlayOr(overlay, "annualRevenue"),
                    )}
                  />
                </InfoCard>

                <InfoCard icon={MapPin} title="Address Information">
                  <InfoRow
                    label="Registered Address"
                    value={overlayOr(overlay, "registeredAddress")}
                  />
                  <InfoRow
                    label="Shipping Address"
                    value={industry.shippingAddress}
                  />
                  <InfoRow
                    label="Billing Address"
                    value={industry.billingAddress}
                  />
                  <InfoRow
                    label="City / State"
                    value={`${overlayOr(overlay, "city")}, ${overlayOr(overlay, "state")}`}
                  />
                  <InfoRow
                    label="Country / Pincode"
                    value={`${overlayOr(overlay, "country")} - ${overlayOr(overlay, "pincode")}`}
                  />
                </InfoCard>

                <InfoCard icon={CreditCard} title="Financial Information">
                  <InfoRow
                    icon={CreditCard}
                    label="Currency"
                    value={overlayOr(overlay, "currency")}
                  />
                  <InfoRow
                    icon={Briefcase}
                    label="Payment Terms"
                    value={overlayOr(overlay, "paymentTerms")}
                  />
                  <InfoRow
                    icon={Landmark}
                    label="Credit Limit"
                    value={formatINRCurrency(overlayOr(overlay, "creditLimit"))}
                  />
                </InfoCard>

                <InfoCard icon={StickyNote} title="Additional Information">
                  <InfoRow
                    label="Remarks"
                    value={overlayOr(overlay, "remarks")}
                  />
                  <InfoRow
                    label="Internal Comments"
                    value={overlayOr(overlay, "internalComments")}
                  />
                </InfoCard>

                <InfoCard icon={Paperclip} title="Attachments">
                  {displayAttachments.map((att) => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => openAttachmentPreview(att)}
                      className="flex w-full items-start gap-3 py-2 text-left transition-colors hover:opacity-80"
                    >
                      <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground">
                          File
                        </div>
                        <div className="truncate text-sm font-medium text-primary! underline-offset-2 hover:underline">
                          {att.fileName || "-"}
                        </div>
                      </div>
                    </button>
                  ))}
                </InfoCard>
              </div>

              {/* Purchase Managers */}
              <div>
                <h6 className="mb-2 flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4 text-primary!" />
                  Purchase Managers
                </h6>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {displayPurchaseManagers.map((pm, idx) => (
                    <Card key={pm._id || idx}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {(pm.name || "PM").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {pm.name || "-"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {pm.department || "-"}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            {pm.phone || "-"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            {pm.email || "-"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Branches */}
              <div>
                <h6 className="mb-2 flex items-center gap-2 font-semibold">
                  <Building2 className="h-4 w-4 text-primary!" />
                  Branches
                </h6>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {displayBranches.map((branch, idx) => (
                    <Card key={branch._id || idx}>
                      <CardContent className="p-4">
                        <div className="text-sm font-semibold">
                          {branch.name || "-"}
                        </div>
                        <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            {branch.address || "-"}
                            {branch.city ? `, ${branch.city}` : ""}
                            {branch.state ? `, ${branch.state}` : ""}
                            {branch.pincode ? ` - ${branch.pincode}` : ""}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="queries">
              {queriesLoading && (
                <div className="py-3 text-center">
                  <Loader message="Loading queries..." />
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S No</TableHead>
                      <TableHead>Query Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queries.map((query, idx) => (
                      <TableRow key={query._id || idx}>
                        <TableCell>
                          {(queryListPage - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell>{query.queryCode || "-"}</TableCell>
                        <TableCell>{formatStatus(query.status)}</TableCell>
                        <TableCell>{query.products?.length || 0}</TableCell>
                        <TableCell>
                          {dateTimeFormatter(query.createdAt, "-")}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="View Query"
                            onClick={() =>
                              window.open(
                                `/#/queries/${query._id || query.id}`,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            <EyeIcon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!queriesLoading && queries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          No queries found for this company.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={queryPage}
                totalPages={queryTotalPages}
                onPageChange={setQueryPage}
                showRange
                totalItems={queryPagination?.totalItems ?? 0}
                itemsPerPage={PAGE_SIZE}
                disabled={queriesLoading}
              />
            </TabsContent>

            <TabsContent value="quotations">
              {quotationsLoading && (
                <div className="py-3 text-center">
                  <Loader message="Loading quotations..." />
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S No</TableHead>
                      <TableHead>Quotation Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.map((quotation, idx) => (
                      <TableRow key={quotation._id || idx}>
                        <TableCell>
                          {(quotationListPage - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell>{quotation.quotationCode || "-"}</TableCell>
                        <TableCell>{formatStatus(quotation.status)}</TableCell>
                        <TableCell>{quotation.products?.length || 0}</TableCell>
                        <TableCell>
                          {formatINRCurrency(quotation.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {dateTimeFormatter(quotation.createdAt, "-")}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="View Quotation"
                            onClick={() =>
                              window.open(
                                `/#/quotations/${quotation._id || quotation.id}`,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            <EyeIcon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!quotationsLoading && quotations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No quotations found for this company.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={quotationPage}
                totalPages={quotationTotalPages}
                onPageChange={setQuotationPage}
                showRange
                totalItems={quotationPagination?.totalItems ?? 0}
                itemsPerPage={PAGE_SIZE}
                disabled={quotationsLoading}
              />
            </TabsContent>

            <TabsContent value="po">
              {poLoading && (
                <div className="py-3 text-center">
                  <Loader message="Loading Sales Order..." />
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S No</TableHead>
                      <TableHead>Sales Order Number</TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Entry Date</TableHead>
                      <TableHead>Dispatchment Date</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po, idx) => (
                      <TableRow key={po._id || idx}>
                        <TableCell>
                          {(poListPage - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell>{po.number || "-"}</TableCell>
                        <TableCell>{po.salespersonName || "-"}</TableCell>
                        <TableCell>{formatINRCurrency(po.amount)}</TableCell>
                        <TableCell>
                          {dateTimeFormatter(po.entryDate, "-")}
                        </TableCell>
                        <TableCell>
                          {dateTimeFormatter(po.dispatchmentDate, "-")}
                        </TableCell>
                        <TableCell>{po.remark || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {!poLoading && purchaseOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No Sales Order entries found for this company.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={poPage}
                totalPages={poTotalPages}
                onPageChange={setPoPage}
                showRange
                totalItems={poPagination?.totalItems ?? 0}
                itemsPerPage={PAGE_SIZE}
                disabled={poLoading}
              />
            </TabsContent>

            <TabsContent value="billing">
              {billingLoading && (
                <div className="py-3 text-center">
                  <Loader message="Loading billing..." />
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S No</TableHead>
                      <TableHead>Billing Number</TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Entry Date</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billings.map((billing, idx) => (
                      <TableRow key={billing._id || idx}>
                        <TableCell>
                          {(billingListPage - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell>{billing.number || "-"}</TableCell>
                        <TableCell>{billing.salespersonName || "-"}</TableCell>
                        <TableCell>
                          {formatINRCurrency(billing.amount)}
                        </TableCell>
                        <TableCell>
                          {dateTimeFormatter(billing.entryDate, "-")}
                        </TableCell>
                        <TableCell>{billing.remark || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {!billingLoading && billings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          No billing entries found for this company.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={billingPage}
                totalPages={billingTotalPages}
                onPageChange={setBillingPage}
                showRange
                totalItems={billingPagination?.totalItems ?? 0}
                itemsPerPage={PAGE_SIZE}
                disabled={billingLoading}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Total Queries
                    </div>
                    <h4 className="text-xl font-semibold">
                      {queryPagination?.totalItems ?? 0}
                    </h4>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Total Quotations
                    </div>
                    <h4 className="text-xl font-semibold">
                      {quotationPagination?.totalItems ?? 0}
                    </h4>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Sales Order Received
                    </div>
                    <h4 className="text-xl font-semibold">
                      {poPagination?.totalItems ?? 0}
                    </h4>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Total Billing
                    </div>
                    <h4 className="text-xl font-semibold">
                      {billingPagination?.totalItems ?? 0}
                    </h4>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Quotation Value
                    </div>
                    <h4 className="text-xl font-semibold">
                      {formatINRCurrency(totalQuotationValue)}
                    </h4>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Sales Order Amount
                    </div>
                    <h4 className="text-xl font-semibold">
                      {formatINRCurrency(totalPoAmount)}
                    </h4>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Billing Amount
                    </div>
                    <h4 className="text-xl font-semibold">
                      {formatINRCurrency(totalBillingAmount)}
                    </h4>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-5">
                  <Card>
                    <CardHeader>
                      <CardTitle>Value Split</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        style={{
                          height: "220px",
                          maxWidth: "360px",
                          margin: "0 auto",
                        }}
                      >
                        <CChartBar
                          data={{
                            labels: [
                              "Quotation Value",
                              "Sales Order Amount",
                              "Billing Amount",
                            ],
                            datasets: [
                              {
                                data: [
                                  Math.max(0, totalQuotationValue),
                                  Math.max(0, totalPoAmount),
                                  Math.max(0, totalBillingAmount),
                                ],
                                backgroundColor: ["#39f", "#2eb85c", "#f9b115"],
                              },
                            ],
                          }}
                          options={{
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                              },
                            },
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="md:col-span-7">
                  <Card>
                    <CardHeader>
                      <CardTitle>Records Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        style={{
                          height: "180px",
                          maxWidth: "360px",
                          margin: "0 auto",
                        }}
                      >
                        <CChartBar
                          data={{
                            labels: [
                              "Queries",
                              "Quotations",
                              "Sales Order",
                              "Billing",
                            ],
                            datasets: [
                              {
                                label: "Count",
                                backgroundColor: [
                                  "#5856d6",
                                  "#39f",
                                  "#2eb85c",
                                  "#f9b115",
                                ],
                                data: [
                                  queryPagination?.totalItems ?? 0,
                                  quotationPagination?.totalItems ?? 0,
                                  poPagination?.totalItems ?? 0,
                                  billingPagination?.totalItems ?? 0,
                                ],
                              },
                            ],
                          }}
                          options={{
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: { precision: 0 },
                              },
                            },
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default IndustryView;
