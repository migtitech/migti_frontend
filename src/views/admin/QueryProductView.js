import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  CheckCircle,
  ExternalLink,
  History,
  ImageIcon,
  Package,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui";
import proBucketService from "../../services/proBucketService";
import queryService from "../../services/queryService";
import industryService from "../../services/industryService";
import { toastError } from "../../utils/toast";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { BackButton, Loader, PageHeader } from "../../components";
import { dateTimeFormatter, dateFormatter } from "../../utils/dateFormatter";
import {
  formatProBucketRateAmount,
  resolveProBucketEffectiveRate,
} from "../../utils/proBucketRate";

/* Placeholder values shown when the source query does not carry the info. */
const SAMPLE = {
  clientCode: "CL-1024",
  createdBy: "Sales Executive",
  referenceBy: "Direct Enquiry",
  receivedVia: "Mail",
};

const statusBadge = (s) => {
  switch (s) {
    case "pending":
      return <Badge variant="warning">Pending</Badge>;
    case "rate_submitted":
      return <Badge variant="info">Rate Submitted</Badge>;
    case "fulfilled":
      return <Badge variant="success">Fulfilled</Badge>;
    case "approval_pending":
      return <Badge variant="destructive">HOD Pending</Badge>;
    default:
      return <Badge variant="outline">{s || "—"}</Badge>;
  }
};

const resolveUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") return img;
  return img.signedUrl || img.url || img.path || null;
};

const supplierDisplayName = (supplier) => {
  if (!supplier || typeof supplier !== "object") return "—";
  return supplier.name?.trim() || supplier.shopname?.trim() || "Supplier";
};

const submitterDisplayName = (submittedBy) => {
  if (!submittedBy) return "—";
  if (typeof submittedBy === "object") {
    return submittedBy.name?.trim() || submittedBy.email?.trim() || "—";
  }
  return String(submittedBy);
};

const formatCurrencyRate = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

/** Product name + variant values (combination), same as Query Form / Query View. */
const getProductDisplayName = (product) => {
  const name = String(product?.productName || "").trim();
  const variantText = (product?.variants || [])
    .map((v) => String(v?.variantName || "").trim())
    .filter(Boolean)
    .map((vn) => vn.replace(/,\s*/g, " ").replace(/\s+/g, " ").trim())
    .join(" ");
  const full = [name, variantText].filter(Boolean).join(" ");
  return full || "—";
};

const normalizeCode = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

const formatReferenceBy = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  if (v === "hod_directly_received") return "HOD (Directly Received)";
  return v;
};

const formatReceivedVia = (value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  return v.charAt(0).toUpperCase() + v.slice(1);
};

/** One label/value pair in the read-only detail grid. */
const Detail = ({ label, value, mono = false, sample = false }) => {
  const isEmpty = value == null || String(value).trim() === "";
  return (
    <div className="space-y-0.5">
      <p className="mb-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mb-0 text-sm ${mono ? "font-mono" : ""}`}>
        {isEmpty ? "—" : value}
        {sample && !isEmpty && (
          <span className="ml-1 text-xs text-muted-foreground">(sample)</span>
        )}
      </p>
    </div>
  );
};

