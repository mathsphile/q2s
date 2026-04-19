# Requirements Document

## Introduction

Quest@Stellar is a decentralized bounty and ambassador marketplace built on the Stellar blockchain using Soroban smart contracts. The platform enables Organizers to create and fund quests (bounties/tasks), Ambassadors to complete quests and earn rewards, and Admins to manage the platform. Rewards are distributed via a custom QUEST token with an integrated liquidity pool for QUEST ↔ XLM swaps. The system comprises a premium frontend application, a modular multi-contract Soroban architecture, email/password authentication with optional Stellar wallet connection, and real-time event streaming.

## Glossary

- **Platform**: The Quest@Stellar web application including frontend, backend services, and smart contracts
- **Admin**: A platform role with full control over user management, quest moderation, fund monitoring, and analytics
- **Organizer**: A platform role that creates and manages quests, funds bounty pools, reviews submissions, and approves or rejects Ambassador work
- **Ambassador**: A platform role that browses quests, applies to quests, submits completed work, earns rewards, and tracks earnings and reputation
- **Quest**: A bounty or task created by an Organizer with a defined reward pool, description, acceptance criteria, and lifecycle states
- **Quest_Contract**: The Soroban smart contract responsible for creating, updating, deleting quests, handling submissions, and managing quest state transitions
- **Treasury_Contract**: The Soroban smart contract responsible for locking funds when bounties are created, releasing rewards on approval, and processing refunds on cancellation
- **Token_Contract**: The Soroban smart contract implementing the custom QUEST token with minting, burning, and transfer logic
- **Liquidity_Pool_Contract**: The Soroban smart contract implementing a basic AMM for QUEST ↔ XLM swaps with LP incentives
- **QUEST_Token**: The custom Stellar token used for bounty rewards and platform incentives
- **XLM**: The native Stellar Lumens cryptocurrency
- **Freighter**: A Stellar browser wallet extension used for signing transactions
- **Wallet_Kit**: The Stellar Wallet Kit SDK for connecting multiple Stellar wallet providers
- **Soroban**: The smart contract platform on the Stellar blockchain
- **Auth_Service**: The backend authentication service handling email/password login, registration, and session management
- **Event_Stream**: The Stellar event streaming mechanism used for real-time updates on quest activity, submissions, and token operations
- **Submission**: Work submitted by an Ambassador for a specific Quest, subject to Organizer review
- **Bounty_Pool**: The locked funds associated with a Quest, held by the Treasury_Contract until rewards are distributed or refunded
- **Fixed_Reward**: A reward model where a single Ambassador receives the entire Bounty_Pool upon approval
- **Split_Reward**: A reward model where the Bounty_Pool is divided among multiple winning Ambassadors
- **Quest_State**: The lifecycle state of a Quest: Draft, Active, In_Review, Completed, or Cancelled
- **LP_Token**: A liquidity provider token representing a share in the QUEST ↔ XLM liquidity pool
- **AMM**: Automated Market Maker — the algorithm governing token swap pricing in the Liquidity_Pool_Contract
- **Reputation_Score**: A numeric score assigned to an Ambassador based on completed quests and approval history
- **Design_System**: The set of colors, typography, spacing, gradients, and glassmorphism effects defining the Platform visual identity

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register with my email and password and select my role, so that I can access the Platform with the appropriate dashboard.

#### Acceptance Criteria

1. WHEN a new user submits a registration form with a valid email, password, and selected role (Admin, Organizer, or Ambassador), THE Auth_Service SHALL create a new account and assign the selected role to the user.
2. WHEN a new user submits a registration form with an email that already exists, THE Auth_Service SHALL reject the registration and return a descriptive error indicating the email is already in use.
3. WHEN a new user submits a registration form with a password shorter than 8 characters, THE Auth_Service SHALL reject the registration and return a descriptive error indicating the password does not meet minimum length requirements.
4. THE Auth_Service SHALL store passwords using a one-way cryptographic hash with a unique salt per user.

---

### Requirement 2: User Authentication

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my role-based dashboard.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE Auth_Service SHALL authenticate the user and return a session token with the user role.
2. WHEN a user submits invalid credentials, THE Auth_Service SHALL reject the login attempt and return a generic error message that does not reveal whether the email or password was incorrect.
3. WHEN a session token expires, THE Auth_Service SHALL require the user to re-authenticate before accessing protected resources.
4. THE Auth_Service SHALL enforce rate limiting of no more than 10 failed login attempts per email address within a 15-minute window.

