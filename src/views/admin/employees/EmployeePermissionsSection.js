import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  Checkbox,
  Label,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../../components/ui";
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
      <Alert variant="info" className="mb-0">
        <AlertDescription>
          Select an employee role above (HOD, SM, SE, PM, PE, Procurement, LP,
          BOE, ADMIN) to configure granular access permissions.
        </AlertDescription>
      </Alert>
    );
  }

  // Full-access roles don't need permission configuration
  if (FULL_ACCESS_ROLES.includes(selectedRole)) {
    return (
      <Alert variant="default" className="mb-0">
        <AlertDescription>
          This role ({selectedRole}) has full access. No permission
          configuration needed.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
        <Spinner size="sm" /> Loading permissions...
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
      <div className="mb-3 flex items-center gap-2">
        <Checkbox
          id="select-all-permissions"
          checked={allSelected}
          onCheckedChange={() => (allSelected ? deselectAll() : selectAll())}
        />
        <Label htmlFor="select-all-permissions" className="font-normal">
          Select All Permissions
        </Label>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              {ACTIONS.map((action) => (
                <TableHead key={action} className="text-center">
                  <label
                    htmlFor={`action-all-${action}`}
                    className="flex items-center justify-center gap-2"
                  >
                    <Checkbox
                      id={`action-all-${action}`}
                      checked={
                        modules.length > 0 &&
                        modules.every((m) =>
                          permissions.includes(`${m.key}:${action}`),
                        )
                      }
                      onCheckedChange={() => toggleAllForAction(action)}
                    />
                    {ACTION_LABELS[action]}
                  </label>
                </TableHead>
              ))}
              <TableHead className="text-center">All</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((mod) => {
              const allModuleChecked = ACTIONS.every((a) =>
                permissions.includes(`${mod.key}:${a}`),
              );
              return (
                <TableRow key={mod.key}>
                  <TableCell>
                    {MODULE_LABEL_DISPLAY[mod.label] || mod.label}
                  </TableCell>
                  {ACTIONS.map((action) => (
                    <TableCell key={action} className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          id={`perm-${mod.key}-${action}`}
                          checked={hasPermission(mod.key, action)}
                          onCheckedChange={() =>
                            togglePermission(mod.key, action)
                          }
                        />
                      </div>
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        id={`perm-${mod.key}-all`}
                        checked={allModuleChecked}
                        onCheckedChange={() => toggleAllForModule(mod.key)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default EmployeePermissionsSection;
