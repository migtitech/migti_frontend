import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { UploadCloud } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Enterprise file-upload control: a bordered drop area with a clear call to
 * action, replacing the browser-default "Choose file / No file chosen"
 * chrome. It wraps a hidden native <input type="file"> and forwards the real
 * DOM change event to `onChange`, so callers that read
 * `e.target.files[0]` and reset `e.target.value` keep working unchanged.
 *
 * Drag-and-drop writes the dropped file(s) onto the hidden input via a
 * DataTransfer and dispatches a native `change` event, so the same handler
 * fires for both click-to-browse and drag-drop.
 */
const FileUpload = ({
  onChange,
  accept,
  multiple = false,
  disabled = false,
  hint,
  className,
}) => {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const input = inputRef.current;
    if (!input) return;
    // Write dropped files onto the hidden input and fire a native change so
    // the caller's onChange(e) receives an event shaped exactly like a click
    // upload (e.target.files / e.target.value both present).
    try {
      const dataTransfer = new DataTransfer();
      Array.from(files).forEach((file) => dataTransfer.items.add(file));
      input.files = dataTransfer.files;
      const changeEvent = new Event("change", { bubbles: true });
      input.dispatchEvent(changeEvent);
    } catch {
      // Some browsers disallow assigning input.files — fall back to opening
      // the picker so the flow still completes.
      openPicker();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          disabled
            ? "cursor-not-allowed border-border bg-muted/40 opacity-60"
            : "cursor-pointer border-border bg-muted/20 hover:border-primary/60 hover:bg-primary/5",
          dragActive && "border-primary bg-primary/10",
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <UploadCloud className="h-5 w-5 text-primary!" />
        </span>
        <div className="text-sm text-foreground">
          <span className="font-medium text-primary!">Click to upload</span>
          <span className="text-muted-foreground"> or drag and drop</span>
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={onChange}
          className="sr-only"
        />
      </div>
    </div>
  );
};

FileUpload.propTypes = {
  onChange: PropTypes.func.isRequired,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  disabled: PropTypes.bool,
  hint: PropTypes.string,
  className: PropTypes.string,
};

export default FileUpload;
