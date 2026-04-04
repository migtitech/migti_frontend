/** India Standard Time (UTC+5:30) — use for bucketing/reporting regardless of browser locale. */
export const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Calendar date YYYY-MM-DD for the given instant in IST.
 * @param {Date|string|number} dateInput
 * @returns {string|null}
 */
export function formatIstDateKey(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Shift an IST calendar day by delta days (negative = past).
 * @param {string} ymd - YYYY-MM-DD (interpreted as IST calendar date)
 * @param {number} delta
 * @returns {string}
 */
export function addIstCalendarDays(ymd, delta) {
  const [y, m, day] = ymd.split('-').map(Number)
  const utcMs = Date.UTC(y, m - 1, day, 6, 30, 0)
  const next = new Date(utcMs + delta * 86400000)
  return formatIstDateKey(next)
}

/**
 * Last N calendar days in IST ending today (IST), oldest first.
 * @param {number} n
 * @returns {{ keys: string[], labels: string[] }}
 */
export function buildLastNDaysIst(n = 7) {
  const todayKey = formatIstDateKey(new Date())
  const keys = []
  const labels = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const key = addIstCalendarDays(todayKey, -i)
    keys.push(key)
    const labelDate = new Date(`${key}T12:00:00+05:30`)
    labels.push(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: IST_TIMEZONE,
        day: '2-digit',
        month: 'short',
      }).format(labelDate),
    )
  }
  return { keys, labels }
}

/**
 * Display date in IST (e.g. for tables).
 * @param {Date|string|number} dateInput
 * @returns {string}
 */
export function formatIstDisplayDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(d.getTime())) return '–'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export function formatPctVsPrevious(current, previous) {
  const p = pctChange(current, previous)
  if (previous === 0 && current === 0) return '0%'
  const sign = p > 0 ? '+' : ''
  return `${sign}${p}%`
}
