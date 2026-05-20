/**
 * Sort an array of objects alphabetically by a given key (default: "name").
 * Case-insensitive, locale-aware. Returns a new array (does not mutate).
 *
 * @param {Array}  arr  - Array of objects to sort
 * @param {string} key  - Object key to sort by (default: "name")
 * @returns {Array}
 */
export const sortAlphabetically = (arr, key = "name") => {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) =>
    String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, {
      sensitivity: "base",
    }),
  );
};
