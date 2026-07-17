import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input, Label } from "../ui";
import { cn } from "../../lib/utils";

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
    <div className="relative">
      {label && <Label className="mb-1.5 block">{label}</Label>}
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        autoComplete="off"
      />
      {showSuggestions && inputValue.trim() && (
        <ul
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
          role="listbox"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
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
                    className={cn(
                      "block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                      isSelected &&
                        "bg-accent font-medium text-accent-foreground",
                    )}
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
