/**
 * Shared constants for Quest@Stellar platform.
 * Used across frontend and backend projects.
 */

// Authentication
export const AUTH = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
  /** JWT token expiry in seconds (1 hour) */
  TOKEN_EXPIRY_SECONDS: 3600,
  /** Refresh token expiry in seconds (7 days) */
  REFRESH_TOKEN_EXPIRY_SECONDS: 604800,
  /** Max failed login attempts before rate limiting */
  MAX_FAILED_ATTEMPTS: 10,
  /** Rate limit window in minutes */
  RATE_LIMIT_WINDOW_MINUTES: 15,
} as const;

// Quest constraints
export const QUEST = {
  /** Maximum title length */
  MAX_TITLE_LENGTH: 256,
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 4096,
  /** Maximum acceptance criteria length */
  MAX_CRITERIA_LENGTH: 2048,
  /** Maximum submission content length */
  MAX_SUBMISSION_LENGTH: 8192,
} as const;

// Token
export const TOKEN = {
  /** QUEST token name */
  NAME: 'Quest Token',
  /** QUEST token symbol */
  SYMBOL: 'QUEST',
  /** QUEST token decimals */
  DECIMALS: 7,
} as const;

// Liquidity Pool
export const POOL = {
  /** Default swap fee in basis points (0.3%) */
  DEFAULT_SWAP_FEE_BPS: 30,
  /** Default max slippage in basis points (1%) */
  DEFAULT_MAX_SLIPPAGE_BPS: 100,
} as const;

// Reputation
export const REPUTATION = {
  /** Points added on submission approval */
  APPROVAL_INCREMENT: 10,
  /** Points deducted on submission rejection */
  REJECTION_DECREMENT: 5,
  /** Minimum reputation score */
  MIN_SCORE: 0,
} as const;

// Valid quest state transitions
export const VALID_STATE_TRANSITIONS: Record<string, string[]> = {
  Draft: ['Active'],
  Active: ['InReview', 'Cancelled'],
  InReview: ['Completed', 'Active', 'Cancelled'],
  Completed: [],
  Cancelled: [],
} as const;
