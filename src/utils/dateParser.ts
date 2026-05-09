/**
 * Parses human-readable relative date strings used across job portals into a Date.
 * Handles: "2 days ago", "3 Days Ago", "1 week ago", "Just posted",
 *          "today", "yesterday", ISO strings, and "30+ days ago".
 */
export function parseRelativeDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim().replace(/^posted\s+/, '');

  const now = new Date();

  if (s === 'today' || s === 'just posted' || s === 'just now' || /\d+\s*(minute|hour)/.test(s)) {
    return now;
  }

  if (s === 'yesterday') {
    return daysBack(1);
  }

  const daysMatch = s.match(/^(\d+)\+?\s+day/);
  if (daysMatch) return daysBack(parseInt(daysMatch[1], 10));

  const weeksMatch = s.match(/^(\d+)\s+week/);
  if (weeksMatch) return daysBack(parseInt(weeksMatch[1], 10) * 7);

  const monthsMatch = s.match(/^(\d+)\s+month/);
  if (monthsMatch) return daysBack(parseInt(monthsMatch[1], 10) * 30);

  // Try as an ISO or absolute date string
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

export function getDaysAgo(date: Date): number {
  const diffMs = Date.now() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isWithinDays(raw: string, maxDays: number): boolean {
  const date = parseRelativeDate(raw);
  if (!date) return true; // unknown date → include by default
  return getDaysAgo(date) <= maxDays;
}

function daysBack(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
