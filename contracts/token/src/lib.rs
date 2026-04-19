#![no_std]
#![allow(deprecated)] // publish() with tuple topics is the standard SEP-41 event pattern

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String};

/// Descriptive error types for the Token Contract.
/// Used by admin operations (initialize, mint, burn) to return structured errors
/// instead of panics. SEP-41 interface functions retain panics per the standard.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TokenError {
    /// The sender does not have enough tokens for the operation.
    InsufficientBalance = 1,
    /// Minting would cause total supply to exceed the configured maximum.
    SupplyOverflow = 2,
    /// The caller is not authorized to perform this operation.
    Unauthorized = 3,
    /// The provided amount is invalid (e.g. zero or negative).
    InvalidAmount = 4,
    /// The contract has already been initialized.
    AlreadyInitialized = 5,
    /// The contract has not been initialized yet.
    NotInitialized = 6,
    /// The allowance for the spender has expired.
    AllowanceExpired = 7,
    /// The spender does not have enough allowance for the operation.
    InsufficientAllowance = 8,
    /// No allowance has been set for the spender.
    NoAllowanceSet = 9,
}

/// Storage keys for instance-level data (shared contract metadata).
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    Admin,
    Name,
    Symbol,
    Decimals,
    MaxSupply,
    TotalSupply,
    Initialized,
}

/// Storage keys for persistent per-account data.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum BalanceKey {
    Balance(Address),
}

/// Storage keys for persistent allowance data.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct AllowanceKey {
    pub from: Address,
    pub spender: Address,
}

