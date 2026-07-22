import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, Checkbox, Label, Select } from "../../../components/ui";

const normalizeId = (g) => g?.id || g?._id || "";

const emitIds = (rows) => [
  ...new Set(rows.map((r) => String(r || "").trim()).filter(Boolean)),
];

/**
 * Checkbox enables group assignment; when enabled, one or more single-select
 * rows with "Add more"; emits unique group ids to parent.
 */
const EmployeeGroupMappingSection = ({
  groups = [],
  value = [],
  onChange,
  mapEnabled = false,
  onMapEnabledChange,
  // F-EMP / D27: when required (procurement/purchase roles) the picker is always
  // shown and the optional on/off toggle is hidden.
  required = false,
  errors = {},
}) => {
  const [rowIds, setRowIds] = useState(() => {
    const v = (value || []).map(String).filter(Boolean);
    return v.length ? [...v, ""] : [""];
  });

  const syncRowsFromValue = (ids) => {
    const list = (ids || []).map(String).filter(Boolean);
    if (!list.length) {
      setRowIds([""]);
      return;
    }
    setRowIds([...list, ""]);
  };

  const setRowsAndNotify = (nextRows) => {
    setRowIds(nextRows);
    onChange(emitIds(nextRows));
  };

  const onToggleMap = (checked) => {
    onMapEnabledChange(!!checked);
    if (!checked) {
      setRowIds([""]);
      onChange([]);
      return;
    }
    if ((value || []).length) {
      syncRowsFromValue(value);
    } else {
      setRowIds([""]);
    }
  };

  const onSelectAt = (index, selected) => {
    const next = [...rowIds];
    if (index < 0 || index >= next.length) {
      return;
    }
    const taken = new Set(
      next
        .map((id, i) => (i === index ? null : id))
        .filter(Boolean)
        .map(String),
    );
    if (selected && taken.has(selected)) {
      return;
    }
    next[index] = selected;
    if (index === next.length - 1 && selected) {
      next.push("");
    }
    setRowsAndNotify(next);
  };

  const onRemove = (index) => {
    if (rowIds.length <= 1) {
      setRowsAndNotify([""]);
      return;
    }
    const next = rowIds.filter((_, i) => i !== index);
    if (next.length && !next.includes("")) {
      next.push("");
    }
    if (next.length === 0) {
      next.push("");
    }
    setRowsAndNotify(next);
  };

  const onAddRow = () => {
    setRowsAndNotify([...rowIds, ""]);
  };

  const allGroupIds = groups.map((g) => String(normalizeId(g))).filter(Boolean);

  const selectedIds = emitIds(rowIds);
  const allSelected =
    allGroupIds.length > 0 &&
    allGroupIds.every((id) => selectedIds.includes(id));

  const onSelectAll = (checked) => {
    if (checked) {
      setRowsAndNotify(allGroupIds.length ? [...allGroupIds] : [""]);
      return;
    }
    setRowsAndNotify([""]);
  };

  const optionsForIndex = (index) => {
    const current = rowIds[index] || "";
    const used = new Set(
      rowIds
        .map((id, i) => (i === index ? null : id))
        .filter(Boolean)
        .map(String),
    );
    return groups.filter((g) => {
      const id = String(normalizeId(g));
      return id && (!used.has(id) || id === current);
    });
  };

  const showPicker = required || mapEnabled;

  return (
    <div>
      {!required && (
        <div className="mb-2 flex items-center gap-2">
          <Checkbox
            id="mapProductGroups"
            checked={mapEnabled}
            onCheckedChange={(checked) => onToggleMap(checked)}
          />
          <Label htmlFor="mapProductGroups" className="font-normal">
            Map employee to product groups (optional)
          </Label>
        </div>
      )}
      {showPicker && (
        <div>
          <Label className="mb-2 block">Assigned groups</Label>
          {groups.length > 0 ? (
            <div className="mb-2 flex items-center gap-2">
              <Checkbox
                id="selectAllGroups"
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(checked)}
              />
              <Label htmlFor="selectAllGroups" className="font-normal">
                Select all groups
              </Label>
            </div>
          ) : null}
          {rowIds.map((rowVal, index) => (
            <div
              className="mb-2 flex items-center gap-2"
              key={`group-row-${index}`}
            >
              <Select
                aria-label={`Group ${index + 1}`}
                value={rowVal || ""}
                onChange={(e) => onSelectAt(index, e.target.value)}
              >
                <option value="">
                  {index === rowIds.length - 1 && !rowVal
                    ? "Select group"
                    : "— None —"}
                </option>
                {optionsForIndex(index).map((g) => {
                  const id = String(normalizeId(g));
                  const name = g.name || id;
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Remove this row"
                disabled={rowIds.length === 1 && !rowVal}
                onClick={() => onRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={onAddRow}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add more
          </Button>
          {errors.assigned_groups?.message ? (
            <p className="mt-1 text-sm text-destructive">
              {errors.assigned_groups.message}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default EmployeeGroupMappingSection;
