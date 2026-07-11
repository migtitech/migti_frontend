import React, { useState, useRef, useEffect, useMemo } from "react";
import { CFormInput } from "@coreui/react";
import "./SearchableDropdown.scss";

const DEFAULT_MAX_DISPLAY = 10;

const getRelevanceScore = (label, query) => {
  const normalizedLabel = label.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalizedLabel === normalizedQuery) return 100;
  if (normalizedLabel.startsWith(normalizedQuery)) return 80;
  if (
    normalizedLabel
      .split(/\s+/)
      .some((word) => word.startsWith(normalizedQuery))
  ) {
    return 60;
  }
  if (normalizedLabel.includes(normalizedQuery)) return 40;
  return 0;
};

const rankOptions = (options, query, getOptionLabel) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  return options
    .map((option) => {
      const label = getOptionLabel(option);
      const score = getRelevanceScore(label, trimmedQuery);
      if (!score) return null;
      return { option, score, label };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.score - left.score || left.label.localeCompare(right.label),
    )
    .map((entry) => entry.option);
};

const SearchableDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  maxDisplayCount = DEFAULT_MAX_DISPLAY,
  getOptionLabel = (opt) =>
    opt?.name != null ? opt.name : (opt?.label ?? String(opt?.value ?? "")),
  getOptionValue = (opt) => opt?._id ?? opt?.id ?? opt?.value,
  disabled = false,
  label,
  invalid = false,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const previousValueRef = useRef(value);

  const normalizedOptions = Array.isArray(options) ? options : [];

  const selectedOption = normalizedOptions.find(
    (option) =>
      getOptionValue(option) === value || getOptionValue(option) === value?._id,
  );

  const suggestions = useMemo(() => {
    const ranked = rankOptions(normalizedOptions, inputValue, getOptionLabel);
    return ranked.slice(0, maxDisplayCount);
  }, [normalizedOptions, inputValue, getOptionLabel, maxDisplayCount]);

  useEffect(() => {
    if (previousValueRef.current === value) return;

    previousValueRef.current = value;

    if (selectedOption) {
      setInputValue(getOptionLabel(selectedOption));
      return;
    }

    if (!value) {
      setInputValue("");
    }
  }, [selectedOption, value, getOptionLabel]);

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    setShowSuggestions(Boolean(nextValue.trim()));

    if (!nextValue.trim()) {
      onChange("");
    }
  };

  const handleSelect = (option) => {
    const optionValue = getOptionValue(option);
    const optionLabel = getOptionLabel(option);
    setInputValue(optionLabel);
    setShowSuggestions(false);
    onChange(optionValue);
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      setShowSuggestions(false);

      if (selectedOption) {
        setInputValue(getOptionLabel(selectedOption));
        return;
      }

      setInputValue("");
      onChange("");
    }, 150);
  };

  const handleFocus = () => {
    if (inputValue.trim()) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="searchable-dropdown">
      {label && (
        <label className="form-label small text-body-secondary mb-1">
          {label}
        </label>
      )}
      <CFormInput
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        invalid={invalid}
        autoComplete="off"
      />
      {showSuggestions && inputValue.trim() && (
        <ul
          className="list-group border rounded shadow-sm searchable-dropdown__suggestions"
          role="listbox"
        >
          {suggestions.length === 0 ? (
            <li className="list-group-item text-muted small py-2">
              No matches
            </li>
          ) : (
            suggestions.map((option) => {
              const optionValue = getOptionValue(option);
              const optionLabel = getOptionLabel(option);
              const isSelected =
                optionValue === value || optionValue === value?._id;

              return (
                <li key={optionValue}>
                  <button
                    type="button"
                    className={`list-group-item list-group-item-action text-start py-2 ${
                      isSelected ? "active" : ""
                    }`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option)}
                  >
                    {optionLabel}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableDropdown;
