import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import Filtered from "../../filtered/Filtered";
import industryService from "../../services/industryService";
import areaService from "../../services/areaService";
import {
  buildAreaNameLookup,
  formatAreaDisplayOrDash,
} from "../../utils/areaDisplay";
import {
  ConfirmDialog,
  Loader,
  TablePagination,
  FilterLockButton,
  PageHeader,
  DataTable,
  RowActions,
} from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Label,
  Select,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole } from "../../hooks/usePermissions";

const INDUSTRY_FILTER_DEFAULTS = { areaId: "" };

const IndustryList = () => {
  const MOBILE_BREAKPOINT = 576;
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { user } = useAuth();
  const isSalesRole = normalizeRole(user?.role).startsWith("sales");
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "industry_list",
    INDUSTRY_FILTER_DEFAULTS,
  );
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(initialValues.areaId);
  const [pagination, setPagination] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchAreas = async () => {
      try {
        const allAreas = [];
        let pageNumber = 1;
        let hasNextPage = true;
        while (hasNextPage) {
          const res = await areaService.getAll({
            pageNumber,
            pageSize: 100,
            areaType: "industry",
          });
          const data = res?.data || res;
          const payload = data || {};
          const pageAreas = payload?.areas || [];
          const pagePagination = payload?.pagination || {};
          allAreas.push(...pageAreas);
          hasNextPage = Boolean(pagePagination?.hasNextPage);
          pageNumber += 1;
        }
        if (cancelled) return;
        setAreas(allAreas);
      } catch {
        if (cancelled) return;
        setAreas([]);
      }
    };
    fetchAreas();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchIndustries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        search: searchTerm || undefined,
        areaIds: selectedAreaId || undefined,
      };
      if (isSalesRole) {
        const storedUser = JSON.parse(
          localStorage.getItem("migticrm_user") || "{}",
        );
        const userZoneIds = storedUser?.zoneIds;
        if (Array.isArray(userZoneIds) && userZoneIds.length) {
          params.zoneIds = userZoneIds.join(",");
        } else if (typeof userZoneIds === "string" && userZoneIds) {
          params.zoneIds = userZoneIds;
        }
      }
      const res = await withMinimumDelay(() => industryService.getAll(params));
      const data = res?.data || res;
      setIndustries(data?.industries || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      toastError(err?.message || "Failed to load industries");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedAreaId, isSalesRole]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIndustries();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchIndustries]);

  useFilterLockPersist("industry_list", filtersLocked, {
    areaId: selectedAreaId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ areaId: selectedAreaId });
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = (event) => setIsMobileView(event.matches);
    setIsMobileView(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }
    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await industryService.delete(id);
      toastSuccess("Customer deleted successfully");
      fetchIndustries();
    } catch (err) {
      toastError(err?.message || "Failed to delete customer");
    }
  };

  const areaNameLookup = buildAreaNameLookup(areas);

  const getZoneLabel = (industry) =>
    formatAreaDisplayOrDash(industry?.area, areaNameLookup);

  const getPurchaseManagerLabel = (industry) => {
    const pms = industry.purchaseManagers || [];
    if (pms.length > 0) {
      const first = pms[0];
      const name = first.name || "";
      const phone = first.phone || "";
      if (name && phone) return `${name} - ${phone}`;
      if (name) return name;
      if (phone) return phone;
      return "-";
    }
    if (industry.purchase_manager_name || industry.purchase_manager_phone) {
      const name = industry.purchase_manager_name || "";
      const phone = industry.purchase_manager_phone || "";
      if (name && phone) return `${name} - ${phone}`;
      if (name) return name;
      if (phone) return phone;
    }
    return "-";
  };

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "#",
        width: 64,
        toggleable: false,
        exportable: false,
        render: (_row, index) => (page - 1) * 10 + index + 1,
      },
      {
        key: "customerCode",
        label: "Customer Code",
        render: (industry) => (
          <span className="font-mono text-xs text-muted-foreground">
            {industry.customerCode || "-"}
          </span>
        ),
      },
      {
        key: "name",
        label: "Customer name",
        render: (industry) => (
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary!">
              {(industry.name || "CL").slice(0, 2).toUpperCase()}
            </span>
            <span className="font-medium text-foreground">{industry.name}</span>
          </div>
        ),
        exportValue: (industry) => industry.name || "",
      },
      {
        key: "gstNumber",
        label: "GST No",
        render: (industry) => industry.gstNumber || "-",
      },
      {
        key: "zone",
        label: "Zone",
        render: (industry) => getZoneLabel(industry),
        exportValue: (industry) => getZoneLabel(industry),
      },
      {
        key: "purchaseManager",
        label: "Purchase Manager",
        render: (industry) => getPurchaseManagerLabel(industry),
        exportValue: (industry) => getPurchaseManagerLabel(industry),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (industry) => (
          <RowActions
            onView={() => navigate(`/industries/${industry._id}`)}
            onEdit={
              canUpdate("industries")
                ? () => navigate(`/industries/edit/${industry._id}`)
                : undefined
            }
            onDelete={
              canDelete("industries")
                ? () => handleDeleteClick(industry._id)
                : undefined
            }
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page, areaNameLookup],
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage the customers your organization supplies and procures for."
        actions={
          canCreate("industries") && (
            <Button onClick={() => navigate("/industries/new")}>
              <Plus className="h-4 w-4" />
              Add customer
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Search
            </Label>
            <div className="max-w-sm">
              <Filtered
                searchTerm={searchTerm}
                setSearchTerm={(value) => {
                  setSearchTerm(value);
                  setPage(1);
                }}
                placeholder="Search by name, code or GST…"
              />
            </div>
          </div>
          {!isSalesRole && (
            <div className="w-full sm:w-56">
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Zone
              </Label>
              <Select
                value={selectedAreaId}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Zones</option>
                {areas.map((a) => {
                  const id = String(a._id || a.id);
                  return (
                    <option key={id} value={id}>
                      {a.name}
                      {a.city ? ` - ${a.city}` : ""}
                    </option>
                  );
                })}
              </Select>
            </div>
          )}
          {!isSalesRole && (
            <FilterLockButton
              filtersLocked={filtersLocked}
              onToggle={handleToggleFiltersLock}
              pageLabel="Industries"
            />
          )}
        </div>
      </div>

      {loading ? (
        <Loader message="Loading industries..." />
      ) : (
        <>
          {isMobileView ? (
            <div className="space-y-3">
              {industries.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchTerm
                    ? "No customers match the current search."
                    : 'No customers found. Click "Add customer" to create one.'}
                </div>
              ) : (
                industries.map((industry, index) => (
                  <div
                    key={industry._id}
                    className="cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                    onClick={() => navigate(`/industries/${industry._id}`)}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary!">
                          {(industry.name || "CL").slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <h6 className="truncate text-base font-semibold leading-tight">
                            {industry.name || "-"}
                          </h6>
                          <div className="text-xs text-muted-foreground">
                            {industry.customerCode || "Code pending"}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        #{(page - 1) * 10 + index + 1}
                      </span>
                    </div>
                    <dl className="grid grid-cols-1 gap-y-1.5 border-t border-border pt-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">GST No</dt>
                        <dd className="truncate text-right font-medium">
                          {industry.gstNumber || "-"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Zone</dt>
                        <dd className="truncate text-right font-medium">
                          {getZoneLabel(industry)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">
                          Purchase Manager
                        </dt>
                        <dd className="truncate text-right font-medium">
                          {getPurchaseManagerLabel(industry)}
                        </dd>
                      </div>
                    </dl>
                    <div
                      className="mt-3 flex justify-end border-t border-border pt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActions
                        onView={() => navigate(`/industries/${industry._id}`)}
                        onEdit={
                          canUpdate("industries")
                            ? () => navigate(`/industries/edit/${industry._id}`)
                            : undefined
                        }
                        onDelete={
                          canDelete("industries")
                            ? () => handleDeleteClick(industry._id)
                            : undefined
                        }
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={industries}
              rowKey={(industry) => industry._id}
              onRowClick={(industry) => navigate(`/industries/${industry._id}`)}
              showSearch={false}
              exportFileName="customers"
              emptyTitle="No customers found"
              emptyMessage={
                searchTerm
                  ? "No customers match the current search."
                  : 'Click "Add customer" to create one.'
              }
            />
          )}
          <TablePagination
            currentPage={pagination?.currentPage ?? 1}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            showRange
            totalItems={pagination?.totalItems ?? 0}
            itemsPerPage={pagination?.itemsPerPage ?? 10}
          />
        </>
      )}

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer?"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default IndustryList;
