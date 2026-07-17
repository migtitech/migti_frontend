import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import supplierService from "../../services/supplierService";
import categoryService from "../../services/categoryService";
import subcategoryService from "../../services/subcategoryService";
import areaService from "../../services/areaService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  SearchableDropdown,
  TablePagination,
  FilterLockButton,
} from "../../components";
import { Alert, AlertDescription, Button, Label } from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const SUPPLIER_FILTER_DEFAULTS = { category: "", subcategory: "", area: "" };

const SupplierList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "supplier_list",
    SUPPLIER_FILTER_DEFAULTS,
  );
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const [filterCategory, setFilterCategory] = useState(initialValues.category);
  const [filterSubcategory, setFilterSubcategory] = useState(
    initialValues.subcategory,
  );
  const [filterArea, setFilterArea] = useState(initialValues.area);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [areas, setAreas] = useState([]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        search: searchTerm || undefined,
      };
      if (filterSubcategory) {
        params.subcategory = filterSubcategory;
      } else if (filterCategory) {
        params.category = filterCategory;
      }
      if (filterArea) {
        const areaObj = areas.find((a) => (a._id || a.id) === filterArea);
        if (areaObj?.name) params.area = areaObj.name;
      }
      const res = await withMinimumDelay(() => supplierService.getAll(params));
      const data = res?.data || res;
      setSuppliers(data?.suppliers || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      toastError(err?.message || "Failed to fetch suppliers");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterCategory, filterSubcategory, filterArea, areas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  useFilterLockPersist("supplier_list", filtersLocked, {
    category: filterCategory,
    subcategory: filterSubcategory,
    area: filterArea,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      category: filterCategory,
      subcategory: filterSubcategory,
      area: filterArea,
    });
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await categoryService.getAll({ parent: "", pageSize: 100 });
        const data = res?.data || res;
        if (!cancelled) setCategories(data?.categories || []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await areaService.getAll({ pageSize: 100 });
        const data = res?.data || res;
        if (!cancelled) setAreas(data?.areas || []);
      } catch {
        if (!cancelled) setAreas([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filterCategory) {
      setSubcategories([]);
      setFilterSubcategory("");
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await subcategoryService.getAllSubcategories({
          category: filterCategory,
        });
        const data = res?.data || res;
        const inner = data?.data ?? data;
        if (!cancelled) setSubcategories(inner?.subcategories || []);
        if (!cancelled) setFilterSubcategory("");
      } catch {
        if (!cancelled) setSubcategories([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filterCategory]);

  const handleFilterCategoryChange = (val) => {
    setFilterCategory(val || "");
    setPage(1);
  };

  const handleFilterSubcategoryChange = (val) => {
    setFilterSubcategory(val || "");
    setPage(1);
  };

  const handleFilterAreaChange = (val) => {
    setFilterArea(val || "");
    setPage(1);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await supplierService.delete(id);
      toastSuccess("Supplier deleted successfully");
      fetchSuppliers();
    } catch (err) {
      toastError(err?.message || "Failed to delete supplier");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "SNo",
        width: 64,
        toggleable: false,
        exportable: false,
        render: (_row, index) => (page - 1) * 10 + index + 1,
      },
      {
        key: "name",
        label: "Name",
        sortable: true,
        render: (supplier) => <strong>{supplier.name}</strong>,
      },
      {
        key: "shopname",
        label: "Shop Name",
        sortable: true,
        render: (supplier) => supplier.shopname || "-",
      },
      {
        key: "phone_1",
        label: "Phone 1",
        render: (supplier) => supplier.phone_1 || "-",
      },
      {
        key: "email",
        label: "Email",
        render: (supplier) => supplier.email || "-",
      },
      {
        key: "other_contact",
        label: "Other Contact",
        render: (supplier) => supplier.other_contact || "-",
      },
      {
        key: "label",
        label: "Label",
        render: (supplier) => supplier.label || "-",
      },
      {
        key: "gst",
        label: "GST",
        render: (supplier) => supplier.gst || "-",
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (supplier) => (
          <RowActions
            onView={() => navigate(`/suppliers/${supplier._id}`)}
            onEdit={
              canUpdate("suppliers")
                ? () => navigate(`/suppliers/edit/${supplier._id}`)
                : undefined
            }
            onDelete={
              canDelete("suppliers")
                ? () => handleDeleteClick(supplier._id)
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
        title="Suppliers"
        description="Manage suppliers, their contacts and sourcing details."
        actions={
          canCreate("suppliers") && (
            <Button onClick={() => navigate("/suppliers/new")}>
              <Plus className="h-4 w-4" />
              Add Supplier
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

      <div className="mb-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
        <SearchableDropdown
          label="Category"
          options={categories}
          value={filterCategory}
          onChange={handleFilterCategoryChange}
          placeholder="Select category"
          maxDisplayCount={5}
          getOptionLabel={(opt) => opt?.name ?? ""}
          getOptionValue={(opt) => opt?._id ?? opt?.id ?? ""}
        />
        <SearchableDropdown
          label="Subcategory"
          options={subcategories}
          value={filterSubcategory}
          onChange={handleFilterSubcategoryChange}
          placeholder="Select subcategory"
          maxDisplayCount={5}
          getOptionLabel={(opt) => opt?.name ?? ""}
          getOptionValue={(opt) => opt?._id ?? opt?.id ?? ""}
          disabled={!filterCategory}
        />
        <SearchableDropdown
          label="Zone"
          options={areas}
          value={filterArea}
          onChange={handleFilterAreaChange}
          placeholder="Select zone"
          maxDisplayCount={5}
          getOptionLabel={(opt) => opt?.name ?? ""}
          getOptionValue={(opt) => opt?._id ?? opt?.id ?? ""}
        />
        <div className="flex items-end">
          <FilterLockButton
            filtersLocked={filtersLocked}
            onToggle={handleToggleFiltersLock}
            pageLabel="Suppliers"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={suppliers}
        rowKey={(supplier) => supplier._id}
        loading={loading}
        onRowClick={(supplier) => navigate(`/suppliers/${supplier._id}`)}
        showSearch={false}
        exportFileName="suppliers"
        emptyTitle="No suppliers found"
        emptyMessage={
          searchTerm || filterCategory || filterSubcategory || filterArea
            ? "No suppliers match the current search or filters."
            : 'Click "Add Supplier" to create one.'
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
        title="Delete Supplier?"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default SupplierList;
