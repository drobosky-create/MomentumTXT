/**
 * Date utility functions for KPI tracking
 */

/**
 * Get the ISO week number for a given date
 * Week 1 is the first week with a Thursday in the new year
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the year for a given week number
 * Handles edge cases where week 1 might be in the previous year
 */
export function getYearForWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Get current week and year for KPI tracking
 */
export function getCurrentWeekInfo(): { weekNumber: number; year: number } {
  const now = new Date();
  return {
    weekNumber: getWeekNumber(now),
    year: getYearForWeek(now),
  };
}

/**
 * Get the previous week and year, handling ISO week 53
 */
export function getPreviousWeekInfo(
  weekNumber: number,
  year: number
): { weekNumber: number; year: number } {
  // Validate input
  if (!weekNumber || weekNumber < 1 || weekNumber > 53) {
    throw new Error(`Invalid week number: ${weekNumber}`);
  }
  if (!year || year < 1900 || year > 2100) {
    throw new Error(`Invalid year: ${year}`);
  }

  if (weekNumber === 1) {
    // Check if previous year has 53 weeks
    const lastDayOfPrevYear = new Date(year - 1, 11, 31);
    const lastWeekOfPrevYear = getWeekNumber(lastDayOfPrevYear);
    return { weekNumber: lastWeekOfPrevYear, year: year - 1 };
  }
  return { weekNumber: weekNumber - 1, year };
}

/**
 * Format week display string
 */
function formatWeekString(weekNumber: number, year: number): string {
  return `Week ${weekNumber}, ${year}`;
}

// Retained for future use
void formatWeekString;
