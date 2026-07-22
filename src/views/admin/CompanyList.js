import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import Filtered from "../../filtered/Filtered";
import companyService from "../../services/companyService";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  StatusBadge,
} from "../../components";
import { Button, Alert, AlertDescription } from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

const CompanyList = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        companyService.getAll({ search: searchTerm || "" }),
      );
      const data = res?.data || res;
      setCompanies(data?.companies || data || []);
    } catch (err) {
      setError(err?.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleDeleteClick = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!id) return;
    try {
      await companyService.delete(id);
      toastSuccess("Company deleted successfully");
      fetchCompanies();
    } catch (err) {
      toastError(err?.message || "Failed to delete company");
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
        render: (_row, index) => index + 1,
      },
      { key: "name", label: "Name", sortable: true },
      {
        key: "code",
        label: "Code",
        sortable: true,
        exportValue: (company) => company.code || "—",
        render: (company) => company.code || "—",
      },
      { key: "brandName", label: "Brand Name", sortable: true },
      { key: "email", label: "Email", sortable: true },
      {
        key: "logo",
        label: "Logo",
        exportable: false,
        render: (company) =>
          company.logoDisplayUrl || company.logoUrl ? (
            <img
              src={company.logoDisplayUrl || company.logoUrl}
              alt="Logo"
              style={{
                height: 32,
                width: "auto",
                maxWidth: 80,
                objectFit: "contain",
              }}
            />
          ) : (
            "-"
          ),
      },
      {
        key: "status",
        label: "Status",
        sortValue: (company) =>
          company.isActive !== false ? "Active" : "Inactive",
        exportValue: (company) =>
          company.isActive !== false ? "Active" : "Inactive",
        render: (company) => (
          <StatusBadge
            status={company.isActive !== false ? "Active" : "Inactive"}
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
        render: (company) => {
          const id = company._id || company.id;
          return (
            <RowActions
              onView={() => navigate(`/companies/${id}`)}
              onEdit={
                canUpdate("companies")
                  ? () => navigate(`/companies/edit/${id}`)
                  : undefined
              }
              onDelete={
                canDelete("companies") ? () => handleDeleteClick(id) : undefined
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
        title="Companies"
        description="Manage the companies and brands operating in your organization."
        actions={
          canCreate("companies") && (
            <Button onClick={() => navigate("/companies/new")}>
              <Plus className="h-4 w-4" />
              Add Company
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
        rows={companies}
        rowKey={(company) => company._id || company.id}
        loading={loading}
        onRowClick={(company) =>
          navigate(`/companies/${company._id || company.id}`)
        }
        showSearch={false}
        exportFileName="companies"
        emptyTitle="No companies found"
        emptyMessage={
          searchTerm
            ? `No companies found matching "${searchTerm}"`
            : 'Click "Add Company" to create one.'
        }
      />

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Company?"
        message="Are you sure you want to delete this company? All related branches will also be deleted."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default CompanyList;
