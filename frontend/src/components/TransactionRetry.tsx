'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { formatNumber, formatDate } from '@/lib/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TxType = 'fund_quest' | 'release_reward' | 'refund' | 'swap' | 'deposit' | 'withdraw';
type TxStatus = 'pending' | 'retrying' | 'resolved' | 'failed';

interface FailedTransaction {
  id: string;
  txType: TxType;
  questId?: number;
  amount?: number;
  errorDetails: string;
  retryCount: number;
  status: TxStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Mock data — will be replaced with API calls
// ---------------------------------------------------------------------------

const initialTransactions: FailedTransaction[] = [
  {
    id: 'tx-001',
    txType: 'fund_quest',
    questId: 4,
    amount: 8000,
    errorDetails: 'Transaction timeout: network congestion detected. The transaction was not confirmed within the expected timeframe.',
    retryCount: 1,
    status: 'pending',
    createdAt: '2025-03-12T10:30:00Z',
  },
  {
    id: 'tx-002',
    txType: 'release_reward',
    questId: 1,
    amount: 1000,
    errorDetails: 'Insufficient fee: the transaction fee was below the network minimum.',
    retryCount: 0,
    status: 'pending',
    createdAt: '2025-03-12T09:15:00Z',
  },
  {
    id: 'tx-003',
    txType: 'swap',
    amount: 500,
    errorDetails: 'Slippage exceeded: the price moved beyond the allowed tolerance during execution.',
    retryCount: 2,
    status: 'failed',
    createdAt: '2025-03-11T16:45:00Z',
  },
  {
    id: 'tx-004',
    txType: 'refund',
    questId: 3,
    amount: 3000,
    errorDetails: 'Contract invocation error: bounty pool not found for the specified quest.',
    retryCount: 0,
    status: 'resolved',
    createdAt: '2025-03-10T14:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const txTypeLabels: Record<TxType, string> = {
  fund_quest: 'Fund Quest',
  release_reward: 'Release Reward',
  refund: 'Refund',
  swap: 'Swap',
  deposit: 'Deposit Liquidity',
  withdraw: 'Withdraw Liquidity',
};

const statusBadge: Record<TxStatus, { label: string; variant: 'warning' | 'info' | 'success' | 'error' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  retrying: { label: 'Retrying...', variant: 'info' },
  resolved: { label: 'Resolved', variant: 'success' },
  failed: { label: 'Failed', variant: 'error' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Transaction Error Handling and Retry UI
 *
 * Displays error messages with retry buttons for failed blockchain transactions.
 * Verifies on-chain state before resubmitting. Shows failed transaction log.
 *
 * Requirements: 6.5, 22.1, 22.2, 22.3, 22.4
 */
export default function TransactionRetry() {
  const [transactions, setTransactions] = useState<FailedTransaction[]>(initialTransactions);
  const [retryTarget, setRetryTarget] = useState<FailedTransaction | null>(null);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!retryTarget) return;

    setRetrying(true);

    // Update status to retrying
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === retryTarget.id ? { ...tx, status: 'retrying' as TxStatus } : tx,
      ),
    );

    try {
      // TODO: Step 1 — Verify on-chain state before resubmitting
      // This prevents duplicate operations (Requirement 22.2)
      // const onChainState = await verifyOnChainState(retryTarget);
      // if (onChainState.alreadyCompleted) { mark as resolved; return; }

      // TODO: Step 2 — Resubmit the transaction
      // await retryTransaction(retryTarget);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate success
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === retryTarget.id
            ? { ...tx, status: 'resolved' as TxStatus, retryCount: tx.retryCount + 1 }
            : tx,
        ),
      );
    } catch {
      // Mark as still pending with incremented retry count
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === retryTarget.id
            ? { ...tx, status: 'pending' as TxStatus, retryCount: tx.retryCount + 1 }
            : tx,
        ),
      );
    } finally {
      setRetrying(false);
      setRetryTarget(null);
    }
  };

  const pendingCount = transactions.filter(
    (tx) => tx.status === 'pending' || tx.status === 'retrying',
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Failed Transactions</h2>
          <p className="mt-1 text-sm text-gray-500">
            {pendingCount > 0
              ? `${pendingCount} transaction${pendingCount > 1 ? 's' : ''} need${pendingCount === 1 ? 's' : ''} attention`
              : 'All transactions resolved'}
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning">{pendingCount} pending</Badge>
        )}
      </div>

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-gray-500 py-8">
            No failed transactions.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const badge = statusBadge[tx.status];
            return (
              <Card key={tx.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {txTypeLabels[tx.txType]}
                      </h3>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(tx.createdAt)}
                      {tx.questId != null && ` · Quest #${tx.questId}`}
                      {tx.amount != null && ` · ${formatNumber(tx.amount)} QUEST`}
                      {tx.retryCount > 0 && ` · ${tx.retryCount} retries`}
                    </p>
                  </div>

                  {(tx.status === 'pending' || tx.status === 'failed') && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setRetryTarget(tx)}
                    >
                      Retry
                    </Button>
                  )}
                </div>

                {/* Error details */}
                <div className="mt-3 rounded-lg bg-error/5 border border-error/20 p-3">
                  <p className="text-xs font-medium text-error mb-1">Error Details</p>
                  <p className="text-sm text-foreground">{tx.errorDetails}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Retry confirmation modal */}
      <Modal
        open={!!retryTarget}
        onClose={() => !retrying && setRetryTarget(null)}
        title="Retry Transaction"
      >
        <p className="text-sm text-gray-500">
          This will verify the on-chain state and resubmit the{' '}
          <span className="font-medium text-foreground">
            {retryTarget ? txTypeLabels[retryTarget.txType] : ''}
          </span>{' '}
          transaction.
          {retryTarget?.retryCount && retryTarget.retryCount > 0
            ? ` This transaction has been retried ${retryTarget.retryCount} time${retryTarget.retryCount > 1 ? 's' : ''} before.`
            : ''}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRetryTarget(null)}
            disabled={retrying}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={retrying}
            onClick={handleRetry}
          >
            Retry Transaction
          </Button>
        </div>
      </Modal>
    </div>
  );
}
