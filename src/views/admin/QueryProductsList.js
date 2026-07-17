import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import proBucketService from "../../services/proBucketService";
import groupService from "../../services/groupService";
import categoryService from "../../services/categoryService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { sortAlphabetically } from "../../utils/sort";
import {
  Loader,
  TablePagination,
  FilterLockButton,
  DataTable,
  PageHeader,
  RowActions,
  StatusBadge,
} from "../../components";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import QuoteLogsSidebar from "./QuoteLogsSidebar";

const QUERY_PRODUCTS_FILTER_DEFAULTS = {
  status: "",
  groupId: "",
  categoryId: "",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "rate_submitted", label: "Rate Submitted" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "approval_pending", label: "Approval Pending" },
];

const statusBadge = (s) => {
  switch (s) {
    case "pending":
      return <StatusBadge variant="warning">Pending</StatusBadge>;
    case "rate_submitted":
      return <StatusBadge variant="default">Rate Submitted</StatusBadge>;
    case "fulfilled":
      return <StatusBadge variant="success">Fulfilled</StatusBadge>;
    case "approval_pending":
      return <StatusBadge variant="secondary">Approval Pending</StatusBadge>;
    default:
      return <StatusBadge variant="outline">{s || "—"}</StatusBadge>;
  }
};

const resolveUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (img.signedUrl) return img.signedUrl;
  if (img.url) return img.url;
  if (img.path) return img.path;
  return null;
};

