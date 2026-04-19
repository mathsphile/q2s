#![no_std]
#![allow(deprecated)] // publish() with tuple topics is the standard Soroban event pattern

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env};

// ── Error types ────────────────────────────────────────────────────────

/// Descriptive error types for the Liquidity Pool Contract.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PoolError {
    /// The pool does not have enough reserves to fulfill the swap.
    InsufficientLiquidity = 1,
    /// The swap would move the reserve ratio beyond the configured max slippage.
    SlippageExceeded = 2,
    /// A withdrawal would reduce reserves below the minimum liquidity threshold.
    MinLiquidityViolation = 3,
    /// The provided amount is invalid (e.g. zero or negative).
    InvalidAmount = 4,
    /// The contract has already been initialized.
    AlreadyInitialized = 5,
    /// The contract has not been initialized yet.
    NotInitialized = 6,
}

// ── Data models ────────────────────────────────────────────────────────

/// Pool reserves and configuration stored in instance storage.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PoolReserves {
    pub quest_reserve: i128,
    pub xlm_reserve: i128,
    pub total_lp_supply: i128,
    pub swap_fee_bps: u32,
    pub max_slippage_bps: u32,
    pub min_liquidity: i128,
}

// ── Storage keys ───────────────────────────────────────────────────────

/// Storage keys for instance-level data (shared contract configuration).
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    /// The QUEST token contract address.
    TokenQuest,
    /// The XLM token contract address.
    TokenXlm,
    /// Whether the contract has been initialized.
    Initialized,
    /// The pool reserves and configuration.
    Reserves,
}

/// Storage keys for persistent per-user LP token balances.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum LpKey {
    LpBalance(Address),
}

// ── Contract ───────────────────────────────────────────────────────────

#[contract]
pub struct LiquidityPoolContract;

#[contractimpl]
impl LiquidityPoolContract {
    /// Initialize the liquidity pool with token addresses and configuration.
    /// Can only be called once. Returns `PoolError::AlreadyInitialized` on
    /// repeated calls, and `PoolError::InvalidAmount` for invalid parameters.
    pub fn initialize(
        env: Env,
        token_quest: Address,
        token_xlm: Address,
        swap_fee_bps: u32,
        max_slippage_bps: u32,
        min_liquidity: i128,
    ) -> Result<(), PoolError> {
        // Prevent re-initialization
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(PoolError::AlreadyInitialized);
        }

        // Validate parameters
        if min_liquidity < 0 {
            return Err(PoolError::InvalidAmount);
        }

        // Store token addresses in instance storage
        env.storage()
            .instance()
            .set(&DataKey::TokenQuest, &token_quest);
        env.storage()
            .instance()
            .set(&DataKey::TokenXlm, &token_xlm);

        // Store initial pool reserves (empty pool)
        let reserves = PoolReserves {
            quest_reserve: 0,
            xlm_reserve: 0,
            total_lp_supply: 0,
            swap_fee_bps,
            max_slippage_bps,
            min_liquidity,
        };
        env.storage().instance().set(&DataKey::Reserves, &reserves);

        // Mark as initialized
        env.storage().instance().set(&DataKey::Initialized, &true);

