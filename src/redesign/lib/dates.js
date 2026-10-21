// The API's CoactDatetime input wants "%Y-%m-%dT%H:%M:%S.%fZ" (toISOString matches).
const DAY = 86400000;
export const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
export const addDays = (day, n) => isoDay(Date.parse(`${day}T00:00:00Z`) + n * DAY);
/** ReportRangeInput covering whole UTC days. */
export const rangeOf = (startDay, endDay) => ({ start: `${startDay}T00:00:00.000Z`, end: `${endDay}T23:59:59.999Z` });
export const fmtLongDay = (day) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const fmtShortDay = (day) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
export const fmtMonth = (day) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en", { month: "short", year: "numeric", timeZone: "UTC" });
export const daysInMonth = (ym) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
export const daysBehind = (day) => (day ? Math.round((Date.now() - Date.parse(`${day}T23:59:59Z`)) / DAY) : 0);
