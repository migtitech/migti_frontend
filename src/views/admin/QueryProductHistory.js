import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, History } from "lucide-react";
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
import { BackButton, Loader, PageHeader } from "../../components";
import { dateFormatter } from "../../utils/dateFormatter";

const MAX_QUERY_LOOKUPS = 30;

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

const normalizeCode = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

const formatReferenceBy = (value) => {
  const v = String(value || "").trim();
  if (!v) return "—";
  if (v === "hod_directly_received") return "HOD (Directly Received)";
  return v;
};

const formatReceivedVia = (value) => {
  const v = String(value || "").trim();
  if (!v) return "—";
  return v.charAt(0).toUpperCase() + v.slice(1);
};

const rowQueryId = (row) =>
  row?.queryId && typeof row.queryId === "object"
    ? row.queryId._id
    : row?.queryId;

/* ── component ───────────────────────────────────── */
const QueryProductHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [rows, setRows] = useState([]);
  const [queryMap, setQueryMap] = useState({});
  const [clientCodeMap, setClientCodeMap] = useState({});
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await proBucketService.getById(id);
        const data = res?.data?.data || res?.data;
        if (!alive) return;
        setDoc(data);

        const code = String(data?.rawProductCode || "").trim();
        const name = String(data?.productName || "").trim();
        const searchTerm = code || name;
        if (!searchTerm) {
          setRows([]);
          return;
        }

        const listRes = await proBucketService.list({
          search: searchTerm,
          pageSize: 100,
        });
        const listRows = Array.isArray(listRes?.data?.data)
          ? listRes.data.data
          : [];
        const matches = listRows.filter((r) =>
          code
            ? normalizeCode(r.rawProductCode) === normalizeCode(code)
            : String(r.productName || "")
                .trim()
                .toLowerCase() === name.toLowerCase(),
        );
        matches.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
        if (!alive) return;
        setRows(matches);

        /* fetch each source query (company, creator, reference) */
        const uniqueQueryIds = [
          ...new Set(matches.map(rowQueryId).filter(Boolean).map(String)),
        ].slice(0, MAX_QUERY_LOOKUPS);

        if (uniqueQueryIds.length) {
          setDetailsLoading(true);
          const results = await Promise.allSettled(
            uniqueQueryIds.map((qid) => queryService.getById(qid)),
          );
          if (!alive) return;

          const qMap = {};
          results.forEach((r, i) => {
            if (r.status === "fulfilled") {
              const q = r.value?.data?.data || r.value?.data;
              if (q) qMap[uniqueQueryIds[i]] = q;
            }
          });
          setQueryMap(qMap);

          /* client codes from each query's industry */
          const uniqueIndustryIds = [
            ...new Set(
              Object.values(qMap)
                .map((q) =>
                  q?.industry_id && typeof q.industry_id === "object"
                    ? q.industry_id._id
                    : q?.industry_id,
                )
                .filter(Boolean)
                .map(String),
            ),
          ].slice(0, MAX_QUERY_LOOKUPS);

          if (uniqueIndustryIds.length) {
            const indResults = await Promise.allSettled(
              uniqueIndustryIds.map((iid) => industryService.getById(iid)),
            );
            if (!alive) return;
            const cMap = {};
            indResults.forEach((r, i) => {
              if (r.status === "fulfilled") {
                const ind = r.value?.data?.data || r.value?.data;
                const codeVal = String(ind?.uniqueId || "").trim();
                if (codeVal) cMap[uniqueIndustryIds[i]] = codeVal;
              }
            });
            setClientCodeMap(cMap);
          }
        }
      } catch (e) {
        if (alive) toastError(e?.message || "Failed to load product history");
      } finally {
        if (alive) {
          setDetailsLoading(false);
          setLoading(false);
        }
      }
    };

    if (id) load();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) return <Loader />;

  const uniqueQueries = [
    ...new Set(rows.map((r) => normalizeCode(r.queryCode)).filter(Boolean)),
  ];
  const uniqueCompanies = [
    ...new Set(
      rows
        .map((r) => {
          const qid = rowQueryId(r);
          const q = qid ? queryMap[String(qid)] : null;
          return String(q?.companyInfo?.name || "").trim();
        })
        .filter(Boolean),
    ),
  ];
  const dates = rows
    .map((r) => new Date(r.createdAt || 0).getTime())
    .filter((t) => t > 0);
  const firstSeen = dates.length ? new Date(Math.min(...dates)) : null;
  const lastSeen = dates.length ? new Date(Math.max(...dates)) : null;

  const summary = [
    { label: "Total Occurrences", value: rows.length },
    { label: "Unique Queries", value: uniqueQueries.length },
    { label: "Companies", value: uniqueCompanies.length || "—" },
    {
      label: "First / Last Seen",
      value:
        firstSeen && lastSeen
          ? `${dateFormatter(firstSeen, "—")} → ${dateFormatter(lastSeen, "—")}`
          : "—",
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <BackButton fallback={`/query-products/${id}`} />
      </div>

      <PageHeader
        title={`Query History — ${doc ? getProductDisplayName(doc) : "Product"}`}
        actions={
          doc?.rawProductCode ? (
            <Badge variant="secondary" className="font-mono text-xs">
              {doc.rawProductCode}
            </Badge>
          ) : null
        }
      />

      {/* ── summary tiles ── */}
      <div className="mb-4 grid grid-cols-12 gap-4">
        {summary.map((s) => (
          <div key={s.label} className="col-span-6 lg:col-span-3">
            <Card>
              <CardContent className="py-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="mb-0 text-lg font-semibold">{s.value}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Appearances Across Queries
          </CardTitle>
          {detailsLoading && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Loading company details…
            </span>
          )}
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="mb-0 text-muted-foreground">
              No other appearances found for this product.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: 48 }}>#</TableHead>
                    <TableHead>Query Code</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        Company
                      </span>
                    </TableHead>
                    <TableHead>Client Code</TableHead>
                    <TableHead>Query By</TableHead>
                    <TableHead>Reference By</TableHead>
                    <TableHead>Received Via</TableHead>
                    <TableHead>Query Date</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => {
                    const oid = row._id || row.id;
                    const isCurrent = String(oid) === String(id);
                    const qid = rowQueryId(row);
                    const q = qid ? queryMap[String(qid)] : null;
                    const industryId =
                      q?.industry_id && typeof q.industry_id === "object"
                        ? q.industry_id._id
                        : q?.industry_id;
                    const clientCode = industryId
                      ? clientCodeMap[String(industryId)]
                      : "";
                    const createdBy =
                      q?.created_by && typeof q.created_by === "object"
                        ? q.created_by.name || q.created_by.email
                        : "";
                    return (
                      <TableRow
                        key={oid || idx}
                        className="cursor-pointer"
                        onClick={() =>
                          !isCurrent && navigate(`/query-products/${oid}`)
                        }
                        title={
                          isCurrent
                            ? "Current product line"
                            : "Open this occurrence"
                        }
                      >
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Badge
                            variant={isCurrent ? "info" : "secondary"}
                            className="font-mono text-xs"
                          >
                            {normalizeCode(row.queryCode) || "—"}
                          </Badge>
                          {isCurrent && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              (this product)
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">
                            {q?.companyInfo?.name?.trim() || "—"}
                          </div>
                          {q?.companyInfo?.area?.trim() ? (
                            <div className="text-sm text-muted-foreground">
                              {q.companyInfo.area}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {clientCode || "—"}
                        </TableCell>
                        <TableCell>{createdBy?.trim() || "—"}</TableCell>
                        <TableCell>
                          {formatReferenceBy(q?.queryReferenceBy)}
                        </TableCell>
                        <TableCell>
                          {formatReceivedVia(q?.queryReceivedBy)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {dateFormatter(q?.createdAt || row.createdAt, "—")}
                        </TableCell>
                        <TableCell>
                          {row.quantity ?? "—"}
                          {row.unit ? (
                            <span className="text-sm text-muted-foreground">
                              {" "}
                              {row.unit}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QueryProductHistory;
