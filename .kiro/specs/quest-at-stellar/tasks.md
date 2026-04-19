# Implementation Plan: Quest@Stellar

## Overview

This plan implements the Quest@Stellar decentralized bounty marketplace on the Stellar blockchain. The implementation follows an incremental approach: foundational smart contracts first (Token → Treasury → Quest → Liquidity Pool), then backend services (auth, database, event streaming), then frontend (landing page, dashboards, wallet integration), and finally CI/CD. Each task builds on previous steps so there is no orphaned code.

## Tasks

- [x] 1. Set up monorepo structure and project scaffolding
  - Create top-level directory structure: `contracts/` (Rust/Soroban), `frontend/` (Next.js), `backend/` (Node.js/TypeScript)
  - Initialize Soroban project with `soroban contract init` for each contract: `quest`, `treasury`, `token`, `liquidity-pool`
  - Initialize Next.js app with TypeScript and Tailwind CSS in `frontend/`
  - Initialize backend project with TypeScript in `backend/`
  - Add shared types/constants directory for cross-project references
  - Set up workspace-level `Cargo.toml` for Soroban contracts
  - _Requirements: 25.1, 25.3_

- [ ] 2. Implement Token Contract (QUEST SEP-41)
  - [x] 2.1 Define Token Contract data models and storage
    - Create `contracts/token/src/lib.rs` with `TokenContract` struct
    - Define storage keys for admin, name, symbol, decimals, max_supply, total_supply, balances, and allowances
    - Implement `initialize` function to set admin, token metadata, and max supply
    - _Requirements: 12.1_

  - [x] 2.2 Implement SEP-41 token interface
    - Implement `balance`, `transfer`, `transfer_from`, `approve`, `allowance` functions
    - Implement `name`, `symbol`, `decimals` read-only functions
    - Validate sender has sufficient balance before transfers
    - Emit transfer and approval events
    - _Requirements: 12.1, 12.5_

  - [x] 2.3 Implement admin operations (mint, burn, total_supply)
    - Implement `mint` with authorized caller check (admin or Treasury contract)
    - Implement max supply overflow check on mint
    - Implement `burn` with balance validation
    - Implement `total_supply` read-only function
    - _Requirements: 12.2, 12.3, 12.4_

  - [x] 2.4 Implement input validation and error handling for Token Contract
    - Define `TokenError` enum with descriptive variants (InsufficientBalance, SupplyOverflow, Unauthorized, InvalidAmount)
    - Validate all parameters are within expected types and ranges
    - Return descriptive errors for invalid inputs
    - _Requirements: 27.4, 12.3, 12.5_

  - [ ]* 2.5 Write property test for Token Contract round-trip serialization
    - **Property 1: Token transfer parameter round-trip**
    - **Validates: Requirements 26.3**

  - [ ]* 2.6 Write unit tests for Token Contract
    - Test initialize, mint, burn, transfer, transfer_from, approve, allowance
    - Test max supply overflow rejection
    - Test unauthorized mint rejection
    - Test insufficient balance rejection
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 3. Implement Treasury Contract
  - [x] 3.1 Define Treasury Contract data models and storage
    - Create `contracts/treasury/src/lib.rs` with `TreasuryContract` struct
    - Define `BountyPool` struct and storage keys for quest bounty pools
    - Define `TreasuryError` enum with descriptive variants (InsufficientBalance, QuestNotFound, Unauthorized, TransferFailed)
    - _Requirements: 6.1, 10.1_

  - [x] 3.2 Implement fund_quest function
    - Lock specified QUEST token amount in the bounty pool via cross-contract call to Token Contract `transfer`
    - Store bounty pool record with quest_id, total_funded, distributed, and organizer
    - Validate organizer has sufficient token balance
    - Emit funding event
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 3.3 Implement release_reward function
    - Transfer reward amount from bounty pool to ambassador wallet via Token Contract `transfer`
    - Update distributed amount in bounty pool
    - Emit reward distribution event with quest_id, ambassador address, and amount
    - Retain funds and emit error event on transfer failure
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 3.4 Implement refund function
    - Calculate undistributed funds (total_funded - distributed)
    - Transfer undistributed funds back to organizer wallet via Token Contract `transfer`
    - Emit refund event with quest_id, organizer address, and refunded amount
    - Retain funds and emit error event on transfer failure
    - _Requirements: 11.2, 11.3, 11.4_

  - [x] 3.5 Implement get_bounty_pool read-only function
    - Return bounty pool details for a given quest_id
    - _Requirements: 6.4_

  - [ ]* 3.6 Write unit tests for Treasury Contract
    - Test fund_quest with valid and insufficient balance
    - Test release_reward with valid and exceeding pool amounts
    - Test refund with partial and full distributions
    - Test error event emission on failures
    - _Requirements: 6.1, 6.2, 10.1, 10.2, 10.3, 11.2, 11.3, 11.4_

