import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import industryBranchService from "../../services/industryBranchService";
import industryService from "../../services/industryService";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  TablePagination,
  FilterLockButton,
  LocationValue,
} from "../../components";
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Select,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const INDUSTRY_BRANCH_FILTER_DEFAULTS = { industryId: "" };

const IndustryBranchList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "industry_branch_list",
    INDUSTRY_BRANCH_FILTER_DEFAULTS,
  );
  const [branches, setBranches] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIndustryId, setFilterIndustryId] = useState(
    initialValues.industryId,
  );
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const fetchIndustries = async () => {
    try {
      const res = await industryService.getAll({
        pageNumber: 1,
        pageSize: 100,
      });
      const data = res?.data ?? res;
      const list = data?.industries ?? data?.data?.industries ?? [];
      setIndustries(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch industries", err);
    }
  };

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        search: searchTerm || undefined,
      };
      if (filterIndustryId) params.industryId = filterIndustryId;
      const res = await withMinimumDelay(() =>
        industryBranchService.getAll(params),
      );
      const data = res?.data?.data || res?.data || res;
      setBranches(data?.branches || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      toastError(err?.message || "Failed to load client branches");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterIndustryId]);

  useEffect(() => {
    fetchIndustries();
  }, []);

  useFilterLockPersist("industry_branch_list", filtersLocked, {
    industryId: filterIndustryId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ industryId: filterIndustryId });
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchBranches(), 300);
    return () => clearTimeout(timer);
  }, [fetchBranches]);

  const handleDeleteClick = (id) => setConfirmDelete({ visible: true, id });
  const handleDeleteConfirm = async () => {
    const bid = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!bid) return;
    try {
      await industryBranchService.delete(bid);
      toastSuccess("Client branch deleted successfully");
      fetchBranches();
    } catch (err) {
      toastError(err?.message || "Failed to delete client branch");
    }
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
        key: "client",
        label: "Client",
        exportValue: (branch) =>
          typeof branch.industryId === "object"
            ? branch.industryId?.name || "-"
            : "-",
        render: (branch) =>
          typeof branch.industryId === "object"
            ? branch.industryId?.name || "-"
            : "-",
      },
      {
        key: "name",
        label: "Branch Name",
        sortable: true,
        exportValue: (branch) => branch.name,
        render: (branch) => (
          <span className="font-semibold text-foreground">{branch.name}</span>
        ),
      },
      {
        key: "location",
        label: "Location",
        sortable: true,
        render: (branch) => <LocationValue value={branch.location} />,
      },
      {
        key: "cityState",
        label: "City / State",
        render: (branch) =>
          branch.city || branch.state
            ? `${branch.city || "-"}, ${branch.state || "-"}`
            : "-",
        exportValue: (branch) =>
          branch.city || branch.state
            ? `${branch.city || "-"}, ${branch.state || "-"}`
            : "-",
      },
      {
        key: "gst",
        label: "GST",
        render: (branch) => branch.gst || "-",
      },
      {
        key: "address",
        label: "Address",
        render: (branch) => branch.address || "-",
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (branch) => (
          <RowActions
            onView={() => navigate("/industry-branches/" + branch._id)}
            onEdit={
              canUpdate("industry_branches")
                ? () => navigate("/industry-branches/edit/" + branch._id)
                : undefined
            }
            onDelete={
              canDelete("industry_branches")
                ? () => handleDeleteClick(branch._id)
                : undefined
            }
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page],
  );

  return (
    <div>
      <PageHeader
        title="Client branches"
        description="Manage client branches and their locations."
        actions={
          canCreate("industry_branches") && (
            <Button onClick={() => navigate("/industry-branches/new")}>
              <Plus className="h-4 w-4" />
              Add client branch
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search branches…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <div className="w-full max-w-xs">
          <Select
            value={filterIndustryId}
            onChange={(e) => {
              setFilterIndustryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All clients</option>
            {industries.map((ind) => (
              <option key={ind._id} value={ind._id}>
                {ind.name}
              </option>
            ))}
          </Select>
        </div>
        <FilterLockButton
          filtersLocked={filtersLocked}
          onToggle={handleToggleFiltersLock}
          pageLabel="Industry Branches"
        />
      </div>

      <DataTable
        columns={columns}
        rows={branches}
        rowKey={(branch) => branch._id}
        loading={loading}
        onRowClick={(branch) => navigate("/industry-branches/" + branch._id)}
        showSearch={false}
        exportFileName="client-branches"
        emptyTitle="No client branches found"
        emptyMessage="Select a client and create a branch."
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
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Client Branch?"
        message="Are you sure you want to delete this client branch?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default IndustryBranchList;