const parseListResponse = (res) => {
  const block = res?.data;
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

const normalizeQueryCode = (code) => String(code || "").trim();

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

const QUERY_CODE_FILTER_PAGE_SIZE = 100;

const QueryProductsList = () => {
  const navigate = useNavigate();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "query_products",
    QUERY_PRODUCTS_FILTER_DEFAULTS,
  );

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  /* filters */
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialValues.status);
  const [filterGroupId, setFilterGroupId] = useState(initialValues.groupId);
  const [filterCategoryId, setFilterCategoryId] = useState(
    initialValues.categoryId,
  );
  const [selectedQueryCodes, setSelectedQueryCodes] = useState(() => new Set());

  /* dropdown meta */
  const [groups, setGroups] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const filteredCategories = filterGroupId
    ? allCategories.filter((c) => {
        const gId =
          c.group && typeof c.group === "object"
            ? c.group._id || c.group.id
            : c.group;
        return String(gId || "") === String(filterGroupId);
      })
    : allCategories;

  /* image preview modal */
  const [imgModal, setImgModal] = useState({
    visible: false,
    images: [],
    title: "",
  });

  const [quoteLogsOpen, setQuoteLogsOpen] = useState(false);

  /* ── debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const selectedQueryCodesKey = [...selectedQueryCodes].sort().join(",");
  const isQueryCodeFilterActive = selectedQueryCodesKey.length > 0;
  const effectivePageSize = isQueryCodeFilterActive
    ? QUERY_CODE_FILTER_PAGE_SIZE
    : pageSize;

  useEffect(() => {
    setPage(1);
  }, [
    searchDebounced,
    filterStatus,
    filterGroupId,
    filterCategoryId,
    selectedQueryCodesKey,
  ]);

  useFilterLockPersist("query_products", filtersLocked, {
    status: filterStatus,
    groupId: filterGroupId,
    categoryId: filterCategoryId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      status: filterStatus,
      groupId: filterGroupId,
      categoryId: filterCategoryId,
    });
  };

  /* ── load groups / categories once ── */
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

  /* ── fetch list ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        proBucketService.list({
          page,
          pageSize: effectivePageSize,
          search: searchDebounced.trim() || undefined,
          status: filterStatus || undefined,
          groupId: filterGroupId || undefined,
          categoryId: filterCategoryId || undefined,
          queryCodes: isQueryCodeFilterActive
            ? selectedQueryCodesKey
            : undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
    } catch (e) {
      toastError(e?.message || "Failed to load query products");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    effectivePageSize,
    searchDebounced,
    filterStatus,
    filterGroupId,
    filterCategoryId,
    isQueryCodeFilterActive,
    selectedQueryCodesKey,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));

  const toggleQueryCode = (code) => {
    const normalized = normalizeQueryCode(code);
    if (!normalized) return;
    setSelectedQueryCodes((prev) => {
      const next = new Set(prev);
      if (next.has(normalized)) next.delete(normalized);
      else next.add(normalized);
      return next;
    });
  };

  const clearQueryCodeFilter = () => {
    setSelectedQueryCodes(new Set());
  };

  const handleClear = () => {
    setSearch("");
    setFilterStatus("");
    setFilterGroupId("");
    setFilterCategoryId("");
    setSelectedQueryCodes(new Set());
    setPage(1);
  };

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "S.No",
        width: 50,
        align: "center",
        toggleable: false,
        exportable: false,
        render: (_row, idx) => (page - 1) * effectivePageSize + idx + 1,
      },
      {
        key: "productName",
        label: "Product Name",
        exportValue: (row) => getProductDisplayName(row),
        render: (row) => (
          <div>
            <div className="font-semibold">{getProductDisplayName(row)}</div>
            {row.rawProductCode && (
              <div className="font-mono text-sm text-muted-foreground">
                {row.rawProductCode}
              </div>
            )}
            {row.hsnNumber && (
              <div className="text-sm text-muted-foreground">
                HSN: <span className="font-medium">{row.hsnNumber}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: "queryCode",
        label: "Query Code",
        exportValue: (row) => normalizeQueryCode(row.queryCode) || "—",
        render: (row) => {
          const queryCode = normalizeQueryCode(row.queryCode);
          const isSelected = queryCode && selectedQueryCodes.has(queryCode);
          return (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={Boolean(isSelected)}
                disabled={!queryCode}
                onCheckedChange={() => toggleQueryCode(queryCode)}
                aria-label={
                  queryCode
                    ? `Show all products for query code ${queryCode}`
                    : "No query code"
                }
              />
              <Badge
                variant="secondary"
                className="whitespace-nowrap font-mono text-xs font-normal"
              >
                {queryCode || "—"}
              </Badge>
            </div>
          );
        },
      },
      {
        key: "unit",
        label: "Unit",
        width: 70,
        align: "center",
        exportValue: (row) => row.unit || "—",
        render: (row) => row.unit || "—",
      },
      {
        key: "quantity",
        label: "Qty",
        width: 70,
        align: "center",
        exportValue: (row) => row.quantity ?? "—",
        render: (row) => (
          <span className="font-semibold">{row.quantity ?? "—"}</span>
        ),
      },
      {
        key: "images",
        label: "Images",
        width: 110,
        align: "center",
        exportable: false,
        render: (row) => {
          const images = Array.isArray(row.images) ? row.images : [];
          const firstImgUrl = images.length > 0 ? resolveUrl(images[0]) : null;
          return images.length > 0 ? (
            <div
              className="flex cursor-pointer flex-col items-center gap-1"
              onClick={() =>
                setImgModal({
                  visible: true,
                  images,
                  title: getProductDisplayName(row) || "Images",
                })
              }
              title={`View ${images.length} image(s)`}
            >
              {firstImgUrl && (
                <img
                  src={firstImgUrl}
                  alt={getProductDisplayName(row)}
                  style={{
                    width: 52,
                    height: 52,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid var(--color-border)",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}
              <Badge variant="secondary" className="text-[0.68rem]">
                {images.length} img
              </Badge>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          );
        },
      },
      {
        key: "groupCategory",
        label: "Group / Category",
        toggleable: true,
        exportValue: (row) => {
          const group =
            row.groupId && typeof row.groupId === "object" ? row.groupId : null;
          const category =
            row.categoryId && typeof row.categoryId === "object"
              ? row.categoryId
              : null;
          return `${group?.name || "No group"} / ${category?.name || "No category"}`;
        },
        render: (row) => {
          const group =
            row.groupId && typeof row.groupId === "object" ? row.groupId : null;
          const category =
            row.categoryId && typeof row.categoryId === "object"
              ? row.categoryId
              : null;
          return (
            <div className="flex flex-col items-start gap-1">
              {group ? (
                <Badge variant="outline" className="font-medium">
                  {group.name}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">No group</span>
              )}
              {category ? (
                <span className="text-xs text-muted-foreground">
                  {category.name}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  No category
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        width: 130,
        exportValue: (row) => row.status || "—",
        render: (row) => statusBadge(row.status),
      },
      {
        key: "actions",
        label: "Action",
        width: 60,
        align: "center",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (row) => (
          <RowActions
            viewLabel="View / Edit"
            onView={() => navigate(`/query-products/${row._id || row.id}`)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page, effectivePageSize, selectedQueryCodes],
  );

  return (
    <div>
      <PageHeader
        title="Query Products"
        description="All products requested across queries, with rates and fulfilment status."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuoteLogsOpen((prev) => !prev)}
            >
              {quoteLogsOpen ? "Hide Quote Logs" : "Show Quote Logs"}
            </Button>
            <span className="text-sm text-muted-foreground">
              Total: <strong className="text-foreground">{total}</strong>
            </span>
          </div>
        }
      />

      {/* ── Filters ── */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-6 md:items-end">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Product name, query code, raw code, unit, HSN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Group</Label>
          <Select
            value={filterGroupId}
            onChange={(e) => {
              const newGroupId = e.target.value;
              const catStillValid = allCategories.some((c) => {
                if ((c._id || c.id) !== filterCategoryId) return false;
                if (!newGroupId) return true;
                const gId =
                  c.group && typeof c.group === "object"
                    ? c.group._id || c.group.id
                    : c.group;
                return String(gId || "") === String(newGroupId);
              });
              setFilterGroupId(newGroupId);
              if (!catStillValid) setFilterCategoryId("");
            }}
          >
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g._id || g.id} value={g._id || g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            Category
            {filterGroupId && (
              <span className="ml-1 text-sm text-muted-foreground">
                ({filteredCategories.length})
              </span>
            )}
          </Label>
          <Select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
          >
            <option value="">All Categories</option>
            {filteredCategories.map((c) => (
              <option key={c._id || c.id} value={c._id || c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <FilterLockButton
            filtersLocked={filtersLocked}
            onToggle={handleToggleFiltersLock}
            pageLabel="Query Products"
          />
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>

      {isQueryCodeFilterActive && (
        <Alert variant="info" className="mb-4">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Showing all products for query code
              {selectedQueryCodesKey.split(",").length !== 1 ? "s" : ""}:{" "}
              {selectedQueryCodesKey.split(",").map((code) => (
                <Badge key={code} variant="default" className="ml-1 font-mono">
                  {code}
                </Badge>
              ))}
            </span>
            <Button variant="outline" size="sm" onClick={clearQueryCodeFilter}>
              Clear query filter
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Table ── */}
      {loading ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row._id || row.id}
            showSearch={false}
            exportFileName="query-products"
            emptyTitle="No query products found"
          />

          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            disabled={loading}
            showRange
            totalItems={total}
            itemsPerPage={effectivePageSize}
            align="center"
            ariaLabel="Query Products pages"
            wrapperClassName="d-flex flex-column align-items-center mt-3 gap-2"
          />
        </>
      )}

      {/* ── Image gallery modal (thumbnail quick-view from list) ── */}
      <Dialog
        open={imgModal.visible}
        onOpenChange={(o) =>
          !o && setImgModal({ visible: false, images: [], title: "" })
        }
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>
              {imgModal.title} — {imgModal.images.length} image
              {imgModal.images.length !== 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 p-6">
            {imgModal.images.map((img, i) => {
              const url = resolveUrl(img);
              const name =
                typeof img === "object" && img !== null
                  ? img.name || `Image ${i + 1}`
                  : `Image ${i + 1}`;
              return (
                <div
                  key={i}
                  className="overflow-hidden rounded-lg border border-border shadow-sm"
                  style={{ width: 160 }}
                >
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={name}
                        style={{
                          width: "100%",
                          height: 140,
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
                      style={{ height: 140 }}
                    >
                      No preview
                    </div>
                  )}
                  <div
                    className="truncate border-t bg-card px-2 py-1 text-sm"
                    title={name}
                  >
                    {name}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <QuoteLogsSidebar
        isOpen={quoteLogsOpen}
        onToggle={() => setQuoteLogsOpen((prev) => !prev)}
        showFloatingToggle={false}
      />
    </div>
  );
};

export default QueryProductsList;
