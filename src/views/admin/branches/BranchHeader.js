import React from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../components/ui";

const BranchHeader = ({ onAdd, canCreate }) => (
  <div className="mb-6 flex items-center justify-between gap-4">
    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
      All Branches
    </h1>
    {canCreate ? (
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add Branch
      </Button>
    ) : null}
  </div>
);

export default BranchHeader;
