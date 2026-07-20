import React, { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import areaService from "../../services/areaService";
import companyService from "../../services/companyService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  TablePagination,
  FilterLockButton,
} from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Badge,
  Select,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const AREA_FILTER_DEFAULTS = { companyId: "", areaType: "" };

const AreaList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "area_list",
    AREA_FILTER_DEFAULTS,
  );
  const [areas, setAreas] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filterCompanyId, setFilterCompanyId] = useState(
    initialValues.companyId,
  );
  const [filterAreaType, setFilterAreaType] = useState(initialValues.areaType);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const fetchCompanies = async () => {
    try {
      const res = await companyService.getAll({ pageNumber: 1, pageSize: 100 });
      const data = res?.data?.data || res?.data || res;
      setCompanies(data?.companies || data || []);
    } catch (err) {
      console.error("Failed to fetch companies", err);
    }
  };

  const fetchAreas = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { pageNumber: page, pageSize: 10, search: searchTerm };
      if (filterCompanyId) params.companyId = filterCompanyId;
      if (filterAreaType) params.areaType = filterAreaType;
      const res = await withMinimumDelay(() => areaService.getAll(params));
      const data = res?.data?.data || res?.data || res;
      setAreas(data?.areas || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      toastError(err?.message || "Failed to load zones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useFilterLockPersist("area_list", filtersLocked, {
    companyId: filterCompanyId,
    areaType: filterAreaType,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      companyId: filterCompanyId,
      areaType: filterAreaType,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchAreas(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, page, filterCompanyId, filterAreaType]);

  const handleDeleteClick = (id) => setConfirmDelete({ visible: true, id });
  const handleDeleteConfirm = async () => {
    const aid = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!aid) return;
    try {
      await areaService.delete(aid);
      toastSuccess("Zone deleted successfully");
      fetchAreas();
    } catch (err) {
      toastError(err?.message || "Failed to delete zone");
    }
  };

  const getAreaTypeBadge = (type) =>
    type === "market" ? (
      <Badge>Market</Badge>
    ) : (
      <Badge variant="secondary">Industry</Badge>
    );
  const getId = (item) => item?.id || item?._id;

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        sortable: true,
        render: (area) => <strong>{area.name}</strong>,
      },
      { key: "city", label: "City", sortable: true },
      {
        key: "areaType",
        label: "Zone Type",
        sortValue: (area) =>
          area.areaType === "market" ? "Market" : "Industry",
        exportValue: (area) =>
          area.areaType === "market" ? "Market" : "Industry",
        render: (area) => getAreaTypeBadge(area.areaType),
      },
      {
        key: "company",
        label: "Company",
        sortValue: (area) => area.companyId?.name ?? "",
        exportValue: (area) => area.companyId?.name ?? "—",
        render: (area) => area.companyId?.name ?? "—",
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (area) => {
          const id = getId(area);
          return (
            <RowActions
              onView={() => navigate(`/zones/${id}`)}
              onEdit={
                canUpdate("zones")
                  ? () => navigate(`/zones/edit/${id}`)
                  : undefined
              }
              onDelete={
                canDelete("zones") ? () => handleDeleteClick(id) : undefined
              }
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  );

  return (
    <div>
      <PageHeader
        title="Zones"
        description="Manage the market and industry zones across your companies."
        actions={
          canCreate("zones") && (
            <Button onClick={() => navigate("/zones/new")}>
              <Plus className="h-4 w-4" />
              Add Zone
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-sm">
          <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={filterCompanyId}
            onChange={(e) => {
              setFilterCompanyId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={getId(c)} value={getId(c)}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={filterAreaType}
            onChange={(e) => {
              setFilterAreaType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            <option value="market">Market</option>
            <option value="industry">Industry</option>
          </Select>
        </div>
        <FilterLockButton
          filtersLocked={filtersLocked}
          onToggle={handleToggleFiltersLock}
          pageLabel="Zones"
        />
      </div>

      <DataTable
        columns={columns}
        rows={areas}
        rowKey={(area) => getId(area)}
        loading={loading}
        onRowClick={(area) => navigate(`/zones/${getId(area)}`)}
        showSearch={false}
        exportFileName="zones"
        emptyTitle="No zones found"
        emptyMessage='Click "Add Zone" to create one.'
      />

      <TablePagination
        currentPage={pagination?.currentPage ?? 1}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        showRange
        totalItems={pagination?.totalItems ?? 0}
        itemsPerPage={pagination?.itemsPerPage ?? 10}
      />

      <ConfirmDialog
        visible={confirmDelete.visible}
        title="Delete Zone?"
        message="Are you sure you want to delete this zone?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete({ visible: false, id: null })}
      />
    </div>
  );
};

export default AreaList;
