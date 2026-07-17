import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import subcategoryService from "../../services/subcategoryService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  StatusBadge,
  TablePagination,
} from "../../components";
import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Switch,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions, { isHodRole } from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";

const StackedNameCode = ({ name, code, bold = false }) => (
  <div>
    {bold ? <strong>{name || "—"}</strong> : <span>{name || "—"}</span>}
    <div>
      <code className="text-primary!">{code || "—"}</code>
    </div>
  </div>
);

const getSubcategoryAvatarLabel = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2).toUpperCase();
};

const getSubcategoryImageSrc = (subcategory) =>
  subcategory?.imageDisplayUrl || subcategory?.image || undefined;

const SubcategoryList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { user } = useAuth();
  const canToggleStatus = isHodRole(user?.role);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [togglingId, setTogglingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const fetchSubcategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        subcategoryService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
        }),
      );
      const data = res?.data || res;
      const inner = data?.data ?? data;
      setSubcategories(inner?.subcategories || []);
      setPagination(inner?.pagination || {});
    } catch (err) {
      setError(err?.message || "Failed to fetch subcategories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubcategories();
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
      await subcategoryService.delete(id);
      toastSuccess("Subcategory deleted successfully");
      fetchSubcategories();
    } catch (err) {
      toastError(err?.message || "Failed to delete subcategory");
    }
  };

  const handleStatusToggle = async (subcategory, checked) => {
    if (!canToggleStatus) return;

    const newStatus = checked ? "active" : "inactive";
    if (subcategory.status === newStatus) return;

    const previousStatus = subcategory.status;
    setTogglingId(subcategory._id);
    setSubcategories((prev) =>
      prev.map((item) =>
        item._id === subcategory._id ? { ...item, status: newStatus } : item,
      ),
    );

    try {
      await subcategoryService.update(subcategory._id, { status: newStatus });
      toastSuccess(
        `Subcategory ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      );
    } catch (err) {
      setSubcategories((prev) =>
        prev.map((item) =>
          item._id === subcategory._id
            ? { ...item, status: previousStatus }
            : item,
        ),
      );
      toastError(err?.message || "Failed to update subcategory status");
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
        sortValue: (sub) => sub.name,
        exportValue: (sub) => sub.name,
        render: (sub) => {
          const imageSrc = getSubcategoryImageSrc(sub);
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 flex-shrink-0">
                {imageSrc ? (
                  <AvatarImage src={imageSrc} alt={sub.name} />
                ) : null}
                <AvatarFallback>
                  {getSubcategoryAvatarLabel(sub.name)}
                </AvatarFallback>
              </Avatar>
              <StackedNameCode
                name={sub.name}
                code={sub.subcategoryCode}
                bold
              />
            </div>
          );
        },
      },
      {
        key: "category",
        label: "Category",
        exportValue: (sub) =>
          typeof sub.category === "object" ? (sub.category?.name ?? "") : "",
        render: (sub) => (
          <StackedNameCode
            name={typeof sub.category === "object" ? sub.category?.name : null}
            code={
              typeof sub.category === "object"
                ? sub.category?.categoryCode
                : null
            }
          />
        ),
      },
      {
        key: "status",
        label: "Status",
        align: "center",
        stopRowClick: true,
        sortValue: (sub) => sub.status,
        exportValue: (sub) => sub.status,
        render: (sub) => (
          <div className="flex items-center justify-center gap-2">
            <Switch
              checked={sub.status === "active"}
              disabled={!canToggleStatus || togglingId === sub._id}
              onCheckedChange={(checked) => handleStatusToggle(sub, checked)}
              aria-label={`Toggle status for ${sub.name}`}
            />
            <StatusBadge status={sub.status} />
          </div>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (sub) => (
          <RowActions
            onEdit={
              canUpdate("subcategories")
                ? () => navigate(`/subcategories/edit/${sub._id}`)
                : undefined
            }
            onDelete={
              canDelete("subcategories")
                ? () => handleDeleteClick(sub._id)
                : undefined
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
        title="Subcategories"
        description="Manage product subcategories and their parent categories."
        actions={
          canCreate("subcategories") && (
            <Button onClick={() => navigate("/subcategories/new")}>
              <Plus className="h-4 w-4" />
              Add Subcategory
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setError("")}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 max-w-sm">
        <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      </div>

      <DataTable
        columns={columns}
        rows={subcategories}
        rowKey={(sub) => sub._id}
        loading={loading}
        showSearch={false}
        exportFileName="subcategories"
        emptyTitle="No subcategories found"
        emptyMessage={
          searchTerm
            ? `No subcategories found matching "${searchTerm}"`
            : 'Click "Add Subcategory" to create one.'
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
        title="Delete Subcategory?"
        message="Are you sure you want to delete this subcategory? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default SubcategoryList;
