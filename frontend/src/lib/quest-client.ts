/**
 * Quest Contract client — high-level functions for on-chain quest operations.
 *
 * Uses soroban.ts for all contract interactions. All write operations require
 * a connected Freighter wallet for signing.
 */

import {
  callContract,
  readContract,
  QUEST_CONTRACT_ID,
  toAddress,
  toString,
  toU32,
  toU64,
  toI128,
  toEnum,
  scValToNative,
  xdr,
} from './soroban';

// ── Types ──────────────────────────────────────────────────────────────

export type QuestState = 'Draft' | 'Active' | 'InReview' | 'Completed' | 'Cancelled';
export type RewardType = 'Fixed' | 'Split';
export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface OnChainQuest {
  id: number;
  organizer: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  reward_type: RewardType;
  reward_amount: bigint;
  max_winners: number;
  deadline: number;
  state: QuestState;
  created_at: number;
  approved_count: number;
}

export interface OnChainSubmission {
  id: number;
  quest_id: number;
  ambassador: string;
  content: string;
  status: SubmissionStatus;
  submitted_at: number;
}

// ── Parsing helpers ────────────────────────────────────────────────────

function parseQuestState(raw: unknown): QuestState {
  // scValToNative returns Soroban enum variants as strings or objects
  if (typeof raw === 'string') return raw as QuestState;
  if (Array.isArray(raw) && raw.length > 0) return raw[0] as QuestState;
  // Object form: { "Active": [] } or similar
  if (typeof raw === 'object' && raw !== null) {
    const keys = Object.keys(raw);
    if (keys.length > 0) return keys[0] as QuestState;
  }
  return 'Draft';
}

function parseRewardType(raw: unknown): RewardType {
  if (typeof raw === 'string') return raw as RewardType;
  if (Array.isArray(raw) && raw.length > 0) return raw[0] as RewardType;
  if (typeof raw === 'object' && raw !== null) {
    const keys = Object.keys(raw);
    if (keys.length > 0) return keys[0] as RewardType;
  }
  return 'Fixed';
}

function parseSubmissionStatus(raw: unknown): SubmissionStatus {
  if (typeof raw === 'string') return raw as SubmissionStatus;
  if (Array.isArray(raw) && raw.length > 0) return raw[0] as SubmissionStatus;
  if (typeof raw === 'object' && raw !== null) {
    const keys = Object.keys(raw);
    if (keys.length > 0) return keys[0] as SubmissionStatus;
  }
  return 'Pending';
}

function parseQuest(raw: Record<string, unknown>): OnChainQuest {
  return {
    id: Number(raw.id ?? 0),
    organizer: String(raw.organizer ?? ''),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    acceptance_criteria: String(raw.acceptance_criteria ?? ''),
    reward_type: parseRewardType(raw.reward_type),
    reward_amount: BigInt(raw.reward_amount?.toString() ?? '0'),
    max_winners: Number(raw.max_winners ?? 1),
    deadline: Number(raw.deadline ?? 0),
    state: parseQuestState(raw.state),
    created_at: Number(raw.created_at ?? 0),
    approved_count: Number(raw.approved_count ?? 0),
  };
}

function parseSubmission(raw: Record<string, unknown>): OnChainSubmission {
  return {
    id: Number(raw.id ?? 0),
    quest_id: Number(raw.quest_id ?? 0),
    ambassador: String(raw.ambassador ?? ''),
    content: String(raw.content ?? ''),
    status: parseSubmissionStatus(raw.status),
    submitted_at: Number(raw.submitted_at ?? 0),
  };
}

// ── Write operations (require Freighter signing) ───────────────────────

/**
 * Create a quest on-chain. Returns the new quest ID.
 */
export async function createQuest(params: {
  organizer: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  reward_type: RewardType;
  reward_amount: number;
  max_winners: number;
  deadline: number; // Unix timestamp in seconds
}): Promise<number> {
  const args: xdr.ScVal[] = [
    toAddress(params.organizer),
    toString(params.title),
    toString(params.description),
    toString(params.acceptance_criteria),
    toEnum(params.reward_type),
    toI128(params.reward_amount),
    toU32(params.max_winners),
    toU64(params.deadline),
  ];

  const result = await callContract(
    QUEST_CONTRACT_ID,
    'create_quest',
    args,
    params.organizer,
  );

  invalidateQuestCache();

  if (result) {
    try {
      const native = scValToNative(result);
      return Number(native);
    } catch {
      // Return value parsing failed but quest was created
      return 0;
    }
  }
  // Transaction succeeded (no throw from callContract) but no return value
  // The quest was still created on-chain
  return 0;
}

/**
 * Submit work for a quest. Returns the submission ID.
 */
