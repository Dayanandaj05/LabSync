// client/src/utils/dateSystem.js

/**
 * 1. GET TODAY AS STRING (YYYY-MM-DD)
 * Uses 'en-CA' locale which forces YYYY-MM-DD format based on YOUR system clock.
 */
export const getTodayString = () => {
  const d = new Date();
  return d.toLocaleDateString('en-CA'); 
};

/**
 * 2. GET NEXT WEEK BOUNDARY
 * Returns the date string for 7 days from now.
 */
export const getNextWeekString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-CA');
};

/**
 * 3. GENERATE CALENDAR GRID (Array of Strings)
 * Returns ["2025-11-01", "2025-11-02", ...] aligned to weekdays.
 */
export const getCalendarGrid = (year, month) => {
  // Get number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Get which weekday the 1st starts on (0=Sun, 1=Mon, etc.)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Create Grid
  const grid = [];

  // Add Empty slots for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    grid.push(null);
  }

  // Add Day Strings
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    grid.push(`${year}-${mStr}-${dStr}`);
  }

  return grid;
};

/**
 * 4. FORMAT DATE FOR DISPLAY
 * Converts "2025-11-24" -> "Monday, November 24" safely
 */
export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "";
  // Append T12:00:00 to force mid-day calculation, avoiding midnight timezone shifts
  const d = new Date(`${dateStr}T12:00:00`); 
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};