---

### Requirement 3: Role-Based Access Control

**User Story:** As a platform operator, I want strict role-based access control, so that each user can only access features permitted for their role.

#### Acceptance Criteria

1. THE Platform SHALL restrict Admin dashboard access to users with the Admin role.
2. THE Platform SHALL restrict Organizer dashboard access to users with the Organizer role.
3. THE Platform SHALL restrict Ambassador dashboard access to users with the Ambassador role.
4. WHEN an authenticated user attempts to access a resource outside their assigned role, THE Platform SHALL deny the request and return an authorization error.
5. WHEN an unauthenticated user attempts to access any protected resource, THE Platform SHALL redirect the user to the login page.

---

### Requirement 4: Stellar Wallet Connection

**User Story:** As an authenticated user, I want to connect my Stellar wallet, so that I can perform on-chain transactions such as funding quests, claiming rewards, and swapping tokens.

#### Acceptance Criteria

1. WHEN an authenticated user initiates wallet connection, THE Platform SHALL support connection via Freighter and Wallet_Kit.
2. WHEN a user successfully connects a Stellar wallet, THE Platform SHALL display the wallet address and current XLM balance on the user dashboard.
3. WHEN a user attempts to perform an on-chain transaction without a connected wallet, THE Platform SHALL display a prompt requesting the user to connect a wallet before proceeding.
4. THE Platform SHALL allow users to disconnect a previously connected wallet from their account.
5. WHEN wallet connection fails due to the wallet extension not being installed, THE Platform SHALL display an error message with a link to install the wallet extension.

---

### Requirement 5: Quest Creation

**User Story:** As an Organizer, I want to create quests with detailed descriptions and reward configurations, so that Ambassadors can discover and complete bounties.

#### Acceptance Criteria

1. WHEN an Organizer submits a quest creation form with a title, description, acceptance criteria, reward type (Fixed_Reward or Split_Reward), reward amount, and deadline, THE Quest_Contract SHALL create a new Quest in Draft state.
2. WHEN an Organizer creates a quest with Split_Reward type, THE Quest_Contract SHALL store the maximum number of winners and the reward amount per winner.
3. THE Quest_Contract SHALL validate that the reward amount is greater than zero before creating a Quest.
4. THE Quest_Contract SHALL assign a unique identifier to each created Quest.
5. WHEN an Organizer submits a quest creation form with missing required fields, THE Platform SHALL reject the submission and indicate which fields are missing.

---

### Requirement 6: Quest Funding

**User Story:** As an Organizer, I want to fund a quest's bounty pool before publishing it, so that Ambassadors are guaranteed rewards upon completion.

#### Acceptance Criteria

1. WHEN an Organizer funds a Quest in Draft state, THE Treasury_Contract SHALL lock the specified QUEST_Token amount in the Bounty_Pool associated with that Quest.
2. WHEN an Organizer attempts to fund a Quest with an amount exceeding the Organizer's wallet balance, THE Treasury_Contract SHALL reject the transaction and return an insufficient balance error.
3. WHEN the Treasury_Contract successfully locks funds for a Quest, THE Quest_Contract SHALL transition the Quest from Draft state to Active state.
4. THE Platform SHALL display the total Bounty_Pool amount, remaining funds, and distributed funds for each Quest on the Organizer dashboard.
5. WHEN a funding transaction fails due to a network error, THE Platform SHALL display an error message and allow the Organizer to retry the transaction.

---

### Requirement 7: Quest State Management

**User Story:** As an Organizer, I want quests to follow a defined lifecycle, so that the status of each quest is clear to all participants.

#### Acceptance Criteria

