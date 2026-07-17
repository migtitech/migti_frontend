import React, { forwardRef } from "react";
import { Select } from "../ui";
import {
  PRODUCT_UNIT_OPTIONS,
  isStandardProductUnit,
} from "../../constants/productUnits";

/**
 * Controlled select for line-item / product `unit` string field.
 * Non-standard legacy values still appear as an extra option until the user picks a standard code.
 */
const ProductUnitSelect = forwardRef(function ProductUnitSelect(
  {
    value,
    onChange,
    disabled = false,
    required = false,
    className,
    id,
    name,
    ...rest
  },
  ref,
) {
  const v = value == null ? "" : String(value).trim();
  const showLegacy = v !== "" && !isStandardProductUnit(v);

  return (
    <Select
      ref={ref}
      {...rest}
      id={id}
      name={name}
      className={className}
      value={v}
      disabled={disabled}
      required={required}
      onChange={onChange}
    >
      {required ? (
        <option value="" disabled>
          Select unit
        </option>
      ) : (
        <option value="">—</option>
      )}
      {showLegacy && <option value={v}>{v} (other)</option>}
      {PRODUCT_UNIT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
});

export default ProductUnitSelect;
