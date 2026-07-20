import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Plus, Check, X } from "lucide-react";
import { Button, Input, Select } from "../ui";
import { cn } from "../../lib/utils";

const BASE_RATES = [0, 5, 18];
const STORAGE_KEY = "migticrm_custom_gst_rates";
const SYNC_EVENT = "migticrm-gst-rates-changed";

const readCustomRates = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(Number)
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 100);
  } catch {
    return [];
  }
};

const formatRate = (n) =>
  `${Number.isInteger(n) ? n : String(n).replace(/0+$/, "")}%`;

/**
 * GST percentage dropdown used everywhere a GST % is entered.
 * Ships with 0 / 5 / 18; the "+" button lets the user add any extra
 * rate, which is persisted in localStorage so it appears in every GST
 * dropdown across the app. If the current field value is a rate that is
 * not in the list (old data), it is shown as an option too, so nothing
 * ever displays blank.
 *
 * Same value/onChange (event with target.value) contract as a native
 * select, so it drops into plain handlers and react-hook-form `register`
 * spreads alike.
 */
const GstRateSelect = React.forwardRef(
  (
    {
      className,
      selectClassName,
      allowEmpty = true,
      placeholder = "Select GST %",
      value,
      onChange,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [customRates, setCustomRates] = useState(readCustomRates);
    const [adding, setAdding] = useState(false);
    const [newRate, setNewRate] = useState("");
    const containerRef = useRef(null);

    // Keep every GstRateSelect instance in sync when a rate is added
    // anywhere (same tab via custom event, other tabs via storage event).
    useEffect(() => {
      const sync = () => setCustomRates(readCustomRates());
      window.addEventListener(SYNC_EVENT, sync);
      window.addEventListener("storage", sync);
      return () => {
        window.removeEventListener(SYNC_EVENT, sync);
        window.removeEventListener("storage", sync);
      };
    }, []);

    useEffect(() => {
      if (!adding) return undefined;
      const onOutside = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setAdding(false);
          setNewRate("");
        }
      };
      document.addEventListener("mousedown", onOutside);
      return () => document.removeEventListener("mousedown", onOutside);
    }, [adding]);

    const options = useMemo(() => {
      const set = new Set([...BASE_RATES, ...customRates]);
      const current =
        value === "" || value == null || Number.isNaN(Number(value))
          ? null
          : Number(value);
      if (current != null) set.add(current);
      return [...set].sort((a, b) => a - b);
    }, [customRates, value]);

    const emitChange = (nextValue) => {
      onChange?.({
        target: { name: props.name, value: String(nextValue) },
        type: "change",
      });
    };

    const handleAddRate = () => {
      const n = Number(newRate);
      if (!Number.isFinite(n) || n < 0 || n > 100) return;
      const next = [...new Set([...customRates, n])].sort((a, b) => a - b);
      setCustomRates(next);
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(next.filter((r) => !BASE_RATES.includes(r))),
        );
      } catch {
        /* storage unavailable — rate still works for this session */
      }
      window.dispatchEvent(new Event(SYNC_EVENT));
      setAdding(false);
      setNewRate("");
      emitChange(n);
    };

    return (
      <div ref={containerRef} className={cn("relative flex gap-1", className)}>
        <Select
          ref={ref}
          {...(value !== undefined ? { value: value ?? "" } : {})}
          onChange={onChange}
          disabled={disabled}
          className={selectClassName}
          {...props}
        >
          {allowEmpty && <option value="">{placeholder}</option>}
          {options.map((rate) => (
            <option key={rate} value={String(rate)}>
              {formatRate(rate)}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={disabled}
          onClick={() => {
            setAdding((v) => !v);
            setNewRate("");
          }}
          aria-label="Add GST rate"
          title="Add GST rate"
        >
          <Plus className="h-4 w-4" />
        </Button>
        {adding && (
          <div className="absolute right-0 top-full z-[1060] mt-1 flex items-center gap-1 rounded-md border border-border bg-popover p-2 shadow-md">
            <Input
              type="number"
              min="0"
              max="100"
              step="any"
              autoFocus
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRate();
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewRate("");
                }
              }}
              placeholder="GST %"
              className="h-8 w-24"
            />
            <Button
              type="button"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleAddRate}
              aria-label="Save GST rate"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                setAdding(false);
                setNewRate("");
              }}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  },
);

GstRateSelect.displayName = "GstRateSelect";

GstRateSelect.propTypes = {
  className: PropTypes.string,
  selectClassName: PropTypes.string,
  allowEmpty: PropTypes.bool,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
};

export default GstRateSelect;
