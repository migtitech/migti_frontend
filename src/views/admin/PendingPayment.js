import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { getAssetsUrl } from "../../api/endpoints";
import purchaseOrderService from "../../services/purchaseOrderService";
import { useAuth } from "../../context/AuthContext";
import { Loader, TablePagination } from "../../components";
import { toastError } from "../../utils/toast";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";

const unwrapResponse = (response) => {
  if (response?.data && typeof response.data === "object") return response.data;
  return response || {};
};

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const PAYMENT_DUE_DAYS = 35;

const computePaymentDueDate = (createdAt) => {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + PAYMENT_DUE_DAYS);
  return d;
};

const PAYMENT_STATUS_BADGE = {
  none: { label: "No payment", color: "secondary" },
  partial_payment_received: { label: "Partial", color: "warning" },
  full_payment_received: { label: "Full", color: "success" },
};

const PAYMENT_AMOUNT_TOLERANCE = 0.01;

/** Hide POs that are fully paid (total ≈ received or no pending balance). */
const isPoFullyPaid = (row) => {
  if (String(row?.paymentReceivedStatus || "") === "full_payment_received") {
    return true;
  }
  const fin = row?.financials || {};
  const total = Number(fin.grandTotal) || 0;
  const received = Number(fin.totalPaid) || 0;
  const remaining = Number(fin.remainingAmount);
  if (!Number.isNaN(remaining) && remaining <= PAYMENT_AMOUNT_TOLERANCE) {
    return true;
  }
  if (
    total > PAYMENT_AMOUNT_TOLERANCE &&
    Math.abs(total - received) <= PAYMENT_AMOUNT_TOLERANCE
  ) {
    return true;
  }
  return false;
};

