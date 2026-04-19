#![no_std]
#![allow(deprecated)] // publish() with tuple topics is the standard event pattern

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, token};

/// Descriptive error types for the Treasury Contract.
/// Used by fund, release, and refund operations to return structured errors.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TreasuryError {
    /// The organizer does not have enough tokens to fund the quest.
    InsufficientBalance = 1,
    /// No bounty pool exists for the given quest_id.
    QuestNotFound = 2,
    /// The caller is not authorized to perform this operation.
    Unauthorized = 3,
    /// A cross-contract token transfer failed.
    TransferFailed = 4,
    /// The contract has already been initialized.
    AlreadyInitialized = 5,
    /// The contract has not been initialized yet.
    NotInitialized = 6,
    /// The provided amount is invalid (e.g. zero or negative).
    InvalidAmount = 7,
}

/// Instance-level storage keys for contract-wide configuration.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    /// The admin/initializer address.
    Admin,
    /// The QUEST token contract address used for cross-contract transfers.
    TokenContract,
    /// Whether the contract has been initialized.
    Initialized,
}

/// Persistent storage key for per-quest bounty pools.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum PoolKey {
    /// Bounty pool for a specific quest, keyed by quest_id.
    BountyPool(u64),
}

/// Represents a bounty pool associated with a quest.
/// Tracks the total funded amount, how much has been distributed,
/// and the organizer who funded it.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct BountyPool {
    /// The quest identifier this pool belongs to.
    pub quest_id: u64,
    /// Total QUEST tokens locked in this pool.
    pub total_funded: i128,
    /// Total QUEST tokens distributed to ambassadors so far.
    pub distributed: i128,
    /// The organizer who funded this bounty pool.
    pub organizer: Address,
}

#[contract]
pub struct TreasuryContract;

#[contractimpl]
impl TreasuryContract {
    /// Initialize the Treasury Contract with the admin address and the
    /// QUEST token contract address used for cross-contract transfers.
    /// Can only be called once.
    pub fn initialize(
        env: Env,
        admin: Address,
        token_contract: Address,
    ) -> Result<(), TreasuryError> {
        // Prevent re-initialization
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(TreasuryError::AlreadyInitialized);
        }

        // Store admin
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Store token contract address for cross-contract calls
        env.storage()
            .instance()
            .set(&DataKey::TokenContract, &token_contract);

        // Mark as initialized
        env.storage().instance().set(&DataKey::Initialized, &true);