1. THE Quest_Contract SHALL enforce the following valid Quest_State transitions: Draft → Active, Active → In_Review, Active → Cancelled, In_Review → Completed, In_Review → Active, In_Review → Cancelled.
2. WHEN an Organizer attempts an invalid Quest_State transition, THE Quest_Contract SHALL reject the transition and return an error describing the invalid state change.
3. WHEN a Quest transitions to Active state, THE Platform SHALL make the Quest visible to all Ambassadors in the quest explorer.
4. WHEN a Quest transitions to Completed state, THE Quest_Contract SHALL prevent further submissions for that Quest.
5. WHEN a Quest transitions to Cancelled state, THE Quest_Contract SHALL prevent further submissions and trigger the refund process in the Treasury_Contract.

---

### Requirement 8: Quest Submission

**User Story:** As an Ambassador, I want to submit my completed work for a quest, so that the Organizer can review and approve my contribution.

#### Acceptance Criteria

1. WHEN an Ambassador submits work for an Active Quest, THE Quest_Contract SHALL record the Submission with the Ambassador's identifier, submission content, and a timestamp.
2. WHEN an Ambassador attempts to submit work for a Quest that is not in Active state, THE Quest_Contract SHALL reject the Submission and return an error indicating the Quest is not accepting submissions.
3. WHEN an Ambassador attempts to submit work for a Quest after the Quest deadline has passed, THE Quest_Contract SHALL reject the Submission and return a late submission error.
4. WHEN an Ambassador attempts to submit duplicate content for the same Quest, THE Quest_Contract SHALL reject the Submission and return a duplicate submission error.
5. THE Quest_Contract SHALL allow an Ambassador to submit only one active Submission per Quest at a time.
6. WHEN a Quest transitions to In_Review state, THE Quest_Contract SHALL prevent new submissions for that Quest.

---

### Requirement 9: Submission Review and Approval

**User Story:** As an Organizer, I want to review and approve or reject Ambassador submissions, so that I can ensure quality work before distributing rewards.

#### Acceptance Criteria

1. WHEN an Organizer approves a Submission for a Fixed_Reward Quest, THE Quest_Contract SHALL call the Treasury_Contract to release the full Bounty_Pool to the approved Ambassador's wallet.
2. WHEN an Organizer approves a Submission for a Split_Reward Quest, THE Quest_Contract SHALL call the Treasury_Contract to release the per-winner reward amount to the approved Ambassador's wallet.
3. WHEN an Organizer rejects a Submission, THE Quest_Contract SHALL update the Submission status to rejected and allow the Ambassador to submit revised work if the Quest remains in Active or In_Review state.
4. WHEN all reward slots for a Split_Reward Quest are filled, THE Quest_Contract SHALL transition the Quest to Completed state.
5. WHEN the Organizer approves the sole winner of a Fixed_Reward Quest, THE Quest_Contract SHALL transition the Quest to Completed state.

---

### Requirement 10: Reward Distribution

**User Story:** As an Ambassador, I want to receive QUEST_Token rewards when my submission is approved, so that I am compensated for my work.

#### Acceptance Criteria

1. WHEN the Treasury_Contract releases rewards for an approved Submission, THE Treasury_Contract SHALL transfer the reward amount in QUEST_Token from the Bounty_Pool to the Ambassador's connected Stellar wallet.
2. WHEN a reward transfer fails due to a network error, THE Treasury_Contract SHALL retain the funds in the Bounty_Pool and emit an error event for retry processing.
3. THE Treasury_Contract SHALL emit a reward distribution event containing the Quest identifier, Ambassador wallet address, and reward amount for each successful transfer.
4. WHEN partial rewards have been distributed for a Split_Reward Quest, THE Platform SHALL display the remaining Bounty_Pool balance on the Quest detail page.

---

### Requirement 11: Quest Cancellation and Refund

**User Story:** As an Organizer, I want to cancel a quest and receive a refund of undistributed funds, so that I can recover funds from quests that are no longer needed.

#### Acceptance Criteria

1. WHEN an Organizer cancels an Active or In_Review Quest, THE Quest_Contract SHALL transition the Quest to Cancelled state and call the Treasury_Contract to initiate a refund.
2. WHEN the Treasury_Contract processes a refund for a Cancelled Quest, THE Treasury_Contract SHALL return all undistributed funds from the Bounty_Pool to the Organizer's connected Stellar wallet.
3. WHEN a refund transaction fails due to a network error, THE Treasury_Contract SHALL retain the funds in the Bounty_Pool and emit an error event for retry processing.
4. THE Treasury_Contract SHALL emit a refund event containing the Quest identifier, Organizer wallet address, and refunded amount for each successful refund.

