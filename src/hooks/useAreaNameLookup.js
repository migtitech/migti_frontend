import { useEffect, useMemo, useState } from "react";
import areaService from "../services/areaService";
import {
  buildAreaNameLookup,
  formatAreaDisplay,
  formatAreaDisplayOrDash,
  formatAreaLocation,
} from "../utils/areaDisplay";

const fetchAllAreas = async () => {
  const allAreas = [];
  let pageNumber = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await areaService.getAll({ pageNumber, pageSize: 100 });
    const payload = res?.data?.data ?? res?.data ?? res;
    const pageAreas = payload?.areas || [];
    const total = payload?.total ?? pageAreas.length;

    allAreas.push(...pageAreas);
    hasMore = allAreas.length < total && pageAreas.length > 0;
    pageNumber += 1;
  }

  return allAreas;
};

export const useAreaNameLookup = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const allAreas = await fetchAllAreas();
        if (!cancelled) setAreas(allAreas);
      } catch {
        if (!cancelled) setAreas([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const lookup = useMemo(() => buildAreaNameLookup(areas), [areas]);

  const formatArea = (area, fallback = "") =>
    formatAreaDisplay(area, lookup) || fallback;

  const formatAreaOrDash = (area, fallback = "—") =>
    formatAreaDisplayOrDash(area, lookup, fallback);

  const formatAreaWithLocation = (area, location, separator = ", ") =>
    formatAreaLocation(area, location, lookup, separator);

  return {
    areas,
    lookup,
    loading,
    formatArea,
    formatAreaOrDash,
    formatAreaWithLocation,
  };
};

export default useAreaNameLookup;