const PendingPayment = () => {
  const { user } = useAuth();
  const { formatArea } = useAreaNameLookup();
  const employeeId = user?._id || user?.id;

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
          employeeId: employeeId || undefined,
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
        toastError(err?.message || "Failed to load assigned sales orders");
        setRows([]);
      } finally {
        setLoadingList(false);
      }
    },
    [searchDebounced, employeeId],
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

  const visibleRows = useMemo(
    () => rows.filter((row) => !isPoFullyPaid(row)),
    [rows],
  );

  const f = detail?.financials;
  const totalPages = pagination?.totalPages || 1;
  const st = String(detail?.paymentReceivedStatus || "none");
  const stBadge = PAYMENT_STATUS_BADGE[st] || PAYMENT_STATUS_BADGE.none;
  const ledgers = detail?.poPayment?.ledgers || [];

  return (
    <div className="position-relative">
      {loadingList && !selectedId && <Loader />}
      <div>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between flex-wrap items-center mb-3">
              <div>
                <h4 className="mb-1">Pending payment</h4>
                <p className="text-muted-foreground text-sm mb-0">
                  Sales orders assigned to you, with received and pending
                  amounts from the Sales Order payment ledger.
                </p>
              </div>
            </div>

            {!selectedId ? (
              <>
                <Input
                  className="mb-3"
                  placeholder="Search Sales Order code, company, product…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Table className="mb-0">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales Order</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-end">
                        Total (incl. GST)
                      </TableHead>
                      <TableHead className="text-end">Received</TableHead>
                      <TableHead className="text-end">Pending</TableHead>
                      <TableHead>Due date</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-end"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.length === 0 && !loadingList && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-body-secondary"
                        >
                          No sales orders with pending payment
                        </TableCell>
                      </TableRow>
                    )}
                    {visibleRows.map((row) => {
                      const fin = row?.financials || {};
                      const pst = String(row?.paymentReceivedStatus || "none");
                      const b =
                        PAYMENT_STATUS_BADGE[pst] || PAYMENT_STATUS_BADGE.none;
                      return (
                        <TableRow
                          key={row._id || row.id}
                          className="cursor-pointer"
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            setSelectedId(String(row._id || row.id))
                          }
                        >
                          <TableCell className="font-medium">
                            {row.poCode || "—"}
                          </TableCell>
                          <TableCell>{row.companyInfo?.name || "—"}</TableCell>
                          <TableCell className="text-end">
                            {formatAmount(fin.grandTotal)}
                          </TableCell>
                          <TableCell className="text-end">
                            {formatAmount(fin.totalPaid)}
                          </TableCell>
                          <TableCell className="text-end">
                            {formatAmount(fin.remainingAmount)}
                          </TableCell>
                          <TableCell>
                            {dateFormatter(
                              computePaymentDueDate(row.createdAt),
                              "—",
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={b.color}>{b.label}</Badge>
                          </TableCell>
                          <TableCell className="text-end text-primary!">
                            View
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  wrapperClassName="flex justify-center mt-4"
                  align="center"
                />
              </>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
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
                    <ArrowLeft className="me-1 h-4 w-4" />
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
                  <p className="text-body-secondary">Not found</p>
                ) : (
                  <>
                    <Tabs
                      value={detailTab}
                      onValueChange={setDetailTab}
                      className="mb-3"
                    >
                      <TabsList>
                        <TabsTrigger value="info">Info</TabsTrigger>
                        <TabsTrigger value="payment">Payment</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    {detailTab === "info" && (
                      <div>
                        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-body-secondary small">
                              Company
                            </div>
                            <div>{detail.companyInfo?.name || "—"}</div>
                          </div>
                          <div>
                            <div className="text-body-secondary small">
                              Status
                            </div>
                            <div>{String(detail.status || "—")}</div>
                          </div>
                          <div>
                            <div className="text-body-secondary small">
                              Location / area
                            </div>
                            <div>
                              {(() => {
                                const areaLabel = formatArea(
                                  detail.companyInfo?.area,
                                );
                                return (
                                  <>
                                    {detail.companyInfo?.location || "—"}
                                    {areaLabel ? ` · ${areaLabel}` : ""}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div>
                            <div className="text-body-secondary small">
                              Expected delivery
                            </div>
                            <div>
                              {detail.expectedDeliveryDate
                                ? dateTimeFormatter(
                                    detail.expectedDeliveryDate,
                                    "-",
                                  )
                                : "—"}
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <div className="text-body-secondary small">
                              Remark
                            </div>
                            <div>{detail.remark || "—"}</div>
                          </div>
                        </div>
                        <h6>Products</h6>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-end">Qty</TableHead>
                              <TableHead className="text-end">Rate</TableHead>
                              <TableHead>Unit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(detail.products || []).map((p) => (
                              <TableRow key={p._id || p.rawProductCode}>
                                <TableCell>{p.productName || "—"}</TableCell>
                                <TableCell className="text-end">
                                  {p.quantity ?? "—"}
                                </TableCell>
                                <TableCell className="text-end">
                                  {p.rate != null ? formatAmount(p.rate) : "—"}
                                </TableCell>
                                <TableCell>{p.unit || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <h6 className="mt-4">Attachment (Sales Order)</h6>
                        {detail.attachmentDocumentId &&
                        detail.attachmentDocumentId.path ? (
                          <Button
                            type="button"
                            variant="link"
                            className="p-0"
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
                          <span className="text-body-secondary">—</span>
                        )}
                      </div>
                    )}
                    {detailTab === "payment" && (
                      <div>
                        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <Card className="h-full">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground">
                                Total amount
                              </div>
                              <div className="text-lg font-semibold">
                                {formatAmount(f?.grandTotal)}
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="h-full">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground">
                                Amount received
                              </div>
                              <div className="text-lg font-semibold text-success!">
                                {formatAmount(f?.totalPaid)}
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="h-full">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground">
                                Pending
                              </div>
                              <div className="text-lg font-semibold text-warning!">
                                {formatAmount(f?.remainingAmount)}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        <h6 className="mb-2">Payment ledger (company)</h6>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-end">Amount</TableHead>
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
                                  No payments recorded yet.
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
                                <TableCell className="text-end text-success! font-medium">
                                  {formatAmount(L.amount)}
                                </TableCell>
                                <TableCell>{L.remark || "—"}</TableCell>
                                <TableCell>
                                  {L.paymentProofDocumentId?.path ? (
                                    <Button
                                      type="button"
                                      variant="link"
                                      size="sm"
                                      className="p-0"
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
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PendingPayment;
