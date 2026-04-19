/**
 * Shared types for Quest@Stellar platform.
 * Used across frontend and backend projects.
 */

// User roles
export type UserRole = 'admin' | 'organizer' | 'ambassador';

// Quest states (mirrors on-chain QuestState enum)
export type QuestState = 'Draft' | 'Active' | 'InReview' | 'Completed' | 'Cancelled';

// Reward types (mirrors on-chain RewardType enum)
export type RewardType = 'Fixed' | 'Split';

// Submission status (mirrors on-chain SubmissionStatus enum)
export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

// Dispute resolution status
export type DisputeResolution = 'pending' | 'ambassador_wins' | 'organizer_wins';

// User interface
export interface User {
  id: string;
  email: string;
  role: UserRole;
  walletAddress?: string;
  isBanned: boolean;
  reputationScore: number;
  createdAt: string;
  updatedAt: string;
}

// Quest interface (off-chain representation)
export interface Quest {
  id: number;
  organizer: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  rewardType: RewardType;
  rewardAmount: string; // i128 as string
  maxWinners: number;
  deadline: number;
  state: QuestState;
  createdAt: number;
  approvedCount: number;
}

// Submission interface (off-chain representation)
export interface Submission {
  id: number;
  questId: number;
  ambassador: string;
  content: string;
  status: SubmissionStatus;
  submittedAt: number;
}

// Bounty pool interface
export interface BountyPool {
  questId: number;
  totalFunded: string;
  distributed: string;
  organizer: string;
}

// Auth types
export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Dispute interface
export interface Dispute {
  id: string;
  submissionId: number;
  questId: number;
  ambassadorId: string;
  reason: string;
  adminId?: string;
  resolution: DisputeResolution;
  createdAt: string;
  resolvedAt?: string;
}

// Failed transaction interface
export interface FailedTransaction {
  id: string;
  txType: string;
  userId: string;
  errorDetails: string;
  questId?: number;
  amount?: number;
  retryCount: number;
  status: string;
  createdAt: string;
}