---

### Requirement 12: QUEST Token Operations

**User Story:** As a platform operator, I want a custom QUEST token with controlled minting and transfer logic, so that the platform has a dedicated reward currency.

#### Acceptance Criteria

1. THE Token_Contract SHALL implement the Stellar SEP-41 token interface for the QUEST_Token with a defined name, symbol, and decimal precision.
2. WHEN the Treasury_Contract requests a token mint, THE Token_Contract SHALL mint the specified amount of QUEST_Token to the designated wallet address.
3. WHEN a mint request would cause the total QUEST_Token supply to exceed the configured maximum supply, THE Token_Contract SHALL reject the mint request and return a supply overflow error.
4. THE Token_Contract SHALL restrict minting operations to authorized callers (Treasury_Contract and Admin accounts).
5. WHEN a transfer is requested between two wallet addresses, THE Token_Contract SHALL verify the sender has sufficient balance before executing the transfer.

---

### Requirement 13: Liquidity Pool

**User Story:** As a user, I want to swap QUEST tokens for XLM and vice versa, so that I can convert my rewards into other assets.

#### Acceptance Criteria

1. THE Liquidity_Pool_Contract SHALL implement a constant-product AMM formula (x * y = k) for QUEST_Token ↔ XLM swaps.
2. WHEN a user initiates a swap from QUEST_Token to XLM, THE Liquidity_Pool_Contract SHALL calculate the output amount based on the current pool reserves and the constant-product formula, deducting a swap fee.
3. WHEN a user initiates a swap from XLM to QUEST_Token, THE Liquidity_Pool_Contract SHALL calculate the output amount based on the current pool reserves and the constant-product formula, deducting a swap fee.
4. WHEN a swap would result in output exceeding available pool reserves, THE Liquidity_Pool_Contract SHALL reject the swap and return an insufficient liquidity error.
5. WHEN a user provides liquidity by depositing both QUEST_Token and XLM, THE Liquidity_Pool_Contract SHALL mint LP_Token proportional to the user's share of the pool.
6. WHEN a user withdraws liquidity by burning LP_Token, THE Liquidity_Pool_Contract SHALL return the proportional share of QUEST_Token and XLM from the pool reserves.
7. THE Liquidity_Pool_Contract SHALL emit swap events containing the input token, output token, input amount, output amount, and user wallet address.

---

### Requirement 14: Liquidity Pool Imbalance Protection

**User Story:** As a platform operator, I want the liquidity pool to handle imbalance scenarios gracefully, so that the pool remains functional and fair.

#### Acceptance Criteria

1. WHEN a swap would move the pool reserve ratio beyond a configured maximum slippage threshold, THE Liquidity_Pool_Contract SHALL reject the swap and return a slippage exceeded error.
2. THE Liquidity_Pool_Contract SHALL enforce a minimum liquidity reserve to prevent the pool from being fully drained.
3. WHEN a liquidity withdrawal would reduce either reserve below the minimum liquidity threshold, THE Liquidity_Pool_Contract SHALL reject the withdrawal and return an insufficient remaining liquidity error.

---

### Requirement 15: Admin User Management

**User Story:** As an Admin, I want to manage platform users by banning or approving accounts, so that I can maintain platform integrity.

#### Acceptance Criteria

1. WHEN an Admin bans a user account, THE Platform SHALL revoke the user's active sessions and prevent the user from logging in.
2. WHEN an Admin unbans a previously banned user account, THE Platform SHALL restore the user's ability to log in and access role-appropriate resources.
3. WHEN an Admin views the user management panel, THE Platform SHALL display a list of all registered users with their role, registration date, account status, and wallet connection status.
4. THE Platform SHALL restrict user management operations (ban, unban, role modification) to users with the Admin role.

---

### Requirement 16: Admin Platform Monitoring

**User Story:** As an Admin, I want to view platform-wide analytics and moderate quests, so that I can monitor platform health and intervene when necessary.

#### Acceptance Criteria

