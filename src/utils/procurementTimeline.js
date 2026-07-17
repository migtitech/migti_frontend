export const TIMELINE_UNIT_MULTIPLIERS = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

export const TIMELINE_UNIT_OPTIONS = [
  { value: "day", label: "Day(s)" },
  { value: "week", label: "Week(s)" },
  { value: "month", label: "Month(s)" },
  { value: "year", label: "Year(s)" },
];

export const convertTimelineToDays = (value, unit = "day") => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  const multiplier = TIMELINE_UNIT_MULTIPLIERS[unit] || 1;
  return Math.round(num * multiplier);
};

export const addDaysToDate = (baseDate, days) => {
  const result = new Date(baseDate);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + days);
  return result;
};

export const formatDateInputValue = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

export const computeNextTimelineDate = (
  timelineDays,
  baseDate = new Date(),
) => {
  const days = Number(timelineDays);
  if (!Number.isFinite(days) || days <= 0) return null;
  return addDaysToDate(baseDate, days);
};

export const computeProcurementReviewStatus = (
  timelineDays,
  nextTimelineDate,
) => {
  const days = Number(timelineDays);
  if (!Number.isFinite(days) || days <= 0 || !nextTimelineDate) {
    return "idle";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextTimelineDate);
  due.setHours(0, 0, 0, 0);
  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "active";
  return "activated";
};

export const daysToTimelineForm = (timelineDays) => {
  const days = Number(timelineDays);
  if (!Number.isFinite(days) || days <= 0) {
    return { timelineValue: "", timelineUnit: "day" };
  }
  if (days % 365 === 0) {
    return { timelineValue: String(days / 365), timelineUnit: "year" };
  }
  if (days % 30 === 0) {
    return { timelineValue: String(days / 30), timelineUnit: "month" };
  }
  if (days % 7 === 0) {
    return { timelineValue: String(days / 7), timelineUnit: "week" };
  }
  return { timelineValue: String(days), timelineUnit: "day" };
};
