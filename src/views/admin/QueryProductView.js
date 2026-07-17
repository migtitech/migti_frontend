import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Select,
  Textarea,
  Spinner,
  Alert,
  AlertDescription,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui";
import proBucketService from "../../services/proBucketService";
import documentService from "../../services/documentService";
import groupService from "../../services/groupService";
import categoryService from "../../services/categoryService";
import { useAuth } from "../../context/AuthContext";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { sortAlphabetically } from "../../utils/sort";
import { Loader, PageHeader, TablePagination } from "../../components";
import { dateTimeFormatter, dateFormatter } from "../../utils/dateFormatter";
import {
  formatProBucketRateAmount,
  resolveProBucketEffectiveRate,
} from "../../utils/proBucketRate";

const isHodRole = (role) => {
  const r = String(role || "").toLowerCase();
  return r === "head_of_department" || r === "hod";
};

const MAX_HOD_RATE = 1_000_000;
const MAX_QUANTITY = 100_000;
const MAX_GST_PERCENTAGE = 100;
const GST_HIGH_RATE_THRESHOLD = 18;

const normalizeRateComparison = (value, { isDiscount = false } = {}) => {
  if (value === "" || value == null) return isDiscount ? 0 : null;
  const n = Number(value);
  if (!Number.isFinite(n)) return isDiscount ? 0 : null;
  return n;
};

const formatRateValue = (value) =>
  value != null && !Number.isNaN(Number(value)) ? Number(value) : "—";

const formatCurrencyRate = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `₹${Number(value).toLocaleString("en-IN")}`;
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

const resolveUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (img.signedUrl) return img.signedUrl;
  if (img.url) return img.url;
  if (img.path) return img.path;
  return null;
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

