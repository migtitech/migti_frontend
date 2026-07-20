import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import industryContactPersonService from "../../services/industryContactPersonService";
import supplierContactPersonService from "../../services/supplierContactPersonService";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  StatusBadge,
} from "../../components";
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
} from "../../components/ui";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

/**
 * Shared Contact Person list for Customer Contacts and Supplier Contacts.
 */
const PARENT_CONFIG = {
  industry: {
    module: "industry_branches",
    title: "Customer contacts",
    description: "Manage contact persons mapped to your clients.",
    basePath: "/customer-contacts",
    emptyMessage: "Add a contact person and map them to a client.",
    mappedKey: "industryId",
    list: (params) => industryContactPersonService.getAll(params),
    remove: (id) => industryContactPersonService.delete(id),
  },
  supplier: {
    module: "suppliers",
    title: "Supplier contacts",
    description: "Manage contact persons mapped to your suppliers.",
    basePath: "/supplier-contacts",
    emptyMessage: "Add a contact person and map them to a supplier.",
    mappedKey: "supplierId",
    list: (params) => supplierContactPersonService.getAll(params),
    remove: (id) => supplierContactPersonService.delete(id),
  },
};

const getMappedName = (cp, mappedKey) => {
  if (cp.mappedName) return cp.mappedName;
  const ref = cp[mappedKey];
  if (ref && typeof ref === "object") {
    return ref.name || "Unassigned";
  }
  return "Unassigned";
};

const normalizeContact = (cp, mappedKey) => ({
  ...cp,
  id: cp._id || cp.id,
  mappedName: getMappedName(cp, mappedKey),
});

const ContactPersonListBase = ({ parentType }) => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const config = PARENT_CONFIG[parentType];

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await config.list({
        pageNumber: 1,
        pageSize: 1000,
      });
      const data = res?.data ?? res;
      const list = data?.contactPersons ?? data?.data?.contactPersons ?? [];
      setContacts(
        (Array.isArray(list) ? list : []).map((cp) =>
          normalizeContact(cp, config.mappedKey),
        ),
      );
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load contact persons");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const filteredContacts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((cp) => {
      const name = `${cp.firstName || ""} ${cp.lastName || ""}`.toLowerCase();
      return (
        name.includes(term) ||
        (cp.email || "").toLowerCase().includes(term) ||
        (cp.mappedName || "").toLowerCase().includes(term)
      );
    });
  }, [contacts, searchTerm]);

  const handleDeleteClick = (id) => setConfirmDelete({ visible: true, id });
  const handleDeleteConfirm = async () => {
    const cid = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!cid) return;
    try {
      await config.remove(cid);
      toastSuccess("Contact person deleted successfully");
      loadContacts();
    } catch (err) {
      toastError(err?.message || "Failed to delete contact person");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        render: (cp) => {
          const fullName =
            `${cp.firstName || ""} ${cp.lastName || ""}`.trim() || "-";
          const initials =
            `${cp.firstName?.[0] || ""}${cp.lastName?.[0] || ""}`
              .trim()
              .toUpperCase() || "CP";
          return (
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary!">
                {initials}
              </span>
              <div className="min-w-0">
                <div className="font-medium text-foreground">{fullName}</div>
                {cp.designation && (
                  <div className="text-xs text-muted-foreground">
                    {cp.designation}
                  </div>
                )}
              </div>
            </div>
          );
        },
        exportValue: (cp) =>
          `${cp.firstName || ""} ${cp.lastName || ""}`.trim(),
      },
      {
        key: "designation",
        label: "Designation",
        render: (cp) => cp.designation || "-",
      },
      {
        key: "email",
        label: "Email",
        render: (cp) => cp.email || "-",
      },
      {
        key: "mappedCompany",
        label: "Mapped Company",
        render: (cp) => cp.mappedName || "Unassigned",
      },
      {
        key: "status",
        label: "Status",
        render: (cp) => <StatusBadge status={cp.status || "inactive"} />,
      },
      {
        key: "primary",
        label: "Primary",
        render: (cp) =>
          cp.isPrimary ? (
            <StatusBadge status="yes" variant="success">
              Primary
            </StatusBadge>
          ) : (
            "-"
          ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (cp) => (
          <RowActions
            onEdit={
              canUpdate(config.module)
                ? () => navigate(`${config.basePath}/edit/${cp.id}`)
                : undefined
            }
            onDelete={
              canDelete(config.module)
                ? () => handleDeleteClick(cp.id)
                : undefined
            }
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, config],
  );

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          canCreate(config.module) && (
            <Button onClick={() => navigate(`${config.basePath}/new`)}>
              <Plus className="h-4 w-4" />
              Add contact person
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
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email or company…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filteredContacts}
        rowKey={(cp) => cp.id}
        loading={loading}
        showSearch={false}
        exportFileName={`${parentType}-contacts`}
        emptyTitle="No contact persons found"
        emptyMessage={config.emptyMessage}
      />

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Contact Person?"
        message="Are you sure you want to delete this contact person?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export const CustomerContactList = () => (
  <ContactPersonListBase parentType="industry" />
);
export const SupplierContactList = () => (
  <ContactPersonListBase parentType="supplier" />
);