        Ok(())
    }

    /// Swap `amount_in` of `token_in` for the other token in the pool.
    ///
    /// Uses the constant-product AMM formula (x * y = k) with fee deduction.
    /// Returns the output amount on success.
    ///
    /// # Errors
    /// - `PoolError::NotInitialized` if the pool has not been initialized.
    /// - `PoolError::InvalidAmount` if `amount_in` is not positive.
    /// - `PoolError::InvalidAmount` if `token_in` does not match either pool token.
    /// - `PoolError::InsufficientLiquidity` if the output exceeds available reserves.
    /// - `PoolError::SlippageExceeded` if the price impact exceeds `max_slippage_bps`.
    /// - `PoolError::SlippageExceeded` if `amount_out < min_amount_out`.
    pub fn swap(
        env: Env,
        user: Address,
        token_in: Address,
        amount_in: i128,
        min_amount_out: i128,
    ) -> Result<i128, PoolError> {
        // 1. Require authorization from the user
        user.require_auth();

        // 2. Validate amount_in > 0
        if amount_in <= 0 {
            return Err(PoolError::InvalidAmount);
        }

        // 3. Ensure the pool is initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(PoolError::NotInitialized);
        }

        // 4. Load reserves and token addresses
        let reserves: PoolReserves = env
            .storage()
            .instance()
            .get(&DataKey::Reserves)
            .ok_or(PoolError::NotInitialized)?;

        let token_quest: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenQuest)
            .ok_or(PoolError::NotInitialized)?;
        let token_xlm: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenXlm)
            .ok_or(PoolError::NotInitialized)?;

        // 5. Determine swap direction
        let (reserve_in, reserve_out, token_out) = if token_in == token_quest {
            // QUEST → XLM
            (reserves.quest_reserve, reserves.xlm_reserve, token_xlm.clone())
        } else if token_in == token_xlm {
            // XLM → QUEST
            (reserves.xlm_reserve, reserves.quest_reserve, token_quest.clone())
        } else {
            return Err(PoolError::InvalidAmount);
        };

        // 6. Calculate fee and amount after fee
        let fee = (amount_in * reserves.swap_fee_bps as i128) / 10_000;
        let amount_in_after_fee = amount_in - fee;

        // 7. Calculate output using constant-product formula:
        //    amount_out = (reserve_out * amount_in_after_fee) / (reserve_in + amount_in_after_fee)
        let amount_out =
            (reserve_out * amount_in_after_fee) / (reserve_in + amount_in_after_fee);

        // 8. Validate amount_out > 0 and does not exceed available reserves
        if amount_out <= 0 || amount_out > reserve_out {
            return Err(PoolError::InsufficientLiquidity);
        }

        // 9. Validate minimum output (user-specified slippage protection)
        if amount_out < min_amount_out {
            return Err(PoolError::SlippageExceeded);
        }

        // 10. Check max slippage: price impact = amount_out / reserve_out (in bps)
        //     price_impact_bps = (amount_out * 10000) / reserve_out
        let price_impact_bps = (amount_out * 10_000) / reserve_out;
        if price_impact_bps > reserves.max_slippage_bps as i128 {
            return Err(PoolError::SlippageExceeded);
        }

        // 11. Transfer token_in from user to pool (this contract)
        let pool_address = env.current_contract_address();
        let token_in_client = token::TokenClient::new(&env, &token_in);
        token_in_client.transfer(&user, &pool_address, &amount_in);

        // 12. Transfer token_out from pool to user
        let token_out_client = token::TokenClient::new(&env, &token_out);
        token_out_client.transfer(&pool_address, &user, &amount_out);

        // 13. Update reserves
        let (new_quest_reserve, new_xlm_reserve) = if token_in == token_quest {
            (
                reserves.quest_reserve + amount_in,
                reserves.xlm_reserve - amount_out,
            )
        } else {
            (
                reserves.quest_reserve - amount_out,
                reserves.xlm_reserve + amount_in,
            )
        };

        let updated_reserves = PoolReserves {
            quest_reserve: new_quest_reserve,
            xlm_reserve: new_xlm_reserve,
            ..reserves
        };
        env.storage()
            .instance()
            .set(&DataKey::Reserves, &updated_reserves);

        // 14. Emit swap event with input token, output token, amounts, and user address
        env.events().publish(
            (symbol_short!("swap"), token_in, token_out),
            (amount_in, amount_out, user),
        );

        Ok(amount_out)
    }

    /// Add liquidity to the pool by depositing QUEST and XLM tokens.
    ///
    /// Mints LP tokens proportional to the user's share of the pool.
    /// For the first deposit (empty pool), LP tokens = sqrt(amount_quest * amount_xlm).
    /// For subsequent deposits, LP tokens = min(amount_quest * total_lp / quest_reserve,
    ///                                          amount_xlm * total_lp / xlm_reserve).
    ///
    /// # Errors
    /// - `PoolError::NotInitialized` if the pool has not been initialized.
    /// - `PoolError::InvalidAmount` if either amount is not positive.
    /// - `PoolError::InvalidAmount` if computed LP tokens would be zero.
    pub fn deposit(
        env: Env,
        user: Address,
        amount_quest: i128,
        amount_xlm: i128,
    ) -> Result<i128, PoolError> {
        // 1. Require authorization from the user
        user.require_auth();

        // 2. Validate both amounts > 0
        if amount_quest <= 0 || amount_xlm <= 0 {
            return Err(PoolError::InvalidAmount);
        }

        // 3. Ensure the pool is initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(PoolError::NotInitialized);
        }

        // 4. Load reserves and token addresses
        let reserves: PoolReserves = env
            .storage()
            .instance()
            .get(&DataKey::Reserves)
            .ok_or(PoolError::NotInitialized)?;

        let token_quest: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenQuest)
            .ok_or(PoolError::NotInitialized)?;
        let token_xlm: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenXlm)
            .ok_or(PoolError::NotInitialized)?;

        // 5. Calculate LP tokens to mint
        let lp_tokens = if reserves.total_lp_supply == 0 {
            // First deposit: lp_tokens = sqrt(amount_quest * amount_xlm)
            let product = amount_quest * amount_xlm;
            isqrt(product)
        } else {
            // Subsequent deposits: proportional to existing pool
            let lp_from_quest =
                (amount_quest * reserves.total_lp_supply) / reserves.quest_reserve;
            let lp_from_xlm =
                (amount_xlm * reserves.total_lp_supply) / reserves.xlm_reserve;
            // Use the minimum to maintain pool ratio
            if lp_from_quest < lp_from_xlm {
                lp_from_quest
            } else {
                lp_from_xlm
            }
        };

        // Validate LP tokens > 0
        if lp_tokens <= 0 {
            return Err(PoolError::InvalidAmount);
        }

        // 6. Transfer QUEST and XLM from user to pool
        let pool_address = env.current_contract_address();
        let quest_client = token::TokenClient::new(&env, &token_quest);
        let xlm_client = token::TokenClient::new(&env, &token_xlm);

        quest_client.transfer(&user, &pool_address, &amount_quest);
        xlm_client.transfer(&user, &pool_address, &amount_xlm);

        // 7. Update reserves
        let new_quest_reserve = reserves.quest_reserve + amount_quest;
        let new_xlm_reserve = reserves.xlm_reserve + amount_xlm;
        let new_total_lp = reserves.total_lp_supply + lp_tokens;

        let updated_reserves = PoolReserves {
            quest_reserve: new_quest_reserve,
            xlm_reserve: new_xlm_reserve,
            total_lp_supply: new_total_lp,
            ..reserves
        };
        env.storage()
            .instance()
            .set(&DataKey::Reserves, &updated_reserves);

        // 8. Update user's LP balance in persistent storage
        let lp_key = LpKey::LpBalance(user.clone());
        let current_lp: i128 = env
            .storage()
            .persistent()
            .get(&lp_key)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&lp_key, &(current_lp + lp_tokens));

        // 9. Emit deposit event
        env.events().publish(
            (symbol_short!("deposit"), user),
            (amount_quest, amount_xlm, lp_tokens),
        );

        Ok(lp_tokens)
    }

    /// Return the current pool reserves as (quest_reserve, xlm_reserve).
    ///
    /// # Errors
    /// - `PoolError::NotInitialized` if the pool has not been initialized.
    pub fn get_reserves(env: Env) -> Result<(i128, i128), PoolError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(PoolError::NotInitialized);
        }

        let reserves: PoolReserves = env
            .storage()
            .instance()
            .get(&DataKey::Reserves)
            .ok_or(PoolError::NotInitialized)?;

        Ok((reserves.quest_reserve, reserves.xlm_reserve))
    }

    /// Return the spot price for a given input token.
    ///
    /// The spot price is calculated as `reserve_out * PRECISION / reserve_in`
    /// where PRECISION = 1_000_000_000 (9 decimal places).
    ///
    /// # Errors
    /// - `PoolError::NotInitialized` if the pool has not been initialized.
    /// - `PoolError::InvalidAmount` if `token_in` does not match either pool token.
    /// - `PoolError::InsufficientLiquidity` if the input reserve is zero.
    pub fn get_spot_price(env: Env, token_in: Address) -> Result<i128, PoolError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(PoolError::NotInitialized);
        }

        let reserves: PoolReserves = env
            .storage()
            .instance()
            .get(&DataKey::Reserves)
            .ok_or(PoolError::NotInitialized)?;

        let token_quest: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenQuest)
            .ok_or(PoolError::NotInitialized)?;
        let token_xlm: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenXlm)
            .ok_or(PoolError::NotInitialized)?;

        const PRECISION: i128 = 1_000_000_000; // 9 decimal places

        let (reserve_in, reserve_out) = if token_in == token_quest {
            (reserves.quest_reserve, reserves.xlm_reserve)
        } else if token_in == token_xlm {
            (reserves.xlm_reserve, reserves.quest_reserve)
        } else {
            return Err(PoolError::InvalidAmount);
        };

        if reserve_in == 0 {
            return Err(PoolError::InsufficientLiquidity);
        }

        Ok(reserve_out * PRECISION / reserve_in)
    }

    /// Remove liquidity from the pool by burning LP tokens.
    ///
    /// Returns the proportional share of QUEST and XLM tokens to the user.
    ///
    /// # Errors
    /// - `PoolError::NotInitialized` if the pool has not been initialized.
    /// - `PoolError::InvalidAmount` if `lp_amount` is not positive.
    /// - `PoolError::InvalidAmount` if user has insufficient LP balance.
    /// - `PoolError::MinLiquidityViolation` if withdrawal would reduce reserves
    ///   below the minimum liquidity threshold.
    pub fn withdraw(
        env: Env,
        user: Address,
        lp_amount: i128,
    ) -> Result<(i128, i128), PoolError> {
        // 1. Require authorization from the user
        user.require_auth();

        // 2. Validate lp_amount > 0
        if lp_amount <= 0 {
            return Err(PoolError::InvalidAmount);
        }

        // 3. Ensure the pool is initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(PoolError::NotInitialized);
        }

        // 4. Load reserves and token addresses
        let reserves: PoolReserves = env
            .storage()
            .instance()
            .get(&DataKey::Reserves)
            .ok_or(PoolError::NotInitialized)?;

        let token_quest: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenQuest)
            .ok_or(PoolError::NotInitialized)?;
        let token_xlm: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenXlm)
            .ok_or(PoolError::NotInitialized)?;

        // 5. Load user's LP balance and validate
        let lp_key = LpKey::LpBalance(user.clone());
        let user_lp: i128 = env
            .storage()
            .persistent()
            .get(&lp_key)
            .unwrap_or(0);

        if user_lp < lp_amount {
            return Err(PoolError::InvalidAmount);
        }

        // 6. Calculate proportional amounts to return
        let quest_out =
            (lp_amount * reserves.quest_reserve) / reserves.total_lp_supply;
        let xlm_out =
            (lp_amount * reserves.xlm_reserve) / reserves.total_lp_supply;

        // 7. Validate remaining reserves >= min_liquidity
        let remaining_quest = reserves.quest_reserve - quest_out;
        let remaining_xlm = reserves.xlm_reserve - xlm_out;

        if remaining_quest < reserves.min_liquidity
            || remaining_xlm < reserves.min_liquidity
        {
            return Err(PoolError::MinLiquidityViolation);
        }

        // 8. Transfer QUEST and XLM from pool to user
        let pool_address = env.current_contract_address();
        let quest_client = token::TokenClient::new(&env, &token_quest);
        let xlm_client = token::TokenClient::new(&env, &token_xlm);

        quest_client.transfer(&pool_address, &user, &quest_out);
        xlm_client.transfer(&pool_address, &user, &xlm_out);

        // 9. Update reserves
        let new_total_lp = reserves.total_lp_supply - lp_amount;

        let updated_reserves = PoolReserves {
            quest_reserve: remaining_quest,
            xlm_reserve: remaining_xlm,
            total_lp_supply: new_total_lp,
            ..reserves
        };
        env.storage()
            .instance()
            .set(&DataKey::Reserves, &updated_reserves);

        // 10. Update user's LP balance
        env.storage()
            .persistent()
            .set(&lp_key, &(user_lp - lp_amount));

        // 11. Emit withdraw event
        env.events().publish(
            (symbol_short!("withdraw"), user),
            (quest_out, xlm_out, lp_amount),
        );

        Ok((quest_out, xlm_out))
    }
}

// ── Helper functions ───────────────────────────────────────────────────

/// Integer square root using Newton's method.
/// Returns the largest integer `r` such that `r * r <= n`.
fn isqrt(n: i128) -> i128 {
    if n <= 0 {
        return 0;
    }
    if n == 1 {
        return 1;
    }

    // Initial guess: start with n/2 (good enough for Newton's convergence)
    let mut x = n;
    let mut y = (x + 1) / 2;

    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }

    x
}
