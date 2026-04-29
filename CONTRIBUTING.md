# Contributing to Quest@Stellar

## Development Setup

1. Clone the repo and install dependencies (see README)
2. Start PostgreSQL, backend, and frontend
3. Connect Freighter wallet on testnet

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling
- Soroban SDK for contract interactions
- Express for backend API

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with meaningful commits
3. Ensure `npm run build` passes for both frontend and backend
4. Ensure `cargo check` passes for contracts
5. Submit a PR with a clear description

## Smart Contract Changes

1. Modify contracts in `contracts/`
2. Build: `cargo build --target wasm32v1-none --release`
3. Test: `cargo test`
4. Deploy to testnet and update `.env` files