1. THE Platform SHALL display platform-wide statistics on the Admin dashboard including total users by role, total quests by state, total funds locked in Treasury_Contract, and total QUEST_Token distributed.
2. WHEN an Admin views the quest moderation panel, THE Platform SHALL display all quests with their current state, Organizer, funding status, and submission count.
3. WHEN an Admin flags a Quest for review, THE Platform SHALL notify the Organizer and temporarily suspend new submissions for that Quest.
4. THE Platform SHALL display Liquidity_Pool_Contract statistics including current reserves, total swap volume, and LP_Token supply on the Admin dashboard.

---

### Requirement 17: Ambassador Dashboard

**User Story:** As an Ambassador, I want a dashboard to explore quests, track my submissions, and view my earnings, so that I can manage my bounty work effectively.

#### Acceptance Criteria

1. WHEN an Ambassador opens the quest explorer, THE Platform SHALL display all Active quests with their title, reward amount, reward type, deadline, and number of submissions.
2. WHEN an Ambassador views the submissions panel, THE Platform SHALL display all Submissions made by the Ambassador with their Quest title, submission date, and current status (pending, approved, rejected).
3. WHEN an Ambassador views the earnings panel, THE Platform SHALL display the Ambassador's total QUEST_Token earned, current QUEST_Token balance, and Reputation_Score.
4. THE Platform SHALL allow Ambassadors to filter and search quests by reward amount, reward type, deadline, and keyword.

---

### Requirement 18: Organizer Dashboard

**User Story:** As an Organizer, I want a dashboard to create quests, manage funding, review submissions, and view analytics, so that I can run my bounty programs effectively.

#### Acceptance Criteria

1. WHEN an Organizer opens the dashboard, THE Platform SHALL display a summary of the Organizer's quests grouped by Quest_State with total funds locked and total funds distributed.
2. WHEN an Organizer views the submission review panel for a Quest, THE Platform SHALL display all Submissions for that Quest with Ambassador details, submission content, submission date, and review actions (approve/reject).
3. THE Platform SHALL display per-quest analytics including number of submissions, approval rate, average time to completion, and fund utilization on the Organizer dashboard.

---

### Requirement 19: Real-Time Event Streaming

**User Story:** As a user, I want to see live updates on quest activity, submissions, and token operations, so that I stay informed without refreshing the page.

#### Acceptance Criteria

1. WHEN a new Quest transitions to Active state, THE Event_Stream SHALL push a notification to all connected Ambassador clients within 5 seconds.
2. WHEN an Ambassador submits work for a Quest, THE Event_Stream SHALL push a notification to the Quest Organizer's client within 5 seconds.
3. WHEN a reward is distributed, THE Event_Stream SHALL push a notification to the receiving Ambassador's client within 5 seconds.
4. WHEN a token swap is executed in the Liquidity_Pool_Contract, THE Event_Stream SHALL push an updated pool reserve notification to all connected clients viewing the swap interface within 5 seconds.
5. IF the Event_Stream connection is lost, THEN THE Platform SHALL attempt to reconnect automatically and resynchronize missed events upon reconnection.

---

### Requirement 20: Dispute Handling

**User Story:** As an Ambassador, I want to raise a dispute if my submission is unfairly rejected, so that there is a basic mechanism for conflict resolution.

#### Acceptance Criteria

1. WHEN an Ambassador raises a dispute on a rejected Submission, THE Platform SHALL record the dispute with the Ambassador's reason and notify the Admin.
2. WHEN an Admin reviews a dispute, THE Platform SHALL display the original Submission, the Organizer's rejection reason, and the Ambassador's dispute reason.
3. WHEN an Admin resolves a dispute in favor of the Ambassador, THE Platform SHALL instruct the Quest_Contract to approve the Submission and trigger reward distribution.
4. WHEN an Admin resolves a dispute in favor of the Organizer, THE Platform SHALL close the dispute and retain the original rejection status.

---

### Requirement 21: Ambassador Reputation System

**User Story:** As an Ambassador, I want my reputation to reflect my track record, so that Organizers can assess my reliability.

#### Acceptance Criteria

1. WHEN an Ambassador's Submission is approved, THE Platform SHALL increase the Ambassador's Reputation_Score by a configured increment.
2. WHEN an Ambassador's Submission is rejected, THE Platform SHALL decrease the Ambassador's Reputation_Score by a configured decrement, with a minimum score of zero.
3. THE Platform SHALL display the Ambassador's Reputation_Score on the Ambassador's public profile and alongside Submissions visible to Organizers.

