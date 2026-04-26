# ⭐ Quest@Stellar

**A decentralized bounty marketplace built on the Stellar blockchain.**

Organizers create quests with XLM rewards. Ambassadors complete them and get paid instantly — all powered by Soroban smart contracts with on-chain transparency.

> **Live on Stellar Testnet** · [View Quest Contract on Explorer](https://stellar.expert/explorer/testnet/contract/CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D)

---

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Organizer   │────▶│ Quest Contract│────▶│  Ambassador     │
│              │     │  (Soroban)   │     │                 │
│ • Create     │     │              │     │ • Browse quests │
│ • Fund (XLM) │     │ • Stores     │     │ • Submit work   │
│ • Approve    │     │   quests     │     │ • Get paid XLM  │
│ • Reject     │     │ • Tracks     │     │                 │
└─────────────┘     │   submissions│     └─────────────────┘
                    └──────────────┘
                           │
                    ┌──────────────┐
                    │ Stellar      │
                    │ Network      │
                    │              │
                    │ XLM payments │
                    │ via Freighter│
                    └──────────────┘
```

### The Flow

1. **Organizer creates a quest** → Stored on-chain via Soroban smart contract (signed with Freighter)
2. **Organizer funds the quest** → Sends XLM to escrow, quest becomes Active
3. **Ambassador submits work** → Submission recorded on-chain (signed with Freighter)
4. **Organizer reviews & approves** → On-chain status update + XLM sent directly to ambassador's wallet
5. **Ambassador gets paid** → XLM arrives instantly in their Stellar wallet

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│                                                        │
│  Landing Page ─── Auth Pages ─── Dashboards            │
│       │               │              │                 │
│       │          ┌────┴────┐    ┌────┴────┐           │
│       │          │ Backend │    │ Soroban  │           │
│       │          │  API    │    │   RPC    │           │
│       │          └────┬────┘    └────┬────┘           │
│       │               │              │                 │
└───────┼───────────────┼──────────────┼─────────────────┘
        │               │              │
   Static SSR      PostgreSQL    Stellar Testnet
   (Vercel)        (Auth only)   (Quest Contract)
```

| Layer | What it does | Technology |
|-------|-------------|------------|
| **Smart Contracts** | Quest lifecycle, submissions, approvals — all on-chain | Rust, Soroban SDK |
| **Frontend** | UI, wallet integration, direct Soroban RPC calls | Next.js 16, TypeScript, Tailwind CSS |
| **Backend** | User auth (email/password), JWT sessions | Express, TypeScript, PostgreSQL |
| **Wallet** | Transaction signing, balance display | Freighter via @stellar/freighter-api |
| **Payments** | Native XLM transfers between wallets | Stellar Horizon API |

### What's on-chain vs off-chain

| On-Chain (Soroban) | Off-Chain (PostgreSQL) |
|---|---|
| Quest creation & state | User accounts & passwords |
| Submissions & status | JWT sessions |
| Approvals & rejections | Organizer profile details |
| XLM reward payments | — |

---

## Deployed Contract IDs (Stellar Testnet)

| Contract | ID | Explorer |
|----------|-----|---------|
| **Quest** (active) | `CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D` | [View](https://stellar.expert/explorer/testnet/contract/CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D) |
| Token (QUEST) | `CDVSSFT7BQNB4NPH6E5SNEDI76HUHMN3NK4YMOCOQWEDVQ4EO6AJPCDE` | [View](https://stellar.expert/explorer/testnet/contract/CDVSSFT7BQNB4NPH6E5SNEDI76HUHMN3NK4YMOCOQWEDVQ4EO6AJPCDE) |
| Treasury | `CDU2LKQDPPGWOP6OBFX2YUOYLVMATHV7GUTJKCP3PXX5MARGHRSEVLNC` | [View](https://stellar.expert/explorer/testnet/contract/CDU2LKQDPPGWOP6OBFX2YUOYLVMATHV7GUTJKCP3PXX5MARGHRSEVLNC) |
| Liquidity Pool | `CC4VDFKPVKL63MAJY565HO44K3PLCRMHZZQF7NAJMRCWUWIYJIJGQH75` | [View](https://stellar.expert/explorer/testnet/contract/CC4VDFKPVKL63MAJY565HO44K3PLCRMHZZQF7NAJMRCWUWIYJIJGQH75) |

**Deployer Wallet:** `GAKAWNAR76U2MPDKUZXPYA6S6S4HOTVIXIRXIEKXJXVNA4XUIHGDSLYY` · [View on Explorer](https://stellar.expert/explorer/testnet/account/GAKAWNAR76U2MPDKUZXPYA6S6S4HOTVIXIRXIEKXJXVNA4XUIHGDSLYY)

---

## Project Structure

```
quest-at-stellar/
├── contracts/              # Soroban smart contracts (Rust)
│   ├── quest/              # Quest lifecycle & submissions
│   ├── treasury/           # Fund locking & reward distribution
│   ├── token/              # QUEST token (SEP-41)
│   └── liquidity-pool/     # AMM for QUEST ↔ XLM swaps
├── frontend/               # Next.js web application
│   ├── src/app/            # Pages (App Router)
│   ├── src/components/     # Reusable UI components
│   ├── src/contexts/       # Auth & Wallet providers
│   └── src/lib/            # Soroban client, API helpers
├── backend/                # Express API server
│   ├── src/auth/           # Registration, login, JWT
│   ├── src/routes/         # API routes
│   ├── src/middleware/      # Auth, CSRF, security headers
│   └── migrations/         # PostgreSQL schema
└── shared/                 # Shared TypeScript types
```

---

## Prerequisites

- **Node.js 20+** and npm
- **Rust** with `wasm32v1-none` target (`rustup target add wasm32v1-none`)
- **Docker** (for PostgreSQL)
- **Stellar CLI** (`cargo install --locked stellar-cli`)
- **Freighter Wallet** browser extension ([freighter.app](https://www.freighter.app/))

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/mathsphile/q2s.git
cd q2s
```

### 2. Start the Database

```bash
docker run -d --name quest-stellar-db \
  -e POSTGRES_DB=quest_stellar \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:16-alpine

# Wait a few seconds, then run migrations
sleep 3
docker exec -i quest-stellar-db psql -U postgres -d quest_stellar < backend/migrations/001_initial_schema.sql
```

### 3. Start the Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set PG_PASSWORD=postgres and your contract IDs
npm install
npx tsc
node dist/index.js
# ✅ Running on http://localhost:3001
```

### 4. Start the Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local — set your contract IDs
npm install
npm run dev
# ✅ Running on http://localhost:3000
```

### 5. Fund Your Wallet

1. Install [Freighter](https://www.freighter.app/) browser extension
2. Switch to **Testnet** in Freighter settings
3. Fund your account: `https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY`

---

## User Manual

### For Ambassadors

1. **Register** → Go to `/register`, choose "Ambassador", enter name/email/password
2. **Connect Wallet** → Click "Connect Wallet" in the top nav, approve in Freighter
3. **Browse Quests** → Go to "Explore Quests" to see active bounties
4. **View Quest** → Click "View Quest" to see full details and acceptance criteria
5. **Submit Work** → Fill in the submission form, click Submit, sign with Freighter
6. **Track Status** → Go to "My Submissions" to see Pending/Approved/Rejected status
7. **Get Paid** → When approved, XLM is sent directly to your connected wallet
8. **View Earnings** → Go to "Earnings" to see your XLM balance, history, and reputation

### For Organizers

1. **Register** → Go to `/register`, choose "Organizer", fill in org details
2. **Connect Wallet** → Click "Connect Wallet" in the top nav
3. **Create Quest** → Go to "Create Quest", fill in title/description/criteria/reward/deadline
4. **Sign Transaction** → Freighter popup asks you to sign the on-chain quest creation
5. **Fund & Activate** → On "My Quests", click "Fund & Activate" to send XLM and make the quest live
6. **Review Submissions** → Go to "Submissions" to see ambassador work
7. **Approve** → Click Approve → Sign on-chain status update → Sign XLM payment to ambassador
8. **Reject** → Click Reject → Ambassador can resubmit

### For Admins

Admin accounts are created directly in the database (not via the registration form):

```sql
-- Connect to the database and insert an admin user
-- Password must be hashed with bcrypt (use the registration flow for a regular user first, then update the role)
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

Admin dashboard shows: user management, on-chain quest overview, dispute resolution.

---

## Smart Contract Functions

### Quest Contract

| Function | Who calls it | What it does |
|----------|-------------|-------------|
| `create_quest` | Organizer | Creates a quest in Draft state |
| `transition_state` | Organizer | Moves quest between states (Draft→Active→InReview→Completed/Cancelled) |
| `submit_work` | Ambassador | Submits work for an active quest |
| `approve_submission` | Organizer | Approves a submission, updates on-chain status |
| `reject_submission` | Organizer | Rejects a submission |
| `get_quest` | Anyone (read) | Returns quest details |
| `get_submissions` | Anyone (read) | Returns all submissions for a quest |

### Quest States

```
Draft ──▶ Active ──▶ InReview ──▶ Completed
                 │              │
                 └──▶ Cancelled ◀┘
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY=GAKAWNAR76U2MPDKUZXPYA6S6S4HOTVIXIRXIEKXJXVNA4XUIHGDSLYY
NEXT_PUBLIC_QUEST_CONTRACT_ID=CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D
```

### Backend (`backend/.env`)

```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=quest_stellar
PG_USER=postgres
PG_PASSWORD=postgres
JWT_SECRET=your-secret-key
PORT=3001
```

---

## Deploy

### Frontend → Vercel

1. Import `mathsphile/q2s` on [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `frontend`
3. Add the environment variables from `frontend/.env.example`
4. Deploy

### Backend → Railway / Render / Any Node.js host

1. Set the environment variables from `backend/.env.example`
2. Build: `npx tsc`
3. Start: `node dist/index.js`
4. Needs a PostgreSQL database

### Smart Contracts → Stellar Testnet

```bash
cd contracts
cargo build --target wasm32v1-none --release
stellar keys generate deployer --network testnet --fund
stellar contract deploy --wasm target/wasm32v1-none/release/quest_contract.wasm \
  --source deployer --network testnet
```

---

## Tech Stack

| | Technology | Purpose |
|---|---|---|
| ⚙️ | **Rust + Soroban SDK** | Smart contracts |
| 🌐 | **Next.js 16** | Frontend framework |
| 🎨 | **Tailwind CSS** | Styling |
| 🔐 | **Express + JWT** | Backend auth |
| 🗄️ | **PostgreSQL** | User data |
| 💳 | **Freighter** | Wallet signing |
| ⭐ | **Stellar Testnet** | Blockchain |
| 📡 | **Soroban RPC** | Contract reads |
| 🌍 | **Horizon API** | XLM payments |

---

## License

MIT
