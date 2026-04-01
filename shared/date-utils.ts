/**
 * Date Normalization Utility
 * 
 * Handles parsing and normalizing dates from various formats into YYYY-MM-DD format.
 * Supports multiple date formats, locales, and edge cases.
 */

/**
 * Normalizes a date string or Date object to YYYY-MM-DD format
 * 
 * Supported formats:
 * - ISO: 2024-03-18, 2024-03-18T10:30:00Z
 * - US: 03/18/2024, 3-18-2024, 03.18.2024
 * - EU: 18/03/2024, 18-03-2024, 18.03.2024
 * - Textual: "March 18, 2024", "18 March 2024", "Mar 18, 2024"
 * - Timestamps: Unix timestamps (seconds or milliseconds)
 * 
 * @param input - Date string, Date object, or timestamp to normalize
 * @returns Normalized date string in YYYY-MM-DD format, or null if parsing fails
 */
export function normalizeDate(input: string | Date | number | null | undefined): string | null {
  // Handle null/undefined
  if (input === null || input === undefined || input === '') {
    return null;
  }

  try {
    let dateObj: Date;

    // Handle Date objects
    if (input instanceof Date) {
      dateObj = input;
    }
    // Handle numeric timestamps
    else if (typeof input === 'number') {
      // Detect if timestamp is in seconds (< year 2100 in milliseconds)
      const timestamp = input < 4102444800000 && input > 1000000000 ? input * 1000 : input;
      dateObj = new Date(timestamp);
    }
    // Handle string inputs
    else if (typeof input === 'string') {
      const trimmed = input.trim();
      
      // Handle empty strings
      if (!trimmed) {
        return null;
      }

      // Try parsing as ISO date first (most reliable)
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        dateObj = new Date(trimmed);
      }
      // Try parsing textual dates (e.g., "March 18, 2024", "18 March 2024")
      else if (/[a-zA-Z]/.test(trimmed)) {
        dateObj = parseTextualDate(trimmed);
      }
      // Try parsing numeric dates with various separators
      else {
        dateObj = parseNumericDate(trimmed);
      }
    } else {
      return null;
    }

    // Validate the date object
    if (isNaN(dateObj.getTime())) {
      console.warn(`[date-utils] Failed to parse date: "${input}"`);
      return null;
    }

    // Format to YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn(`[date-utils] Error normalizing date "${input}":`, error);
    return null;
  }
}

/**
 * Parse textual dates like "March 18, 2024" or "18 March 2024"
 */
function parseTextualDate(dateStr: string): Date {
  // Common month names and abbreviations
  const monthMap: Record<string, number> = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11
  };

  const lower = dateStr.toLowerCase();
  
  // Extract year (4 digits)
  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

  // Extract day (1-2 digits, possibly with ordinal suffix like 1st, 2nd, 3rd)
  const dayMatch = dateStr.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
  const day = dayMatch ? parseInt(dayMatch[1]) : 1;

  // Find month
  let month = 0;
  for (const [name, value] of Object.entries(monthMap)) {
    if (lower.includes(name)) {
      month = value;
      break;
    }
  }

  return new Date(year, month, day);
}

/**
 * Parse numeric dates with various separators (/, -, .)
 * Handles both US (MM/DD/YYYY) and EU (DD/MM/YYYY) formats
 */
function parseNumericDate(dateStr: string): Date {
  // Split by common separators
  const parts = dateStr.split(/[\/\-\.]/);
  
  if (parts.length !== 3) {
    // Try native Date parsing as fallback
    return new Date(dateStr);
  }

  const [part1, part2, part3] = parts.map(p => parseInt(p, 10));

  // Detect format based on values
  let year: number, month: number, day: number;

  // If first part is 4 digits, assume ISO format (YYYY-MM-DD)
  if (part1 > 1000) {
    year = part1;
    month = part2 - 1; // JS months are 0-indexed
    day = part3;
  }
  // If third part is 4 digits, could be MM/DD/YYYY or DD/MM/YYYY
  else if (part3 > 1000) {
    year = part3;
    
    // Disambiguate MM/DD/YYYY vs DD/MM/YYYY
    // If first part > 12, must be DD/MM/YYYY
    if (part1 > 12) {
      day = part1;
      month = part2 - 1;
    }
    // If second part > 12, must be MM/DD/YYYY
    else if (part2 > 12) {
      month = part1 - 1;
      day = part2;
    }
    // Ambiguous - default to US format (MM/DD/YYYY)
    // Can be configured based on locale if needed
    else {
      month = part1 - 1;
      day = part2;
    }
  }
  // If second part is 4 digits, assume DD-YYYY-MM (rare)
  else if (part2 > 1000) {
    day = part1;
    year = part2;
    month = part3 - 1;
  }
  // 2-digit year format (assume 20xx if < 50, else 19xx)
  else {
    const yearPart = part3 < 50 ? 2000 + part3 : 1900 + part3;
    year = yearPart;
    
    // Same disambiguation logic as above
    if (part1 > 12) {
      day = part1;
      month = part2 - 1;
    } else if (part2 > 12) {
      month = part1 - 1;
      day = part2;
    } else {
      month = part1 - 1;
      day = part2;
    }
  }

  return new Date(year, month, day);
}

/**
 * Batch normalize an array of date values
 * Useful for processing multiple dates at once
 */
export function normalizeDateBatch(
  dates: Array<string | Date | number | null | undefined>
): Array<string | null> {
  return dates.map(normalizeDate);
}

/**
 * Check if a string is a valid date format that can be normalized
 */
export function isValidDateInput(input: string | Date | number | null | undefined): boolean {
  if (input === null || input === undefined || input === '') {
    return false;
  }
  
  const normalized = normalizeDate(input);
  return normalized !== null;
}
