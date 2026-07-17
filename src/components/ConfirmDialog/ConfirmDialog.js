import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "../ui";
import { cn } from "../../lib/utils";

/**
 * Reusable confirmation dialog (replaces window.confirm).
 * @param {boolean} visible - Whether the modal is open
 * @param {function} onClose - Called when modal is closed (backdrop or Cancel)
 * @param {function} onConfirm - Called when user clicks Confirm
 * @param {string} title - Modal title (e.g. "Delete Brand?")
 * @param {string} message - Body message (e.g. "This action cannot be undone.")
 * @param {string} [confirmText='Delete'] - Confirm button label
 * @param {string} [cancelText='Cancel'] - Cancel button label
 * @param {string} [confirmColor='danger'] - color for confirm button (danger, primary, etc.)
 * @param {string} [icon='trash'] - 'trash' | 'warning' for the header icon
 * @param {boolean} [closeOnConfirm=true] - If false, only onConfirm runs (parent closes the modal)
 */
const ConfirmDialog = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  confirmColor = "danger",
  icon = "trash",
  closeOnConfirm = true,
}) => {
  const handleConfirm = () => {
    onConfirm?.();
    if (closeOnConfirm) {
      onClose?.();
    }
  };

  const isDanger = confirmColor === "danger";
  const IconComponent = icon === "warning" ? AlertTriangle : Trash2;

  return (
    <Dialog open={!!visible} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-md" onEscapeKeyDown={onClose}>
        <DialogHeader className="flex-col items-center gap-3 border-b-0 pb-0 pt-6 text-center sm:items-center">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              isDanger
                ? "bg-destructive/10 text-destructive"
                : "bg-warning-muted text-warning!",
            )}
          >
            <IconComponent className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg">{title}</DialogTitle>
          {message && (
            <DialogDescription className="text-center">
              {message}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="justify-center border-t-0 pt-2 pb-6 sm:justify-center">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={isDanger ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
