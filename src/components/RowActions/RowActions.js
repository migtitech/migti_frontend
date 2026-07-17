import React from "react";
import PropTypes from "prop-types";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button, Tooltip } from "../ui";
import { cn } from "../../lib/utils";

/**
 * Standard table row action buttons (view / edit / delete) plus optional
 * extra actions. Ghost icon buttons with tooltips — one consistent look
 * for every list page. Pass only the handlers you need; omit any to hide
 * that action. Permission gating is the caller's responsibility (only pass
 * onEdit/onDelete when the user is allowed).
 */
const RowActions = ({
  onView,
  onEdit,
  onDelete,
  viewLabel = "View",
  editLabel = "Edit",
  deleteLabel = "Delete",
  extra,
  className,
}) => (
  <div className={cn("flex items-center justify-end gap-0.5", className)}>
    {extra}
    {onView && (
      <Tooltip content={viewLabel}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={onView}
          aria-label={viewLabel}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </Tooltip>
    )}
    {onEdit && (
      <Tooltip content={editLabel}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={onEdit}
          aria-label={editLabel}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </Tooltip>
    )}
    {onDelete && (
      <Tooltip content={deleteLabel}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label={deleteLabel}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </Tooltip>
    )}
  </div>
);

RowActions.propTypes = {
  onView: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  viewLabel: PropTypes.string,
  editLabel: PropTypes.string,
  deleteLabel: PropTypes.string,
  extra: PropTypes.node,
  className: PropTypes.string,
};

export default RowActions;
