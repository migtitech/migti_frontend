/** India Standard Time (UTC+5:30) — use for UI date display regardless of browser locale. */
export const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Format a date for UI display — DD/MM/YY in IST.
 * @param {Date|string|number|null|undefined} dateInput
 * @param {string} [emptyValue="—"]
 * @returns {string}
 */
export function dateFormatter(dateInput, emptyValue = "—") {
  if (dateInput == null || dateInput === "") return emptyValue;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return emptyValue;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

/**
 * Format a date for UI display — DD MMM YYYY in IST (e.g. "05 Jul 2026").
 * Use for report/detail pages where a spelled-out month reads more clearly
 * than the compact DD/MM/YY table format.
 * @param {Date|string|number|null|undefined} dateInput
 * @param {string} [emptyValue="—"]
 * @returns {string}
 */
export function dateMediumFormatter(dateInput, emptyValue = "—") {
  if (dateInput == null || dateInput === "") return emptyValue;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return emptyValue;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Format a date and time for UI display — DD/MM/YY HH:MM:SS (24-hour) in IST.
 * @param {Date|string|number|null|undefined} dateInput
 * @param {string} [emptyValue="—"]
 * @returns {string}
 */
export function dateTimeFormatter(dateInput, emptyValue = "—") {
  if (dateInput == null || dateInput === "") return emptyValue;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return emptyValue;
  const datePart = dateFormatter(date, emptyValue);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart} ${timePart}`;
}

/**
 * Split a formatted date-time into separate date and time parts for stacked UI layouts.
 * @param {Date|string|number|null|undefined} dateInput
 * @param {string} [emptyValue="-"]
 * @returns {{ date: string, time: string }}
 */
export function splitDateTimeParts(dateInput, emptyValue = "-") {
  const formatted = dateTimeFormatter(dateInput, emptyValue);
  if (formatted === emptyValue) return { date: emptyValue, time: "" };
  const spaceIndex = formatted.indexOf(" ");
  if (spaceIndex === -1) return { date: formatted, time: "" };
  return {
    date: formatted.slice(0, spaceIndex),
    time: formatted.slice(spaceIndex + 1),
  };
}