---

### Requirement 22: Transaction Retry and Error Handling

**User Story:** As a user, I want failed blockchain transactions to be handled gracefully with retry options, so that temporary network issues do not result in lost funds or broken state.

#### Acceptance Criteria

1. WHEN a blockchain transaction fails due to a transient network error, THE Platform SHALL display an error message and provide a retry option to the user.
2. WHEN a blockchain transaction fails during reward distribution, THE Treasury_Contract SHALL retain the funds in the Bounty_Pool and mark the distribution as pending retry.
3. THE Platform SHALL log all failed transactions with the transaction type, error details, timestamp, and user identifier for Admin review.
4. WHEN a user retries a failed transaction, THE Platform SHALL verify the current on-chain state before resubmitting to prevent duplicate operations.

---

### Requirement 23: Landing Page

**User Story:** As a visitor, I want to see a high-quality landing page that explains the platform, so that I understand the value proposition and am motivated to sign up.

#### Acceptance Criteria

1. THE Platform SHALL display a landing page with a hero section, feature highlights, how-it-works section, and call-to-action buttons for registration.
2. THE Platform SHALL render the landing page with the Design_System including gradients, glassmorphism effects, and subtle animations.
3. THE Platform SHALL render the landing page in under 3 seconds on a standard broadband connection.
4. THE Platform SHALL make the landing page accessible to unauthenticated visitors without requiring login.

---

### Requirement 24: Mobile Responsiveness

**User Story:** As a user, I want the platform to work smoothly on mobile devices, so that I can manage quests and transactions on the go.

#### Acceptance Criteria

1. THE Platform SHALL render all pages and dashboards responsively across viewport widths from 320px to 2560px.
2. THE Platform SHALL maintain touch-friendly interactive elements with a minimum tap target size of 44x44 pixels on mobile viewports.
3. THE Platform SHALL adapt navigation to a mobile-friendly layout (such as a hamburger menu) on viewports narrower than 768px.

---

### Requirement 25: CI/CD Pipeline

**User Story:** As a developer, I want an automated CI/CD pipeline, so that smart contracts are tested, the frontend is built, and deployments happen automatically.

#### Acceptance Criteria

1. WHEN code is pushed to the main branch, THE CI/CD pipeline SHALL run all Soroban smart contract tests.
2. WHEN all smart contract tests pass, THE CI/CD pipeline SHALL deploy the smart contracts to the Stellar testnet.
3. WHEN code is pushed to the main branch, THE CI/CD pipeline SHALL build the frontend application and run frontend tests.
4. WHEN the frontend build and tests succeed, THE CI/CD pipeline SHALL deploy the frontend application to the configured hosting environment.
5. IF any step in the CI/CD pipeline fails, THEN THE CI/CD pipeline SHALL halt subsequent steps and report the failure with error details.

---

### Requirement 26: Smart Contract Serialization Round-Trip

**User Story:** As a developer, I want smart contract data structures to serialize and deserialize correctly, so that on-chain data integrity is maintained.

#### Acceptance Criteria

1. FOR ALL valid Quest data structures, serializing to Soroban storage format and deserializing back SHALL produce an equivalent Quest data structure (round-trip property).
2. FOR ALL valid Submission data structures, serializing to Soroban storage format and deserializing back SHALL produce an equivalent Submission data structure (round-trip property).
3. FOR ALL valid token transfer parameters, encoding to the Soroban invocation format and decoding back SHALL produce equivalent parameters (round-trip property).

---

### Requirement 27: Security and Input Validation

**User Story:** As a platform operator, I want all user inputs validated and sanitized, so that the platform is protected against injection attacks and malformed data.

#### Acceptance Criteria

1. THE Platform SHALL validate and sanitize all user-provided text inputs on both client and server before processing.
2. THE Auth_Service SHALL enforce CSRF protection on all state-changing requests.
3. THE Platform SHALL set secure HTTP headers including Content-Security-Policy, X-Content-Type-Options, and Strict-Transport-Security on all responses.
4. WHEN a smart contract function receives parameters outside the expected type or range, THE smart contract SHALL reject the call and return a descriptive error.
