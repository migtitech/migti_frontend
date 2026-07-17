import React from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../components/ui";

const EmployeeHeader = ({ onAdd, canCreate }) => (
  <div className="mb-4 flex items-center justify-between">
    <h4 className="text-xl font-semibold text-foreground">Employees</h4>
    {canCreate("employees") && (
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Add Employee
      </Button>
    )}
  </div>
);

export default EmployeeHeader;
