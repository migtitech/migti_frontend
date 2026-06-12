import React, { useEffect, useState } from "react";
import {
  CRow,
  CCol,
  CFormCheck,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CSpinner,
  CAlert,
} from "@coreui/react";
import { api } from "../../../api/axiosClient";
import { ADMIN } from "../../../api/endpoints";
import { FULL_ACCESS_ROLES } from "../../../context/AuthContext";

const ACTIONS = ["read", "create", "update", "delete"];

const ACTION_LABELS = {
  read: "Read",
  create: "Create",
  update: "Update",
  delete: "Delete",
};

/** API module labels from backend → UI display names */
const MODULE_LABEL_DISPLAY = {
  Industries: "Clients",
  "Industry Branches": "Client branches",
  "Sub Zones": "Sub-zones",
  "Purchase Orders": "Sales Order",
  "Visit Management": "Visit Management",
  "My Visits": "My Visits",
  "Po Payment": "Sales Order payment",
  "Po Payment Backlog": "Pending Payments",
  "Po Bucket": "Sales Order Bucket",
};

const ALLOWED_MODULE_LABELS = new Set([
  "MigtiCRM",
  "Dashboard",
  "Companies",
  "Branch Settings",
  "Branches",
  "Zones",
  "Sub Zones",
  "Industries",
  "Industry Branches",
  "Product Management",
  "Groups",
  "Categories",
  "Brands",
  "Products",
  "Product Lead",
  "Queries",
  "Quotations",
  "Suppliers",
  "Rate Card",
  "Task Management",
  "Task Bucket",
  "Branch Analytics",
  "Target Analytics",
  "Purchase Orders",
  "Pro Bucket",
  "Po Bucket",
  "Purchase Bucket",
  "Inventory Bucket",
  "Po Payment",
  "Po Payment Backlog",
  "Billing Request",
  "Dispatchment",
  "Employees",
  "Visit Management",
  "My Visits",
]);

const EmployeePermissionsSection = ({
  selectedRole,
  permissions = [],
  onChange,
}) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await api.get(ADMIN.PERMISSIONS_MODULES);
        // Support both response.data.modules and response.modules
        const mods = response?.data?.modules ?? response?.modules ?? [];
        const normalized = Array.isArray(mods) ? mods : [];
        const filtered = normalized.filter(
          (mod) => mod?.label && ALLOWED_MODULE_LABELS.has(mod.label),
        );
        setModules(filtered);
      } catch {
        setModules([]);
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
  }, []);

  // No role selected yet
  if (!selectedRole) {
    return (
      <CAlert color="info" className="mb-0">
        Select an employee role above (HOD, SM, SE, PM, PE, Procurement, LP,
        BOE, ADMIN) to configure granular access permissions.
      </CAlert>
    );
  }

  // Full-access roles don't need permission configuration
  if (FULL_ACCESS_ROLES.includes(selectedRole)) {
    return (
      <CAlert color="secondary" className="mb-0">
        This role ({selectedRole}) has full access. No permission configuration
        needed.
      </CAlert>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-3">
        <CSpinner size="sm" /> Loading permissions...
      </div>
    );
  }

  const hasPermission = (moduleKey, action) => {
    return permissions.includes(`${moduleKey}:${action}`);
  };

  const togglePermission = (moduleKey, action) => {
    const perm = `${moduleKey}:${action}`;
    let updated;
    if (permissions.includes(perm)) {
      updated = permissions.filter((p) => p !== perm);
    } else {
      updated = [...permissions, perm];
    }
    onChange(updated);
  };

  const toggleAllForModule = (moduleKey) => {
    const modulePerms = ACTIONS.map((a) => `${moduleKey}:${a}`);
    const allChecked = modulePerms.every((p) => permissions.includes(p));
    let updated;
    if (allChecked) {
      updated = permissions.filter((p) => !p.startsWith(`${moduleKey}:`));
    } else {
      const newPerms = modulePerms.filter((p) => !permissions.includes(p));
      updated = [...permissions, ...newPerms];
    }
    onChange(updated);
  };

  const toggleAllForAction = (action) => {
    const actionPerms = modules.map((m) => `${m.key}:${action}`);
    const allChecked = actionPerms.every((p) => permissions.includes(p));
    let updated;
    if (allChecked) {
      updated = permissions.filter((p) => !p.endsWith(`:${action}`));
    } else {
      const newPerms = actionPerms.filter((p) => !permissions.includes(p));
      updated = [...permissions, ...newPerms];
    }
    onChange(updated);
  };

  const selectAll = () => {
    const allPerms = modules.flatMap((m) =>
      ACTIONS.map((a) => `${m.key}:${a}`),
    );
    onChange(allPerms);
  };

  const deselectAll = () => {
    onChange([]);
  };

  const allSelected =
    modules.length > 0 &&
    modules.every((m) =>
      ACTIONS.every((a) => permissions.includes(`${m.key}:${a}`)),
    );

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CFormCheck
            id="select-all-permissions"
            label="Select All Permissions"
            checked={allSelected}
            onChange={() => (allSelected ? deselectAll() : selectAll())}
          />
        </CCol>
      </CRow>
      <CTable bordered responsive small>
        <CTableHead color="light">
          <CTableRow>
            <CTableHeaderCell>Module</CTableHeaderCell>
            {ACTIONS.map((action) => (
              <CTableHeaderCell key={action} className="text-center">
                <CFormCheck
                  id={`action-all-${action}`}
                  label={ACTION_LABELS[action]}
                  checked={
                    modules.length > 0 &&
                    modules.every((m) =>
                      permissions.includes(`${m.key}:${action}`),
                    )
                  }
                  onChange={() => toggleAllForAction(action)}
                />
              </CTableHeaderCell>
            ))}
            <CTableHeaderCell className="text-center">All</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {modules.map((mod) => {
            const allModuleChecked = ACTIONS.every((a) =>
              permissions.includes(`${mod.key}:${a}`),
            );
            return (
              <CTableRow key={mod.key}>
                <CTableDataCell>
                  {MODULE_LABEL_DISPLAY[mod.label] || mod.label}
                </CTableDataCell>
                {ACTIONS.map((action) => (
                  <CTableDataCell key={action} className="text-center">
                    <CFormCheck
                      id={`perm-${mod.key}-${action}`}
                      checked={hasPermission(mod.key, action)}
                      onChange={() => togglePermission(mod.key, action)}
                    />
                  </CTableDataCell>
                ))}
                <CTableDataCell className="text-center">
                  <CFormCheck
                    id={`perm-${mod.key}-all`}
                    checked={allModuleChecked}
                    onChange={() => toggleAllForModule(mod.key)}
                  />
                </CTableDataCell>
              </CTableRow>
            );
          })}
        </CTableBody>
      </CTable>
    </>
  );
};

export default EmployeePermissionsSection;
