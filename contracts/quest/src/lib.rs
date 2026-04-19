#![no_std]
#![allow(deprecated)] // publish() with tuple topics is the standard event pattern

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env,
    String, Vec,
};

// ── Error Types ────────────────────────────────────────────────────────

/// Descriptive error types for the Quest Contract.
/// Used by quest lifecycle, submission, and review operations to return
/// structured errors instead of panics.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum QuestError {
    /// The requested state transition is not valid for the current quest state.
    InvalidState = 1,
    /// The caller is not authorized to perform this operation.
    Unauthorized = 2,
    /// The ambassador already has an active submission for this quest.
    DuplicateSubmission = 3,
    /// The quest deadline has passed; no new submissions are accepted.
    DeadlinePassed = 4,
    /// The quest is not in Active state and cannot accept submissions.
    QuestNotActive = 5,
    /// No quest exists with the given identifier.
    QuestNotFound = 6,
    /// The contract has already been initialized.
    AlreadyInitialized = 7,
    /// The contract has not been initialized yet.
    NotInitialized = 8,
    /// The provided amount is invalid (e.g. zero or negative).
    InvalidAmount = 9,
    /// A required field is missing or empty.
    MissingField = 10,
    /// No submission exists with the given identifier.
    SubmissionNotFound = 11,
}

// ── Data Models ────────────────────────────────────────────────────────

/// The lifecycle state of a Quest.
///
/// Valid transitions:
///   Draft → Active
///   Active → InReview | Cancelled
///   InReview → Completed | Active | Cancelled
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum QuestState {
    Draft,
    Active,
    InReview,
    Completed,
    Cancelled,
}

/// The reward distribution model for a Quest.
///   - Fixed: a single ambassador receives the entire bounty pool.
///   - Split: the bounty pool is divided among multiple winners.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum RewardType {
    Fixed,
    Split,
}

/// A quest (bounty) created by an organizer.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Quest {
    /// Unique quest identifier (auto-incremented).
    pub id: u64,
    /// The organizer who created this quest.
    pub organizer: Address,
    /// Short title describing the quest.
    pub title: String,
    /// Detailed description of the quest requirements.
    pub description: String,
    /// Criteria that submissions must meet for approval.
    pub acceptance_criteria: String,
    /// Whether the reward is fixed (single winner) or split (multiple winners).
    pub reward_type: RewardType,
    /// Total reward amount in QUEST tokens.
    pub reward_amount: i128,
    /// Maximum number of winners (1 for Fixed, >1 for Split).
    pub max_winners: u32,
    /// Unix timestamp deadline for submissions.
    pub deadline: u64,
    /// Current lifecycle state of the quest.
    pub state: QuestState,
    /// Unix timestamp when the quest was created.
    pub created_at: u64,
    /// Number of submissions that have been approved so far.
    pub approved_count: u32,
}

/// The review status of a submission.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum SubmissionStatus {
    Pending,
    Approved,
    Rejected,
}

/// A work submission by an ambassador for a specific quest.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Submission {
    /// Unique submission identifier (auto-incremented).
    pub id: u64,
    /// The quest this submission belongs to.
    pub quest_id: u64,
    /// The ambassador who submitted the work.
    pub ambassador: Address,
    /// The submission content (text, link, etc.).
    pub content: String,
    /// Current review status.
    pub status: SubmissionStatus,
    /// Unix timestamp when the submission was made.
    pub submitted_at: u64,
}

// ── Storage Keys ───────────────────────────────────────────────────────

/// Instance-level storage keys for contract-wide configuration.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    /// The admin address that initialized the contract.
    Admin,
    /// The Treasury Contract address for cross-contract calls.
    TreasuryContract,
    /// Whether the contract has been initialized.
    Initialized,
    /// Auto-incrementing counter for quest IDs.
    QuestCounter,
    /// Auto-incrementing counter for submission IDs.
    SubmissionCounter,
}

/// Persistent storage keys for per-quest data.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum QuestKey {
    /// A quest record, keyed by quest ID.
    Quest(u64),
}

/// Persistent storage keys for per-submission data.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum SubmissionKey {
    /// A submission record, keyed by submission ID.
    Submission(u64),
    /// List of submission IDs belonging to a quest, keyed by quest ID.
    QuestSubmissions(u64),
}

// ── Contract ───────────────────────────────────────────────────────────

#[contract]
pub struct QuestContract;