- [ ] 4. Implement Quest Contract
  - [x] 4.1 Define Quest Contract data models and storage
    - Create `contracts/quest/src/lib.rs` with `QuestContract` struct
    - Define `Quest`, `Submission`, `QuestState`, `RewardType`, `SubmissionStatus` types
    - Define `QuestError` enum with descriptive variants (InvalidState, Unauthorized, DuplicateSubmission, DeadlinePassed, QuestNotActive, QuestNotFound)
    - Define storage keys for quests, submissions, and quest counter
    - _Requirements: 5.1, 5.4, 26.1, 26.2_

  - [x] 4.2 Implement create_quest function
    - Accept organizer, title, description, acceptance_criteria, reward_type, reward_amount, max_winners, deadline
    - Validate reward_amount > 0 and required fields are present
    - Create quest in Draft state with unique auto-incremented ID
    - Store quest in Soroban persistent storage
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.3 Implement quest state transition logic
    - Implement `transition_state` function enforcing valid transitions: Draft→Active, Active→InReview, Active→Cancelled, InReview→Completed, InReview→Active, InReview→Cancelled
    - Reject invalid transitions with descriptive error
    - On Cancelled transition, invoke Treasury Contract `refund`
    - Emit state transition events
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.4 Implement submit_work function
    - Validate quest is in Active state
    - Validate deadline has not passed
    - Validate ambassador has no existing active submission for this quest
    - Validate submission content is not duplicate
    - Record submission with ambassador, content, timestamp, and Pending status
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 4.5 Implement approve_submission and reject_submission functions
    - `approve_submission`: validate organizer authorization, invoke Treasury `release_reward`, update submission status to Approved, increment approved_count
    - For Fixed_Reward: release full bounty pool, transition quest to Completed
    - For Split_Reward: release per-winner amount, transition to Completed when approved_count == max_winners
    - `reject_submission`: update submission status to Rejected, allow resubmission if quest is Active or InReview
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 4.6 Implement read-only functions (get_quest, get_submissions, get_quest_state)
    - Return quest details, submission list, and quest state for given IDs
    - _Requirements: 5.4, 7.1_

  - [ ]* 4.7 Write property tests for Quest Contract serialization round-trip
    - **Property 2: Quest data structure round-trip**
    - **Validates: Requirements 26.1**
    - **Property 3: Submission data structure round-trip**
    - **Validates: Requirements 26.2**

  - [ ]* 4.8 Write unit tests for Quest Contract
    - Test create_quest with valid and invalid inputs
    - Test all valid state transitions and invalid transition rejection
    - Test submit_work with active quest, inactive quest, past deadline, duplicate content
    - Test approve/reject submission flows for Fixed and Split reward types
    - Test quest auto-completion on all reward slots filled
    - _Requirements: 5.1–5.5, 7.1–7.5, 8.1–8.6, 9.1–9.5_

- [x] 5. Checkpoint - Smart contract core
  - Ensure all smart contract tests pass, ask the user if questions arise.