        Ok(())
    }

    /// Lock QUEST tokens in a bounty pool for a quest.
    ///
    /// The organizer must authorize this call. The specified `amount` of QUEST
    /// tokens is transferred from the organizer's wallet to the treasury
    /// contract via a cross-contract call to the Token Contract's `transfer`.
    /// A `BountyPool` record is created and stored in persistent storage.
    pub fn fund_quest(
        env: Env,
        quest_id: u64,
        organizer: Address,
        amount: i128,
    ) -> Result<(), TreasuryError> {
        // 1. Require authorization from the organizer
        organizer.require_auth();

        // 2. Validate amount is positive
        if amount <= 0 {
            return Err(TreasuryError::InvalidAmount);
        }

        // 3. Ensure the contract is initialized and get the token contract address
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .ok_or(TreasuryError::NotInitialized)?;

        // 4. Transfer tokens from organizer to treasury via cross-contract call.
        //    The token contract's `transfer` will panic with "insufficient balance"
        //    if the organizer doesn't have enough tokens, which surfaces as a
        //    transaction failure to the caller.
        let token_client = token::TokenClient::new(&env, &token_address);
        token_client.transfer(&organizer, &env.current_contract_address(), &amount);

        // 5. Create the bounty pool record
        let pool = BountyPool {
            quest_id,
            total_funded: amount,
            distributed: 0,
            organizer: organizer.clone(),
        };

        // 6. Store the bounty pool in persistent storage
        env.storage()
            .persistent()
            .set(&PoolKey::BountyPool(quest_id), &pool);

        // 7. Emit funding event
        env.events().publish(
            (symbol_short!("fund"), quest_id),
            (organizer, amount),
        );

        Ok(())
    }

    /// Release a reward to an ambassador from a quest's bounty pool.
    ///
    /// Transfers `amount` QUEST tokens from the treasury to the ambassador's
    /// wallet via the Token Contract. Updates the bounty pool's distributed
    /// amount on success. On transfer failure, funds are retained in the pool
    /// and an error event is emitted.
    ///
    /// The admin must authorize this call (typically invoked cross-contract
    /// by the Quest Contract).
    pub fn release_reward(
        env: Env,
        quest_id: u64,
        ambassador: Address,
        amount: i128,
    ) -> Result<(), TreasuryError> {
        // 1. Require admin authorization (called via Quest Contract cross-contract)
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TreasuryError::NotInitialized)?;
        admin.require_auth();

        // 2. Validate amount is positive
        if amount <= 0 {
            return Err(TreasuryError::InvalidAmount);
        }

        // 3. Look up the bounty pool for this quest
        let mut pool: BountyPool = env
            .storage()
            .persistent()
            .get(&PoolKey::BountyPool(quest_id))
            .ok_or(TreasuryError::QuestNotFound)?;

        // 4. Validate sufficient remaining funds in the pool
        let remaining = pool.total_funded - pool.distributed;
        if remaining < amount {
            return Err(TreasuryError::InsufficientBalance);
        }

        // 5. Get the token contract address
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .ok_or(TreasuryError::NotInitialized)?;

        // 6. Transfer tokens from treasury to ambassador.
        //    Use try_transfer to handle failures gracefully — on failure,
        //    retain funds in the pool and emit an error event.
        let token_client = token::TokenClient::new(&env, &token_address);
        let transfer_result = token_client.try_transfer(
            &env.current_contract_address(),
            &ambassador,
            &amount,
        );

        if transfer_result.is_err() {
            // Retain funds and emit error event for retry processing
            env.events().publish(
                (symbol_short!("rew_err"), quest_id),
                (ambassador, amount),
            );
            return Err(TreasuryError::TransferFailed);
        }

        // 7. Update the distributed amount in the bounty pool
        pool.distributed += amount;
        env.storage()
            .persistent()
            .set(&PoolKey::BountyPool(quest_id), &pool);

        // 8. Emit reward distribution event
        env.events().publish(
            (symbol_short!("reward"), quest_id),
            (ambassador, amount),
        );

        Ok(())
    }

    /// Refund undistributed funds from a quest's bounty pool to the organizer.
    ///
    /// Calculates the undistributed amount (total_funded - distributed) and
    /// transfers it back to the organizer's wallet via the Token Contract.
    /// On transfer failure, funds are retained in the pool and an error event
    /// is emitted.
    ///
    /// The admin must authorize this call (typically invoked cross-contract
    /// by the Quest Contract on quest cancellation).
    pub fn refund(
        env: Env,
        quest_id: u64,
        organizer: Address,
    ) -> Result<i128, TreasuryError> {
        // 1. Require admin authorization (called via Quest Contract cross-contract)
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TreasuryError::NotInitialized)?;
        admin.require_auth();

        // 2. Look up the bounty pool for this quest
        let mut pool: BountyPool = env
            .storage()
            .persistent()
            .get(&PoolKey::BountyPool(quest_id))
            .ok_or(TreasuryError::QuestNotFound)?;

        // 3. Calculate undistributed funds
        let undistributed = pool.total_funded - pool.distributed;

        // 4. If nothing to refund, return 0
        if undistributed <= 0 {
            return Ok(0);
        }

        // 5. Get the token contract address
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .ok_or(TreasuryError::NotInitialized)?;

        // 6. Transfer undistributed funds from treasury back to organizer.
        //    Use try_transfer to handle failures gracefully — on failure,
        //    retain funds in the pool and emit an error event.
        let token_client = token::TokenClient::new(&env, &token_address);
        let transfer_result = token_client.try_transfer(
            &env.current_contract_address(),
            &organizer,
            &undistributed,
        );

        if transfer_result.is_err() {
            // 7. Retain funds and emit error event for retry processing
            env.events().publish(
                (symbol_short!("ref_err"), quest_id),
                (organizer, undistributed),
            );
            return Err(TreasuryError::TransferFailed);
        }

        // 8. Update the pool: mark all funds as distributed (fully refunded)
        pool.distributed = pool.total_funded;
        env.storage()
            .persistent()
            .set(&PoolKey::BountyPool(quest_id), &pool);

        // 9. Emit refund event with quest_id, organizer, and refunded amount
        env.events().publish(
            (symbol_short!("refund"), quest_id),
            (organizer, undistributed),
        );

        // 10. Return the refunded amount
        Ok(undistributed)
    }

    /// Return bounty pool details for a given quest.
    ///
    /// This is a read-only function that retrieves the `BountyPool` from
    /// persistent storage. Panics if no pool exists for the given `quest_id`.
    pub fn get_bounty_pool(env: Env, quest_id: u64) -> BountyPool {
        env.storage()
            .persistent()
            .get(&PoolKey::BountyPool(quest_id))
            .unwrap_or_else(|| panic!("no bounty pool found for quest {}", quest_id))
    }
}
