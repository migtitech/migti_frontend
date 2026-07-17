import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import groupService from "../../services/groupService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  StatusToggle,
  TablePagination,
} from "../../components";
import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Label,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions, { isHodRole } from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";

const getGroupAvatarLabel = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2).toUpperCase();
};

const getGroupIconSrc = (group) =>
  group?.iconDisplayUrl || group?.iconUrl || undefined;

const GroupList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { user } = useAuth();
  const canToggleStatus = isHodRole(user?.role);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });
  const [togglingId, setTogglingId] = useState(null);

  const fetchGroups = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        groupService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
        }),
      );
      const data = res?.data || res;
      setGroups(data?.groups || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      setError(err?.message || "Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGroups();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, page]);

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const { id } = confirmDelete;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await groupService.delete(id);
      toastSuccess("Group deleted successfully");
      fetchGroups();
    } catch (err) {
      toastError(err?.message || "Failed to delete group");
    }
  };

  const handleStatusToggle = async (group, checked) => {
    if (!canToggleStatus) return;

    const newStatus = checked ? "active" : "inactive";
    if (group.status === newStatus) return;

    const previousStatus = group.status;
    setTogglingId(group._id);
    setGroups((prev) =>
      prev.map((item) =>
        item._id === group._id ? { ...item, status: newStatus } : item,
      ),
    );

    try {
      await groupService.update(group._id, { status: newStatus });
      toastSuccess(
        `Group ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      );
    } catch (err) {
      setGroups((prev) =>
        prev.map((item) =>
          item._id === group._id ? { ...item, status: previousStatus } : item,
        ),
      );
      toastError(err?.message || "Failed to update group status");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "S No",
        width: 64,
        toggleable: false,
        exportable: false,
        render: (_row, index) => (page - 1) * 10 + index + 1,
      },
      {
        key: "name",
        label: "Name",
        sortable: true,
        exportValue: (grp) => grp.name,
        render: (grp) => {
          const iconSrc = getGroupIconSrc(grp);
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 flex-shrink-0">
                {iconSrc ? <AvatarImage src={iconSrc} alt={grp.name} /> : null}
                <AvatarFallback>{getGroupAvatarLabel(grp.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-semibold text-foreground">{grp.name}</div>
                <code className="text-xs text-muted-foreground">
                  {grp.code || "—"}
                </code>
              </div>
            </div>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        align: "center",
        stopRowClick: true,
        sortValue: (grp) => grp.status,
        exportValue: (grp) => grp.status,
        render: (grp) => (
          <StatusToggle
            status={grp.status}
            disabled={!canToggleStatus || togglingId === grp._id}
            onCheckedChange={(checked) => handleStatusToggle(grp, checked)}
            aria-label={`Toggle status for ${grp.name}`}
            className="justify-center"
          />
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (grp) => (
          <RowActions
            onEdit={
              canUpdate("groups")
                ? () => navigate(`/groups/edit/${grp._id}`)
                : undefined
            }
            onDelete={
              canDelete("groups") ? () => handleDeleteClick(grp._id) : undefined
            }
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page, canToggleStatus, togglingId],
  );

  return (
    <div>
      <PageHeader
        title="Groups"
        description="Manage product groups used to organize categories."
        actions={
          canCreate("groups") && (
            <Button onClick={() => navigate("/groups/new")}>
              <Plus className="h-4 w-4" />
              Add Group
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
        <div className="max-w-sm">
          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Search
          </Label>
          <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={groups}
        rowKey={(grp) => grp._id}
        loading={loading}
        onRowClick={(grp) => navigate(`/groups/edit/${grp._id}`)}
        showSearch={false}
        exportFileName="groups"
        emptyTitle="No groups found"
        emptyMessage={
          searchTerm
            ? `No groups found matching "${searchTerm}"`
            : 'Click "Add Group" to create one.'
        }
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
        title="Delete Group?"
        message="Are you sure you want to delete this group? Categories linked to it will need to be updated first."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default GroupList;