- [ ] 6. Implement Liquidity Pool Contract
  - [x] 6.1 Define Liquidity Pool data models and storage
    - Create `contracts/liquidity-pool/src/lib.rs` with `LiquidityPoolContract` struct
    - Define `PoolReserves` struct and storage keys
    - Define `PoolError` enum with descriptive variants (InsufficientLiquidity, SlippageExceeded, MinLiquidityViolation, InvalidAmount)
    - Implement `initialize` function with token addresses, swap_fee_bps, max_slippage_bps, min_liquidity
    - _Requirements: 13.1, 14.1, 14.2_

  - [x] 6.2 Implement swap function with constant-product AMM
    - Calculate output amount using x * y = k formula with fee deduction
    - Validate output does not exceed available reserves
    - Validate swap does not exceed max slippage threshold
    - Execute token transfers via cross-contract calls to Token Contract
    - Emit swap event with input token, output token, amounts, and user address
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.7, 14.1_

  - [x] 6.3 Implement deposit (add liquidity) function
    - Accept QUEST and XLM amounts from user
    - Mint LP tokens proportional to user's share of the pool
    - Update pool reserves
    - _Requirements: 13.5_

  - [x] 6.4 Implement withdraw (remove liquidity) function
    - Accept LP token amount to burn
    - Calculate proportional QUEST and XLM to return
    - Validate withdrawal does not reduce reserves below minimum liquidity
    - Return tokens to user and update reserves
    - _Requirements: 13.6, 14.2, 14.3_

  - [x] 6.5 Implement read-only functions (get_reserves, get_spot_price)
    - Return current pool reserves and spot price for a given input token
    - _Requirements: 13.1, 16.4_

  - [ ]* 6.6 Write unit tests for Liquidity Pool Contract
    - Test swap in both directions with fee calculation
    - Test insufficient liquidity rejection
    - Test slippage exceeded rejection
    - Test deposit and LP token minting
    - Test withdraw and minimum liquidity enforcement
    - Test event emission
    - _Requirements: 13.1–13.7, 14.1–14.3_

- [x] 7. Checkpoint - All smart contracts complete
  - Ensure all smart contract tests pass, ask the user if questions arise.

- [ ] 8. Set up PostgreSQL database and schema
  - [x] 8.1 Create database migration files
    - Create `users` table with id, email, password_hash, salt, role, wallet_address, is_banned, reputation_score, created_at, updated_at
    - Create `sessions` table with id, user_id, token_hash, expires_at, created_at
    - Create `login_attempts` table with email, attempted_at, success
    - Create `disputes` table with id, submission_id, quest_id, ambassador_id, reason, admin_id, resolution, created_at, resolved_at
    - Create `failed_transactions` table with id, tx_type, user_id, error_details, quest_id, amount, retry_count, status, created_at
    - Add indexes on email, user_id, and quest_id columns
    - _Requirements: 1.1, 1.4, 2.4, 15.3, 20.1, 22.3_

  - [x] 8.2 Set up database connection and ORM layer
    - Configure PostgreSQL connection with environment variables
    - Set up Prisma or Drizzle ORM with TypeScript types matching the schema
    - Create database client singleton
    - _Requirements: 1.1_

- [ ] 9. Implement Auth Service (Backend)
  - [x] 9.1 Implement user registration endpoint
    - Accept email, password, and role (admin, organizer, ambassador)
    - Validate email format and uniqueness
    - Validate password minimum length (8 characters)
    - Hash password with bcrypt using unique salt per user
    - Store user record in PostgreSQL
    - Return created user (without password hash)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 9.2 Implement login endpoint with rate limiting
    - Accept email and password
    - Verify credentials against stored hash
    - Return generic error on invalid credentials (no email/password distinction)
    - Generate JWT session token with user role in payload
    - Store session in sessions table
    - Implement rate limiting: max 10 failed attempts per email in 15-minute window
    - Record login attempts in login_attempts table
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 9.3 Implement token verification, refresh, and logout
    - `verifyToken`: validate JWT signature and expiration, return token payload
    - `refreshToken`: issue new JWT if current token is valid but near expiry
    - `logout`: invalidate session by removing from sessions table
    - Require re-authentication on expired tokens
    - _Requirements: 2.3_

  - [x] 9.4 Implement CSRF protection and secure headers middleware
    - Add CSRF token validation on all state-changing requests
    - Set Content-Security-Policy, X-Content-Type-Options, Strict-Transport-Security headers
    - _Requirements: 27.2, 27.3_

  - [ ]* 9.5 Write unit tests for Auth Service
    - Test registration with valid, duplicate email, and short password inputs
    - Test login with valid, invalid, and rate-limited scenarios
    - Test token verification, refresh, and logout
    - Test CSRF protection
    - _Requirements: 1.1–1.4, 2.1–2.4, 27.2, 27.3_

