import React, { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import brandService from "../../services/brandService";
import Filtered from "../../filtered/Filtered";
import { useNavigate } from "react-router-dom";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  StatusBadge,
  TablePagination,
} from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const getBrandAvatarLabel = (name) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2).toUpperCase();
};

const getBrandIconSrc = (brand) =>
  brand?.iconDisplayUrl || brand?.iconUrl || undefined;

const BrandList = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();

  const fetchBrands = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        brandService.getAll({
          pageNumber: page,
          pageSize: 10,
          search: searchTerm,
        }),
      );
      const data = res?.data || res;
      setBrands(data?.brands || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      setError(err?.message || "Failed to fetch brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchBrands, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, page]);

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await brandService.delete(id);
      toastSuccess("Brand deleted successfully");
      fetchBrands();
    } catch (err) {
      toastError(err?.message || "Failed to delete brand");
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
        render: (brand) => {
          const iconSrc = getBrandIconSrc(brand);
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 flex-shrink-0">
                {iconSrc ? (
                  <AvatarImage src={iconSrc} alt={brand.name} />
                ) : null}
                <AvatarFallback>
                  {getBrandAvatarLabel(brand.name)}
                </AvatarFallback>
              </Avatar>
              <strong>{brand.name}</strong>
            </div>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        sortValue: (brand) =>
          brand.status === "active" ? "Active" : "Inactive",
        exportValue: (brand) =>
          brand.status === "active" ? "Active" : "Inactive",
        render: (brand) => (
          <StatusBadge
            status={brand.status === "active" ? "Active" : "Inactive"}
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
        render: (brand) => (
          <RowActions
            onEdit={
              canUpdate("brands")
                ? () => navigate(`/brands/edit/${brand._id}`)
                : undefined
            }
            onDelete={
              canDelete("brands")
                ? () => handleDeleteClick(brand._id)
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
        title="Brands"
        description="Manage the brands available across your organization."
        actions={
          canCreate("brands") && (
            <Button onClick={() => navigate("/brands/new")}>
              <Plus className="h-4 w-4" />
              Add Brand
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 max-w-sm">
        <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      </div>

      <DataTable
        columns={columns}
        rows={brands}
        rowKey={(brand) => brand._id}
        loading={loading}
        onRowClick={(brand) => navigate(`/brands/edit/${brand._id}`)}
        showSearch={false}
        exportFileName="brands"
        emptyTitle="No brands found"
        emptyMessage='Click "Add Brand" to create one.'
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
        title="Delete Brand?"
        message="Are you sure you want to delete this brand? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default BrandList;
