/**
 * Deployed contract addresses and network configuration.
 * Centralized config for all Stellar/Soroban interactions.
 */

export const CONTRACTS = {
  quest: process.env.NEXT_PUBLIC_QUEST_CONTRACT_ID ?? '',
  token: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID ?? '',
  treasury: process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ID ?? '',
  liquidityPool: process.env.NEXT_PUBLIC_LP_CONTRACT_ID ?? '',
} as const;

export const NETWORK = {
  rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org',
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
  passphrase: 'Test SDF Network ; September 2015',
  name: 'testnet',
} as const;

export const ESCROW = {
  address: process.env.NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY ?? '',
} as const;
