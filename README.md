# ⭐ Quest@Stellar

**A decentralized bounty marketplace built on the Stellar blockchain.**

Organizers create quests with XLM rewards. Ambassadors complete them and get paid instantly — all powered by Soroban smart contracts with on-chain transparency.

> **Live on Stellar Testnet** · [View Quest Contract on Explorer](https://stellar.expert/explorer/testnet/contract/CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D)

---

## ✅ Feature Checklist

| Feature | Status | Details |
|---------|--------|---------|
| Smart contract deployed | ✅ Working | Quest contract on Stellar Testnet |
| Inter-contract calls | ✅ Implemented | Quest ↔ Treasury cross-contract calls (fund_quest, release_reward, refund). Simplified to direct XLM payments in production for reliability |
| Custom token deployed | ✅ Deployed | QUEST token (SEP-41) at `CDVSSFT7...AJPCDE`. Currently using native XLM for payments to reduce complexity |
| Liquidity pool deployed | ✅ Deployed | AMM pool at `CC4VDFKP...GQH75` with constant-product formula (x·y=k) |
| CI/CD pipeline | ✅ Configured | GitHub Actions for contracts (cargo test + WASM build), backend (tsc + vitest), frontend (next build). Vercel auto-deploy on push |
| Mobile responsive | ✅ Fully responsive | 320px–2560px. Hamburger nav on mobile, 44px tap targets, responsive grids |
| Wallet integration | ✅ Working | Freighter via @stellar/freighter-api. Persists across refresh |
| On-chain quest lifecycle | ✅ Working | Create → Fund → Submit → Approve/Reject — all on Soroban |
| XLM payments | ✅ Working | Direct Stellar payments on approval via Horizon API |
| Production ready | ✅ Ready | Vercel config, env examples, security headers, CSRF protection |

---

## How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Organizer   │────▶│  Quest Contract   │────▶│  Ambassador     │
│              │     │  (Soroban)        │     │                 │
│ • Create     │     │                  │     │ • Browse quests │
│ • Fund (XLM) │     │ • Stores quests  │     │ • Submit work   │
│ • Approve    │     │ • Tracks subs    │     │ • Get paid XLM  │
│ • Reject     │     │ • State machine  │     │                 │
└──────┬───────┘     └──────────────────┘     └────────┬────────┘
       │                                               │
       │         ┌──────────────────┐                  │
       └────────▶│  Stellar Network  │◀────────────────┘
                 │                  │
                 │ • XLM payments   │
                 │ • Freighter sign │
                 │ • Horizon API    │
                 └──────────────────┘
```

### The Flow

1. **Organizer creates a quest** → Stored on-chain via Soroban smart contract (signed with Freighter)
2. **Organizer funds the quest** → Sends XLM to escrow, quest transitions Draft → Active
3. **Ambassador submits work** → Submission recorded on-chain (signed with Freighter)
4. **Organizer reviews & approves** → On-chain status update + XLM sent directly to ambassador's wallet
5. **Ambassador gets paid** → XLM arrives instantly in their Stellar wallet

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 16)                     │
│                                                             │
│  Landing Page ─── Auth Pages ─── Role Dashboards            │
│  (SSR, static)    (client)       (client + Soroban RPC)     │
│       │               │                │                    │
│       │          ┌────┴────┐      ┌────┴─────┐             │
│       │          │ Backend │      │ Soroban   │             │
│       │          │  API    │      │   RPC     │             │
│       │          │ (auth)  │      │ (on-chain)│             │
│       │          └────┬────┘      └────┬─────┘             │
└───────┼───────────────┼────────────────┼────────────────────┘
        │               │                │
   Vercel          PostgreSQL      Stellar Testnet
   (CDN+SSR)       (auth only)    (Quest Contract)
```

### What's on-chain vs off-chain

| On-Chain (Soroban Smart Contract) | Off-Chain (PostgreSQL) |
|---|---|
| Quest creation, state transitions | User accounts (email/password) |
| Submissions & review status | JWT sessions |
| Approval/rejection records | Organizer profile (org name, country, etc.) |
| XLM reward payments (Horizon) | — |

---

## Smart Contracts

### Deployed Contracts (Stellar Testnet)

| Contract | ID | Status | Explorer |
|----------|-----|--------|---------|
| **Quest** | `CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D` | ✅ Active | [View](https://stellar.expert/explorer/testnet/contract/CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D) |
| **Token** (QUEST SEP-41) | `CDVSSFT7BQNB4NPH6E5SNEDI76HUHMN3NK4YMOCOQWEDVQ4EO6AJPCDE` | ✅ Deployed | [View](https://stellar.expert/explorer/testnet/contract/CDVSSFT7BQNB4NPH6E5SNEDI76HUHMN3NK4YMOCOQWEDVQ4EO6AJPCDE) |
| **Treasury** | `CDU2LKQDPPGWOP6OBFX2YUOYLVMATHV7GUTJKCP3PXX5MARGHRSEVLNC` | ✅ Deployed | [View](https://stellar.expert/explorer/testnet/contract/CDU2LKQDPPGWOP6OBFX2YUOYLVMATHV7GUTJKCP3PXX5MARGHRSEVLNC) |
| **Liquidity Pool** | `CC4VDFKPVKL63MAJY565HO44K3PLCRMHZZQF7NAJMRCWUWIYJIJGQH75` | ✅ Deployed | [View](https://stellar.expert/explorer/testnet/contract/CC4VDFKPVKL63MAJY565HO44K3PLCRMHZZQF7NAJMRCWUWIYJIJGQH75) |

**Deployer/Escrow Wallet:** `GAKAWNAR76U2MPDKUZXPYA6S6S4HOTVIXIRXIEKXJXVNA4XUIHGDSLYY` · [View](https://stellar.expert/explorer/testnet/account/GAKAWNAR76U2MPDKUZXPYA6S6S4HOTVIXIRXIEKXJXVNA4XUIHGDSLYY)

### Inter-Contract Call Architecture

The contracts are designed with a modular cross-contract call pattern:

```
Quest Contract ──invoke_contract──▶ Treasury Contract ──invoke_contract──▶ Token Contract
     │                                    │
     │  create_quest()                    │  fund_quest() → token.transfer()
     │  submit_work()                     │  release_reward() → token.transfer()
     │  approve_submission()──────────────│  refund() → token.transfer()
     │  reject_submission()               │
     │  transition_state()────────────────│  (on cancel → refund)
```

**Production simplification:** For the live app, payments use native XLM via Stellar's Horizon API instead of the Treasury cross-contract flow. This avoids Soroban auth complexity while keeping quest lifecycle fully on-chain.

### Custom Token (QUEST — SEP-41)

The QUEST token implements the full [Stellar SEP-41 token interface](https://developers.stellar.org/docs/tokens/token-interface):

- `initialize(admin, name, symbol, decimal, max_supply)`
- `balance(id)`, `transfer(from, to, amount)`, `transfer_from(spender, from, to, amount)`
- `approve(from, spender, amount, expiration_ledger)`, `allowance(from, spender)`
- `mint(to, amount)` — admin only, with max supply overflow check
- `burn(from, amount)` — with balance validation
- `name()`, `symbol()`, `decimals()`, `total_supply()`

### Liquidity Pool (AMM)

Constant-product AMM (x·y=k) for QUEST ↔ XLM swaps:

- `swap(user, token_in, amount_in, min_amount_out)` — with fee deduction and slippage protection
- `deposit(user, amount_quest, amount_xlm)` — mint LP tokens proportional to pool share
- `withdraw(user, lp_amount)` — burn LP tokens, return proportional reserves
- `get_reserves()`, `get_spot_price(token_in)` — read-only pool info
- Configurable: `swap_fee_bps`, `max_slippage_bps`, `min_liquidity`

### Quest Contract Functions

| Function | Caller | Description |
|----------|--------|-------------|
| `create_quest` | Organizer | Creates quest in Draft state with reward config |
| `transition_state` | Organizer | State machine: Draft→Active→InReview→Completed/Cancelled |
| `submit_work` | Ambassador | Records submission on-chain (validates: Active state, deadline, no duplicates) |
| `approve_submission` | Organizer | Updates status to Approved, increments approved_count |
| `reject_submission` | Organizer | Updates status to Rejected (ambassador can resubmit) |
| `get_quest` | Anyone | Read quest details |
| `get_submissions` | Anyone | Read all submissions for a quest |
| `get_quest_state` | Anyone | Read quest lifecycle state |

### Quest State Machine

```
Draft ──▶ Active ──▶ InReview ──▶ Completed
                │               │
                └──▶ Cancelled ◀┘
```

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

Runs on every push to `main` and on pull requests:

| Job | What it does | Commands |
|-----|-------------|----------|
| **Smart Contracts** | Compile + test all 4 Soroban contracts | `cargo check`, `cargo test`, `cargo build --target wasm32-unknown-unknown --release` |
| **Backend** | TypeScript check + unit tests | `npx tsc --noEmit`, `npx vitest --run` |
| **Frontend** | Full production build | `npm run build` |

### Vercel (Frontend Auto-Deploy)

- Connected to `mathsphile/q2s` GitHub repo
- Root directory: `frontend`
- Auto-deploys on push to `main`
- Environment variables set in Vercel dashboard

### Backend Deployment

Deploy to Railway, Render, or any Node.js host:
```bash
cd backend && npm ci && npx tsc && node dist/index.js
```

---

## Mobile Responsiveness

The UI is fully responsive from **320px to 2560px**:

| Viewport | Behavior |
|----------|----------|
| **< 768px** (mobile) | Hamburger menu, stacked cards, single-column layouts |
| **768px–1024px** (tablet) | 2-column grids, collapsible sidebar |
| **> 1024px** (desktop) | Full sidebar, 4-column stat grids, side-by-side layouts |

Accessibility features:
- Minimum **44×44px** tap targets on all interactive elements
- Keyboard navigation with visible focus indicators
- ARIA labels on all icons and decorative elements
- Semantic HTML with proper heading hierarchy

---

## Project Structure

```
q2s/
├── contracts/                  # Soroban smart contracts (Rust)
│   ├── quest/src/lib.rs        # Quest lifecycle, submissions, approvals
│   ├── treasury/src/lib.rs     # Fund locking, reward distribution, refunds
│   ├── token/src/lib.rs        # QUEST token (SEP-41 compliant)
│   ├── liquidity-pool/src/lib.rs # AMM for QUEST ↔ XLM swaps
│   └── Cargo.toml              # Workspace config
├── frontend/                   # Next.js 16 web application
│   ├── src/app/                # Pages (App Router)
│   │   ├── page.tsx            # Landing page (SSR)
│   │   ├── (auth)/             # Login & register pages
│   │   ├── ambassador/         # Ambassador dashboard & pages
│   │   ├── organizer/          # Organizer dashboard & pages
│   │   └── admin/              # Admin dashboard & pages
│   ├── src/components/         # Reusable UI (Button, Card, Modal, etc.)
│   ├── src/contexts/           # AuthProvider, WalletProvider
│   ├── src/lib/                # soroban.ts, quest-client.ts, api.ts
│   └── vercel.json             # Vercel deployment config
├── backend/                    # Express API server
│   ├── src/auth/               # Register, login, JWT, logout
│   ├── src/routes/             # Auth routes, admin routes
│   ├── src/middleware/          # Auth, CSRF, security headers
│   └── migrations/             # PostgreSQL schema
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** and npm
- **Rust** with `wasm32v1-none` target (`rustup target add wasm32v1-none`)
- **Docker** (for PostgreSQL)
- **Stellar CLI** (`cargo install --locked stellar-cli`)
- **Freighter Wallet** browser extension ([freighter.app](https://www.freighter.app/))

### 1. Clone

```bash
git clone https://github.com/mathsphile/q2s.git
cd q2s
```

### 2. Database

```bash
docker run -d --name quest-stellar-db \
  -e POSTGRES_DB=quest_stellar \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:16-alpine

sleep 3
docker exec -i quest-stellar-db psql -U postgres -d quest_stellar \
  < backend/migrations/001_initial_schema.sql
```

### 3. Backend

```bash
cd backend
cp .env.example .env    # edit with your values
npm install
npx tsc
node dist/index.js      # http://localhost:3001
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env.local    # edit with your contract IDs
npm install
npm run dev                   # http://localhost:3000
```

### 5. Wallet Setup

1. Install [Freighter](https://www.freighter.app/)
2. Switch to **Testnet** in settings
3. Fund: `https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY`

---

## User Manual

### Ambassador Workflow

1. **Register** at `/register` → Choose "Ambassador" → Enter name, email, password
2. **Sign in** at `/login/ambassador`
3. **Connect wallet** → Click "Connect Wallet" in top nav → Approve in Freighter
4. **Explore quests** → Browse active bounties with reward amounts and deadlines
5. **View quest details** → Read description, acceptance criteria, reward info
6. **Submit work** → Write your deliverable, click Submit → Sign with Freighter
7. **Track status** → "My Submissions" shows Pending / Approved / Rejected
8. **Receive payment** → On approval, XLM is sent directly to your wallet
9. **View earnings** → "Earnings" page shows XLM balance, approved count, history

### Organizer Workflow

1. **Register** at `/register` → Choose "Organizer" → Fill in org details (name, size, country, phone)
2. **Sign in** at `/login/organizer`
3. **Connect wallet** → Link your Freighter wallet
4. **Create quest** → Title, description, acceptance criteria, reward (XLM), deadline → Sign with Freighter
5. **Fund & activate** → "My Quests" → Click "Fund & Activate" → Send XLM → Quest goes live
6. **Review submissions** → "Submissions" page → Read ambassador work
7. **Approve** → Sign on-chain approval (Freighter #1) → Sign XLM payment (Freighter #2)
8. **Reject** → Sign on-chain rejection → Ambassador can resubmit

### Admin Workflow

Admin accounts are created via database only (not through registration):

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

Admin dashboard: user management (ban/unban), on-chain quest overview with donut chart, dispute resolution.

---

## Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001/api` |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_HORIZON_URL` | Stellar Horizon API | `https://horizon-testnet.stellar.org` |
| `NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY` | Escrow wallet public key | `GAKAWNAR76U2...` |
| `NEXT_PUBLIC_QUEST_CONTRACT_ID` | Quest contract address | `CBYM56J6J36Y...` |

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PG_HOST` | PostgreSQL host | `localhost` |
| `PG_PORT` | PostgreSQL port | `5432` |
| `PG_DATABASE` | Database name | `quest_stellar` |
| `PG_USER` | Database user | `postgres` |
| `PG_PASSWORD` | Database password | `postgres` |
| `JWT_SECRET` | JWT signing secret | `change-in-production` |
| `PORT` | Server port | `3001` |

---

## Production Deployment

### Frontend → Vercel

1. Import `mathsphile/q2s` at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `frontend`
3. Add environment variables from the table above
4. Deploy — auto-deploys on every push to `main`

### Backend → Railway / Render

1. Connect your GitHub repo
2. Set root directory to `backend`
3. Build command: `npm ci && npx tsc`
4. Start command: `node dist/index.js`
5. Add a PostgreSQL addon
6. Set environment variables

### Smart Contracts → Stellar

```bash
cd contracts
cargo build --target wasm32v1-none --release

stellar keys generate deployer --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32v1-none/release/quest_contract.wasm \
  --source deployer --network testnet

# Initialize
stellar contract invoke --id <CONTRACT_ID> --source deployer --network testnet \
  -- initialize --admin <DEPLOYER_PUBLIC_KEY> --treasury_contract <TREASURY_ID>
```

---

## Tech Stack

| | Technology | Purpose |
|---|---|---|
| ⚙️ | Rust + Soroban SDK 25.3 | Smart contracts (4 contracts) |
| 🌐 | Next.js 16 + TypeScript | Frontend (SSR + client) |
| 🎨 | Tailwind CSS | Responsive styling + animations |
| 🔐 | Express + JWT + bcrypt | Backend auth |
| 🗄️ | PostgreSQL 16 | User data storage |
| 💳 | @stellar/freighter-api | Wallet connection + tx signing |
| ⭐ | Stellar Testnet | Blockchain network |
| 📡 | Soroban RPC | Smart contract reads/writes |
| 🌍 | Horizon API | XLM balance + payments |
| 🚀 | Vercel | Frontend hosting + CDN |
| 🔄 | GitHub Actions | CI/CD pipeline |

---

## Security

- **JWT auth** with bcrypt password hashing (12 rounds, unique salt per user)
- **Rate limiting** — max 10 failed login attempts per email per 15 minutes
- **CSRF protection** — double-submit cookie pattern on state-changing requests
- **Security headers** — CSP, X-Content-Type-Options, HSTS, X-Frame-Options
- **Input validation** — client-side + server-side + smart contract level
- **Admin registration blocked** — admin accounts only via direct database access
- **Wallet persistence** — verified against Freighter on each page load

---

## License

MIT
