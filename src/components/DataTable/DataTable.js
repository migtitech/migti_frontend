import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Search,
  Download,
  Columns3,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  FilterX,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Select,
  Button,
  Checkbox,
  Skeleton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "../ui";
import EmptyState from "../EmptyState/EmptyState";
import { cn } from "../../lib/utils";

/** Sorted, de-duplicated option values pulled from the rows for a select filter. */
const deriveOptions = (rows, accessor) => {
  const set = new Set();
  for (const r of rows || []) {
    const v = accessor(r);
    if (v != null && String(v).trim() !== "") set.add(String(v));
  }
  return [...set]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));
};

/** True when a single row satisfies one filter field given its current value. */
const rowMatchesField = (field, value, row) => {
  const raw = field.accessor ? field.accessor(row) : row[field.key];
  if (field.type === "select") {
    if (!value) return true;
    return String(raw ?? "") === String(value);
  }
  if (field.type === "amountRange") {
    const { min = "", max = "" } = value || {};
    const v = Number(raw) || 0;
    if (min !== "" && v < Number(min)) return false;
    if (max !== "" && v > Number(max)) return false;
    return true;
  }
  if (field.type === "dateRange") {
    const { from = "", to = "" } = value || {};
    if (!from && !to) return true;
    if (!raw) return false;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) return false;
    if (from && t < new Date(from).getTime()) return false;
    // Include the whole "to" day (23:59:59.999).
    if (to && t > new Date(to).getTime() + (86400000 - 1)) return false;
    return true;
  }
  return true;
};

/** Whether a filter field currently holds an active (non-empty) value. */
const isFieldActive = (field, value) => {
  if (value == null) return false;
  if (field.type === "select") return value !== "";
  if (field.type === "amountRange")
    return (value.min ?? "") !== "" || (value.max ?? "") !== "";
  if (field.type === "dateRange")
    return (value.from ?? "") !== "" || (value.to ?? "") !== "";
  return false;
};

/**
 * Enterprise-grade data table: search, sort, column visibility, sticky
 * header, row selection with bulk actions, and Export to Excel.
 *
 * columns: [{
 *   key, label, align, sortable, toggleable, exportable, width,
 *   render(row, index), sortValue(row), exportValue(row), stopRowClick,
 * }]
 */
