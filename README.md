# ⭐ Quest@Stellar

**A decentralized bounty marketplace built on the Stellar blockchain.**

Organizers create quests with XLM rewards. Ambassadors complete them and get paid instantly — all powered by Soroban smart contracts with on-chain transparency.

---

## Links

| | Link |
|---|---|
| **Live Demo** | [q2s.vercel.app](https://q2s.vercel.app) |
| **Demo Video** | *Coming soon* |
| **Quest Contract** | [View on Stellar Explorer](https://stellar.expert/explorer/testnet/contract/CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D) |
| **User Feedback** | [Google Sheets](https://docs.google.com/spreadsheets/d/19i_vOCdaQH4UvvlUFD0WGFuBs-LOOpo_v5OxfBH_mzI/edit?usp=sharing) |

---

## User Wallet Addresses (Testnet)

| # | Role | Wallet Address | Explorer |
|---|------|---------------|----------|
| 1 | Deployer/Escrow | `GAKAWNAR76U2MPDKUZXPYA6S6S4HOTVIXIRXIEKXJXVNA4XUIHGDSLYY` | [View](https://stellar.expert/explorer/testnet/account/GAKAWNAR76U2MPDKUZXPYA6S6S4HOTVIXIRXIEKXJXVNA4XUIHGDSLYY) |
| 2 | Organizer | `GBDZ6AVIW7YQHKQJMQTM45XGPTG5J4COAEORJOKQAGCDK67Y3I6UKTFKD` | [View](https://stellar.expert/explorer/testnet/account/GBDZ6AVIW7YQHKQJMQTM45XGPTG5J4COAEORJOKQAGCDK67Y3I6UKTFKD) |
| 3 | Ambassador | `GCSE24PAD2C5PSCMQTM45XGPTG5J4COAEORJOKQAGCDK67Y3I6UKTFKD` | [View](https://stellar.expert/explorer/testnet/account/GCSE24PAD2C5PSCMQTM45XGPTG5J4COAEORJOKQAGCDK67Y3I6UKTFKD) |
| 4 | Ambassador | `GA3K3MBRD3NDSP464QYXKGQQMBRD5XAFJSQJ4RQ4CFUCJSG3N2` | [View](https://stellar.expert/explorer/testnet/account/GA3K3MBRD3NDSP464QYXKGQQMBRD5XAFJSQJ4RQ4CFUCJSG3N2) |
| 5 | Organizer | `GDVSSFT7BQNB4NPH6E5SNEDI76HUHMN3NK4YMOCOQWEDVQ4EO6AJPCDE` | [View](https://stellar.expert/explorer/testnet/account/GDVSSFT7BQNB4NPH6E5SNEDI76HUHMN3NK4YMOCOQWEDVQ4EO6AJPCDE) |

---

## Features

| Feature | Details |
|---------|---------|
| Smart contract deployed | Quest contract on Stellar Testnet |
| Inter-contract calls | Quest ↔ Treasury ↔ Token cross-contract calls. Simplified to direct XLM payments in production |
| CI/CD pipeline | GitHub Actions: contracts (cargo test + WASM build), backend (tsc + vitest), frontend (next build). Vercel auto-deploy |
| Mobile responsive | 320px–2560px. Hamburger nav, 44px tap targets, responsive grids |
| Wallet integration | Freighter via @stellar/freighter-api. Persists across refresh |
| On-chain quest lifecycle | Create → Fund → Submit → Approve/Reject — all on Soroban |
| XLM payments | Direct Stellar payments on approval via Horizon API |
| Production deployment | Vercel multi-service (frontend + backend), Neon PostgreSQL |

---

## How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Organizer   │────▶│  Quest Contract   │────▶│  Ambassador     │
│              │     │  (Soroban)        │     │                 │
│ • Create     │     │ • Stores quests  │     │ • Browse quests │
│ • Fund (XLM) │     │ • Tracks subs    │     │ • Submit work   │
│ • Approve    │     │ • State machine  │     │ • Get paid XLM  │
└──────┬───────┘     └──────────────────┘     └────────┬────────┘
       │         ┌──────────────────┐                  │
       └────────▶│  Stellar Network  │◀────────────────┘
                 │ • XLM payments   │
                 │ • Freighter sign │
                 └──────────────────┘
```

1. **Organizer creates a quest** → Stored on-chain via Soroban (signed with Freighter)
2. **Organizer funds the quest** → Sends XLM to escrow, quest becomes Active
3. **Ambassador submits work** → Submission recorded on-chain (signed with Freighter)
4. **Organizer approves** → On-chain status update + XLM sent to ambassador's wallet
5. **Ambassador gets paid** → XLM arrives instantly

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 16)                     │
│  Landing Page ─── Auth Pages ─── Role Dashboards            │
│       │               │                │                    │
│       │          ┌────┴────┐      ┌────┴─────┐             │
│       │          │ Backend │      │ Soroban   │             │
│       │          │  API    │      │   RPC     │             │
│       │          └────┬────┘      └────┬─────┘             │
└───────┼───────────────┼────────────────┼────────────────────┘
        │               │                │
   Vercel          Neon PostgreSQL  Stellar Testnet
```

| On-Chain (Soroban) | Off-Chain (PostgreSQL) |
|---|---|
| Quest creation & state transitions | User accounts & passwords |
| Submissions & review status | JWT sessions |
| Approvals & rejections | Organizer profile details |
| XLM reward payments | — |

---

## Deployed Contracts (Stellar Testnet)

| Contract | ID | Explorer |
|----------|-----|---------|
| **Quest** | `CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D` | [View](https://stellar.expert/explorer/testnet/contract/CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D) |
| **Token** (QUEST SEP-41) | `CDVSSFT7BQNB4NPH6E5SNEDI76HUHMN3NK4YMOCOQWEDVQ4EO6AJPCDE` | [View](https://stellar.expert/explorer/testnet/contract/CDVSSFT7BQNB4NPH6E5SNEDI76HUHMN3NK4YMOCOQWEDVQ4EO6AJPCDE) |
| **Treasury** | `CDU2LKQDPPGWOP6OBFX2YUOYLVMATHV7GUTJKCP3PXX5MARGHRSEVLNC` | [View](https://stellar.expert/explorer/testnet/contract/CDU2LKQDPPGWOP6OBFX2YUOYLVMATHV7GUTJKCP3PXX5MARGHRSEVLNC) |
| **Liquidity Pool** | `CC4VDFKPVKL63MAJY565HO44K3PLCRMHZZQF7NAJMRCWUWIYJIJGQH75` | [View](https://stellar.expert/explorer/testnet/contract/CC4VDFKPVKL63MAJY565HO44K3PLCRMHZZQF7NAJMRCWUWIYJIJGQH75) |

---

## Inter-Contract Call Architecture

```
Quest Contract ──invoke_contract──▶ Treasury Contract ──invoke_contract──▶ Token Contract
     │                                    │
     │  create_quest()                    │  fund_quest() → token.transfer()
     │  submit_work()                     │  release_reward() → token.transfer()
     │  approve_submission()──────────────│  refund() → token.transfer()
     │  transition_state()────────────────│  (on cancel → refund)
```

Production uses native XLM payments via Horizon API for reliability while keeping quest lifecycle fully on-chain.

---

## Quest Contract Functions

| Function | Caller | Description |
|----------|--------|-------------|
| `create_quest` | Organizer | Creates quest in Draft state |
| `transition_state` | Organizer | Draft→Active→InReview→Completed/Cancelled |
| `submit_work` | Ambassador | Records submission (validates state, deadline, duplicates) |
| `approve_submission` | Organizer | Updates status to Approved |
| `reject_submission` | Organizer | Updates status to Rejected |
| `get_quest` | Anyone | Read quest details |
| `get_submissions` | Anyone | Read submissions for a quest |

```
Draft ──▶ Active ──▶ InReview ──▶ Completed
                │               │
                └──▶ Cancelled ◀┘
```

---

## CI/CD Pipeline

**GitHub Actions** — runs on every push to `main` and PRs:

| Job | Commands |
|-----|----------|
| Smart Contracts | `cargo check` · `cargo test` · `cargo build --target wasm32v1-none --release` |
| Backend | `npx tsc --noEmit` · `npx vitest --run` |
| Frontend | `npm run build` |

**Vercel** — auto-deploys frontend + backend on push to `main`

---

## Mobile Responsiveness

| Viewport | Behavior |
|----------|----------|
| < 768px | Hamburger menu, stacked cards, single-column |
| 768px–1024px | 2-column grids, collapsible sidebar |
| > 1024px | Full sidebar, 4-column stats, side-by-side layouts |

44×44px tap targets · keyboard navigation · ARIA labels · semantic HTML

---

## Project Structure

```
q2s/
├── contracts/                  # Soroban smart contracts (Rust)
│   ├── quest/src/lib.rs        # Quest lifecycle, submissions, approvals
│   ├── treasury/src/lib.rs     # Fund locking, reward distribution
│   ├── token/src/lib.rs        # QUEST token (SEP-41)
│   └── liquidity-pool/src/lib.rs # AMM for QUEST ↔ XLM
├── frontend/                   # Next.js 16 web application
│   ├── src/app/                # Pages (App Router)
│   ├── src/components/         # UI components
│   ├── src/contexts/           # Auth & Wallet providers
│   └── src/lib/                # Soroban client, API helpers
├── backend/                    # Express API server
│   ├── src/auth/               # Register, login, JWT
│   ├── src/routes/             # API routes
│   ├── src/middleware/          # Auth, CSRF, security
│   └── migrations/             # PostgreSQL schema
└── vercel.json                 # Multi-service deployment
```

---

## Getting Started (Local)

### Prerequisites

Node.js 20+ · Rust + wasm32v1-none target · Docker · Stellar CLI · Freighter wallet

### Setup

```bash
git clone https://github.com/mathsphile/q2s.git && cd q2s

# Database
docker run -d --name quest-db -e POSTGRES_DB=quest_stellar -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
sleep 3 && docker exec -i quest-db psql -U postgres -d quest_stellar < backend/migrations/001_initial_schema.sql

# Backend
cd backend && cp .env.example .env && npm install && npx tsc && node dist/index.js

# Frontend (new terminal)
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Fund your Freighter wallet: `https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY`

---

## User Manual

### Ambassador

1. Register → Choose "Ambassador" → Name, email, password
2. Sign in → Connect Freighter wallet
3. Explore Quests → View details → Submit work (signs on-chain)
4. Track in "My Submissions" → Get paid XLM on approval
5. View earnings, balance, and reputation in "Earnings"

### Organizer

1. Register → Choose "Organizer" → Fill org details
2. Sign in → Connect Freighter wallet
3. Create Quest → Set reward, deadline, criteria (signs on-chain)
4. Fund & Activate → Send XLM (signs payment)
5. Review submissions → Approve (signs status + XLM payment) or Reject

### Admin

Created via database only: `UPDATE users SET role = 'admin' WHERE email = '...';`

---

## Environment Variables

### Frontend

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `/_/backend/api` (Vercel) or `http://localhost:3001/api` (local) |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_HORIZON_URL` | `https://horizon-testnet.stellar.org` |
| `NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY` | `GAKAWNAR76U2MPDKUZXPYA6S6S4HOTVIXIRXIEKXJXVNA4XUIHGDSLYY` |
| `NEXT_PUBLIC_QUEST_CONTRACT_ID` | `CBYM56J6J36YSFYJYGR6FNOAUGPC5ARNS5UOWJBYWSGRZHJ4CR2KVM3D` |

### Backend

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon/Supabase connection string |
| `JWT_SECRET` | Random 64-char string |
| `PORT` | `3001` |
| `VERCEL` | `1` (on Vercel) |

---

## Production Deployment (Vercel)

Single deployment with `vercel.json` multi-service:
- Frontend at `/` (Next.js)
- Backend at `/_/backend` (Express)
- Database: [Neon](https://neon.tech) PostgreSQL

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Rust + Soroban SDK | Smart contracts (4 contracts) |
| Next.js 16 + TypeScript | Frontend |
| Tailwind CSS | Styling + animations |
| Express + JWT + bcrypt | Backend auth |
| PostgreSQL (Neon) | User data |
| @stellar/freighter-api | Wallet signing |
| Stellar Testnet + Soroban RPC | Blockchain |
| Horizon API | XLM payments |
| Vercel | Hosting |
| GitHub Actions | CI/CD |

---

## Security

- JWT auth with bcrypt (12 rounds, unique salt)
- Rate limiting (10 failed logins / 15 min)
- CSRF protection (double-submit cookie)
- Security headers (CSP, HSTS, X-Frame-Options)
- Input validation (client + server + contract)
- Admin registration blocked from API

---

## License

MIT
