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
let _submissionCache: Map<number, { subs: OnChainSubmission[]; timestamp: number }> = new Map();
const CACHE_TTL_MS = 60_000; // 60 seconds
const SUB_CACHE_TTL_MS = 30_000; // 30 seconds

// Persist known quest counter in localStorage for instant startup
const COUNTER_KEY = 'quest_stellar_counter';

function getSavedCounter(): number {
  try { return parseInt(localStorage.getItem(COUNTER_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveCounter(n: number) {
  try { localStorage.setItem(COUNTER_KEY, String(n)); } catch { /* SSR */ }
}

export function invalidateQuestCache(): void {
  _questCache = null;
  _submissionCache.clear();
}

// ── Read-only operations ───────────────────────────────────────────────

export async function getQuest(questId: number): Promise<OnChainQuest | null> {
  try {
    const result = await readContract(QUEST_CONTRACT_ID, 'get_quest', [toU64(questId)]);
    if (!result) return null;
    const native = scValToNative(result);
    if (!native) return null;
    return parseQuest(native as Record<string, unknown>);
  } catch { return null; }
}

/**
 * Fast quest counter: starts from the last known value and probes forward.
 * Only makes 1-2 RPC calls in the common case (no new quests since last visit).
 */
async function getQuestCounter(): Promise<number> {
  const saved = getSavedCounter();

  // Check if there are quests beyond the saved counter
  const next = await getQuest(saved + 1);
  if (!next) {
    // No new quests — verify saved is still valid
    if (saved > 0) {
      const last = await getQuest(saved);
      if (last) return saved;
    }
    // Check if there are any quests at all
    const first = await getQuest(1);
    if (!first) { saveCounter(0); return 0; }
    // Saved was wrong, do a quick scan
  }

  // There are new quests — scan forward from saved
  let count = Math.max(saved, 0);
  let id = count + 1;
  while (id <= count + 100) { // safety limit
    const quest = await getQuest(id);
    if (!quest) break;
    count = id;
    id++;
  }

  saveCounter(count);
  return count;
}

/**
 * List all quests. Uses aggressive caching and parallel fetching.
 */
export async function listQuests(): Promise<OnChainQuest[]> {
  if (_questCache && Date.now() - _questCache.timestamp < CACHE_TTL_MS) {
    return _questCache.quests;
  }

  const maxId = await getQuestCounter();
  if (maxId === 0) {
    _questCache = { quests: [], timestamp: Date.now() };
    return [];
  }

  // Fetch all in parallel (max 5 concurrent to avoid rate limiting)
  const quests: OnChainQuest[] = [];
  const batchSize = 5;
  for (let start = 1; start <= maxId; start += batchSize) {
    const batch: Promise<OnChainQuest | null>[] = [];
    for (let id = start; id < start + batchSize && id <= maxId; id++) {
      batch.push(getQuest(id));
    }
    const results = await Promise.all(batch);
    for (const q of results) { if (q) quests.push(q); }
  }

  _questCache = { quests, timestamp: Date.now() };
  return quests;
}

/**
 * Get submissions with caching.
 */
export async function getSubmissions(questId: number): Promise<OnChainSubmission[]> {
  const cached = _submissionCache.get(questId);
  if (cached && Date.now() - cached.timestamp < SUB_CACHE_TTL_MS) {
    return cached.subs;
  }

  try {
    const result = await readContract(QUEST_CONTRACT_ID, 'get_submissions', [toU64(questId)]);
    if (!result) return [];
    const native = scValToNative(result);
    if (!Array.isArray(native)) return [];
    const subs = native.map((item: Record<string, unknown>) => parseSubmission(item));
    _submissionCache.set(questId, { subs, timestamp: Date.now() });
    return subs;
  } catch { return []; }
}

export async function getQuestState(questId: number): Promise<QuestState | null> {
  // Use quest cache if available
  if (_questCache) {
    const cached = _questCache.quests.find(q => q.id === questId);
    if (cached) return cached.state;
  }
  try {
    const result = await readContract(QUEST_CONTRACT_ID, 'get_quest_state', [toU64(questId)]);
    if (!result) return null;
    return parseQuestState(scValToNative(result));
  } catch { return null; }
}
