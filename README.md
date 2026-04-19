# Quest@Stellar

Decentralized bounty marketplace on the Stellar blockchain. Organizers create quests with XLM rewards, ambassadors complete them and get paid instantly via Soroban smart contracts.

## Architecture

- **Smart Contracts** — Soroban/Rust: Quest lifecycle, submissions, approvals on-chain
- **Frontend** — Next.js 16, TypeScript, Tailwind CSS, Freighter wallet integration
- **Backend** — Express, TypeScript, PostgreSQL (auth only)
- **Payments** — Native XLM via Stellar network

## Quick Start

```bash
# Prerequisites: Node 20+, Rust, Docker, Stellar CLI

# 1. Database
docker run -d --name quest-db -e POSTGRES_DB=quest_stellar -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
docker exec -i quest-db psql -U postgres -d quest_stellar < backend/migrations/001_initial_schema.sql

# 2. Backend
cd backend && cp .env.example .env  # edit with your values
npm install && npx tsc && node dist/index.js

# 3. Frontend
cd frontend && cp .env.example .env.local  # edit with your values
npm install && npm run dev
```

## Deploy to Vercel (Frontend)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Set **Root Directory** to `frontend`
4. Add environment variables from `frontend/.env.example`
5. Deploy

## Contract Deployment

```bash
cd contracts
cargo build --target wasm32v1-none --release
stellar keys generate deployer --network testnet --fund

# Deploy each contract
stellar contract deploy --wasm target/wasm32v1-none/release/quest_contract.wasm --source deployer --network testnet
```

## Environment Variables

See `frontend/.env.example` and `backend/.env.example` for all required variables.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Rust, Soroban SDK |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | Express, TypeScript, PostgreSQL |
| Wallet | Freighter via @stellar/freighter-api |
| Blockchain | Stellar Testnet, Soroban RPC |
