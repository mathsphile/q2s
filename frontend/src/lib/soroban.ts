/**
 * Soroban RPC client helper — core integration layer for on-chain operations.
 *
 * Provides functions to build, simulate, sign (via Freighter), and submit
 * Soroban smart contract invocations on the Stellar testnet.
 */

import {
  Account,
  Contract,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

// ── Configuration ──────────────────────────────────────────────────────

const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org';

const NETWORK_PASSPHRASE = Networks.TESTNET; // "Test SDF Network ; September 2015"

const BASE_FEE = '100';

export const QUEST_CONTRACT_ID =
  process.env.NEXT_PUBLIC_QUEST_CONTRACT_ID ?? '';

// Escrow address — the deployer account acts as the escrow for quest funds.
// In production this would be a dedicated multisig or smart wallet.
export const ESCROW_ADDRESS =
  process.env.NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY ?? '';

// ── Server singleton ───────────────────────────────────────────────────

let _server: rpc.Server | null = null;

export function getServer(): rpc.Server {
  if (!_server) {
    _server = new rpc.Server(SOROBAN_RPC_URL);
  }
  return _server;
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Poll `getTransaction` until the transaction is confirmed or fails. */
async function pollTransaction(
  server: rpc.Server,
  hash: string,
  timeoutMs = 30_000,
): Promise<rpc.Api.GetTransactionResponse> {
  const start = Date.now();
  const interval = 2_000;

  while (Date.now() - start < timeoutMs) {
    const txResponse = await server.getTransaction(hash);

    if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return txResponse;
    }
    if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Transaction failed on-chain');
    }
    // status === NOT_FOUND — still pending
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error('Transaction confirmation timed out');
}

// ── Core functions ─────────────────────────────────────────────────────

/**
 * Build, sign (via Freighter), and submit a contract invocation.
 *
 * @param contractId  The deployed contract address (C… string)
 * @param method      The contract function name
 * @param args        Array of xdr.ScVal arguments
 * @param signerAddress  The public key of the signer (Freighter wallet)
 * @returns The parsed return value from the transaction result
 */
export async function callContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signerAddress: string,
): Promise<xdr.ScVal | undefined> {
  const server = getServer();
  const contract = new Contract(contractId);

  // 1. Load the source account
  const account = await server.getAccount(signerAddress);

  // 2. Build the transaction
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // 3. Simulate to get resource estimates
  const simulation = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulation)) {
    const errMsg =
      'error' in simulation
        ? String(simulation.error)
        : 'Simulation failed';
    throw new Error(`Simulation error: ${errMsg}`);
  }

  // 4. Assemble the transaction with simulation results
  const assembled = rpc.assembleTransaction(tx, simulation).build();

  // 5. Sign with Freighter
  const signResult = await signTransaction(assembled.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (signResult.error) {
    throw new Error(`Signing failed: ${signResult.error}`);
  }

  const signedTx = TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    NETWORK_PASSPHRASE,
  );

  // 6. Submit to the network
  const sendResponse = await server.sendTransaction(signedTx);

  if (sendResponse.status === 'ERROR') {
    throw new Error(`Submit error: ${sendResponse.errorResult?.toXDR('base64') ?? 'unknown'}`);
  }

  // 7. Poll until confirmed
  const confirmed = await pollTransaction(server, sendResponse.hash);

  // 8. Extract return value
  if (
    confirmed.status === rpc.Api.GetTransactionStatus.SUCCESS &&
    confirmed.resultMetaXdr
  ) {
    try {
      const meta = confirmed.resultMetaXdr;
      // Try to get the return value — the meta version varies
      const sorobanMeta = meta.v3?.()?.sorobanMeta?.() ?? null;
      if (sorobanMeta) {
        return sorobanMeta.returnValue() ?? undefined;
      }
    } catch {
      // v3 not available — try to extract from returnValue directly
      try {
        const rv = (confirmed as unknown as { returnValue?: xdr.ScVal }).returnValue;
        if (rv) return rv;
      } catch {
        // No return value available
      }
    }
  }

  // For SDK v15+, the return value might be directly on the response
  try {
    const rv = (confirmed as unknown as { returnValue?: xdr.ScVal }).returnValue;
    if (rv) return rv;
  } catch {
    // ignore
  }

  return undefined;
}

