import React, { useEffect, useState, useMemo } from "react";
import { CheckCircle } from "lucide-react";
import deliveryApprovalService from "../../services/deliveryApprovalService";
import { getAssetsUrl } from "../../api/endpoints";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import {
  DataTable,
  PageHeader,
  RowActions,
  TablePagination,
  FilterLockButton,
} from "../../components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  Spinner,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { dateFormatter } from "../../utils/dateFormatter";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";

const DELIVERY_APPROVAL_FILTER_DEFAULTS = { dateFrom: "", dateTo: "" };

const serverStatus = (d) => d?.status ?? d?.inventoryStatus;

const STATUS_LABELS = {
  inventory_received: "Inventory received",
  ready_for_dispatchment: "Ready for dispatch",
  delivered: "Delivered",
  pending: "Pending",
  purchased: "Purchased",
};

const STATUS_VARIANTS = {
  inventory_received: "success",
  ready_for_dispatchment: "default",
  delivered: "secondary",
  pending: "warning",
  purchased: "secondary",
};

const dash = (value) => {
  if (value == null || value === "") return "—";
  return value;
};

const statusLabel = (s) => {
  if (s === undefined || s === null || s === "") return "—";
  const v = String(s).trim();
  if (STATUS_LABELS[v]) return STATUS_LABELS[v];
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const statusBadge = (s) => {
  if (s === undefined || s === null || s === "")
    return <Badge variant="outline">—</Badge>;
  const v = String(s).trim();
  if (STATUS_LABELS[v]) {
    return (
      <Badge variant={STATUS_VARIANTS[v] || "secondary"}>
        {STATUS_LABELS[v]}
      </Badge>
    );
  }
  const readable = v
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant="secondary">{readable}</Badge>;
};

const parseListResponse = (res) => {
  if (!res || typeof res !== "object") {
    return { list: [], total: 0, page: 1, pageSize: 20 };
  }
  const block = res.data;
  if (!block || typeof block !== "object") {
    return { list: [], total: 0, page: 1, pageSize: 20 };
  }
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    page: block.page ?? 1,
    pageSize: block.pageSize ?? 20,
  };
};

const docOpenUrl = (doc) => {
  if (!doc || typeof doc !== "object") return "";
  const p = doc.path || doc.url;
  return p ? getAssetsUrl(p) : "";
};

const DetailField = ({ label, children, className = "" }) => (
  <div className={className}>
    <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="break-words">{children ?? "—"}</div>
  </div>
);

const DetailSection = ({ title, children, className = "" }) => (
  <Card className={`shadow-sm ${className}`.trim()}>
    <CardHeader className="border-b border-border bg-muted/40 px-3 py-2">
      <CardTitle className="text-sm font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent className="p-3">{children}</CardContent>
  </Card>
);

const DocumentPreview = ({ doc, title }) => {
  if (!doc || typeof doc !== "object") return null;
  const url = docOpenUrl(doc);
  if (!url) return null;
  const mime = String(doc.mimeType || "");
  const isImg = mime.startsWith("image/");
  const name = doc.originalName || "Open file";
  return (
    <div className="mb-3 border-b border-border pb-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {isImg ? (
        <div className="mb-2">
          <img
            src={url}
            alt=""
            className="max-h-[200px] rounded border border-border"
          />
        </div>
      ) : null}
      <Button
        variant="link"
        className="h-auto p-0"
        onClick={() => window.open(url, "_blank", "noopener")}
      >
        {name}
      </Button>
    </div>
  );
};