- [x] 10. Implement role-based access control middleware
  - Create authentication middleware that extracts and verifies JWT from request headers
  - Create authorization middleware that checks user role against required role for each route
  - Return 401 for unauthenticated requests, 403 for unauthorized role access
  - Redirect unauthenticated users to login page on frontend
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 11. Implement Admin API endpoints
  - [x] 11.1 Implement user management endpoints
    - `GET /api/admin/users` — list all users with role, registration date, status, wallet connection
    - `POST /api/admin/users/:id/ban` — ban user, revoke active sessions
    - `POST /api/admin/users/:id/unban` — unban user, restore access
    - Restrict all endpoints to Admin role
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 11.2 Implement platform monitoring endpoints
    - `GET /api/admin/analytics` — return total users by role, quests by state, funds locked, tokens distributed
    - `GET /api/admin/quests` — list all quests with state, organizer, funding status, submission count
    - `POST /api/admin/quests/:id/flag` — flag quest, suspend submissions, notify organizer
    - `GET /api/admin/pool-stats` — return LP reserves, swap volume, LP token supply
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 11.3 Implement dispute management endpoints
    - `GET /api/admin/disputes` — list all disputes with submission, rejection reason, dispute reason
    - `POST /api/admin/disputes/:id/resolve` — resolve dispute (ambassador_wins triggers approval + reward, organizer_wins closes dispute)
    - _Requirements: 20.2, 20.3, 20.4_

- [ ] 12. Implement Organizer and Ambassador API endpoints
  - [x] 12.1 Implement quest CRUD API endpoints
    - `POST /api/quests` — create quest (calls Quest Contract)
    - `GET /api/quests` — list quests with filters (state, reward type, keyword)
    - `GET /api/quests/:id` — get quest details with bounty pool info
    - `POST /api/quests/:id/fund` — fund quest (calls Treasury Contract)
    - `POST /api/quests/:id/state` — transition quest state
    - `POST /api/quests/:id/cancel` — cancel quest and trigger refund
    - _Requirements: 5.1–5.5, 6.1–6.5, 7.1–7.5, 11.1_

  - [x] 12.2 Implement submission API endpoints
    - `POST /api/quests/:id/submissions` — submit work (calls Quest Contract)
    - `GET /api/quests/:id/submissions` — list submissions for a quest
    - `POST /api/submissions/:id/approve` — approve submission (calls Quest Contract)
    - `POST /api/submissions/:id/reject` — reject submission (calls Quest Contract)
    - _Requirements: 8.1–8.6, 9.1–9.5_

  - [x] 12.3 Implement dispute and reputation endpoints
    - `POST /api/disputes` — raise dispute on rejected submission
    - `GET /api/ambassadors/:id/reputation` — get reputation score
    - Update reputation on submission approval (+increment) and rejection (-decrement, min 0)
    - _Requirements: 20.1, 21.1, 21.2, 21.3_

  - [x] 12.4 Implement transaction retry and failed transaction logging
    - Log all failed blockchain transactions with type, error, timestamp, user_id
    - `POST /api/transactions/:id/retry` — verify on-chain state before resubmitting
    - Prevent duplicate operations on retry
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

