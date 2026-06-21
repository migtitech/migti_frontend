import { useEffect, useState } from "react";
import {
  clearPersistedFilters,
  getInitialFilterLockState,
  persistLockedFilters,
} from "../utils/filterLock";

export function useFilterLock(pageKey, defaults, legacyKeys = {}) {
  const fieldKeys = Object.keys(defaults);
  const [init] = useState(() =>
    getInitialFilterLockState(pageKey, defaults, legacyKeys),
  );
  const [filtersLocked, setFiltersLocked] = useState(init.filtersLocked);

  const toggleFiltersLock = (currentValues) => {
    if (filtersLocked) {
      setFiltersLocked(false);
      clearPersistedFilters(pageKey, fieldKeys, legacyKeys);
      return;
    }
    setFiltersLocked(true);
    persistLockedFilters(pageKey, currentValues);
  };

  return {
    filtersLocked,
    toggleFiltersLock,
    initialValues: init.values,
  };
}

export function useFilterLockPersist(pageKey, filtersLocked, values) {
  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (!filtersLocked) return;
    persistLockedFilters(pageKey, JSON.parse(serialized));
  }, [pageKey, filtersLocked, serialized]);
}