const PurchaseManagerList = ({ managers = [] }) => {
  if (!managers.length) {
    return (
      <p className="mb-0 text-sm text-muted-foreground">No contacts listed.</p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {managers.map((pm, index) => (
        <div
          key={`${pm?.email || pm?.phone || pm?.name || "pm"}-${index}`}
          className="rounded border border-border bg-muted/40 px-3 py-2"
        >
          <div className="font-semibold">{dash(pm?.name)}</div>
          {pm?.phone ? (
            <div className="text-sm text-muted-foreground">{pm.phone}</div>
          ) : null}
          {pm?.email ? (
            <div className="break-words text-sm text-muted-foreground">
              {pm.email}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const DeliveryApprovalDetail = ({ detail, approving, onApprove }) => {
  const { formatAreaOrDash } = useAreaNameLookup();
  const itemCompany = detail?.companyInfo;
  const purchaseManagers = Array.isArray(itemCompany?.purchaseManagers)
    ? itemCompany.purchaseManagers
    : [];
  const pbr = detail?.purchaseBillingRequestId;
  const lineStatus = serverStatus(detail);
  const hasDocuments =
    detail?.attachmentDocumentId ||
    detail?.receivingDocumentId ||
    (pbr &&
      typeof pbr === "object" &&
      (pbr.billDocumentId || pbr.proofDocumentId));

  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="rounded-lg bg-warning-muted p-3">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-grow">
            <h5 className="mb-1 break-words text-lg font-semibold">
              {dash(detail.productName)}
            </h5>
            <div className="text-sm text-muted-foreground">
              Sales Order{" "}
              <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-xs text-background">
                {dash(detail.poCode)}
              </span>
            </div>
          </div>
          <Badge variant="warning" className="self-start">
            Awaiting HOD approval
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusBadge(lineStatus)}
          {detail.rawProductCode ? (
            <Badge variant="outline" className="font-mono">
              {detail.rawProductCode}
            </Badge>
          ) : null}
        </div>
      </div>

      <DetailSection title="Product & sales order">
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Product name">
            {dash(detail.productName)}
          </DetailField>
          <DetailField label="Sales order code">
            <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-xs text-background">
              {dash(detail.poCode)}
            </span>
          </DetailField>
          <DetailField label="Raw product code">
            {detail.rawProductCode ? <code>{detail.rawProductCode}</code> : "—"}
          </DetailField>
          <DetailField label="Line status">
            {statusBadge(lineStatus)}
          </DetailField>
          <DetailField label="Dispatch date">
            {dateFormatter(detail.dispatchmentDate, "—")}
          </DetailField>
          {detail.effectiveGroupName ? (
            <DetailField label="Product group">
              {detail.effectiveGroupName}
            </DetailField>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection title="Line details">
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Quantity">{dash(detail.quantity)}</DetailField>
          <DetailField label="Unit">{dash(detail.unit)}</DetailField>
          <DetailField label="HSN">{dash(detail.hsnNumber)}</DetailField>
          <DetailField label="GST %">
            {detail.gstPercentage != null ? `${detail.gstPercentage}%` : "—"}
          </DetailField>
          <DetailField label="Model / part #" className="col-span-2">
            {dash(detail.modelNumber)}
          </DetailField>
          {detail.description ? (
            <DetailField label="Description" className="col-span-2">
              {detail.description}
            </DetailField>
          ) : null}
          {detail.remark ? (
            <DetailField label="Line remark" className="col-span-2">
              {detail.remark}
            </DetailField>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection title="Company & delivery location">
        {itemCompany ? (
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Company name" className="col-span-2">
              {dash(itemCompany.name)}
            </DetailField>
            <DetailField label="Area">
              {formatAreaOrDash(itemCompany.area)}
            </DetailField>
            <DetailField label="Location">
              {dash(itemCompany.location)}
            </DetailField>
            <DetailField label="Address" className="col-span-2">
              {dash(itemCompany.address)}
            </DetailField>
            {itemCompany.billingAddress ? (
              <DetailField label="Billing address" className="col-span-2">
                {itemCompany.billingAddress}
              </DetailField>
            ) : null}
            {itemCompany.shippingAddress ? (
              <DetailField label="Shipping address" className="col-span-2">
                {itemCompany.shippingAddress}
              </DetailField>
            ) : null}
          </div>
        ) : (
          <p className="mb-0 text-sm text-muted-foreground">
            No company information.
          </p>
        )}
      </DetailSection>

      <DetailSection title="Purchase manager contacts">
        <PurchaseManagerList managers={purchaseManagers} />
      </DetailSection>

      <DetailSection title="Delivery proof & remarks">
        <div className="grid grid-cols-1 gap-3">
          <DetailField label="Receiving remark">
            {detail.receivingRemark ? (
              <span className="italic">{detail.receivingRemark}</span>
            ) : (
              "—"
            )}
          </DetailField>
        </div>
        {detail.receivingDocumentId ? (
          <div className="mt-3 border-t border-border pt-2">
            <DocumentPreview
              doc={detail.receivingDocumentId}
              title="Receiving / delivery proof"
            />
          </div>
        ) : (
          <p className="mb-0 mt-2 text-sm text-muted-foreground">
            No delivery proof uploaded.
          </p>
        )}
      </DetailSection>

      {hasDocuments ? (
        <DetailSection title="Documents">
          <DocumentPreview
            doc={detail.attachmentDocumentId}
            title="Line attachment"
          />
          {pbr && typeof pbr === "object" ? (
            <>
              <div className="mb-3 border-b border-border pb-2 text-sm text-muted-foreground">
                Linked billing request:{" "}
                <strong>{pbr.uniqueId || pbr._id || "—"}</strong>
                {pbr.status ? (
                  <>
                    {" "}
                    · <Badge variant="secondary">{pbr.status}</Badge>
                  </>
                ) : null}
              </div>
              <DocumentPreview
                doc={pbr.billDocumentId}
                title="Billing — bill document"
              />
              <DocumentPreview
                doc={pbr.proofDocumentId}
                title="Billing — proof document"
              />
            </>
          ) : null}
        </DetailSection>
      ) : null}

      <div className="sticky bottom-0 bg-card pt-2">
        <Button className="w-full" disabled={approving} onClick={onApprove}>
          {approving ? (
            <>
              <Spinner size="sm" className="mr-2" /> Approving…
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve delivery (HOD)
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const DeliveryApprovalList = () => {
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "delivery_approval",
    DELIVERY_APPROVAL_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [from, setFrom] = useState(initialValues.dateFrom);
  const [to, setTo] = useState(initialValues.dateTo);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, from, to]);

  useFilterLockPersist("delivery_approval", filtersLocked, {
    dateFrom: from,
    dateTo: to,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ dateFrom: from, dateTo: to });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        deliveryApprovalService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
    } catch (e) {
      toastError(e?.message || "Failed to load delivery approval queue");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchDebounced, from, to]);

  const openDetail = async (id) => {
    setDetailId(id);
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await deliveryApprovalService.getById(id);
      const doc = res?.data;
      setDetail(
        doc && typeof doc === "object" && !Array.isArray(doc) ? doc : null,
      );
    } catch (e) {
      toastError(e?.message || "Failed to load line");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailId(null);
    setDetail(null);
  };

  const approve = async () => {
    if (!detailId) return;
    setApproving(true);
    try {
      const res = await deliveryApprovalService.approveDelivery(detailId);
      const payload = res?.data;
      if (payload && payload.success === false) {
        toastError(payload?.message || "Update failed");
        return;
      }
      toastSuccess("Delivery approved by HOD");
      closeDetail();
      await load();
    } catch (e) {
      toastError(e?.message || "Update failed");
    } finally {
      setApproving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const columns = useMemo(
    () => [
      {
        key: "productName",
        label: "Product",
        sortable: true,
        exportValue: (row) => row.productName || "—",
        render: (row) => (
          <span className="block break-words font-medium">
            {row.productName || "—"}
          </span>
        ),
      },
      {
        key: "poCode",
        label: "Sales order",
        sortable: true,
        exportValue: (row) => row.poCode || "—",
        render: (row) => (
          <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-xs text-background">
            {row.poCode || "—"}
          </span>
        ),
      },
      {
        key: "rawProductCode",
        label: "Raw code",
        exportValue: (row) => row.rawProductCode || "—",
        render: (row) =>
          row.rawProductCode ? (
            <code className="text-sm">{row.rawProductCode}</code>
          ) : (
            "—"
          ),
      },
      {
        key: "dispatchmentDate",
        label: "Dispatch",
        sortValue: (row) => row.dispatchmentDate,
        exportValue: (row) => dateFormatter(row.dispatchmentDate, "—"),
        render: (row) => dateFormatter(row.dispatchmentDate, "—"),
      },
      {
        key: "status",
        label: "Status",
        sortValue: (row) => statusLabel(serverStatus(row)),
        exportValue: (row) => statusLabel(serverStatus(row)),
        render: (row) => statusBadge(serverStatus(row)),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (row) => <RowActions onView={() => openDetail(row._id)} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div>
      <PageHeader
        title="Delivery approval"
        description="Delivered lines awaiting HOD sign-off."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-72">
          <Label className="mb-1.5 block">Search</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Product name, sales order number, or raw code"
          />
        </div>
        <div className="w-full sm:w-44">
          <Label className="mb-1.5 block">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Label className="mb-1.5 block">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <FilterLockButton
          filtersLocked={filtersLocked}
          onToggle={handleToggleFiltersLock}
          pageLabel="Delivery Approval"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        loading={loading}
        onRowClick={(row) => openDetail(row._id)}
        showSearch={false}
        exportFileName="delivery-approval"
        emptyTitle="No lines awaiting HOD delivery approval"
        emptyMessage="Delivered lines will appear here for sign-off."
      />

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        wrapperClassName="d-flex justify-content-center mt-4"
        align="center"
      />

      <Sheet open={detailOpen} onOpenChange={(o) => !o && closeDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Delivery Review</SheetTitle>
          </SheetHeader>
          <SheetBody className="bg-muted/30">
            {detailLoading ? (
              <div className="py-10 text-center">
                <Spinner />
              </div>
            ) : !detail ? (
              <p className="mb-0 text-muted-foreground">No data available.</p>
            ) : (
              <DeliveryApprovalDetail
                detail={detail}
                approving={approving}
                onApprove={approve}
              />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DeliveryApprovalList;
