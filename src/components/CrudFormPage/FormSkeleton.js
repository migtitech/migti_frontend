import React from "react";
import { Skeleton } from "../ui";

const FieldSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-9 w-full" />
  </div>
);

const FormSkeleton = () => (
  <div className="space-y-8" aria-busy="true" aria-label="Loading form">
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldSkeleton />
        <FieldSkeleton />
      </div>
    </div>
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldSkeleton />
      </div>
    </div>
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  </div>
);

export default FormSkeleton;
