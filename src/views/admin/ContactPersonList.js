import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import bpDummy from "../../data/businessPartnerDummy";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  StatusBadge,
} from "../../components";
import { Alert, AlertDescription, Button, Input } from "../../components/ui";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";

/**
 * Frontend-only "Contact Person" list, shared by Customer Contacts and
 * Supplier Contacts. Data lives in localStorage (see
 * data/businessPartnerDummy.js) — there is no backend entity for this yet.
 */
const PARENT_CONFIG = {
  industry: {
    module: "industry_branches",
    title: "Customer contacts",
    description: "Manage contact persons mapped to your clients.",
    basePath: "/customer-contacts",
    emptyMessage: "Add a contact person and map them to a client.",
  },
  supplier: {
    module: "suppliers",
    title: "Supplier contacts",
    description: "Manage contact persons mapped to your suppliers.",
    basePath: "/supplier-contacts",
    emptyMessage: "Add a contact person and map them to a supplier.",
  },
};

const ContactPersonListBase = ({ parentType }) => {
  const navigate = useNavigate();
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const config = PARENT_CONFIG[parentType];

  const [contacts, setContacts] = useState(() =>
    bpDummy.listContactPersons({ parentType }),
  );
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });

  const loadContacts = () => {
    try {
      setContacts(bpDummy.listContactPersons({ parentType }));
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load contact persons");
    }
  };

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
  const handleDeleteConfirm = () => {
    const cid = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (!cid) return;
    try {
      bpDummy.deleteContactPerson(cid);
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
        render: (cp) => (
          <span className="font-semibold text-foreground">
            {`${cp.firstName || ""} ${cp.lastName || ""}`.trim() || "-"}
          </span>
        ),
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filteredContacts}
        rowKey={(cp) => cp.id}
        loading={false}
        showSearch={false}
        exportFileName={`${parentType}-contacts`}
        emptyTitle="No contact persons found"
        emptyMessage={config.emptyMessage}
      />

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete contact person?"
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