- [x] 13. Checkpoint - Backend services complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [ ] 14. Implement frontend design system and shared components
  - [x] 14.1 Set up Tailwind CSS design system
    - Configure Tailwind with custom color palette, gradients, glassmorphism utilities
    - Define typography scale, spacing system, and border-radius tokens
    - Create CSS utility classes for glass-card, gradient-bg, subtle-animation effects
    - Ensure all interactive elements have minimum 44x44px tap targets for mobile
    - _Requirements: 23.2, 24.2_

  - [x] 14.2 Build shared UI components
    - Create Button, Input, Card, Modal, Badge, Toast, Skeleton loader components
    - Create responsive Sidebar and TopNav navigation components
    - Create hamburger menu for mobile viewports (<768px)
    - Create DashboardLayout component with role-based sidebar navigation
    - Ensure all components are responsive from 320px to 2560px
    - _Requirements: 24.1, 24.3_

  - [x] 14.3 Implement AuthProvider context
    - Create React context for JWT session management
    - Implement login, logout, register, and token refresh functions
    - Store token in httpOnly cookie or secure storage
    - Redirect unauthenticated users to login page
    - _Requirements: 2.1, 2.3, 3.5_

  - [x] 14.4 Implement WalletProvider context
    - Integrate `@creit.tech/stellar-wallets-kit` for Freighter and other wallets
    - Implement connect, disconnect, and getBalance functions
    - Display wallet address and XLM balance when connected
    - Show prompt to connect wallet when on-chain transaction is attempted without wallet
    - Show error with install link when wallet extension is not detected
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 14.5 Implement client-side input validation and sanitization
    - Create validation utilities for email, password, quest form fields
    - Sanitize all text inputs on client side before submission
    - Display inline validation errors on forms
    - _Requirements: 27.1, 5.5_

- [x] 15. Implement Landing Page
  - Create server-rendered landing page at `/` with hero section, feature highlights, how-it-works section, and CTA buttons
  - Apply design system: gradients, glassmorphism cards, subtle scroll animations
  - Optimize for <3 second load time (SSR, image optimization, code splitting)
  - Make accessible to unauthenticated visitors
  - _Requirements: 23.1, 23.2, 23.3, 23.4_

- [x] 16. Implement Authentication Pages
  - Create `/login` page with email/password form, generic error display, and link to register
  - Create `/register` page with email, password, role selection form, and validation errors
  - Wire forms to Auth Service API endpoints
  - Redirect authenticated users to role-appropriate dashboard
  - _Requirements: 1.1–1.3, 2.1, 2.2_

- [ ] 17. Implement Admin Dashboard
  - [x] 17.1 Build Admin dashboard overview page
    - Display platform-wide stats: total users by role, quests by state, funds locked, tokens distributed
    - Display LP pool stats: reserves, swap volume, LP token supply
    - _Requirements: 16.1, 16.4_

  - [x] 17.2 Build user management panel
    - Display user list with role, registration date, status, wallet connection
    - Implement ban/unban actions with confirmation modals
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 17.3 Build quest moderation panel
    - Display all quests with state, organizer, funding status, submission count
    - Implement flag quest action
    - _Requirements: 16.2, 16.3_

  - [x] 17.4 Build dispute resolution panel
    - Display disputes with original submission, rejection reason, and dispute reason
    - Implement resolve actions (ambassador_wins, organizer_wins)
    - _Requirements: 20.2, 20.3, 20.4_

- [ ] 18. Implement Organizer Dashboard
  - [x] 18.1 Build Organizer dashboard overview page
    - Display quest summary grouped by state with total funds locked and distributed
    - Display per-quest analytics: submissions, approval rate, avg time to completion, fund utilization
    - _Requirements: 18.1, 18.3_

  - [x] 18.2 Build quest creation and management pages
    - Create quest form with title, description, acceptance criteria, reward type, reward amount, max winners, deadline
    - Implement quest funding flow with wallet transaction signing
    - Display bounty pool details (total, remaining, distributed) per quest
    - Implement quest state transition controls (move to review, cancel)
    - _Requirements: 5.1–5.5, 6.1, 6.4, 7.1–7.5_

  - [x] 18.3 Build submission review panel
    - Display submissions with ambassador details, content, date, and status
    - Implement approve/reject actions with confirmation
    - Show remaining reward slots for Split_Reward quests
    - _Requirements: 9.1–9.5, 18.2, 10.4_