/**
 * Read-only contract call — uses simulation only, no signing needed.
 */

// Cache the read-only account to avoid an RPC call per read
let _readAccount: Account | null = null;
let _readAccountTimestamp = 0;
const READ_ACCOUNT_TTL = 60_000; // 1 minute

async function getReadAccount(): Promise<Account> {
  if (_readAccount && Date.now() - _readAccountTimestamp < READ_ACCOUNT_TTL) {
    return _readAccount;
  }

  const sourceKey =
    process.env.NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY ??
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

  try {
    const server = getServer();
    const rpcAccount = await server.getAccount(sourceKey);
    _readAccount = new Account(rpcAccount.accountId(), rpcAccount.sequenceNumber());
  } catch {
    _readAccount = new Account(sourceKey, '0');
  }
  _readAccountTimestamp = Date.now();
  return _readAccount;
}

export async function readContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<xdr.ScVal | undefined> {
  const server = getServer();
  const contract = new Contract(contractId);
  const account = await getReadAccount();

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulation)) {
    const errMsg =
      'error' in simulation
        ? String(simulation.error)
        : 'Simulation failed';
    throw new Error(`Read simulation error: ${errMsg}`);
  }

  // Extract the return value from simulation results
  if (rpc.Api.isSimulationSuccess(simulation) && simulation.result) {
    return simulation.result.retval;
  }

  return undefined;
}

// ── ScVal encoding helpers ─────────────────────────────────────────────

export function toAddress(pubkey: string): xdr.ScVal {
  return new Address(pubkey).toScVal();
}

export function toString(str: string): xdr.ScVal {
  return nativeToScVal(str, { type: 'string' });
}

export function toU32(n: number): xdr.ScVal {
  return nativeToScVal(n, { type: 'u32' });
}

export function toU64(n: number | bigint): xdr.ScVal {
  return nativeToScVal(BigInt(n), { type: 'u64' });
}

export function toI128(n: number | bigint): xdr.ScVal {
  return nativeToScVal(BigInt(n), { type: 'i128' });
}

/**
 * Encode a Soroban enum variant (e.g. RewardType::Fixed).
 * Soroban enums with no data are encoded as a single-element Vec containing
 * the variant name as a Symbol.
 */
export function toEnum(variant: string): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant)]);
}

// Re-export for convenience
export { scValToNative, nativeToScVal, xdr, Address };

// ── Native XLM payment ────────────────────────────────────────────────

import { Operation, Asset, Horizon } from '@stellar/stellar-sdk';

const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

let _horizon: Horizon.Server | null = null;

export function getHorizon(): Horizon.Server {
  if (!_horizon) {
    _horizon = new Horizon.Server(HORIZON_URL);
  }
  return _horizon;
}

/**
 * Send native XLM from one account to another via a standard Stellar payment.
 * Signed via Freighter. Amount is in XLM (e.g. 10 = 10 XLM).
 */
export async function sendXlmPayment(
  from: string,
  to: string,
  amountXlm: number,
): Promise<string> {
  const horizon = getHorizon();
  const account = await horizon.loadAccount(from);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: to,
        asset: Asset.native(),
        amount: amountXlm.toFixed(7),
      }),
    )
    .setTimeout(30)
    .build();

  // Sign with Freighter
  const signResult = await signTransaction(tx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (signResult.error) {
    throw new Error(`Signing failed: ${signResult.error}`);
  }

  const signedTx = TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    NETWORK_PASSPHRASE,
  );

  // Submit via Horizon (not Soroban RPC — this is a classic Stellar tx)
  const result = await horizon.submitTransaction(signedTx);
  return (result as { hash: string }).hash;
}

/**
 * Get the native XLM balance for an account.
 */
export async function getXlmBalance(address: string): Promise<number> {
  try {
    const horizon = getHorizon();
    const account = await horizon.loadAccount(address);
    const native = account.balances.find(
      (b: { asset_type: string }) => b.asset_type === 'native',
    );
    return native ? parseFloat((native as { balance: string }).balance) : 0;
  } catch {
    return 0;
  }
}
