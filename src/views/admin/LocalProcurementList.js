import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBasket,
  Clipboard,
  Eye,
  Inbox,
  IndianRupee,
  RefreshCcw,
  Users,
} from "lucide-react";
import localProcurementService from "../../services/localProcurementService";
import areaService from "../../services/areaService";
import documentService from "../../services/documentService";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import {
  TablePagination,
  FilterLockButton,
  PageHeader,
  StatusBadge,
  DataTable,
} from "../../components";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter } from "../../utils/dateFormatter";
import { useAuth, ROLES } from "../../context/AuthContext";

const LOCAL_PROCUREMENT_FILTER_DEFAULTS = {
  status: "",
  dateFrom: "",
  dateTo: "",
  zoneId: "",
};

/**
 * Bucket a row into one of the page tabs:
 * - "reverify": submitted rows back for re-verification
 * - "assigned": pending rows assigned to an employee
 * - "direct":   pending rows with no assignee (came in directly)
 */
const classifyRow = (row) => {
  if (row?.status === "submitted") return "reverify";
  if (row?.employeeId) return "assigned";
  return "direct";
};

const statusBadge = (status) => {
  switch (status) {
    case "pending":
      return <StatusBadge variant="warning" status="Pending" />;
    case "submitted":
      return <StatusBadge variant="success" status="Submitted" />;
    default:
      return <StatusBadge variant="secondary" status={status || "—"} />;
  }
};

const imgSrc = (path) => {
  if (!path) return "";
  if (
    typeof path === "string" &&
    (path.startsWith("http://") || path.startsWith("https://"))
  )
    return path;
  return getAssetsUrl(path);
};

const resolveImagePath = (img) => {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.path || img.url || "";
};

const sanitizeRateInput = (raw) => {
  if (raw === "" || raw == null) return "";
  const t = String(raw).replace(/[^\d.]/g, "");
  if (t === "") return "";
  const dot = t.indexOf(".");
  if (dot === -1) return t;
  return t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, "");
};

const latestRate = (row) => {
  const rates = Array.isArray(row?.rates) ? row.rates : [];
  if (rates.length) return rates[rates.length - 1];
  if (row?.status === "submitted") {
    return {
      supplier: row.supplier,
      price: row.rate,
      rate: row.rate,
      unit: row.unit,
      remark: row.remark,
    };
  }
  return null;
};

const formatProcurementZone = (zone) => {
  if (!zone || typeof zone !== "object") return "—";
  const name = zone.name?.trim() || "";
  const city = zone.city?.trim() || "";
  if (name && city) return `${name} (${city})`;
  return name || city || "—";
};

const unwrapPayload = (res) => res?.data?.data ?? res?.data;