/* ── component ───────────────────────────────────── */
const QueryProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [fullQuery, setFullQuery] = useState(null);
  const [industry, setIndustry] = useState(null);
  const [occurrences, setOccurrences] = useState([]);
  const [occurrencesTotal, setOccurrencesTotal] = useState(0);
  const [occurrencesLoading, setOccurrencesLoading] = useState(false);

  /* ── load product + its query / company info ── */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setFullQuery(null);
      setIndustry(null);
      try {
        const res = await withMinimumDelay(() => proBucketService.getById(id));
        const data = res?.data?.data || res?.data;
        if (!alive) return;
        setDoc(data);

        const queryId =
          data?.queryId && typeof data.queryId === "object"
            ? data.queryId._id
            : data?.queryId;
        if (queryId) {
          try {
            const qRes = await queryService.getById(queryId);
            const q = qRes?.data?.data || qRes?.data;
            if (!alive) return;
            setFullQuery(q || null);

            const industryId =
              q?.industry_id && typeof q.industry_id === "object"
                ? q.industry_id._id
                : q?.industry_id;
            if (industryId) {
              try {
                const iRes = await industryService.getById(industryId);
                const ind = iRes?.data?.data || iRes?.data;
                if (alive) setIndustry(ind || null);
              } catch {
                /* client code falls back to sample */
              }
            }
          } catch {
            /* query details fall back to sample values */
          }
        }
      } catch (e) {
        if (alive) toastError(e?.message || "Failed to load query product");
      } finally {
        if (alive) setLoading(false);
      }
    };
    if (id) load();
    return () => {
      alive = false;
    };
  }, [id]);

  /* ── load occurrences of the same product across queries ── */
  useEffect(() => {
    let alive = true;
    const loadOccurrences = async () => {
      const code = String(doc?.rawProductCode || "").trim();
      const name = String(doc?.productName || "").trim();
      const searchTerm = code || name;
      if (!searchTerm) return;
      setOccurrencesLoading(true);
      try {
        const res = await proBucketService.list({
          search: searchTerm,
          pageSize: 100,
        });
        const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
        const matches = rows.filter((r) =>
          code
            ? normalizeCode(r.rawProductCode) === normalizeCode(code)
            : String(r.productName || "")
                .trim()
                .toLowerCase() === name.toLowerCase(),
        );
        if (!alive) return;
        setOccurrences(matches);
        setOccurrencesTotal(matches.length);
      } catch {
        /* non-critical */
      } finally {
        if (alive) setOccurrencesLoading(false);
      }
    };
    if (doc) loadOccurrences();
    return () => {
      alive = false;
    };
  }, [doc]);

  if (loading) return <Loader />;

  const savedImages = Array.isArray(doc?.images) ? doc.images : [];
  const procurementRates = Array.isArray(doc?.rates) ? doc.rates : [];

  const queryRef =
    doc?.queryId && typeof doc.queryId === "object" ? doc.queryId : null;
  const companyInfo = queryRef?.companyInfo || fullQuery?.companyInfo || {};
  const purchaseManager = Array.isArray(companyInfo?.purchaseManagers)
    ? companyInfo.purchaseManagers[0]
    : null;

  const queryCode =
    doc?.queryCode || queryRef?.queryCode || fullQuery?.queryCode || "";

  const groupName =
    doc?.groupId && typeof doc.groupId === "object" ? doc.groupId.name : "";
  const categoryName =
    doc?.categoryId && typeof doc.categoryId === "object"
      ? doc.categoryId.name
      : "";

  const clientCode = String(industry?.uniqueId || "").trim();
  const createdByName =
    fullQuery?.created_by && typeof fullQuery.created_by === "object"
      ? fullQuery.created_by.name || fullQuery.created_by.email || ""
      : "";
  const referenceBy = formatReferenceBy(fullQuery?.queryReferenceBy);
  const receivedVia = formatReceivedVia(fullQuery?.queryReceivedBy);

  const uniqueQueryCodes = [
    ...new Set(
      occurrences.map((o) => normalizeCode(o.queryCode)).filter(Boolean),
    ),
  ];

  const rm = doc?.rateManagement || null;

  return (
    <div>
      {/* ── Top bar ── */}
      <div className="mb-4">
        <BackButton fallback="/query-products" />
      </div>

      <PageHeader
        title={doc ? getProductDisplayName(doc) : "Query Product"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(doc?.status)}
            {doc?.hodApproved && (
              <Badge variant="success">
                <CheckCircle className="h-3 w-3" />
                HOD Approved
              </Badge>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate(`/query-products/${id}/history`)}
            >
              <History className="h-4 w-4" />
              Product Query History
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-4">
        {/* ── Product details ── */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Product Details
              </CardTitle>
              {queryCode && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {queryCode}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-x-4 gap-y-4">
                <div className="col-span-12 md:col-span-6">
                  <Detail
                    label="Product Name"
                    value={getProductDisplayName(doc)}
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail
                    label="Raw Product Code"
                    value={doc?.rawProductCode}
                    mono
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail label="Query Code" value={queryCode} mono />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <Detail label="Quantity" value={doc?.quantity} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail label="Unit" value={doc?.unit} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail label="HSN Number" value={doc?.hsnNumber} mono />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail label="Model Number" value={doc?.modelNumber} />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <Detail
                    label="GST %"
                    value={
                      doc?.gstPercentage != null ? `${doc.gstPercentage}%` : ""
                    }
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail label="Group" value={groupName} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail label="Category" value={categoryName} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail
                    label="Added On"
                    value={dateTimeFormatter(doc?.createdAt, "")}
                  />
                </div>

                <div className="col-span-12">
                  <Detail label="Description" value={doc?.description} />
                </div>
                <div className="col-span-12">
                  <Detail label="Remark" value={doc?.remark} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Images (view only) ── */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Images
              </CardTitle>
              <Badge variant="secondary">{savedImages.length}</Badge>
            </CardHeader>
            <CardContent>
              {savedImages.length === 0 ? (
                <p className="mb-0 text-sm text-muted-foreground">
                  No images attached to this product.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {savedImages.map((img, i) => {
                    const url = resolveUrl(img);
                    const name =
                      typeof img === "object"
                        ? img.name || `Image ${i + 1}`
                        : `Image ${i + 1}`;
                    return (
                      <div
                        key={i}
                        className="shrink-0 overflow-hidden rounded-md border border-border"
                        style={{ width: 100 }}
                      >
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={url}
                              alt={name}
                              style={{
                                width: "100%",
                                height: 90,
                                objectFit: "cover",
                                display: "block",
                              }}
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          </a>
                        ) : (
                          <div
                            className="flex items-center justify-center bg-muted text-sm text-muted-foreground"
                            style={{ height: 90 }}
                          >
                            No preview
                          </div>
                        )}
                        <div
                          className="truncate border-t border-border bg-background px-1 py-1"
                          style={{ fontSize: "0.65rem" }}
                          title={name}
                        >
                          {name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Query & company info ── */}
        <div className="col-span-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Query &amp; Company Information
              </CardTitle>
              {queryRef?.status && (
                <Badge variant="outline" className="capitalize">
                  {queryRef.status}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-x-4 gap-y-4">
                <div className="col-span-12 md:col-span-4">
                  <Detail label="Company Name" value={companyInfo?.name} />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Detail
                    label="Client Code"
                    value={clientCode || SAMPLE.clientCode}
                    mono
                    sample={!clientCode}
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail label="Area" value={companyInfo?.area} />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Detail label="Location" value={companyInfo?.location} />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <Detail
                    label="Query Created By"
                    value={createdByName || SAMPLE.createdBy}
                    sample={!createdByName}
                  />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <Detail
                    label="Reference By"
                    value={referenceBy || SAMPLE.referenceBy}
                    sample={!referenceBy}
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Detail
                    label="Received Via"
                    value={receivedVia || SAMPLE.receivedVia}
                    sample={!receivedVia}
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Detail
                    label="Query Date"
                    value={dateFormatter(
                      fullQuery?.createdAt || doc?.createdAt,
                      "",
                    )}
                  />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <Detail
                    label="Purchase Manager"
                    value={
                      purchaseManager?.name
                        ? `${purchaseManager.name}${
                            purchaseManager.phone
                              ? ` (${purchaseManager.phone})`
                              : ""
                          }`
                        : ""
                    }
                  />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <Detail
                    label="Tracking Code"
                    value={queryRef?.query_tracking_code}
                    mono
                  />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <Detail label="Address" value={companyInfo?.address} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Product history summary ── */}
        <div className="col-span-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Product Query History
              </CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => navigate(`/query-products/${id}/history`)}
              >
                <ExternalLink className="h-4 w-4" />
                View Full History
              </Button>
            </CardHeader>
            <CardContent>
              {occurrencesLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  Checking how many times this product has appeared…
                </div>
              ) : (
                <>
                  <p className="mb-2 text-sm">
                    This product has appeared{" "}
                    <span className="font-semibold">{occurrencesTotal}</span>{" "}
                    time{occurrencesTotal === 1 ? "" : "s"} across{" "}
                    <span className="font-semibold">
                      {uniqueQueryCodes.length}
                    </span>{" "}
                    quer{uniqueQueryCodes.length === 1 ? "y" : "ies"}.
                  </p>
                  {uniqueQueryCodes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {occurrences.map((o) => {
                        const oid = o._id || o.id;
                        const isCurrent = String(oid) === String(id);
                        return (
                          <Badge
                            key={oid}
                            variant={isCurrent ? "info" : "secondary"}
                            className="cursor-pointer font-mono text-xs"
                            title={
                              isCurrent
                                ? "Current product line"
                                : "Open this occurrence"
                            }
                            onClick={() =>
                              !isCurrent && navigate(`/query-products/${oid}`)
                            }
                          >
                            {normalizeCode(o.queryCode) || "—"}
                            {isCurrent ? " (this)" : ""}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <p className="mb-0 mt-2 text-xs text-muted-foreground">
                    Click a query code to open that occurrence, or use “View
                    Full History” to see the companies each query came from.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Rates (read only) ── */}
        <div className="col-span-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Rates</CardTitle>
              <div className="flex items-center gap-2">
                {rm?.isHodRateApproved && (
                  <Badge variant="success">HOD rate approved</Badge>
                )}
                {procurementRates.length > 0 && (
                  <Badge variant="info">
                    {procurementRates.length} procurement rate
                    {procurementRates.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {rm && (rm.hasHodRates || rm.hasSubmittedRates) && (
                <div className="mb-4 grid grid-cols-12 gap-x-4 gap-y-4">
                  <div className="col-span-6 md:col-span-3">
                    <Detail
                      label="Minimum Rate"
                      value={formatCurrencyRate(rm.minRate)}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <Detail
                      label="Maximum Rate"
                      value={formatCurrencyRate(rm.maxRate)}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <Detail label="Rate Unit" value={rm.submittedRateUnit} />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <Detail
                      label="HOD Rate Status"
                      value={
                        rm.isHodRateApproved
                          ? "Approved"
                          : rm.hodRateStatus || "Pending"
                      }
                    />
                  </div>
                </div>
              )}

              {procurementRates.length === 0 ? (
                <p className="mb-0 text-muted-foreground">
                  No procurement rates have been submitted for this product yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: 48 }}>#</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Base rate</TableHead>
                        <TableHead>GST %</TableHead>
                        <TableHead>Discount %</TableHead>
                        <TableHead>Final amount</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead>Submitted At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procurementRates.map((row, idx) => (
                        <TableRow
                          key={
                            row._id || `${row.submittedAt}-${row.rate}-${idx}`
                          }
                        >
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              {supplierDisplayName(row.supplier)}
                            </span>
                            {row.supplier?.uniqueId ? (
                              <div className="font-mono text-sm text-muted-foreground">
                                {row.supplier.uniqueId}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="font-semibold text-primary!">
                            {formatCurrencyRate(row.rate)}
                          </TableCell>
                          <TableCell>
                            {row.gstPercentage != null ? row.gstPercentage : 0}
                          </TableCell>
                          <TableCell>
                            {row.discountPercentage != null
                              ? row.discountPercentage
                              : 0}
                          </TableCell>
                          <TableCell className="font-semibold text-success!">
                            ₹
                            {formatProBucketRateAmount(
                              resolveProBucketEffectiveRate(row),
                            )}
                          </TableCell>
                          <TableCell>{row.unit?.trim() || "—"}</TableCell>
                          <TableCell>
                            {submitterDisplayName(row.submittedBy)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {dateTimeFormatter(row.submittedAt, "—")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QueryProductView;
