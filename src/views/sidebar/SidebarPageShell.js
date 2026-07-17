import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui";

const SidebarPageShell = ({ title, description, children }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      {description && (
        <p className="mb-3 text-sm text-muted-foreground">{description}</p>
      )}
      {children || (
        <p className="text-sm text-muted-foreground">
          This page is reserved for this sidebar module. Existing CRM workflows
          are unchanged; connect features here when ready.
        </p>
      )}
    </CardContent>
  </Card>
);

export default SidebarPageShell;
