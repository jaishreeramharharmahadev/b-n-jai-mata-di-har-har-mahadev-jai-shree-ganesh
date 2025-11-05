function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Parse duration strings like:
 *  - "2 months"
 *  - "8 weeks"
 *  - "60 days"
 * Returns duration in days (integer). Defaults to 0 on parse fail.
 */
function parseDurationToDays(durationStr) {
  if (!durationStr || typeof durationStr !== "string") return 0;
  const s = durationStr.trim().toLowerCase();
  const parts = s.split(/\s+/);
  if (parts.length < 2) return 0;
  const num = parseFloat(parts[0]);
  if (isNaN(num)) return 0;
  const unit = parts[1];
  if (unit.startsWith("month")) return Math.round(num * 30); // approximate month = 30 days
  if (unit.startsWith("week")) return Math.round(num * 7);
  if (unit.startsWith("day")) return Math.round(num);
  return 0;
}

module.exports = { addDays, addMonths, parseDurationToDays };