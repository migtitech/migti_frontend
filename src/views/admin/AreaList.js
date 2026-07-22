import React, { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import areaService from "../../services/areaService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  TablePagination,
  FilterLockButton,
  StatusBadge,
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

const AREA_FILTER_DEFAULTS = { areaType: "", isActive: "" };

const AreaList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "area_list",
    AREA_FILTER_DEFAULTS,
  );
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filterAreaType, setFilterAreaType] = useState(initialValues.areaType);
  const [filterIsActive, setFilterIsActive] = useState(initialValues.isActive);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const fetchAreas = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { pageNumber: page, pageSize: 10, search: searchTerm };
      if (filterAreaType) params.areaType = filterAreaType;
      if (filterIsActive !== "") params.isActive = filterIsActive;
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

  useFilterLockPersist("area_list", filtersLocked, {
    areaType: filterAreaType,
    isActive: filterIsActive,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      areaType: filterAreaType,
      isActive: filterIsActive,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchAreas(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, page, filterAreaType, filterIsActive]);

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
      {
        key: "state",
        label: "State",
        sortable: true,
        exportValue: (area) => area.state || "—",
        render: (area) => area.state || "—",
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
        key: "status",
        label: "Status",
        sortValue: (area) => (area.isActive !== false ? "Active" : "Inactive"),
        exportValue: (area) =>
          area.isActive !== false ? "Active" : "Inactive",
        render: (area) => (
          <StatusBadge
            status={area.isActive !== false ? "Active" : "Inactive"}
          />
        ),
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
        description="Manage the market and industry zones."
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
        <div className="w-full sm:w-48">
          <Select
            value={filterIsActive}
            onChange={(e) => {
              setFilterIsActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
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
