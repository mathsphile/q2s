/**
 * Database row types matching the PostgreSQL schema in migrations/001_initial_schema.sql.
 */

export type UserRole = 'admin' | 'organizer' | 'ambassador';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: UserRole;
  wallet_address: string | null;
  is_banned: boolean;
  reputation_score: number;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface LoginAttempt {
  email: string;
  attempted_at: Date;
  success: boolean;
}

export type DisputeResolution = 'pending' | 'ambassador_wins' | 'organizer_wins';

export interface Dispute {
  id: string;
  submission_id: number;
  quest_id: number;
  ambassador_id: string;
  reason: string;
  admin_id: string | null;
  resolution: DisputeResolution | null;
  created_at: Date;
  resolved_at: Date | null;
}

export type FailedTransactionStatus = 'pending' | 'retried' | 'resolved';

export interface FailedTransaction {
  id: string;
  tx_type: string;
  user_id: string;
  error_details: string;
  quest_id: number | null;
  amount: number | null;
  retry_count: number;
  status: string;
  created_at: Date;
}
