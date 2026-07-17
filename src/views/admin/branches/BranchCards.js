import React, { useMemo } from "react";
import { Plus } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "../../../components/ui";
import { RowActions, Loader } from "../../../components";

const BranchCards = ({
  branches,
  companies,
  loading,
  error,
  onClearError,
  onAdd,
  onView,
  onEdit,
  onDelete,
  canCreate,
  canUpdate,
  canDelete,
}) => {
  const companyById = useMemo(() => {
    const map = new Map();
    companies.forEach((company) => {
      map.set(String(company.id), company);
    });
    return map;
  }, [companies]);

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={onClearError}
            className="text-sm font-medium underline underline-offset-2"
          >
            Dismiss
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return <Loader message="Loading branches..." />;
  }

  if (branches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">No branches found.</p>
          {canCreate ? (
            <Button onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Add Branch
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {branches.map((branch) => {
        const company = companyById.get(String(branch.companyId));
        return (
          <Card key={branch.id} className="flex h-full flex-col">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <strong>{branch.name}</strong>
              <Badge variant="success">Active</Badge>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <div>
                <small className="text-muted-foreground">Company:</small>
                <p className="mb-0">{company?.name || "N/A"}</p>
              </div>
              <div>
                <small className="text-muted-foreground">Email:</small>
                <p className="mb-0">{branch.email}</p>
              </div>
              <div>
                <small className="text-muted-foreground">Branch Code:</small>
                <p className="mb-0">{branch.branchcode || "-"}</p>
              </div>
              <div>
                <small className="text-muted-foreground">Phone:</small>
                <p className="mb-0">{branch.phone || "-"}</p>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <RowActions
                onView={() => onView(branch.id)}
                onEdit={canUpdate ? () => onEdit(branch) : undefined}
                onDelete={canDelete ? () => onDelete(branch.id) : undefined}
              />
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export default BranchCards;
