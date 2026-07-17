import React from "react";
import { Button, Card, CardContent, Spinner } from "../../../components/ui";

const EmployeeFormActions = ({ submitting, isEdit, onCancel }) => (
  <Card className="mb-4">
    <CardContent className="flex justify-end gap-2 p-6">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={submitting}>
        {submitting ? (
          <Spinner size="sm" />
        ) : isEdit ? (
          "Update Employee"
        ) : (
          "Create Employee"
        )}
      </Button>
    </CardContent>
  </Card>
);

export default EmployeeFormActions;
