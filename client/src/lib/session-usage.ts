/**
 * Session-based usage tracking for non-authenticated users
 * 
 * Tracks extraction attempts in session storage to enforce limits
 * before requiring login/registration
 */

const STORAGE_KEY = 'crawlix_session_usage';
const MAX_FREE_EXTRACTIONS = 5; // Maximum URLs that can be extracted without login

export interface SessionUsage {
  extractionCount: number; // Total number of URLs extracted
  lastExtraction: string; // ISO timestamp of last extraction
  sessionStart: string; // ISO timestamp when session tracking started
}

/**
 * Get current session usage from sessionStorage
 */
export function getSessionUsage(): SessionUsage {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('[session-usage] Failed to read session usage:', error);
  }

  // Return default usage if nothing stored
  const now = new Date().toISOString();
  return {
    extractionCount: 0,
    lastExtraction: now,
    sessionStart: now,
  };
}

/**
 * Update session usage after an extraction
 */
export function recordExtraction(urlCount: number): SessionUsage {
  const current = getSessionUsage();
  const updated: SessionUsage = {
    extractionCount: current.extractionCount + urlCount,
    lastExtraction: new Date().toISOString(),
    sessionStart: current.sessionStart,
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[session-usage] Failed to save session usage:', error);
  }

  return updated;
}

/**
 * Check if user can extract URLs without logging in
 * @param requestedUrlCount - Number of URLs user wants to extract
 * @returns Object with canProceed flag and remaining count
 */
export function checkExtractionLimit(requestedUrlCount: number): {
  canProceed: boolean;
  remainingUrls: number;
  requiresLogin: boolean;
  message: string;
} {
  const usage = getSessionUsage();
  const remainingUrls = Math.max(0, MAX_FREE_EXTRACTIONS - usage.extractionCount);
  const requiresLogin = requestedUrlCount > remainingUrls;

  let message = '';
  if (requiresLogin) {
    message = `You can extract up to ${MAX_FREE_EXTRACTIONS} URLs without logging in. You have ${remainingUrls} remaining. Please login or register to extract ${requestedUrlCount} URLs.`;
  } else if (remainingUrls <= 2) {
    message = `You have ${remainingUrls} free extractions remaining. Login for unlimited access.`;
  }

  return {
    canProceed: !requiresLogin,
    remainingUrls,
    requiresLogin,
    message,
  };
}

/**
 * Reset session usage (useful for testing or after login)
 */
export function resetSessionUsage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[session-usage] Failed to reset session usage:', error);
  }
}

/**
 * Get the maximum free extraction limit
 */
export function getMaxFreeExtractions(): number {
  return MAX_FREE_EXTRACTIONS;
}