/* ── component ───────────────────────────────────── */
const QueryProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const userIsHod = isHodRole(user?.role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [doc, setDoc] = useState(null);

  const [groups, setGroups] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPreviews, setPendingPreviews] = useState([]);

  const [form, setForm] = useState({
    productName: "",
    rawProductCode: "",
    quantity: "",
    unit: "",
    hsnNumber: "",
    modelNumber: "",
    gstPercentage: "",
    description: "",
    remark: "",
    groupId: "",
    categoryId: "",
  });

  const [rateForm, setRateForm] = useState({
    minRate: "",
    maxRate: "",
  });
  const [updatingRate, setUpdatingRate] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyFilters, setHistoryFilters] = useState({
    from: "",
    to: "",
    search: "",
  });
  const [historyFilterDraft, setHistoryFilterDraft] = useState({
    from: "",
    to: "",
    search: "",
  });

  const applyRateManagement = (rm) => {
    const toFormRate = (value) => {
      if (value == null || value === "") return "0";
      return String(value);
    };
    setRateForm({
      minRate: toFormRate(rm?.minRate),
      maxRate: toFormRate(rm?.maxRate),
    });
  };

  /* categories filtered by selected group — must be after form useState */
  const filteredCategories = form.groupId
    ? allCategories.filter((c) => {
        const gId =
          c.group && typeof c.group === "object"
            ? c.group._id || c.group.id
            : c.group;
        return String(gId || "") === String(form.groupId);
      })
    : allCategories;

  /* ── load groups / categories ── */
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [grpRes, catRes] = await Promise.all([
          groupService.getAll({ pageSize: 100 }),
          categoryService.getAllCategories(),
        ]);
        setGroups(
          sortAlphabetically(
            Array.isArray(grpRes?.data?.groups)
              ? grpRes.data.groups
              : Array.isArray(grpRes?.data)
                ? grpRes.data
                : [],
          ),
        );
        setAllCategories(
          sortAlphabetically(
            Array.isArray(catRes?.data?.categories)
              ? catRes.data.categories
              : Array.isArray(catRes?.data)
                ? catRes.data
                : [],
          ),
        );
      } catch {
        /* non-critical */
      }
    };
    loadMeta();
  }, []);

  /* ── load document ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() => proBucketService.getById(id));
        const data = res?.data?.data || res?.data;
        setDoc(data);
        applyRateManagement(data?.rateManagement);
        setForm({
          productName: data?.productName || "",
          rawProductCode: data?.rawProductCode || "",
          quantity: data?.quantity ?? "",
          unit: data?.unit || "",
          hsnNumber: data?.hsnNumber || "",
          modelNumber: data?.modelNumber || "",
          gstPercentage: data?.gstPercentage ?? "",
          description: data?.description || "",
          remark: data?.remark || "",
          groupId:
            data?.groupId && typeof data.groupId === "object"
              ? data.groupId._id || ""
              : data?.groupId || "",
          categoryId:
            data?.categoryId && typeof data.categoryId === "object"
              ? data.categoryId._id || ""
              : data?.categoryId || "",
        });
      } catch (e) {
        toastError(e?.message || "Failed to load query product");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  /* cleanup object URLs */
  useEffect(() => {
    return () => pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingPreviews]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setRateField = (key, val) => setRateForm((f) => ({ ...f, [key]: val }));

  const loadRateHistories = useCallback(
    async (page = 1, filters = historyFilters) => {
      if (!userIsHod || !id) return;
      setHistoryLoading(true);
      try {
        const params = {
          page,
          pageSize: historyPageSize,
        };
        if (filters.from) params.from = filters.from;
        if (filters.to) params.to = filters.to;
        if (filters.search?.trim()) params.search = filters.search.trim();

        const res = await proBucketService.listHodRateHistories(id, params);
        const payload = res?.data || res;
        setHistoryRows(Array.isArray(payload?.data) ? payload.data : []);
        setHistoryTotal(Number(payload?.total) || 0);
        setHistoryPage(Number(payload?.page) || page);
        setHistoryTotalPages(Number(payload?.totalPages) || 1);
      } catch (e) {
        toastError(e?.message || "Failed to load rate history");
      } finally {
        setHistoryLoading(false);
      }
    },
    [historyFilters, historyPageSize, id, userIsHod],
  );

  const applyHistoryFilters = () => {
    setHistoryFilters({
      from: historyFilterDraft.from || "",
      to: historyFilterDraft.to || "",
      search: historyFilterDraft.search || "",
    });
    setHistoryPage(1);
  };

  const clearHistoryFilters = () => {
    const empty = { from: "", to: "", search: "" };
    setHistoryFilterDraft(empty);
    setHistoryFilters(empty);
    setHistoryPage(1);
  };

  useEffect(() => {
    if (!userIsHod || !id || !form.rawProductCode?.trim()) {
      setHistoryRows([]);
      setHistoryTotal(0);
      setHistoryPage(1);
      setHistoryTotalPages(1);
      return;
    }
    loadRateHistories(historyPage);
  }, [
    form.rawProductCode,
    historyPage,
    historyFilters,
    id,
    loadRateHistories,
    userIsHod,
  ]);

  /* ── image helpers ── */
  const handleFilePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPendingFiles((p) => [...p, ...files]);
    setPendingPreviews((p) => [
      ...p,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
    e.target.value = "";
  };

  const removePending = (idx) => {
    URL.revokeObjectURL(pendingPreviews[idx]);
    setPendingFiles((p) => p.filter((_, i) => i !== idx));
    setPendingPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const removeSaved = (imgId) => {
    setDoc((prev) => ({
      ...prev,
      images: (prev?.images || []).filter((img) => (img?._id || img) !== imgId),
    }));
  };

  const buildImageIds = (uploadedDocs) => {
    const saved = (doc?.images || [])
      .map((img) => (typeof img === "object" ? img._id || img.id : img))
      .filter(Boolean);
    const fresh = uploadedDocs.map((d) => d._id || d.id).filter(Boolean);
    return [...saved, ...fresh];
  };

  /* ── update ── */
  const handleUpdate = async () => {
    const quantity = form.quantity !== "" ? Number(form.quantity) : undefined;
    if (quantity !== undefined) {
      if (!Number.isFinite(quantity) || quantity < 0) {
        toastError("Enter a valid quantity");
        return;
      }
      if (quantity > MAX_QUANTITY) {
        toastError("Quantity cannot exceed 1,00,000");
        return;
      }
    }

    const gstPercentage =
      form.gstPercentage !== "" ? Number(form.gstPercentage) : null;
    if (gstPercentage !== null) {
      if (!Number.isFinite(gstPercentage) || gstPercentage < 0) {
        toastError("Enter a valid GST percentage");
        return;
      }
      if (gstPercentage > MAX_GST_PERCENTAGE) {
        toastError("GST percentage cannot exceed 100");
        return;
      }
    }

    setSaving(true);
    try {
      let uploadedDocs = [];
      if (pendingFiles.length > 0) {
        const res = await documentService.uploadImages(pendingFiles);
        const raw = res?.data || res;
        uploadedDocs = raw?.data?.documents || raw?.documents || [];
      }

      const payload = {
        productName: form.productName,
        quantity: form.quantity !== "" ? Number(form.quantity) : undefined,
        modelNumber: form.modelNumber,
        gstPercentage:
          form.gstPercentage !== "" ? Number(form.gstPercentage) : null,
        remark: form.remark,
        images: buildImageIds(uploadedDocs),
      };

      const res = await proBucketService.updateQueryProduct(id, payload);
      const updated = res?.data?.data || res?.data;
      if (updated) setDoc(updated);

      setPendingFiles([]);
      setPendingPreviews([]);
      toastSuccess("Query product updated successfully");
    } catch (e) {
      toastError(e?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  /* ── HOD rate management ── */
  const handleUpdateRate = async () => {
    if (!userIsHod) {
      toastError("Only Head of Department can update rates");
      return;
    }
    const minRate = Number(rateForm.minRate);
    const maxRate = Number(rateForm.maxRate);

    if (!Number.isFinite(minRate) || minRate < 0) {
      toastError("Enter a valid minimum rate");
      return;
    }
    if (!Number.isFinite(maxRate) || maxRate < 0) {
      toastError("Enter a valid maximum rate");
      return;
    }
    if (minRate > maxRate) {
      toastError("Minimum rate cannot exceed maximum rate");
      return;
    }
    if (minRate > MAX_HOD_RATE) {
      toastError("Minimum rate cannot exceed 1,000,000");
      return;
    }
    if (maxRate > MAX_HOD_RATE) {
      toastError("Maximum rate cannot exceed 1,000,000");
      return;
    }

    setUpdatingRate(true);
    try {
      const res = await proBucketService.updateHodRates(id, {
        minRate,
        maxRate,
        discount: 0,
      });
      const updated = res?.data?.data || res?.data;
      if (updated) {
        setDoc(updated);
        applyRateManagement(updated?.rateManagement);
        if (historyPage === 1) {
          loadRateHistories(1);
        } else {
          setHistoryPage(1);
        }
      }
      const approved = updated?.rateManagement?.isHodRateApproved;
      toastSuccess(
        approved
          ? "Rates approved and updated successfully"
          : "Rates updated successfully",
      );
    } catch (e) {
      toastError(e?.message || "Failed to update rates");
    } finally {
      setUpdatingRate(false);
    }
  };

  /* ── HOD approve ── */
  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await proBucketService.updateQueryProduct(id, {
        status: "pending",
        hodApproved: true,
      });
      const updated = res?.data?.data || res?.data;
      if (updated) setDoc(updated);
      toastSuccess("HOD approved — status set to Pending");
    } catch (e) {
      toastError(e?.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  /* ── derived flags ── */
  const hodApproved = !!doc?.hodApproved;
  const canUpdate = userIsHod || !hodApproved; // non-HOD locked out after approval
  const savedImages = Array.isArray(doc?.images) ? doc.images : [];
  const queryCode =
    doc?.queryCode ||
    (doc?.queryId && typeof doc.queryId === "object"
      ? doc.queryId.queryCode
      : "") ||
    "—";

  const submittedRateUnit =
    doc?.rateManagement?.submittedRateUnit?.trim() || form.unit?.trim() || "—";

  const hasRateData =
    doc?.rateManagement?.hasSubmittedRates ||
    doc?.rateManagement?.hasHodRates ||
    (Array.isArray(doc?.rates) && doc.rates.length > 0);

  const ratesAwaitingHodApproval =
    hasRateData && !doc?.rateManagement?.isHodRateApproved;

  const ratesUnchanged =
    normalizeRateComparison(rateForm.minRate) ===
      normalizeRateComparison(doc?.rateManagement?.minRate) &&
    normalizeRateComparison(rateForm.maxRate) ===
      normalizeRateComparison(doc?.rateManagement?.maxRate);

  const minRateValue = normalizeRateComparison(rateForm.minRate);
  const maxRateValue = normalizeRateComparison(rateForm.maxRate);
  const rateMargin =
    minRateValue != null && maxRateValue != null && maxRateValue >= minRateValue
      ? maxRateValue - minRateValue
      : null;
  const ratesMinExceedsMax =
    minRateValue != null && maxRateValue != null && minRateValue > maxRateValue;

  const minRateExceedsLimit =
    minRateValue != null && minRateValue > MAX_HOD_RATE;
  const maxRateExceedsLimit =
    maxRateValue != null && maxRateValue > MAX_HOD_RATE;
  const ratesExceedLimit = minRateExceedsLimit || maxRateExceedsLimit;

  const ratesHaveZero = minRateValue === 0 || maxRateValue === 0;

  const hasHistoryFilters = !!(
    historyFilters.from ||
    historyFilters.to ||
    historyFilters.search?.trim()
  );

  const procurementRates = Array.isArray(doc?.rates) ? doc.rates : [];

  const quantityValue = normalizeRateComparison(form.quantity);
  const quantityExceedsLimit =
    quantityValue != null && quantityValue > MAX_QUANTITY;

  const gstPercentageValue =
    form.gstPercentage === "" || form.gstPercentage == null
      ? null
      : Number(form.gstPercentage);
  const gstExceedsMax =
    gstPercentageValue != null &&
    Number.isFinite(gstPercentageValue) &&
    gstPercentageValue > MAX_GST_PERCENTAGE;
  const gstAboveStandardRate =
    gstPercentageValue != null &&
    Number.isFinite(gstPercentageValue) &&
    gstPercentageValue > GST_HIGH_RATE_THRESHOLD &&
    !gstExceedsMax;

  if (loading) return <Loader />;

  return (
    <div>
      {/* ── Top bar ── */}
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/query-products")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <PageHeader
        title={doc ? getProductDisplayName(doc) : "Query Product"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(doc?.status)}

            {hodApproved && (
              <Badge variant="success">
                <CheckCircle className="h-3 w-3" />
                HOD Approved
              </Badge>
            )}

            {/* HOD Approve — visible to HOD only, disabled after approval */}
            {userIsHod && (
              <Button
                type="button"
                size="sm"
                disabled={hodApproved || approving}
                onClick={handleApprove}
                className="bg-success! text-success-foreground hover:opacity-90"
              >
                {approving ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Approving…
                  </>
                ) : hodApproved ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    HOD Approved
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    HOD Approve
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />

      {/* locked banner for non-HOD after approval */}
      {hodApproved && !userIsHod && (
        <Alert variant="success" className="mb-4">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            This product has been <strong>HOD approved</strong>. Editing is
            restricted to Head of Department only.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* ── Images panel ── */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Images</CardTitle>
              <Badge variant="secondary">
                {savedImages.length + pendingFiles.length}
              </Badge>
            </CardHeader>
            <CardContent>
              {savedImages.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 text-sm text-muted-foreground">Saved</p>
                  <div className="flex flex-wrap gap-2">
                    {savedImages.map((img, i) => {
                      const url = resolveUrl(img);
                      const imgId =
                        typeof img === "object" ? img._id || img.id : img;
                      const name =
                        typeof img === "object"
                          ? img.name || `Image ${i + 1}`
                          : `Image ${i + 1}`;
                      return (
                        <div
                          key={i}
                          className="relative shrink-0 overflow-hidden rounded-md border border-border"
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
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => removeSaved(imgId)}
                              title="Remove"
                              style={{
                                position: "absolute",
                                top: 3,
                                right: 3,
                                background: "rgba(220,53,69,0.85)",
                                border: "none",
                                borderRadius: "50%",
                                width: 20,
                                height: 20,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                padding: 0,
                                color: "#fff",
                              }}
                            >
                              <Trash2 style={{ width: 10, height: 10 }} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pendingFiles.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Pending upload ({pendingFiles.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pendingPreviews.map((src, i) => (
                      <div
                        key={i}
                        className="relative shrink-0 overflow-hidden rounded-md border border-border"
                        style={{ width: 100 }}
                      >
                        <img
                          src={src}
                          alt={pendingFiles[i]?.name}
                          style={{
                            width: "100%",
                            height: 90,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        <div
                          className="truncate border-t border-border bg-background px-1 py-1"
                          style={{ fontSize: "0.65rem" }}
                          title={pendingFiles[i]?.name}
                        >
                          {pendingFiles[i]?.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => removePending(i)}
                          title="Remove"
                          style={{
                            position: "absolute",
                            top: 3,
                            right: 3,
                            background: "rgba(220,53,69,0.85)",
                            border: "none",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            padding: 0,
                            color: "#fff",
                          }}
                        >
                          <Trash2 style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canUpdate && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleFilePick}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="h-4 w-4" />
                    Add Images
                  </Button>
                  {pendingFiles.length > 0 && (
                    <p className="mb-0 mt-2 text-sm text-warning!">
                      ⚠ {pendingFiles.length} image
                      {pendingFiles.length !== 1 ? "s" : ""} waiting — click{" "}
                      <strong>Update</strong> to save.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Details / edit form ── */}
        <div className="col-span-12 lg:col-span-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Product Details</CardTitle>
              <span className="text-sm text-muted-foreground">
                Query:{" "}
                <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-xs text-background">
                  {queryCode}
                </span>
              </span>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 space-y-1.5 md:col-span-6">
                  <Label>Product Name</Label>
                  <Input
                    value={
                      doc
                        ? getProductDisplayName({
                            productName: form.productName,
                            variants: doc.variants,
                          })
                        : form.productName
                    }
                    placeholder="Product name"
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="col-span-12 space-y-1.5 md:col-span-6">
                  <Label>Raw Product Code</Label>
                  <Input
                    value={form.rawProductCode}
                    placeholder="Raw product code"
                    className="bg-muted font-mono"
                    disabled
                  />
                </div>

                <div className="col-span-12 space-y-1.5 md:col-span-6">
                  <Label>Query Code</Label>
                  <Input
                    value={queryCode}
                    readOnly
                    className="bg-muted font-mono"
                  />
                </div>

                <div className="col-span-6 space-y-1.5 md:col-span-3">
                  <Label>Unit</Label>
                  <Input
                    value={form.unit}
                    placeholder="e.g. pcs"
                    className="bg-muted"
                    disabled
                  />
                </div>

                <div className="col-span-6 space-y-1.5 md:col-span-3">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    max={MAX_QUANTITY}
                    value={form.quantity}
                    onChange={(e) => setField("quantity", e.target.value)}
                    placeholder="0"
                    disabled={!canUpdate}
                    aria-invalid={quantityExceedsLimit || undefined}
                  />
                  {quantityExceedsLimit && (
                    <p className="mb-0 mt-1 text-sm text-destructive">
                      Quantity must not exceed 1,00,000.
                    </p>
                  )}
                </div>

                <div className="col-span-6 space-y-1.5 md:col-span-3">
                  <Label>HSN Number</Label>
                  <Input
                    value={form.hsnNumber}
                    placeholder="HSN code"
                    className="bg-muted"
                    disabled
                  />
                </div>

                <div className="col-span-6 space-y-1.5 md:col-span-3">
                  <Label>Model Number</Label>
                  <Input
                    value={form.modelNumber}
                    onChange={(e) => setField("modelNumber", e.target.value)}
                    placeholder="Model no."
                    disabled={!canUpdate}
                  />
                </div>

                <div className="col-span-6 space-y-1.5 md:col-span-3">
                  <Label
                    className={
                      gstAboveStandardRate
                        ? "font-semibold text-warning!"
                        : undefined
                    }
                  >
                    GST %
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={MAX_GST_PERCENTAGE}
                    value={form.gstPercentage}
                    onChange={(e) => setField("gstPercentage", e.target.value)}
                    placeholder="0"
                    disabled={!canUpdate}
                    aria-invalid={gstExceedsMax || undefined}
                    className={
                      gstAboveStandardRate
                        ? "border-warning! font-semibold text-warning!"
                        : undefined
                    }
                  />
                  {gstAboveStandardRate && (
                    <p className="mb-0 mt-1 text-sm text-warning!">
                      GST is more than 18%.
                    </p>
                  )}
                  {gstExceedsMax && (
                    <p className="mb-0 mt-1 text-sm text-destructive">
                      GST percentage must not exceed 100.
                    </p>
                  )}
                </div>

                <div className="col-span-12 space-y-1.5 md:col-span-4">
                  <Label>Group</Label>
                  <Select value={form.groupId} className="bg-muted" disabled>
                    <option value="">— No Group —</option>
                    {groups.map((g) => (
                      <option key={g._id || g.id} value={g._id || g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="col-span-12 space-y-1.5 md:col-span-5">
                  <Label>Category</Label>
                  <Select value={form.categoryId} className="bg-muted" disabled>
                    <option value="">— No Category —</option>
                    {filteredCategories.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="col-span-12 space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={form.description}
                    placeholder="Product description…"
                    className="bg-muted"
                    disabled
                  />
                </div>

                <div className="col-span-12 space-y-1.5">
                  <Label>Remark</Label>
                  <Textarea
                    rows={2}
                    value={form.remark}
                    onChange={(e) => setField("remark", e.target.value)}
                    placeholder="Any remarks…"
                    disabled={!canUpdate}
                  />
                </div>
              </div>

              {/* ── Action row ── */}
              <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/query-products")}
                  disabled={saving}
                >
                  Cancel
                </Button>

                {canUpdate && (
                  <Button
                    type="button"
                    onClick={handleUpdate}
                    disabled={saving || quantityExceedsLimit || gstExceedsMax}
                  >
                    {saving ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        Updating…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Update
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Rate Management ── */}
        <div className="col-span-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Rate Management</CardTitle>
              {doc?.rateManagement?.isHodRateApproved && (
                <Badge variant="success">HOD rate approved</Badge>
              )}
              {ratesAwaitingHodApproval && (
                <Badge variant="warning">Awaiting HOD approval</Badge>
              )}
            </CardHeader>
            <CardContent>
              {!hasRateData && !form.rawProductCode?.trim() ? (
                <p className="mb-0 text-muted-foreground">
                  No supplier rates have been submitted yet. Rates can be
                  managed here after procurement submits rates for this product.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 space-y-1.5 md:col-span-3">
                      <Label>Submitted rate unit</Label>
                      <Input
                        value={submittedRateUnit}
                        readOnly
                        className="bg-muted"
                      />
                    </div>

                    <div className="col-span-12 space-y-1.5 md:col-span-3">
                      <Label>Minimum rate</Label>
                      <Input
                        type="number"
                        min={0}
                        max={MAX_HOD_RATE}
                        value={rateForm.minRate}
                        onChange={(e) =>
                          setRateField("minRate", e.target.value)
                        }
                        placeholder="0"
                        disabled={!userIsHod}
                        aria-invalid={
                          ratesMinExceedsMax || minRateExceedsLimit || undefined
                        }
                      />
                    </div>

                    <div className="col-span-12 space-y-1.5 md:col-span-3">
                      <Label>Maximum rate</Label>
                      <Input
                        type="number"
                        min={0}
                        max={MAX_HOD_RATE}
                        value={rateForm.maxRate}
                        onChange={(e) =>
                          setRateField("maxRate", e.target.value)
                        }
                        placeholder="0"
                        disabled={!userIsHod}
                        aria-invalid={
                          ratesMinExceedsMax || maxRateExceedsLimit || undefined
                        }
                      />
                    </div>

                    <div className="col-span-12 space-y-1.5 md:col-span-3">
                      <Label className="font-semibold text-primary!">
                        Margin
                      </Label>
                      <Input
                        value={formatRateValue(rateMargin)}
                        readOnly
                        className="bg-muted font-semibold text-primary!"
                      />
                    </div>
                  </div>

                  {ratesMinExceedsMax && (
                    <p className="mb-0 mt-3 text-sm text-destructive">
                      Minimum rate cannot be greater than maximum rate.
                    </p>
                  )}

                  {ratesExceedLimit && (
                    <p className="mb-0 mt-3 text-sm text-destructive">
                      Minimum and maximum rates must not exceed 1,000,000.
                    </p>
                  )}

                  {ratesHaveZero && userIsHod && (
                    <p className="mb-0 mt-3 text-sm text-warning!">
                      Minimum and maximum rates must both be greater than 0 to
                      update.
                    </p>
                  )}

                  {!form.rawProductCode?.trim() && (
                    <p className="mb-0 mt-3 text-sm text-warning!">
                      Raw product code is missing — rates cannot be updated
                      until it is set on the source query.
                    </p>
                  )}

                  {userIsHod && (
                    <div className="mt-4 flex justify-end border-t border-border pt-3">
                      <Button
                        type="button"
                        onClick={handleUpdateRate}
                        disabled={
                          updatingRate ||
                          !form.rawProductCode?.trim() ||
                          ratesMinExceedsMax ||
                          ratesExceedLimit ||
                          ratesHaveZero ||
                          (ratesUnchanged && !ratesAwaitingHodApproval)
                        }
                      >
                        {updatingRate ? (
                          <>
                            <Spinner className="h-4 w-4" />
                            {ratesAwaitingHodApproval
                              ? "Approving…"
                              : "Updating rate…"}
                          </>
                        ) : ratesAwaitingHodApproval ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Approve & Update Rate
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Update Rate
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {!userIsHod && (
                    <p className="mb-0 mt-3 text-sm text-muted-foreground">
                      Rate updates are available to Head of Department only.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Procurement Rates</CardTitle>
              {procurementRates.length > 0 && (
                <Badge variant="info">
                  {procurementRates.length} rate
                  {procurementRates.length === 1 ? "" : "s"}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
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
                        <TableHead>Phone</TableHead>
                        <TableHead>Base rate</TableHead>
                        <TableHead>GST %</TableHead>
                        <TableHead>Discount %</TableHead>
                        <TableHead>Final amount</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Remark</TableHead>
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
                          <TableCell>
                            {row.supplier?.phone_1?.trim() || "—"}
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
                          <TableCell>{row.remark?.trim() || "—"}</TableCell>
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

        {userIsHod && (
          <div className="col-span-12">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Rate History</CardTitle>
                {historyTotal > 0 && (
                  <Badge variant="info">
                    {historyTotal} record{historyTotal === 1 ? "" : "s"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {!form.rawProductCode?.trim() ? (
                  <p className="mb-0 text-muted-foreground">
                    Rate history is available once this product has a raw
                    product code.
                  </p>
                ) : (
                  <>
                    <div className="mb-3 grid grid-cols-12 items-end gap-3">
                      <div className="col-span-12 space-y-1.5 md:col-span-6 lg:col-span-3">
                        <Label className="text-sm text-muted-foreground">
                          Search query code
                        </Label>
                        <Input
                          value={historyFilterDraft.search}
                          placeholder="Query code"
                          onChange={(e) =>
                            setHistoryFilterDraft((prev) => ({
                              ...prev,
                              search: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") applyHistoryFilters();
                          }}
                        />
                      </div>
                      <div className="col-span-12 space-y-1.5 md:col-span-6 lg:col-span-2">
                        <Label className="text-sm text-muted-foreground">
                          From date
                        </Label>
                        <Input
                          type="date"
                          value={historyFilterDraft.from}
                          max={historyFilterDraft.to || undefined}
                          onChange={(e) =>
                            setHistoryFilterDraft((prev) => ({
                              ...prev,
                              from: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="col-span-12 space-y-1.5 md:col-span-6 lg:col-span-2">
                        <Label className="text-sm text-muted-foreground">
                          To date
                        </Label>
                        <Input
                          type="date"
                          value={historyFilterDraft.to}
                          min={historyFilterDraft.from || undefined}
                          onChange={(e) =>
                            setHistoryFilterDraft((prev) => ({
                              ...prev,
                              to: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="col-span-12 flex flex-wrap gap-2 md:col-span-6 lg:col-span-5">
                        <Button
                          type="button"
                          onClick={applyHistoryFilters}
                          disabled={historyLoading}
                        >
                          Apply Filters
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={clearHistoryFilters}
                          disabled={historyLoading || !hasHistoryFilters}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    {historyLoading && historyRows.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-4">
                        <Spinner className="h-4 w-4" />
                        Loading rate history…
                      </div>
                    ) : historyRows.length === 0 ? (
                      <p className="mb-0 text-muted-foreground">
                        {hasHistoryFilters
                          ? "No rate history matches your filters."
                          : "No rate history recorded for this product yet."}
                      </p>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date &amp; Time</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Minimum Rate</TableHead>
                                <TableHead>Maximum Rate</TableHead>
                                <TableHead>Query Info</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {historyRows.map((row) => (
                                <TableRow key={row.id || row._id}>
                                  <TableCell>
                                    {dateTimeFormatter(row.createdAt, "—")}
                                  </TableCell>
                                  <TableCell>
                                    {row.unit?.trim() || "—"}
                                  </TableCell>
                                  <TableCell>
                                    {formatRateValue(row.minRate)}
                                  </TableCell>
                                  <TableCell>
                                    {formatRateValue(row.maxRate)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-semibold">
                                      {row.companyName?.trim() || "—"}
                                    </div>
                                    <div className="font-mono text-sm text-muted-foreground">
                                      {row.queryCode?.trim() || "—"}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      Received:{" "}
                                      {dateFormatter(row.queryReceivedAt, "—")}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <TablePagination
                          currentPage={historyPage}
                          totalPages={historyTotalPages}
                          onPageChange={setHistoryPage}
                          showRange
                          totalItems={historyTotal}
                          itemsPerPage={historyPageSize}
                          disabled={historyLoading}
                        />
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryProductView;