const LocalProcurementList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const openDetail = (row) =>
    navigate(`/local-pro/${row._id}`, { state: { row } });
  const isLocalPro =
    String(user?.role || "").toLowerCase() === ROLES.LOCAL_PROCUREMENT;

  const pageTitle = isLocalPro ? "My Pro Bucket" : "Local Pro";
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "local_procurement",
    LOCAL_PROCUREMENT_FILTER_DEFAULTS,
  );

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [activeTab, setActiveTab] = useState("assigned");
  const [fromDate, setFromDate] = useState(initialValues.dateFrom);
  const [toDate, setToDate] = useState(initialValues.dateTo);
  const [zoneId, setZoneId] = useState(initialValues.zoneId);
  const [marketZones, setMarketZones] = useState([]);
  const [marketZonesLoading, setMarketZonesLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [submitPanelOpen, setSubmitPanelOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [supplier, setSupplier] = useState("");
  const [price, setPrice] = useState("");
  const [rate, setRate] = useState("");
  const [unit, setUnit] = useState("");
  const [remark, setRemark] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  /* Load one big page and classify client-side into the Assigned /
     Direct / Reverify tabs (the list API has no assignee filter). */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() =>
          localProcurementService.list({
            page: 1,
            pageSize: 100,
            from: fromDate || undefined,
            to: toDate || undefined,
            zoneId: zoneId.trim() || undefined,
          }),
        );
        if (cancelled) return;
        const block = res?.data;
        setRows(Array.isArray(block?.data) ? block.data : []);
        setTotal(Number(block?.total) || 0);
      } catch (e) {
        if (cancelled) return;
        toastError(e?.message || "Failed to load local procurement items");
        setRows([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, zoneId, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const loadMarketZones = async () => {
      setMarketZonesLoading(true);
      try {
        const res = await areaService.getAll({
          pageNumber: 1,
          pageSize: 100,
          areaType: "market",
        });
        if (cancelled) return;
        const zonesPayload = unwrapPayload(res);
        const zoneRows = zonesPayload?.areas || [];
        setMarketZones(
          (zoneRows || []).map((zone) => ({
            ...zone,
            id: zone._id || zone.id,
          })),
        );
      } catch (e) {
        if (!cancelled) {
          toastError(e?.message || "Failed to load zones");
          setMarketZones([]);
        }
      } finally {
        if (!cancelled) setMarketZonesLoading(false);
      }
    };
    loadMarketZones();
    return () => {
      cancelled = true;
    };
  }, []);

  useFilterLockPersist("local_procurement", filtersLocked, {
    status: "",
    dateFrom: fromDate,
    dateTo: toDate,
    zoneId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      status: "",
      dateFrom: fromDate,
      dateTo: toDate,
      zoneId,
    });
  };

  /* ── classification into tabs + pending counts ── */
  const buckets = useMemo(() => {
    const assigned = [];
    const direct = [];
    const reverify = [];
    rows.forEach((row) => {
      const kind = classifyRow(row);
      if (kind === "reverify") reverify.push(row);
      else if (kind === "assigned") assigned.push(row);
      else direct.push(row);
    });
    return { assigned, direct, reverify };
  }, [rows]);

  const pendingCounts = useMemo(
    () => ({
      assigned: buckets.assigned.filter((r) => r.status === "pending").length,
      direct: buckets.direct.filter((r) => r.status === "pending").length,
      reverify: buckets.reverify.length,
    }),
    [buckets],
  );

  const tabRows = buckets[activeTab] || [];
  const totalPages = Math.max(1, Math.ceil(tabRows.length / pageSize) || 1);
  const visibleRows = tabRows.slice((page - 1) * pageSize, page * pageSize);

  const canSubmitRow = useMemo(
    () => (row) => {
      if (row?.status !== "pending") return false;
      if (
        user?.role === ROLES.SUPER_ADMIN ||
        user?.role === ROLES.ADMIN ||
        user?.role === ROLES.HEAD_OF_DEPARTMENT
      ) {
        return true;
      }
      if (isLocalPro) {
        const uid = user?.id || user?._id;
        return (
          uid && String(row?.employeeId?._id || row?.employeeId) === String(uid)
        );
      }
      return false;
    },
    [user, isLocalPro],
  );

  const openSubmitPanel = (row) => {
    setActiveRow(row);
    setSupplier("");
    setPrice("");
    setRate("");
    setUnit(row?.productSnapshot?.unit || "");
    setRemark("");
    setImageFiles([]);
    setSubmitPanelOpen(true);
  };

  const closeSubmitPanel = () => {
    if (submitting || uploadingImages) return;
    setSubmitPanelOpen(false);
    setActiveRow(null);
    setImageFiles([]);
  };

  const handleSubmit = async () => {
    if (!activeRow?._id) return;
    if (!supplier.trim()) {
      toastError("Supplier is required");
      return;
    }
    if (rate === "" || Number.isNaN(Number(rate)) || Number(rate) < 0) {
      toastError("Enter a valid rate ≥ 0");
      return;
    }
    if (price !== "" && (Number.isNaN(Number(price)) || Number(price) < 0)) {
      toastError("Enter a valid price ≥ 0");
      return;
    }

    setSubmitting(true);
    try {
      let images = [];
      if (imageFiles.length) {
        setUploadingImages(true);
        const uploadRes = await documentService.uploadImages(imageFiles);
        const docs =
          uploadRes?.data?.documents ||
          uploadRes?.documents ||
          uploadRes?.data ||
          [];
        images = (Array.isArray(docs) ? docs : [])
          .filter((d) => d?._id)
          .map((d) => ({ documentId: d._id }));
        setUploadingImages(false);
      }

      await localProcurementService.submit(activeRow._id, {
        supplier: supplier.trim(),
        price: price !== "" ? Number(price) : undefined,
        rate: Number(rate),
        unit: unit || "",
        remark: remark || "",
        images,
      });
      toastSuccess("Submitted successfully");
      closeSubmitPanel();
      setReloadKey((k) => k + 1);
    } catch (e) {
      toastError(e?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const columns = [
    {
      key: "index",
      label: "#",
      width: 52,
      toggleable: false,
      exportable: false,
      render: (_row, index) => (page - 1) * pageSize + index + 1,
    },
    {
      key: "product",
      label: "Product",
      sortable: true,
      sortValue: (row) => row.productSnapshot?.productName || "",
      exportValue: (row) => row.productSnapshot?.productName || "",
      render: (row) => {
        const snap = row.productSnapshot || {};
        const firstImage = Array.isArray(snap.images) ? snap.images[0] : null;
        const src = imgSrc(resolveImagePath(firstImage));
        return (
          <div className="flex items-center gap-2">
            {src ? (
              <img
                src={src}
                alt={snap.productName || "Product"}
                className="h-9 w-9 shrink-0 rounded border border-border object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground">
                <ShoppingBasket className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              <div
                className="max-w-[14rem] truncate font-medium text-foreground"
                title={snap.productName || ""}
              >
                {snap.productName || "Product"}
              </div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {row.queryCode || snap.queryCode || "—"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "quantity",
      label: "Qty",
      align: "right",
      sortValue: (row) => Number(row.productSnapshot?.quantity) || 0,
      exportValue: (row) => {
        const snap = row.productSnapshot || {};
        return snap.quantity != null
          ? `${snap.quantity} ${snap.unit || ""}`.trim()
          : "";
      },
      render: (row) => {
        const snap = row.productSnapshot || {};
        return snap.quantity != null
          ? `${snap.quantity} ${snap.unit || ""}`.trim()
          : "—";
      },
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      sortValue: (row) => row.productSnapshot?.categoryName || "",
      exportValue: (row) => row.productSnapshot?.categoryName || "",
      render: (row) => row.productSnapshot?.categoryName || "—",
    },
    {
      key: "zone",
      label: "Zone",
      exportValue: (row) => formatProcurementZone(row.zoneId),
      render: (row) => formatProcurementZone(row.zoneId),
    },
    ...(!isLocalPro
      ? [
          {
            key: "assignee",
            label: "Assignee",
            sortValue: (row) => row.employeeId?.name || "",
            exportValue: (row) => row.employeeId?.name || "Unassigned",
            render: (row) => (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {row.employeeId?.name || "Unassigned"}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "submission",
      label: "Submitted rate",
      exportValue: (row) => {
        const s = latestRate(row);
        return s ? `${s.supplier || "—"} — ₹${s.rate ?? "—"}` : "";
      },
      render: (row) => {
        const s = latestRate(row);
        if (!s) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="text-sm">
            <div className="truncate" title={s.supplier || ""}>
              {s.supplier || "—"}
            </div>
            <div className="text-muted-foreground">
              ₹ {s.rate ?? "—"} / {s.unit || "—"}
            </div>
          </div>
        );
      },
    },
    {
      key: "assignedOn",
      label: "Assigned",
      sortable: true,
      sortValue: (row) =>
        row.createdAt ? new Date(row.createdAt).getTime() : 0,
      exportValue: (row) => dateFormatter(row.createdAt, "—"),
      render: (row) => (
        <span className="whitespace-nowrap">
          {dateFormatter(row.createdAt, "—")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      exportValue: (row) => row.status || "",
      render: (row) => statusBadge(row.status),
    },
    {
      key: "action",
      label: "Action",
      align: "center",
      toggleable: false,
      exportable: false,
      stopRowClick: true,
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="View details"
            aria-label="View details"
            onClick={() => openDetail(row)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canSubmitRow(row) && (
            <Button size="sm" onClick={() => openSubmitPanel(row)}>
              Submit rate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={pageTitle}
        description="Review procurement assignments and submit supplier rates."
        actions={
          <div className="flex items-center gap-2">
            {isLocalPro ? (
              <ShoppingBasket className="h-5 w-5 text-primary!" />
            ) : (
              <Clipboard className="h-5 w-5 text-primary!" />
            )}
            <Badge variant="secondary">{total} total</Badge>
          </div>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="assigned">
            <Clipboard className="mr-2 h-4 w-4" />
            Assigned
            <Badge
              variant={pendingCounts.assigned > 0 ? "warning" : "secondary"}
              className="ml-1.5 px-1.5 text-[0.68rem]"
              title={`${pendingCounts.assigned} pending`}
            >
              {pendingCounts.assigned}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="direct">
            <Inbox className="mr-2 h-4 w-4" />
            Direct
            <Badge
              variant={pendingCounts.direct > 0 ? "warning" : "secondary"}
              className="ml-1.5 px-1.5 text-[0.68rem]"
              title={`${pendingCounts.direct} pending`}
            >
              {pendingCounts.direct}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="reverify">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reverify
            <Badge
              variant={pendingCounts.reverify > 0 ? "warning" : "secondary"}
              className="ml-1.5 px-1.5 text-[0.68rem]"
              title={`${pendingCounts.reverify} pending`}
            >
              {pendingCounts.reverify}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            From date
          </Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-40">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            To date
          </Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-56">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            Zone
          </Label>
          <Select
            value={zoneId}
            onChange={(e) => {
              setZoneId(e.target.value);
              setPage(1);
            }}
            disabled={marketZonesLoading}
          >
            <option value="">All zones</option>
            {marketZones.map((zone) => (
              <option key={zone.id} value={String(zone.id)}>
                {formatProcurementZone(zone)}
              </option>
            ))}
          </Select>
        </div>
        <FilterLockButton
          filtersLocked={filtersLocked}
          onToggle={handleToggleFiltersLock}
          pageLabel={pageTitle}
        />
        <Button
          variant="outline"
          onClick={() => {
            setFromDate("");
            setToDate("");
            setZoneId("");
            setPage(1);
          }}
        >
          Clear filters
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={visibleRows}
        rowKey={(row) => row._id}
        loading={loading}
        onRowClick={openDetail}
        searchPlaceholder="Search product, query code, supplier…"
        exportFileName="local-procurement"
        emptyTitle={
          activeTab === "reverify"
            ? "No submissions waiting for re-verification."
            : activeTab === "direct"
              ? "No direct (unassigned) items found."
              : isLocalPro
                ? "No assignments in your bucket yet."
                : "No local procurement assignments found."
        }
        rowClassName={(row) =>
          row.status === "pending" ? "bg-warning/5" : undefined
        }
      />

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        wrapperClassName="mt-4 flex justify-center"
        align="center"
      />

      <Dialog
        open={submitPanelOpen}
        onOpenChange={(o) => {
          if (!o) closeSubmitPanel();
        }}
      >
        <DialogContent
          showClose={!submitting && !uploadingImages}
          className="max-w-lg"
          onInteractOutside={(e) => {
            if (submitting || uploadingImages) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (submitting || uploadingImages) e.preventDefault();
          }}
          aria-label="Submit rate"
        >
          <DialogHeader className="gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary!">
              <IndianRupee className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Submit Rate</DialogTitle>
              <DialogDescription
                className="truncate"
                title={activeRow?.productSnapshot?.productName}
              >
                {activeRow?.productSnapshot?.productName ||
                  "Submit supplier rate for this item"}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Supplier <span className="text-destructive">*</span>
              </Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(sanitizeRateInput(e.target.value))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Rate <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(sanitizeRateInput(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <ProductUnitSelect
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remark</Label>
              <Input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Images</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setImageFiles(Array.from(e?.target?.files || []))
                }
              />
              {imageFiles.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {imageFiles.length} file(s) selected
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeSubmitPanel}
              disabled={submitting || uploadingImages}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploadingImages}
            >
              {submitting || uploadingImages ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalProcurementList;