/// Allowance value with amount and expiration ledger.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct AllowanceValue {
    pub amount: i128,
    pub expiration_ledger: u32,
}

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    /// Initialize the QUEST token with admin, metadata, and max supply.
    /// Can only be called once. Returns `TokenError::AlreadyInitialized` on
    /// repeated calls, and `TokenError::InvalidAmount` if max_supply is negative.
    pub fn initialize(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
        decimal: u32,
        max_supply: i128,
    ) -> Result<(), TokenError> {
        // Prevent re-initialization
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(TokenError::AlreadyInitialized);
        }

        // Validate max_supply
        if max_supply < 0 {
            return Err(TokenError::InvalidAmount);
        }

        // Store admin in instance storage
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Store token metadata in instance storage
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::Decimals, &decimal);

        // Store supply configuration
        env.storage().instance().set(&DataKey::MaxSupply, &max_supply);
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);

        // Mark as initialized
        env.storage().instance().set(&DataKey::Initialized, &true);

        Ok(())
    }

    // ── SEP-41 read-only metadata ──────────────────────────────────────

    /// Return the token name.
    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::Name).unwrap()
    }

    /// Return the token symbol.
    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&DataKey::Symbol).unwrap()
    }

    /// Return the number of decimals.
    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Decimals).unwrap()
    }

    // ── SEP-41 balance ─────────────────────────────────────────────────

    /// Return the token balance for `id`. Returns 0 if no balance stored.
    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&BalanceKey::Balance(id))
            .unwrap_or(0)
    }

    // ── SEP-41 transfer ────────────────────────────────────────────────

    /// Transfer `amount` tokens from `from` to `to`.
    /// Requires authorization from `from`.
    /// Panics on invalid inputs per the SEP-41 standard.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        if amount < 0 {
            panic!("transfer amount must be non-negative");
        }

        // Read sender balance
        let from_balance: i128 = env
            .storage()
            .persistent()
            .get(&BalanceKey::Balance(from.clone()))
            .unwrap_or(0);

        if from_balance < amount {
            panic!("insufficient balance");
        }

        // Update sender balance
        env.storage()
            .persistent()
            .set(&BalanceKey::Balance(from.clone()), &(from_balance - amount));

        // Update receiver balance
        let to_balance: i128 = env
            .storage()
            .persistent()
            .get(&BalanceKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&BalanceKey::Balance(to.clone()), &(to_balance + amount));

        // Emit transfer event
        env.events()
            .publish((symbol_short!("transfer"), from, to), amount);
    }

    // ── SEP-41 approve ─────────────────────────────────────────────────

    /// Approve `spender` to spend up to `amount` tokens on behalf of `from`.
    /// The approval expires at `expiration_ledger`.
    /// Panics on invalid inputs per the SEP-41 standard.
    pub fn approve(
        env: Env,
        from: Address,
        spender: Address,
        amount: i128,
        expiration_ledger: u32,
    ) {
        from.require_auth();

        if amount < 0 {
            panic!("approve amount must be non-negative");
        }

        let key = AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        };

        let allowance = AllowanceValue {
            amount,
            expiration_ledger,
        };

        env.storage().persistent().set(&key, &allowance);

        // Emit approval event
        env.events()
            .publish((symbol_short!("approve"), from, spender), amount);
    }

    // ── SEP-41 allowance ───────────────────────────────────────────────

    /// Return the current allowance that `spender` can spend from `from`.
    /// Returns 0 if no allowance exists or if the allowance has expired.
    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let key = AllowanceKey { from, spender };

        if let Some(allowance) = env.storage().persistent().get::<AllowanceKey, AllowanceValue>(&key)
        {
            if allowance.expiration_ledger < env.ledger().sequence() {
                // Allowance has expired
                0
            } else {
                allowance.amount
            }
        } else {
            0
        }
    }

    // ── SEP-41 transfer_from ───────────────────────────────────────────

    /// Transfer `amount` tokens from `from` to `to` on behalf of `spender`.
    /// Requires authorization from `spender` and a sufficient allowance.
    /// Panics on invalid inputs per the SEP-41 standard.
    pub fn transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        spender.require_auth();

        if amount < 0 {
            panic!("transfer amount must be non-negative");
        }

        // Check allowance
        let allowance_key = AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        };

        let allowance_val: AllowanceValue = env
            .storage()
            .persistent()
            .get(&allowance_key)
            .unwrap_or_else(|| panic!("no allowance set"));

        if allowance_val.expiration_ledger < env.ledger().sequence() {
            panic!("allowance expired");
        }

        if allowance_val.amount < amount {
            panic!("insufficient allowance");
        }

        // Check sender balance
        let from_balance: i128 = env
            .storage()
            .persistent()
            .get(&BalanceKey::Balance(from.clone()))
            .unwrap_or(0);

        if from_balance < amount {
            panic!("insufficient balance");
        }

        // Deduct allowance
        let new_allowance = AllowanceValue {
            amount: allowance_val.amount - amount,
            expiration_ledger: allowance_val.expiration_ledger,
        };
        env.storage()
            .persistent()
            .set(&allowance_key, &new_allowance);

        // Update sender balance
        env.storage()
            .persistent()
            .set(&BalanceKey::Balance(from.clone()), &(from_balance - amount));

        // Update receiver balance
        let to_balance: i128 = env
            .storage()
            .persistent()
            .get(&BalanceKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&BalanceKey::Balance(to.clone()), &(to_balance + amount));

        // Emit transfer event
        env.events()
            .publish((symbol_short!("transfer"), from, to), amount);
    }

    // ── Admin operations ───────────────────────────────────────────────

    /// Mint `amount` tokens to `to`. Only the admin can call this.
    /// Returns structured `TokenError` variants instead of panicking.
    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), TokenError> {
        // Verify contract is initialized and get admin
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TokenError::NotInitialized)?;
        admin.require_auth();

        if amount <= 0 {
            return Err(TokenError::InvalidAmount);
        }

        // Check max supply overflow
        let total_supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        let max_supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxSupply)
            .unwrap_or(i128::MAX);

        if total_supply + amount > max_supply {
            return Err(TokenError::SupplyOverflow);
        }

        // Update total supply
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(total_supply + amount));

        // Update recipient balance
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&BalanceKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&BalanceKey::Balance(to.clone()), &(balance + amount));

        // Emit mint event
        env.events()
            .publish((symbol_short!("mint"), admin, to), amount);

        Ok(())
    }

    /// Burn `amount` tokens from `from`. Requires authorization from `from`.
    /// Returns structured `TokenError` variants instead of panicking.
    pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), TokenError> {
        from.require_auth();

        if amount <= 0 {
            return Err(TokenError::InvalidAmount);
        }

        // Check sufficient balance
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&BalanceKey::Balance(from.clone()))
            .unwrap_or(0);

        if balance < amount {
            return Err(TokenError::InsufficientBalance);
        }

        // Update balance
        env.storage()
            .persistent()
            .set(&BalanceKey::Balance(from.clone()), &(balance - amount));

        // Update total supply
        let total_supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(total_supply - amount));

        // Emit burn event
        env.events()
            .publish((symbol_short!("burn"), from), amount);

        Ok(())
    }

    /// Return the current total supply of QUEST tokens.
    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }
}
