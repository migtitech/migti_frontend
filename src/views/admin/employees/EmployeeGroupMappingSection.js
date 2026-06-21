import React, { useState } from "react";
import {
  CFormCheck,
  CFormFeedback,
  CFormLabel,
  CFormSelect,
  CButton,
  CInputGroup,
  CRow,
  CCol,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPlus, cilX } from "@coreui/icons";

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

  return (
    <CRow>
      <CCol xs={12} className="mb-2">
        <CFormCheck
          id="mapProductGroups"
          label="Map employee to product groups (optional)"
          checked={mapEnabled}
          onChange={(e) => onToggleMap(e.target.checked)}
        />
      </CCol>
      {mapEnabled && (
        <CCol xs={12}>
          <CFormLabel className="d-block">Assigned groups</CFormLabel>
          {groups.length > 0 ? (
            <CFormCheck
              id="selectAllGroups"
              className="mb-2"
              label="Select all groups"
              checked={allSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
            />
          ) : null}
          {rowIds.map((rowVal, index) => (
            <CInputGroup className="mb-2" key={`group-row-${index}`}>
              <CFormSelect
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
              </CFormSelect>
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                title="Remove this row"
                disabled={rowIds.length === 1 && !rowVal}
                onClick={() => onRemove(index)}
              >
                <CIcon icon={cilX} />
              </CButton>
            </CInputGroup>
          ))}
          <CButton
            type="button"
            color="primary"
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={onAddRow}
          >
            <CIcon icon={cilPlus} className="me-1" />
            Add more
          </CButton>
          {errors.assigned_groups?.message ? (
            <CFormFeedback className="d-block" invalid>
              {errors.assigned_groups.message}
            </CFormFeedback>
          ) : null}
        </CCol>
      )}
    </CRow>
  );
};

export default EmployeeGroupMappingSection;
