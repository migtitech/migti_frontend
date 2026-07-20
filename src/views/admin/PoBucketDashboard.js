import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import purchaseOrderService from "../../services/purchaseOrderService";
import {
  EyeIcon,
  Loader,
  PageHeader,
  TablePagination,
  FilterLockButton,
} from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole } from "../../hooks/usePermissions";
import { dateFormatter } from "../../utils/dateFormatter";

const PO_BUCKET_FILTER_DEFAULTS = { status: "" };

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "hod_approved", label: "HOD approved" },
  { value: "cancelled", label: "Cancelled" },
  { value: "closed", label: "Closed" },
];

const formatInrAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getStatusBadge = (status) => {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "confirmed":
      return <Badge variant="info">Confirmed</Badge>;
    case "fulfilled":
      return <Badge variant="success">Fulfilled</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "closed":
      return <Badge variant="secondary">Closed</Badge>;
    case "hod_approved":
      return <Badge variant="success">HOD approved</Badge>;
    default:
      return <Badge variant="secondary">{status || "-"}</Badge>;
  }
};

const isHodRole = (role) => {
  const r = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return r === "head_of_department" || r === "hod";
};

/** PIN required on PO Bucket before HOD can close a purchase order (UI gate). */
const PO_CLOSE_SECRET_PIN = "2003";

const PoBucketDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "po_bucket",
    PO_BUCKET_FILTER_DEFAULTS,
  );
  const hodUser = isHodRole(user?.role);
  const isSalesRole = normalizeRole(user?.role).startsWith("sales");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialValues.status);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  /** Single modal: confirm message first, then PIN (avoids CoreUI firing onClose when swapping modals). */
  const [poCloseModalOpen, setPoCloseModalOpen] = useState(false);
  const [poCloseStep, setPoCloseStep] = useState("confirm");
  const [closePinInput, setClosePinInput] = useState("");
  const [closing, setClosing] = useState(false);
  const pendingClosePoIdRef = useRef(null);
  const latestFetchIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchDebounced, statusFilter]);

  useFilterLockPersist("po_bucket", filtersLocked, {
    status: statusFilter,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status: statusFilter });
  };

  useEffect(() => {
    const fetchData = async () => {
      const fetchId = Date.now();
      latestFetchIdRef.current = fetchId;
      setLoading(true);
      try {
        const res = await withMinimumDelay(() =>
          purchaseOrderService.getAll({
            pageNumber,
            pageSize,
            search: searchDebounced.trim() || undefined,
            status: statusFilter || undefined,
            ...(() => {
              if (!isSalesRole) return {};
              const storedUser = JSON.parse(
                localStorage.getItem("migticrm_user") || "{}",
              );
              const userZoneIds = storedUser?.zoneIds;
              if (Array.isArray(userZoneIds) && userZoneIds.length)
                return { zoneIds: userZoneIds.join(",") };
              if (typeof userZoneIds === "string" && userZoneIds)
                return { zoneIds: userZoneIds };
              return {};
            })(),
          }),
        );
        const data = res?.data || res;
        const result = data?.data ?? data;
        if (latestFetchIdRef.current !== fetchId) return;
        setRows(result?.purchaseOrders || []);
        setPagination(result?.pagination || null);
      } catch (err) {
        if (latestFetchIdRef.current !== fetchId) return;
        toastError(err?.message || "Failed to load sales orders");
        setRows([]);
        setPagination(null);
      } finally {
        if (latestFetchIdRef.current === fetchId) setLoading(false);
      }
    };
    fetchData();
  }, [pageNumber, pageSize, searchDebounced, statusFilter, isSalesRole]);

  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.currentPage ?? pageNumber;
  const totalItems = pagination?.totalItems ?? rows.length;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const resetClosePoFlow = () => {
    pendingClosePoIdRef.current = null;
    setClosePinInput("");
    setPoCloseStep("confirm");
    setPoCloseModalOpen(false);
  };

  const openCloseConfirm = (po, e) => {
    e?.stopPropagation?.();
    pendingClosePoIdRef.current = po._id || po.id || null;
    setClosePinInput("");
    setPoCloseStep("confirm");
    setPoCloseModalOpen(true);
  };

  const handlePoCloseModalDismiss = () => {
    if (closing) return;
    resetClosePoFlow();
  };

  const handleConfirmedCloseAfterPin = () => {
    const trimmed = String(closePinInput || "").trim();
    if (trimmed !== PO_CLOSE_SECRET_PIN) {
      toastError("Incorrect PIN. Sales order was not closed.");
      return;
    }
    const id = pendingClosePoIdRef.current;
    if (!id) return;
    resetClosePoFlow();
    setClosing(true);
    void (async () => {
      try {
        await purchaseOrderService.hodClose(id);
        toastSuccess("Sales order closed");
        const res = await purchaseOrderService.getAll({
          pageNumber,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: statusFilter || undefined,
        });
        const data = res?.data || res;
        const result = data?.data ?? data;
        setRows(result?.purchaseOrders || []);
        setPagination(result?.pagination || null);
      } catch (err) {
        toastError(err?.message || "Failed to close sales order");
      } finally {
        setClosing(false);
      }
    })();
  };

  return (
    <div>
      <Dialog
        open={poCloseModalOpen}
        onOpenChange={(open) => {
          if (!open) handlePoCloseModalDismiss();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {poCloseStep === "confirm"
                ? "Close Sales Order?"
                : "Enter Secret PIN"}
            </DialogTitle>
          </DialogHeader>
          {poCloseStep === "confirm" ? (
            <p className="text-sm text-muted-foreground">
              This sales order will be marked closed and all product lines will
              be set to Sales Order closed. Click Continue, then enter the
              secret PIN to confirm.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="po-close-pin">
                PIN required to close this sales order
              </Label>
              <Input
                id="po-close-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="PIN"
                value={closePinInput}
                disabled={closing}
                autoFocus
                onChange={(e) => setClosePinInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!closing) handleConfirmedCloseAfterPin();
                  }
                }}
              />
            </div>
          )}
          <DialogFooter>
            {poCloseStep === "confirm" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={closing}
                  onClick={handlePoCloseModalDismiss}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={closing}
                  onClick={() => setPoCloseStep("pin")}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={closing}
                  onClick={() => {
                    setPoCloseStep("confirm");
                    setClosePinInput("");
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={closing}
                  onClick={handlePoCloseModalDismiss}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={closing}
                  onClick={handleConfirmedCloseAfterPin}
                >
                  Close Sales Order
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHeader title="Sales Order Bucket" />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                value={searchTerm}
                placeholder="Search Sales Order code, company, product"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Rows per page
              </Label>
              <Select
                value={pageSize}
                onChange={(e) => {
                  const next = Number(e.target.value) || 10;
                  setPageSize(next);
                  setPageNumber(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Select>
            </div>
            <div className="flex items-end">
              <FilterLockButton
                filtersLocked={filtersLocked}
                onToggle={handleToggleFiltersLock}
                pageLabel="Sales Order Bucket"
              />
            </div>
          </div>
          {loading && <Loader />}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Sales Order Number</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((po, index) => {
                  const poId = po._id || po.id;
                  const st = String(po.status || "").toLowerCase();
                  const canShowClose =
                    hodUser && st !== "closed" && st !== "cancelled";
                  return (
                    <TableRow
                      key={poId}
                      className="cursor-pointer"
                      onClick={() => navigate(`/po-bucket/${poId}`)}
                    >
                      <TableCell>
                        {(currentPage - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell>
                        <strong>{po.poCode || "-"}</strong>
                      </TableCell>
                      <TableCell>{po.companyInfo?.name || "-"}</TableCell>
                      <TableCell>
                        {Array.isArray(po.products) ? po.products.length : 0}{" "}
                        item(s)
                      </TableCell>
                      <TableCell>₹{formatInrAmount(po.totalAmount)}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell>
                        {po.createdAt ? dateFormatter(po.createdAt, "") : "-"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="View"
                            onClick={() => navigate(`/po-bucket/${poId}`)}
                          >
                            <EyeIcon />
                          </Button>
                          {canShowClose ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Close Sales Order"
                              disabled={closing}
                              onClick={(e) => openCloseConfirm(po, e)}
                            >
                              <Trash2 className="text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    {!loading && "No sales orders found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPageNumber}
            showRange
            totalItems={totalItems}
            itemsPerPage={pageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PoBucketDashboard;