- [ ] 19. Implement Ambassador Dashboard
  - [x] 19.1 Build quest explorer page
    - Display all Active quests with title, reward amount, reward type, deadline, submission count
    - Implement filter and search by reward amount, reward type, deadline, keyword
    - _Requirements: 17.1, 17.4_

  - [x] 19.2 Build submission management page
    - Display ambassador's submissions with quest title, date, and status
    - Implement submit work form for active quests
    - Implement dispute raising on rejected submissions
    - _Requirements: 17.2, 8.1, 20.1_

  - [x] 19.3 Build earnings and reputation page
    - Display total QUEST tokens earned, current balance, and reputation score
    - Display reputation score on ambassador profile
    - _Requirements: 17.3, 21.3_

- [ ] 20. Implement Swap and Liquidity Pool UI
  - [x] 20.1 Build token swap interface
    - Create swap form with token selection (QUEST ↔ XLM), amount input, and price impact display
    - Calculate and display expected output, fee, and slippage
    - Execute swap via Liquidity Pool Contract with wallet signing
    - Display error messages for insufficient liquidity and slippage exceeded
    - _Requirements: 13.1–13.4, 13.7, 14.1_

  - [x] 20.2 Build liquidity management panel
    - Create deposit form for adding QUEST + XLM liquidity
    - Create withdraw form for burning LP tokens
    - Display current pool reserves and user's LP token balance
    - Display error for minimum liquidity violations
    - _Requirements: 13.5, 13.6, 14.2, 14.3_

- [ ] 21. Implement Real-Time Event Streaming
  - [x] 21.1 Build backend Event Stream Listener
    - Connect to Soroban RPC and subscribe to Quest, Treasury, Token, and LP contract events
    - Parse contract events and transform to application event format
    - Implement automatic reconnection with exponential backoff
    - Implement event resynchronization from last known ledger on reconnect
    - _Requirements: 19.1–19.5_

  - [x] 21.2 Build WebSocket server
    - Create WebSocket server that accepts client connections
    - Route events to appropriate clients based on user role and subscribed quests
    - Push quest activation events to all ambassador clients within 5 seconds
    - Push submission events to quest organizer clients within 5 seconds
    - Push reward distribution events to receiving ambassador clients within 5 seconds
    - Push pool reserve updates to swap interface clients within 5 seconds
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [x] 21.3 Build frontend EventStreamProvider
    - Create React context wrapping WebSocket connection
    - Implement automatic reconnection and missed event resync on frontend
    - Dispatch real-time updates to relevant dashboard components
    - _Requirements: 19.5_

- [x] 22. Implement transaction error handling and retry UI
  - Display error messages with retry buttons for failed blockchain transactions
  - Verify on-chain state before resubmitting retried transactions
  - Show failed transaction log in Admin dashboard
  - Handle funding, reward, refund, and swap transaction failures gracefully
  - _Requirements: 6.5, 22.1, 22.2, 22.3, 22.4_

- [x] 23. Checkpoint - Full application integration
  - Ensure all frontend and backend tests pass, ask the user if questions arise.

- [ ] 24. Implement CI/CD Pipeline
  - [x] 24.1 Create GitHub Actions workflow for smart contracts
    - Run `cargo test` for all Soroban contracts on push to main
    - Deploy contracts to Stellar testnet on test success
    - Halt pipeline and report errors on failure
    - _Requirements: 25.1, 25.2, 25.5_

  - [x] 24.2 Create GitHub Actions workflow for frontend
    - Run `npm run build` and frontend tests on push to main
    - Deploy frontend to configured hosting environment on success
    - Halt pipeline and report errors on failure
    - _Requirements: 25.3, 25.4, 25.5_

- [x] 25. Final checkpoint - Full system verification
  - Ensure all smart contract, backend, and frontend tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Smart contracts are implemented first (Token → Treasury → Quest → LP) because later contracts depend on earlier ones via cross-contract calls
- Property tests validate on-chain data serialization round-trip correctness
- Unit tests validate specific examples, edge cases, and error conditions