const DataTable = ({
  columns,
  rows,
  rowKey = (row) => row._id || row.id,
  loading = false,
  emptyTitle = "No records found",
  emptyMessage,
  onRowClick,
  showSearch = true,
  searchPlaceholder = "Search...",
  filterFields,
  exportFileName = "export",
  stickyHeader = true,
  maxHeight = "65vh",
  selectable = false,
  selectedKeys,
  onSelectionChange,
  bulkActions,
  rowClassName,
  rowStyle,
  className = "",
}) => {
  const [internalSearch, setInternalSearch] = useState("");
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const [hiddenKeys, setHiddenKeys] = useState(() => new Set());
  const [filterValues, setFilterValues] = useState({});

  const visibleColumns = useMemo(
    () => columns.filter((col) => !hiddenKeys.has(col.key)),
    [columns, hiddenKeys],
  );

  // Resolve filter fields, auto-deriving select options from the data when the
  // caller didn't supply an explicit list.
  const resolvedFilters = useMemo(
    () =>
      (filterFields || []).map((f) =>
        f.type === "select" && !f.options
          ? { ...f, options: deriveOptions(rows, f.accessor) }
          : f,
      ),
    [filterFields, rows],
  );

  const setFilter = (key, value) =>
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilterValues({});
  const hasActiveFilters = resolvedFilters.some((f) =>
    isFieldActive(f, filterValues[f.key]),
  );

  const filteredRows = useMemo(() => {
    let list = rows;
    // Structured field filters (status / entity / amount / date).
    if (resolvedFilters.length) {
      list = list.filter((row) =>
        resolvedFilters.every((f) =>
          rowMatchesField(f, filterValues[f.key], row),
        ),
      );
    }
    // Free-text search.
    if (showSearch && internalSearch.trim()) {
      const term = internalSearch.trim().toLowerCase();
      list = list.filter((row) =>
        columns.some((col) => {
          if (col.exportable === false && !col.sortValue) return false;
          const raw = col.sortValue ? col.sortValue(row) : row[col.key];
          return String(raw ?? "")
            .toLowerCase()
            .includes(term);
        }),
      );
    }
    return list;
  }, [
    rows,
    columns,
    internalSearch,
    showSearch,
    resolvedFilters,
    filterValues,
  ]);

  const sortedRows = useMemo(() => {
    if (!sort.key) return filteredRows;
    const column = columns.find((col) => col.key === sort.key);
    if (!column) return filteredRows;
    const accessor = column.sortValue || ((row) => row[column.key]);
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return -1 * dir;
      if (bv == null) return 1 * dir;
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filteredRows, sort, columns]);

  const toggleSort = (column) => {
    if (!column.sortable) return;
    setSort((prev) => {
      if (prev.key !== column.key) return { key: column.key, direction: "asc" };
      if (prev.direction === "asc")
        return { key: column.key, direction: "desc" };
      return { key: null, direction: "asc" };
    });
  };

  const toggleColumn = (key) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected =
    selectable &&
    sortedRows.length > 0 &&
    sortedRows.every((row) => selectedKeys?.has(rowKey(row)));

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(
      allSelected ? new Set() : new Set(sortedRows.map(rowKey)),
    );
  };

  const toggleSelectRow = (key) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const exportColumns = columns.filter((col) => col.exportable !== false);
    const data = sortedRows.map((row) => {
      const record = {};
      exportColumns.forEach((col) => {
        const value = col.exportValue
          ? col.exportValue(row)
          : col.render
            ? undefined
            : row[col.key];
        record[col.label] = value ?? "";
      });
      return record;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${exportFileName}.xlsx`);
  };

  const selectionCount = selectedKeys?.size || 0;
  const skeletonColSpan = visibleColumns.length + (selectable ? 1 : 0);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {showSearch && (
            <div className="relative w-64 max-w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {selectable && selectionCount > 0 && (
            <div className="flex items-center gap-3 rounded-md bg-accent px-3 py-1.5">
              <span className="text-sm font-medium text-accent-foreground">
                {selectionCount} selected
              </span>
              {bulkActions}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {columns
                .filter((col) => col.toggleable !== false)
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={!hiddenKeys.has(col.key)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => toggleColumn(col.key)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      {resolvedFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 p-3">
          {resolvedFilters.map((field) => {
            const value = filterValues[field.key];
            if (field.type === "select") {
              return (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {field.label}
                  </label>
                  <Select
                    value={value || ""}
                    onChange={(e) => setFilter(field.key, e.target.value)}
                    className="h-9 w-48 max-w-full"
                  >
                    <option value="">
                      {field.allLabel || `All ${field.label}`}
                    </option>
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            }
            if (field.type === "amountRange") {
              const { min = "", max = "" } = value || {};
              return (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {field.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="Min"
                      value={min}
                      onChange={(e) =>
                        setFilter(field.key, { min: e.target.value, max })
                      }
                      className="h-9 w-28"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="Max"
                      value={max}
                      onChange={(e) =>
                        setFilter(field.key, { min, max: e.target.value })
                      }
                      className="h-9 w-28"
                    />
                  </div>
                </div>
              );
            }
            if (field.type === "dateRange") {
              const { from = "", to = "" } = value || {};
              return (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {field.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={from}
                      onChange={(e) =>
                        setFilter(field.key, { from: e.target.value, to })
                      }
                      className="h-9 w-40"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="date"
                      value={to}
                      onChange={(e) =>
                        setFilter(field.key, { from, to: e.target.value })
                      }
                      className="h-9 w-40"
                    />
                  </div>
                </div>
              );
            }
            return null;
          })}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9"
            >
              <FilterX className="h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <div
          className={stickyHeader ? "overflow-auto" : undefined}
          style={stickyHeader ? { maxHeight } : undefined}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {selectable && (
                  <TableHead
                    className={cn(
                      "w-10",
                      stickyHeader && "sticky top-0 z-10 bg-muted",
                    )}
                  >
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    style={{ width: col.width, textAlign: col.align || "left" }}
                    className={cn(
                      stickyHeader && "sticky top-0 z-10 bg-muted",
                      col.sortable && "cursor-pointer select-none",
                    )}
                    onClick={() => toggleSort(col)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable &&
                        (sort.key === col.key ? (
                          sort.direction === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-primary!" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-primary!" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                        ))}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell colSpan={skeletonColSpan}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : sortedRows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={skeletonColSpan} className="p-0">
                    <EmptyState title={emptyTitle} message={emptyMessage} />
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row, index) => {
                  const key = rowKey(row);
                  return (
                    <TableRow
                      key={key}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(
                        onRowClick && "cursor-pointer",
                        rowClassName && rowClassName(row, index),
                      )}
                      style={rowStyle ? rowStyle(row, index) : undefined}
                    >
                      {selectable && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedKeys?.has(key) || false}
                            onCheckedChange={() => toggleSelectRow(key)}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          style={{ textAlign: col.align || "left" }}
                          onClick={
                            col.stopRowClick
                              ? (e) => e.stopPropagation()
                              : undefined
                          }
                        >
                          {col.render ? col.render(row, index) : row[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.node.isRequired,
      align: PropTypes.oneOf(["left", "right", "center"]),
      sortable: PropTypes.bool,
      toggleable: PropTypes.bool,
      exportable: PropTypes.bool,
      width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      render: PropTypes.func,
      sortValue: PropTypes.func,
      exportValue: PropTypes.func,
      stopRowClick: PropTypes.bool,
    }),
  ).isRequired,
  rows: PropTypes.array.isRequired,
  rowKey: PropTypes.func,
  loading: PropTypes.bool,
  emptyTitle: PropTypes.string,
  emptyMessage: PropTypes.string,
  onRowClick: PropTypes.func,
  showSearch: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  filterFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.oneOf(["select", "amountRange", "dateRange"]).isRequired,
      accessor: PropTypes.func,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          label: PropTypes.string,
        }),
      ),
      allLabel: PropTypes.string,
    }),
  ),
  exportFileName: PropTypes.string,
  stickyHeader: PropTypes.bool,
  maxHeight: PropTypes.string,
  selectable: PropTypes.bool,
  selectedKeys: PropTypes.instanceOf(Set),
  onSelectionChange: PropTypes.func,
  bulkActions: PropTypes.node,
  rowClassName: PropTypes.func,
  rowStyle: PropTypes.func,
  className: PropTypes.string,
};

export default DataTable;
