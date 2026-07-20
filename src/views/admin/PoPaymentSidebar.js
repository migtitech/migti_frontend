import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getAssetsUrl } from "../../api/endpoints";
import documentService from "../../services/documentService";
import poPaymentService from "../../services/poPaymentService";
import purchaseOrderService from "../../services/purchaseOrderService";
import usePermissions from "../../hooks/usePermissions";
import { ROLE_LABELS } from "../../context/AuthContext";
import { Loader, TablePagination } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
  Spinner,
} from "../../components/ui";
import { toastError, toastSuccess } from "../../utils/toast";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const unwrapResponse = (response) => {
  if (response?.data && typeof response.data === "object") return response.data;
  return response || {};
};

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const getTodayInputDate = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatEmployeeRole = (role) => {
  if (!role) return "—";
  const key = String(role).trim();
  return ROLE_LABELS[key] || key.replace(/_/g, " ");
};

const PAYMENT_STATUS_BADGE = {
  none: { label: "No payment", color: "secondary" },
  partial_payment_received: { label: "Partial", color: "warning" },
  full_payment_received: { label: "Full", color: "success" },
};

const PoPaymentSidebar = () => {
  const { canUpdate } = usePermissions();
  const canAddPayment = canUpdate("po_payment");

  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState("info");

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    remark: "",
    paidAt: getTodayInputDate(),
  });

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced]);

  const loadList = useCallback(
    async (pageNumber = 1) => {
      setLoadingList(true);
      try {
        const res = await purchaseOrderService.getAll({
          pageNumber,
          pageSize: 10,
          search: searchDebounced || undefined,
        });
        const payload = unwrapResponse(res);
        const data = payload?.data || payload;
        setRows(data?.purchaseOrders || []);
        setPagination(
          data?.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
          },
        );
      } catch (err) {
        toastError(err?.message || "Failed to load sales orders");
        setRows([]);
      } finally {
        setLoadingList(false);
      }
    },
    [searchDebounced],
  );

  useEffect(() => {
    loadList(page);
  }, [page, loadList]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const res = await purchaseOrderService.getById(id);
      const payload = unwrapResponse(res);
      setDetail(payload?.data || payload);
    } catch (err) {
      toastError(err?.message || "Failed to load Sales Order");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      setDetailTab("info");
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const onOpenAdd = () => {
    setForm({
      amount: "",
      remark: "",
      paidAt: getTodayInputDate(),
    });
    setProofFile(null);
    setAddOpen(true);
  };

  const onSubmitPayment = async () => {
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      toastError("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      let paymentProofDocumentId = null;
      if (proofFile) {
        setUploading(true);
        const ures = await documentService.uploadAttachments([proofFile]);
        const pld = ures?.data || ures;
        const docs = pld?.data?.documents || pld?.documents || [];
        const first = docs[0];
        const docId = first?._id || first?.id;
        if (!docId) {
          toastError("Could not upload proof file");
          setUploading(false);
          setSaving(false);
          return;
        }
        paymentProofDocumentId = String(docId);
        setUploading(false);
      }

      const time =
        form.paidAt && form.paidAt.length >= 8
          ? new Date(form.paidAt + "T12:00:00.000Z").toISOString()
          : new Date().toISOString();
      const res = await poPaymentService.appendLedger(selectedId, {
        amount,
        remark: (form.remark || "").trim(),
        paidAt: time,
        paymentProofDocumentId,
      });
      const u = unwrapResponse(res);
      if (u?.success === false) {
        toastError(u?.message || "Failed");
        return;
      }
      toastSuccess("Payment recorded");
      setAddOpen(false);
      setProofFile(null);
      loadDetail(selectedId);
      loadList(pagination.currentPage);
    } catch (err) {
      toastError(err?.message || "Failed to add payment");
    } finally {
      setSaving(false);
    }
  };

  const f = detail?.financials;
  const totalPages = pagination?.totalPages || 1;
  const st = String(detail?.paymentReceivedStatus || "none");
  const stBadge = PAYMENT_STATUS_BADGE[st] || PAYMENT_STATUS_BADGE.none;
  const ledgers = detail?.poPayment?.ledgers || [];

  return (
    <div className="relative">
      {loadingList && !selectedId && <Loader />}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <h4 className="mb-1 text-lg font-semibold text-foreground">
              Sales Order payment
            </h4>
            <p className="text-sm text-muted-foreground">
              Track and record company payments against sales orders.
            </p>
          </div>

          {!selectedId ? (
            <>
              <Input
                className="mb-3"
                placeholder="Search Sales Order code, company, product…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales Order</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">
                        Total (incl. GST)
                      </TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && !loadingList && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground"
                        >
                          No sales orders
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.map((row) => {
                      const fin = row?.financials || {};
                      const pst = String(row?.paymentReceivedStatus || "none");
                      const b =
                        PAYMENT_STATUS_BADGE[pst] || PAYMENT_STATUS_BADGE.none;
                      return (
                        <TableRow
                          key={row._id || row.id}
                          className="cursor-pointer"
                          onClick={() =>
                            setSelectedId(String(row._id || row.id))
                          }
                        >
                          <TableCell className="font-medium">
                            {row.poCode || "—"}
                          </TableCell>
                          <TableCell>{row.companyInfo?.name || "—"}</TableCell>
                          <TableCell className="text-right">
                            {formatAmount(fin.grandTotal)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(fin.totalPaid)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(fin.remainingAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={b.color}>{b.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-primary!">
                            View
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                wrapperClassName="d-flex justify-content-center mt-4"
                align="center"
              />
            </>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedId(null);
                    setDetail(null);
                    loadList(page);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  All Sales Orders
                </Button>
                {loadingDetail ? (
                  <Spinner size="sm" />
                ) : (
                  <strong>{detail?.poCode || "—"}</strong>
                )}
                <Badge variant={stBadge.color}>{stBadge.label}</Badge>
              </div>
              {loadingDetail ? (
                <Loader />
              ) : !detail ? (
                <p className="text-muted-foreground">Not found</p>
              ) : (
                <Tabs value={detailTab} onValueChange={setDetailTab}>
                  <TabsList className="mb-3">
                    <TabsTrigger value="info">Info</TabsTrigger>
                    <TabsTrigger value="employee">Employee</TabsTrigger>
                    <TabsTrigger value="payment">Payment</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info">
                    <div>
                      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Company
                          </div>
                          <div>{detail.companyInfo?.name || "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Date of Sales Order received
                          </div>
                          <div>
                            {dateFormatter(
                              detail.poReceivedDate || detail.createdAt,
                              "—",
                            )}
                          </div>
                        </div>
                      </div>
                      <h6 className="mb-2 font-semibold">Products</h6>
                      <div className="rounded-lg border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead className="text-right">Rate</TableHead>
                              <TableHead>Unit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(detail.products || []).map((p) => (
                              <TableRow key={p._id || p.rawProductCode}>
                                <TableCell>{p.productName || "—"}</TableCell>
                                <TableCell className="text-right">
                                  {p.quantity ?? "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {p.rate != null ? formatAmount(p.rate) : "—"}
                                </TableCell>
                                <TableCell>{p.unit || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <h6 className="mt-4 mb-2 font-semibold">
                        Attachment (Sales Order)
                      </h6>
                      {detail.attachmentDocumentId &&
                      detail.attachmentDocumentId.path ? (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0"
                          onClick={() =>
                            window.open(
                              getAssetsUrl(detail.attachmentDocumentId.path),
                              "_blank",
                              "noopener",
                            )
                          }
                        >
                          {detail.attachmentDocumentId.originalName ||
                            "View attachment"}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="employee">
                    <div>
                      {(() => {
                        const sales = detail.salesEmployeeId;
                        const created = detail.created_by;
                        const snap = detail.assigned_employee;
                        const salesId =
                          sales &&
                          typeof sales === "object" &&
                          (sales._id || sales.id)
                            ? String(sales._id || sales.id)
                            : null;
                        const createdId =
                          created &&
                          typeof created === "object" &&
                          (created._id || created.id)
                            ? String(created._id || created.id)
                            : null;
                        const rows = [];
                        if (sales && typeof sales === "object") {
                          rows.push({
                            key: "sales",
                            label: "Sales employee",
                            name: sales.name,
                            role: sales.role,
                            phone: sales.phone,
                            email: sales.email,
                          });
                        }
                        if (
                          created &&
                          typeof created === "object" &&
                          (!salesId || !createdId || salesId !== createdId)
                        ) {
                          rows.push({
                            key: "created",
                            label: "Created by",
                            name: created.name,
                            role: created.role,
                            phone: created.phone,
                            email: created.email,
                          });
                        }
                        const snapName =
                          snap && typeof snap === "object"
                            ? snap.name || snap.employeeName
                            : null;
                        const hasSnap =
                          snap &&
                          typeof snap === "object" &&
                          (snapName || snap.phone || snap.email || snap.role);
                        if (hasSnap) {
                          rows.push({
                            key: "snapshot",
                            label: "Assigned (snapshot)",
                            name: snapName || "—",
                            role: snap.role,
                            phone: snap.phone,
                            email: snap.email,
                          });
                        }
                        if (rows.length === 0) {
                          return (
                            <p className="text-muted-foreground">
                              No employee information on this sales order.
                            </p>
                          );
                        }
                        return (
                          <div className="rounded-lg border border-border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Employee</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Role</TableHead>
                                  <TableHead>Phone</TableHead>
                                  <TableHead>Email</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.map((r) => (
                                  <TableRow key={r.key}>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {r.label}
                                    </TableCell>
                                    <TableCell>{r.name || "—"}</TableCell>
                                    <TableCell>
                                      {formatEmployeeRole(r.role)}
                                    </TableCell>
                                    <TableCell>{r.phone || "—"}</TableCell>
                                    <TableCell>{r.email || "—"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })()}
                    </div>
                  </TabsContent>

                  <TabsContent value="payment">
                    <div>
                      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground">
                              Total amount
                            </div>
                            <div className="text-lg font-semibold text-foreground">
                              {formatAmount(f?.grandTotal)}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground">
                              Amount received
                            </div>
                            <div className="text-lg font-semibold text-success!">
                              {formatAmount(f?.totalPaid)}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-xs text-muted-foreground">
                              Pending
                            </div>
                            <div className="text-lg font-semibold text-warning!">
                              {formatAmount(f?.remainingAmount)}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="mb-2 flex items-center justify-between">
                        <h6 className="font-semibold">
                          Payment ledger (company)
                        </h6>
                        {canAddPayment && (
                          <Button type="button" size="sm" onClick={onOpenAdd}>
                            Add payment
                          </Button>
                        )}
                      </div>
                      <div className="rounded-lg border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">
                                Amount
                              </TableHead>
                              <TableHead>Remark</TableHead>
                              <TableHead>Proof</TableHead>
                              <TableHead>Recorded by</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledgers.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-center text-muted-foreground"
                                >
                                  No payments recorded yet. Use &quot;Add
                                  payment&quot; to record the first entry.
                                </TableCell>
                              </TableRow>
                            )}
                            {ledgers.map((L) => (
                              <TableRow
                                key={L._id || `${L.paidAt}-${L.amount}`}
                              >
                                <TableCell>
                                  {dateTimeFormatter(L.paidAt, "-")}
                                </TableCell>
                                <TableCell className="text-right font-medium text-success!">
                                  {formatAmount(L.amount)}
                                </TableCell>
                                <TableCell>{L.remark || "—"}</TableCell>
                                <TableCell>
                                  {L.paymentProofDocumentId?.path ? (
                                    <Button
                                      type="button"
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0"
                                      onClick={() =>
                                        window.open(
                                          getAssetsUrl(
                                            L.paymentProofDocumentId.path,
                                          ),
                                          "_blank",
                                          "noopener",
                                        )
                                      }
                                    >
                                      Open
                                    </Button>
                                  ) : (
                                    "—"
                                  )}
                                </TableCell>
                                <TableCell>
                                  {L.recordedBy?.name ||
                                    (L.recordedBy && String(L.recordedBy)) ||
                                    "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={addOpen}
        onOpenChange={(open) => {
          if (!open && !saving) setAddOpen(false);
        }}
      >
        <SheetContent side="right" className="w-full p-0 sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Add Payment</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment date</Label>
              <Input
                type="date"
                value={form.paidAt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, paidAt: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remark</Label>
              <Textarea
                value={form.remark}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, remark: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment proof (optional)</Label>
              <Input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  setProofFile(e?.target?.files?.[0] || null);
                }}
              />
            </div>
            {uploading && (
              <div className="text-sm text-muted-foreground">Uploading…</div>
            )}
          </SheetBody>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => !saving && setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={onSubmitPayment}>
              {saving ? "Saving…" : "Save payment"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default PoPaymentSidebar;