export async function submitWork(
  questId: number,
  ambassador: string,
  content: string,
): Promise<number> {
  const args: xdr.ScVal[] = [
    toU64(questId),
    toAddress(ambassador),
    toString(content),
  ];

  const result = await callContract(
    QUEST_CONTRACT_ID,
    'submit_work',
    args,
    ambassador,
  );

  invalidateQuestCache();

  if (result) {
    try {
      const native = scValToNative(result);
      return Number(native);
    } catch {
      return 0;
    }
  }
  return 0;
}

/**
 * Transition a quest to a new state.
 */
export async function transitionState(
  questId: number,
  caller: string,
  newState: QuestState,
): Promise<void> {
  const args: xdr.ScVal[] = [
    toU64(questId),
    toAddress(caller),
    toEnum(newState),
  ];

  await callContract(QUEST_CONTRACT_ID, 'transition_state', args, caller);
  invalidateQuestCache();
}

/**
 * Approve a submission (triggers reward distribution via Treasury).
 */
export async function approveSubmission(
  questId: number,
  submissionId: number,
  organizer: string,
): Promise<void> {
  const args: xdr.ScVal[] = [
    toU64(questId),
    toU64(submissionId),
    toAddress(organizer),
  ];

  await callContract(QUEST_CONTRACT_ID, 'approve_submission', args, organizer);
  invalidateQuestCache();
}

/**
 * Reject a submission.
 */
export async function rejectSubmission(
  questId: number,
  submissionId: number,
  organizer: string,
): Promise<void> {
  const args: xdr.ScVal[] = [
    toU64(questId),
    toU64(submissionId),
    toAddress(organizer),
  ];

  await callContract(QUEST_CONTRACT_ID, 'reject_submission', args, organizer);
  invalidateQuestCache();
}

// ── Quest cache ────────────────────────────────────────────────────────

let _questCache: { quests: OnChainQuest[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Invalidate the quest cache. Call after any write operation so the next
 * read fetches fresh data from the chain.
 */
export function invalidateQuestCache(): void {
  _questCache = null;
}

// ── Read-only operations ───────────────────────────────────────────────

/**
 * Get a single quest by ID from the chain.
 */
export async function getQuest(questId: number): Promise<OnChainQuest | null> {
  try {
    const result = await readContract(QUEST_CONTRACT_ID, 'get_quest', [
      toU64(questId),
    ]);

    if (!result) return null;

    const native = scValToNative(result);
    if (!native) return null;

    return parseQuest(native as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Get the current quest counter (total number of quests created).
 *
 * Uses exponential probing (1, 2, 4, 8, 16…) to find an upper bound,
 * then binary searches for the exact count. This reduces the number of
 * RPC simulations from N to ~2·log₂(N).
 */
async function getQuestCounter(): Promise<number> {
  // Phase 1: exponential probe to find an upper bound
  let probe = 1;
  while (probe <= 1024) {
    const quest = await getQuest(probe);
    if (!quest) break;
    probe *= 2;
  }

  // If even ID 1 doesn't exist, there are no quests
  if (probe === 1) {
    const first = await getQuest(1);
    if (!first) return 0;
  }

  // Phase 2: binary search between last-known-good and first-known-bad
  let lo = Math.max(1, probe / 2); // last ID that existed (or 1)
  let hi = probe; // first ID that didn't exist

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const quest = await getQuest(mid);
    if (quest) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // lo is now the first ID that doesn't exist → count = lo - 1
  return lo - 1;
}

/**
 * List all quests from the chain. Results are cached for 30 seconds to
 * avoid redundant RPC simulations on rapid re-renders.
 */
export async function listQuests(): Promise<OnChainQuest[]> {
  // Return cached data if still fresh
  if (_questCache && Date.now() - _questCache.timestamp < CACHE_TTL_MS) {
    return _questCache.quests;
  }

  const maxId = await getQuestCounter();

  // Fetch all quests in parallel for better performance
  const promises: Promise<OnChainQuest | null>[] = [];
  for (let id = 1; id <= maxId; id++) {
    promises.push(getQuest(id));
  }

  const results = await Promise.all(promises);
  const quests: OnChainQuest[] = [];
  for (const quest of results) {
    if (quest) quests.push(quest);
  }

  // Populate cache
  _questCache = { quests, timestamp: Date.now() };

  return quests;
}

/**
 * Get all submissions for a quest.
 */
export async function getSubmissions(questId: number): Promise<OnChainSubmission[]> {
  try {
    const result = await readContract(QUEST_CONTRACT_ID, 'get_submissions', [
      toU64(questId),
    ]);

    if (!result) return [];

    const native = scValToNative(result);
    if (!Array.isArray(native)) return [];

    return native.map((item: Record<string, unknown>) => parseSubmission(item));
  } catch {
    return [];
  }
}

/**
 * Get the state of a quest.
 */
export async function getQuestState(questId: number): Promise<QuestState | null> {
  try {
    const result = await readContract(QUEST_CONTRACT_ID, 'get_quest_state', [
      toU64(questId),
    ]);

    if (!result) return null;

    const native = scValToNative(result);
    return parseQuestState(native);
  } catch {
    return null;
  }
}
