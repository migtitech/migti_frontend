import React from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../../components/ui";
import { EyeIcon } from "../../../components";
import { Loader, TablePagination } from "../../../components";
import { ROLE_LABELS } from "../../../context/AuthContext";

const EmployeeTable = ({
  employees,
  loading,
  error,
  onClearError,
  onView,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
  page = 1,
  pageSize = 10,
  pagination = {},
  onPageChange,
  hasActiveFilters = false,
}) => {
  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? 0;

  const roleBadgeVariant = (role) => {
    const variants = {
      head_of_department: "default",
      sales_manager: "info",
      sales_exicutive: "info",
      purchase_exicutive: "warning",
      procurement: "warning",
      back_office_exicutive: "secondary",
      administrator: "default",
      finance: "success",
      inventry_manager: "warning",
      dispatch_manager: "info",
    };
    return variants[role] || "default";
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Employee List</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription className="flex w-full items-center justify-between gap-3">
              <span>{error}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={onClearError}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {loading ? (
          <Loader message="Loading employees..." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SNo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee, index) => {
                  const rowNumber = (page - 1) * pageSize + index + 1;
                  return (
                    <TableRow
                      key={employee.id}
                      className="cursor-pointer"
                      onClick={() => onView(employee.id)}
                    >
                      <TableCell>{rowNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary! text-sm font-medium text-primary-foreground">
                            {employee.name?.charAt(0)?.toUpperCase() || "E"}
                          </span>
                          <span className="font-semibold">{employee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(employee.role)}>
                          {employee.role
                            ? ROLE_LABELS[employee.role] ||
                              employee.role
                                .split("_")
                                .map(
                                  (w) =>
                                    w.charAt(0).toUpperCase() +
                                    w.slice(1).toLowerCase(),
                                )
                                .join(" ")
                            : "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.designation || "-"}</TableCell>
                      <TableCell>{employee.idnumber || "-"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(employee.id);
                            }}
                            title="View"
                          >
                            <EyeIcon />
                          </Button>
                          {canUpdate && canUpdate("employees") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(employee);
                              }}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && canDelete("employees") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(employee.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      {hasActiveFilters
                        ? "No employees match your search or filters."
                        : 'No employees found. Click "Add Employee" to create one.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && totalItems > 0 && onPageChange && (
          <div className="mt-3 flex flex-col items-center justify-between gap-2 px-2 pb-2 md:flex-row">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * pageSize + 1, totalItems)}-
              {Math.min(page * pageSize, totalItems)} of {totalItems}
            </div>
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              wrapperClassName="d-flex justify-content-center mt-4"
              align="center"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeTable;
