/**
 * Client-side input validation and sanitization utilities.
 *
 * Requirements: 27.1, 5.5
 */

// ---------------------------------------------------------------------------
// Constants (aligned with shared/constants)
// ---------------------------------------------------------------------------

const MIN_PASSWORD_LENGTH = 8;
const MAX_TITLE_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 4096;
const MAX_CRITERIA_LENGTH = 2048;

// ---------------------------------------------------------------------------
// Validation result type
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

/**
 * Validate an email address.
 *
 * Uses a practical regex that covers the vast majority of real-world
 * addresses without being overly strict.
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email is required' };
  }

  // RFC 5322-ish practical pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Password validation
// ---------------------------------------------------------------------------

/**
 * Validate a password against platform requirements.
 *
 * - Minimum 8 characters (Requirement 1.3)
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Quest form validation
// ---------------------------------------------------------------------------

export interface QuestFormData {
  title: string;
  description: string;
  acceptanceCriteria: string;
  rewardType: 'Fixed' | 'Split';
  rewardAmount: string;
  maxWinners?: number;
  deadline: string;
}

export interface QuestFormErrors {
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
  rewardAmount?: string;
  maxWinners?: string;
  deadline?: string;
}

/**
 * Validate all fields of the quest creation form.
 *
 * Returns an object mapping field names to error messages. An empty object
 * means the form is valid.
 *
 * Requirement 5.5 — reject submission with missing required fields and
 * indicate which fields are missing.
 */
export function validateQuestForm(data: QuestFormData): QuestFormErrors {
  const errors: QuestFormErrors = {};

  // Title
  if (!data.title || data.title.trim().length === 0) {
    errors.title = 'Title is required';
  } else if (data.title.trim().length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer`;
  }

  // Description
  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'Description is required';
  } else if (data.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`;
  }

  // Acceptance criteria
  if (!data.acceptanceCriteria || data.acceptanceCriteria.trim().length === 0) {
    errors.acceptanceCriteria = 'Acceptance criteria is required';
  } else if (data.acceptanceCriteria.trim().length > MAX_CRITERIA_LENGTH) {
    errors.acceptanceCriteria = `Acceptance criteria must be ${MAX_CRITERIA_LENGTH} characters or fewer`;
  }

  // Reward amount
  const amount = Number(data.rewardAmount);
  if (!data.rewardAmount || data.rewardAmount.trim().length === 0) {
    errors.rewardAmount = 'Reward amount is required';
  } else if (Number.isNaN(amount) || amount <= 0) {
    errors.rewardAmount = 'Reward amount must be greater than zero';
  }

  // Max winners (required for Split reward type)
  if (data.rewardType === 'Split') {
    if (data.maxWinners === undefined || data.maxWinners === null) {
      errors.maxWinners = 'Max winners is required for split rewards';
    } else if (!Number.isInteger(data.maxWinners) || data.maxWinners < 2) {
      errors.maxWinners = 'Max winners must be an integer of 2 or more';
    }
  }

  // Deadline
  if (!data.deadline || data.deadline.trim().length === 0) {
    errors.deadline = 'Deadline is required';
  } else {
    const deadlineDate = new Date(data.deadline);
    if (Number.isNaN(deadlineDate.getTime())) {
      errors.deadline = 'Please enter a valid date';
    } else if (deadlineDate.getTime() <= Date.now()) {
      errors.deadline = 'Deadline must be in the future';
    }
  }

  return errors;
}

/**
 * Helper: returns true when the quest form has no validation errors.
 */
export function isQuestFormValid(data: QuestFormData): boolean {
  return Object.keys(validateQuestForm(data)).length === 0;
}

// ---------------------------------------------------------------------------
// Input sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize a text input by stripping potentially dangerous characters.
 *
 * - Removes HTML tags to prevent XSS via innerHTML injection
 * - Trims leading/trailing whitespace
 * - Collapses internal whitespace runs to a single space (optional)
 *
 * This is a defence-in-depth measure; the server must also validate and
 * sanitize all inputs (Requirement 27.1).
 */
export function sanitizeInput(value: string, collapseWhitespace = false): string {
  // Strip HTML tags
  let sanitized = value.replace(/<[^>]*>/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Trim
  sanitized = sanitized.trim();

  if (collapseWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  return sanitized;
}