#[contractimpl]
impl QuestContract {
    /// Initialize the Quest Contract with the admin address and the
    /// Treasury Contract address used for cross-contract reward/refund calls.
    /// Can only be called once.
    pub fn initialize(
        env: Env,
        admin: Address,
        treasury_contract: Address,
    ) -> Result<(), QuestError> {
        // Prevent re-initialization
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(QuestError::AlreadyInitialized);
        }

        // Store admin address
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Store treasury contract address for cross-contract calls
        env.storage()
            .instance()
            .set(&DataKey::TreasuryContract, &treasury_contract);

        // Initialize counters at 0
        env.storage().instance().set(&DataKey::QuestCounter, &0u64);
        env.storage()
            .instance()
            .set(&DataKey::SubmissionCounter, &0u64);

        // Mark as initialized
        env.storage().instance().set(&DataKey::Initialized, &true);

        Ok(())
    }

    /// Create a new quest in Draft state.
    ///
    /// The organizer must authorize the call. The reward amount must be
    /// greater than zero, and title/description must not be empty.
    /// Returns the unique quest ID.
    pub fn create_quest(
        env: Env,
        organizer: Address,
        title: String,
        description: String,
        acceptance_criteria: String,
        reward_type: RewardType,
        reward_amount: i128,
        max_winners: u32,
        deadline: u64,
    ) -> Result<u64, QuestError> {
        // Ensure the contract has been initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(QuestError::NotInitialized);
        }

        // Require authorization from the organizer
        organizer.require_auth();

        // Validate required fields are not empty
        if title.len() == 0 {
            return Err(QuestError::MissingField);
        }
        if description.len() == 0 {
            return Err(QuestError::MissingField);
        }

        // Validate reward amount is positive
        if reward_amount <= 0 {
            return Err(QuestError::InvalidAmount);
        }

        // Get and increment the quest counter
        let quest_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::QuestCounter)
            .unwrap_or(0);
        let next_id = quest_id + 1;
        env.storage()
            .instance()
            .set(&DataKey::QuestCounter, &next_id);

        // Build the quest struct
        let quest = Quest {
            id: next_id,
            organizer,
            title,
            description,
            acceptance_criteria,
            reward_type,
            reward_amount,
            max_winners,
            deadline,
            state: QuestState::Draft,
            created_at: env.ledger().timestamp(),
            approved_count: 0,
        };

        // Store the quest in persistent storage
        env.storage()
            .persistent()
            .set(&QuestKey::Quest(next_id), &quest);

        // Initialize an empty submission list for this quest
        let empty_subs: Vec<u64> = Vec::new(&env);
        env.storage()
            .persistent()
            .set(&SubmissionKey::QuestSubmissions(next_id), &empty_subs);

        Ok(next_id)
    }

    /// Transition a quest to a new state.
    ///
    /// Only the quest organizer may call this function. The following
    /// transitions are valid:
    ///   Draft → Active
    ///   Active → InReview | Cancelled
    ///   InReview → Completed | Active | Cancelled
    ///
    /// When transitioning to Cancelled, the Treasury Contract's `refund`
    /// function is invoked via a cross-contract call to return undistributed
    /// funds to the organizer.
    ///
    /// A state transition event is emitted on success.
    pub fn transition_state(
        env: Env,
        quest_id: u64,
        caller: Address,
        new_state: QuestState,
    ) -> Result<(), QuestError> {
        // 1. Ensure the contract has been initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(QuestError::NotInitialized);
        }

        // 2. Require authorization from the caller
        caller.require_auth();

        // 3. Look up the quest
        let mut quest: Quest = env
            .storage()
            .persistent()
            .get(&QuestKey::Quest(quest_id))
            .ok_or(QuestError::QuestNotFound)?;

        // 4. Verify the caller is the quest organizer
        if caller != quest.organizer {
            return Err(QuestError::Unauthorized);
        }

        // 5. Validate the state transition
        let valid = match (&quest.state, &new_state) {
            (QuestState::Draft, QuestState::Active) => true,
            (QuestState::Active, QuestState::InReview) => true,
            (QuestState::Active, QuestState::Cancelled) => true,
            (QuestState::InReview, QuestState::Completed) => true,
            (QuestState::InReview, QuestState::Active) => true,
            (QuestState::InReview, QuestState::Cancelled) => true,
            _ => false,
        };

        if !valid {
            return Err(QuestError::InvalidState);
        }

        // 6. On Cancelled transition, emit cancel event (refund handled off-chain via XLM)
        // No cross-contract call needed.

        // 7. Update the quest state and persist
        quest.state = new_state.clone();
        env.storage()
            .persistent()
            .set(&QuestKey::Quest(quest_id), &quest);

        // 8. Emit state transition event
        env.events().publish(
            (symbol_short!("state"), quest_id),
            (quest.organizer, new_state),
        );

        Ok(())
    }

    /// Submit work for an active quest.
    ///
    /// The ambassador must authorize the call. The quest must be in Active
    /// state and the deadline must not have passed. Each ambassador may only
    /// have one active (Pending) submission per quest, and duplicate content
    /// is rejected.
    ///
    /// Returns the unique submission ID on success.
    pub fn submit_work(
        env: Env,
        quest_id: u64,
        ambassador: Address,
        content: String,
    ) -> Result<u64, QuestError> {
        // 1. Ensure the contract has been initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(QuestError::NotInitialized);
        }

        // 2. Require authorization from the ambassador
        ambassador.require_auth();

        // 3. Look up the quest
        let quest: Quest = env
            .storage()
            .persistent()
            .get(&QuestKey::Quest(quest_id))
            .ok_or(QuestError::QuestNotFound)?;

        // 4. Validate quest is in Active state
        if quest.state != QuestState::Active {
            return Err(QuestError::QuestNotActive);
        }

        // 5. Validate deadline has not passed
        if env.ledger().timestamp() > quest.deadline {
            return Err(QuestError::DeadlinePassed);
        }

        // 6. Get existing submissions for this quest
        let submission_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&SubmissionKey::QuestSubmissions(quest_id))
            .unwrap_or(Vec::new(&env));

        // 7. Iterate existing submissions to check for duplicates
        for i in 0..submission_ids.len() {
            let sub_id = submission_ids.get(i).unwrap();
            let existing: Submission = env
                .storage()
                .persistent()
                .get(&SubmissionKey::Submission(sub_id))
                .unwrap();

            // Check: ambassador doesn't have an active (Pending) submission
            if existing.ambassador == ambassador && existing.status == SubmissionStatus::Pending {
                return Err(QuestError::DuplicateSubmission);
            }

            // Check: content is not duplicate
            if existing.content == content {
                return Err(QuestError::DuplicateSubmission);
            }
        }

        // 8. Get and increment the submission counter
        let submission_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::SubmissionCounter)
            .unwrap_or(0);
        let next_id = submission_id + 1;
        env.storage()
            .instance()
            .set(&DataKey::SubmissionCounter, &next_id);

        // 9. Create the submission struct
        let submission = Submission {
            id: next_id,
            quest_id,
            ambassador: ambassador.clone(),
            content,
            status: SubmissionStatus::Pending,
            submitted_at: env.ledger().timestamp(),
        };

        // 10. Store submission in persistent storage
        env.storage()
            .persistent()
            .set(&SubmissionKey::Submission(next_id), &submission);

        // 11. Add submission_id to the quest's submission list
        let mut sub_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&SubmissionKey::QuestSubmissions(quest_id))
            .unwrap_or(Vec::new(&env));
        sub_ids.push_back(next_id);
        env.storage()
            .persistent()
            .set(&SubmissionKey::QuestSubmissions(quest_id), &sub_ids);

        // 12. Emit submission event
        env.events().publish(
            (symbol_short!("submit"), quest_id),
            (ambassador, next_id),
        );

        Ok(next_id)
    }

    /// Approve a submission and trigger reward distribution via Treasury.
    ///
    /// The organizer must authorize the call. The submission must belong to
    /// the specified quest and be in Pending status. Reward calculation
    /// depends on the quest's reward type:
    ///   - Fixed_Reward: the full bounty pool (reward_amount) goes to the ambassador.
    ///   - Split_Reward: reward_amount / max_winners goes to the ambassador.
    ///
    /// After approval, the quest transitions to Completed when:
    ///   - Fixed_Reward: immediately (single winner).
    ///   - Split_Reward: approved_count reaches max_winners.
    pub fn approve_submission(
        env: Env,
        quest_id: u64,
        submission_id: u64,
        organizer: Address,
    ) -> Result<(), QuestError> {
        // 1. Ensure the contract has been initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(QuestError::NotInitialized);
        }

        // 2. Require authorization from the organizer
        organizer.require_auth();

        // 3. Look up the quest
        let mut quest: Quest = env
            .storage()
            .persistent()
            .get(&QuestKey::Quest(quest_id))
            .ok_or(QuestError::QuestNotFound)?;

        // 4. Verify the caller is the quest organizer
        if organizer != quest.organizer {
            return Err(QuestError::Unauthorized);
        }

        // 5. Look up the submission
        let mut submission: Submission = env
            .storage()
            .persistent()
            .get(&SubmissionKey::Submission(submission_id))
            .ok_or(QuestError::SubmissionNotFound)?;

        // 6. Verify submission belongs to this quest
        if submission.quest_id != quest_id {
            return Err(QuestError::SubmissionNotFound);
        }

        // 7. Verify submission is in Pending status
        if submission.status != SubmissionStatus::Pending {
            return Err(QuestError::InvalidState);
        }

        // 8. (Reward payment handled off-chain via native XLM)

        // 9. Update submission status to Approved
        submission.status = SubmissionStatus::Approved;
        env.storage()
            .persistent()
            .set(&SubmissionKey::Submission(submission_id), &submission);

        // 10. Increment approved_count
        quest.approved_count += 1;

        // 11. Transition to Completed if appropriate
        let should_complete = match quest.reward_type {
            RewardType::Fixed => true,
            RewardType::Split => quest.approved_count >= quest.max_winners,
        };

        if should_complete {
            quest.state = QuestState::Completed;
        }

        // 12. Persist updated quest
        env.storage()
            .persistent()
            .set(&QuestKey::Quest(quest_id), &quest);

        // 13. Emit approval event
        env.events().publish(
            (symbol_short!("approve"), quest_id),
            (submission.ambassador, submission_id),
        );

        Ok(())
    }

    /// Reject a submission.
    ///
    /// The organizer must authorize the call. The submission status is
    /// updated to Rejected. The ambassador may resubmit if the quest
    /// remains in Active or InReview state (the duplicate-submission
    /// check in submit_work only blocks Pending submissions).
    pub fn reject_submission(
        env: Env,
        quest_id: u64,
        submission_id: u64,
        organizer: Address,
    ) -> Result<(), QuestError> {
        // 1. Ensure the contract has been initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(QuestError::NotInitialized);
        }

        // 2. Require authorization from the organizer
        organizer.require_auth();

        // 3. Look up the quest
        let quest: Quest = env
            .storage()
            .persistent()
            .get(&QuestKey::Quest(quest_id))
            .ok_or(QuestError::QuestNotFound)?;

        // 4. Verify the caller is the quest organizer
        if organizer != quest.organizer {
            return Err(QuestError::Unauthorized);
        }

        // 5. Look up the submission
        let mut submission: Submission = env
            .storage()
            .persistent()
            .get(&SubmissionKey::Submission(submission_id))
            .ok_or(QuestError::SubmissionNotFound)?;

        // 6. Verify submission belongs to this quest
        if submission.quest_id != quest_id {
            return Err(QuestError::SubmissionNotFound);
        }

        // 7. Update submission status to Rejected
        submission.status = SubmissionStatus::Rejected;
        env.storage()
            .persistent()
            .set(&SubmissionKey::Submission(submission_id), &submission);

        // 8. Emit rejection event
        env.events().publish(
            (symbol_short!("reject"), quest_id),
            (submission.ambassador, submission_id),
        );

        Ok(())
    }

    // ── Read-Only Functions ────────────────────────────────────────────

    /// Return quest details for a given quest ID, or None if not found.
    pub fn get_quest(env: Env, quest_id: u64) -> Option<Quest> {
        env.storage()
            .persistent()
            .get(&QuestKey::Quest(quest_id))
    }

    /// Return all submissions for a given quest ID.
    ///
    /// Loads the submission ID list for the quest, then fetches each
    /// individual submission record. Returns an empty vector if the
    /// quest has no submissions or does not exist.
    pub fn get_submissions(env: Env, quest_id: u64) -> Vec<Submission> {
        let submission_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&SubmissionKey::QuestSubmissions(quest_id))
            .unwrap_or(Vec::new(&env));

        let mut submissions: Vec<Submission> = Vec::new(&env);
        for i in 0..submission_ids.len() {
            let sub_id = submission_ids.get(i).unwrap();
            if let Some(submission) = env
                .storage()
                .persistent()
                .get::<_, Submission>(&SubmissionKey::Submission(sub_id))
            {
                submissions.push_back(submission);
            }
        }
        submissions
    }

    /// Return just the lifecycle state of a quest, or None if not found.
    pub fn get_quest_state(env: Env, quest_id: u64) -> Option<QuestState> {
        let quest: Option<Quest> = env
            .storage()
            .persistent()
            .get(&QuestKey::Quest(quest_id));
        quest.map(|q| q.state)
    }
}
