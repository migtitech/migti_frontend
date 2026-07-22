import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Search, Star, X, Trash2, Building2, Lock } from "lucide-react";
import { Input, Label, Badge } from "../../../components/ui";
import { cn } from "../../../lib/utils";
import { statusVariant } from "./statusFormatters";
import { suppliers as allSuppliers } from "../../../data/purchaseMasterDummyData";

/**
 * Reusable type-to-search supplier autocomplete with a rich suggestion
 * dropdown, shown inline. Matches on name / category / city; picking a
 * suggestion fills the field and surfaces a supplier card. Shared by the
 * Create-PO and Create-Return flows.
 *
 * When `locked` is true the field is read-only (the supplier is derived from a
 * chosen PO/GRN and must not be changed) — it renders only the supplier card
 * with a "locked / auto-selected" hint, so the return is always tracked back to
 * the real source.
 */
const SupplierAutocomplete = ({
  value,
  onSelect,
  invalid,
  label = "Search & select supplier",
  locked = false,
  lockedHint = "Auto-selected from the chosen source — can't be changed.",
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);

  const selected = allSuppliers.find((s) => s.id === value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allSuppliers;
    return allSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (s) => {
    onSelect(s.id);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(matches.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[highlight]) choose(matches[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Locked mode: just the supplier card + hint, no search box.
  if (locked) {
    return (
      <div className="space-y-1.5">
        <Label>Supplier</Label>
        {selected ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {selected.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selected.category} · {selected.city} · {selected.id}
                </p>
              </div>
              <Badge variant="secondary">
                <Lock className="mr-1 h-3 w-3" />
                Auto-selected
              </Badge>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Supplier will be filled once you choose a source above.
          </p>
        )}
        <p className="text-xs text-muted-foreground">{lockedHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative" ref={boxRef}>
        <Label htmlFor="supplier-search">{label}</Label>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="supplier-search"
            autoComplete="off"
            className="pl-9"
            placeholder="Type a supplier name, category or city…"
            value={query}
            aria-invalid={invalid || undefined}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
          />
          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {open && (
          <ul className="absolute z-[1100] mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-card py-1 shadow-lg">
            {matches.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No supplier matches “{query}”.
              </li>
            ) : (
              matches.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(s)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                      i === highlight ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {s.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.category} · {s.city}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-warning text-warning!" />
                        {s.rating}
                      </span>
                      <Badge variant={statusVariant(s.status)}>
                        {s.status}
                      </Badge>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {selected ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                {selected.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selected.category} · {selected.city}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(selected.status)}>
                {selected.status}
              </Badge>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:text-destructive"
                onClick={() => onSelect("")}
                aria-label="Remove supplier"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Contact</dt>
              <dd className="text-foreground">{selected.contact}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="text-foreground">{selected.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Rating</dt>
              <dd className="text-foreground">{selected.rating} / 5</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Code</dt>
              <dd className="text-foreground">{selected.id}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No supplier selected yet — search above and pick one.
        </p>
      )}
    </div>
  );
};

SupplierAutocomplete.propTypes = {
  value: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  invalid: PropTypes.bool,
  label: PropTypes.string,
  locked: PropTypes.bool,
  lockedHint: PropTypes.string,
};

export default SupplierAutocomplete;
