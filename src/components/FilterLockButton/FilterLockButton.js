import React from "react";
import { Lock, Unlock } from "lucide-react";
import { Button } from "../ui";
import { cn } from "../../lib/utils";

const FilterLockButton = ({
  filtersLocked,
  onToggle,
  pageLabel = "this page",
  className = "",
}) => (
  <Button
    type="button"
    variant="outline"
    size="icon"
    className={cn(
      filtersLocked && "border-warning/40 bg-warning-muted text-warning!",
      className,
    )}
    title={
      filtersLocked
        ? `Unlock filters (values will not persist when you leave ${pageLabel})`
        : `Lock filters (values stay when you return to ${pageLabel})`
    }
    onClick={onToggle}
  >
    {filtersLocked ? (
      <Lock className="h-4 w-4" />
    ) : (
      <Unlock className="h-4 w-4" />
    )}
  </Button>
);

export default FilterLockButton;
