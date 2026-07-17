import React from "react";
import { Folder } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui";
import { PageHeader } from "../../components";
import { useAuth } from "../../context/AuthContext";

const DmgBucket = () => {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title="DMG Bucket"
        description={`Welcome, ${user?.name}. Manage DMG-related items here.`}
      />

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Folder className="h-4 w-4" />
          <CardTitle>DMG Bucket</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This bucket is for DMG (Direct Material Group / related) items.
            Content can be added as per your process.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DmgBucket;
