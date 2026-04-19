'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Mock data — will be replaced with contract calls
// ---------------------------------------------------------------------------

const poolData = {
  questReserve: 500_000,
  xlmReserve: 250_000,
  totalLpSupply: 354_000,
  userLpBalance: 12_500,
  minLiquidity: 1_000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Liquidity Management Panel
 *
 * Deposit form for adding QUEST + XLM liquidity, withdraw form for burning
 * LP tokens, pool reserves display, and LP token balance.
 *
 * Requirements: 13.5, 13.6, 14.2, 14.3
 */
export default function LiquidityPage() {
  // Deposit state
  const [depositQuest, setDepositQuest] = useState('');
  const [depositXlm, setDepositXlm] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Withdraw state
  const [withdrawLp, setWithdrawLp] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Calculate estimated LP tokens for deposit
  const estimatedLpTokens = (() => {
    const quest = Number(depositQuest);
    const xlm = Number(depositXlm);
    if (quest <= 0 || xlm <= 0 || poolData.totalLpSupply === 0) return 0;
    // LP tokens proportional to share of pool
    const shareByQuest = quest / poolData.questReserve;
    const shareByXlm = xlm / poolData.xlmReserve;
    const share = Math.min(shareByQuest, shareByXlm);
    return share * poolData.totalLpSupply;
  })();

  // Calculate estimated returns for withdrawal
  const estimatedReturn = (() => {
    const lp = Number(withdrawLp);
    if (lp <= 0 || poolData.totalLpSupply === 0) return { quest: 0, xlm: 0 };
    const share = lp / poolData.totalLpSupply;
    return {
      quest: share * poolData.questReserve,
      xlm: share * poolData.xlmReserve,
    };
  })();

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);

    const quest = Number(depositQuest);
    const xlm = Number(depositXlm);

    if (quest <= 0 || xlm <= 0) {
      setDepositError('Both amounts must be greater than 0');
      return;
    }

    setDepositing(true);
    try {
      // TODO: Call Liquidity Pool Contract deposit via wallet signing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setDepositQuest('');
      setDepositXlm('');
    } catch {
      setDepositError('Deposit failed. Please try again.');
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    const lp = Number(withdrawLp);

    if (lp <= 0) {
      setWithdrawError('Amount must be greater than 0');
      return;
    }

    if (lp > poolData.userLpBalance) {
      setWithdrawError('Insufficient LP token balance');
      return;
    }

    // Check minimum liquidity
    const remainingLp = poolData.totalLpSupply - lp;
    if (remainingLp < poolData.minLiquidity && remainingLp > 0) {
      setWithdrawError(
        `Withdrawal would reduce pool below minimum liquidity (${formatNumber(poolData.minLiquidity, 0)})`,
      );
      return;
    }

    setWithdrawing(true);
    try {
      // TODO: Call Liquidity Pool Contract withdraw via wallet signing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setWithdrawLp('');
    } catch {
      setWithdrawError('Withdrawal failed. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Auto-calculate XLM when QUEST is entered (maintain ratio)
  const handleQuestChange = (value: string) => {
    setDepositQuest(value);
    setDepositError(null);
    const quest = Number(value);
    if (quest > 0 && poolData.questReserve > 0) {
      const ratio = poolData.xlmReserve / poolData.questReserve;
      setDepositXlm((quest * ratio).toFixed(2));
    } else {
      setDepositXlm('');
    }
  };

  const handleXlmChange = (value: string) => {
    setDepositXlm(value);
    setDepositError(null);
    const xlm = Number(value);
    if (xlm > 0 && poolData.xlmReserve > 0) {
      const ratio = poolData.questReserve / poolData.xlmReserve;
      setDepositQuest((xlm * ratio).toFixed(2));
    } else {
      setDepositQuest('');
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      {/* Page header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Liquidity</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add or remove liquidity from the QUEST/XLM pool
        </p>
        <div className="mt-2">
          <Link
            href="/swap"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ← Back to Swap
          </Link>
        </div>
      </div>

      {/* Pool overview */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Pool Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-lg font-bold text-foreground">
              {formatNumber(poolData.questReserve, 0)}
            </p>
            <p className="text-xs text-gray-500">QUEST Reserve</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center">
            <p className="text-lg font-bold text-foreground">
              {formatNumber(poolData.xlmReserve, 0)}
            </p>
            <p className="text-xs text-gray-500">XLM Reserve</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">Total LP Supply</span>
          <span className="font-semibold text-foreground">
            {formatNumber(poolData.totalLpSupply, 0)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Your LP Balance</span>
          <span className="font-semibold text-foreground">
            {formatNumber(poolData.userLpBalance, 0)}{' '}
            <Badge variant="info" className="ml-1">
              {((poolData.userLpBalance / poolData.totalLpSupply) * 100).toFixed(2)}%
            </Badge>
          </span>
        </div>
      </Card>

      {/* Deposit form */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Add Liquidity</h2>
        <form onSubmit={handleDeposit} className="space-y-4">
          <Input
            label="QUEST Amount"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={depositQuest}
            onChange={(e) => handleQuestChange(e.target.value)}
          />
          <Input
            label="XLM Amount"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={depositXlm}
            onChange={(e) => handleXlmChange(e.target.value)}
          />

          {estimatedLpTokens > 0 && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated LP Tokens</span>
                <span className="font-semibold text-foreground">
                  {formatNumber(estimatedLpTokens)}
                </span>
              </div>
            </div>
          )}

          {depositError && (
            <p className="text-sm text-error" role="alert">
              {depositError}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={depositing}
            disabled={!depositQuest || !depositXlm}
          >
            Add Liquidity
          </Button>
        </form>
      </Card>

      {/* Withdraw form */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Remove Liquidity</h2>
        <form onSubmit={handleWithdraw} className="space-y-4">
          <Input
            label="LP Tokens to Burn"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={withdrawLp}
            onChange={(e) => {
              setWithdrawLp(e.target.value);
              setWithdrawError(null);
            }}
          />

          {Number(withdrawLp) > 0 && (
            <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">QUEST Returned</span>
                <span className="font-semibold text-foreground">
                  {formatNumber(estimatedReturn.quest)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">XLM Returned</span>
                <span className="font-semibold text-foreground">
                  {formatNumber(estimatedReturn.xlm)}
                </span>
              </div>
            </div>
          )}

          {withdrawError && (
            <p className="text-sm text-error" role="alert">
              {withdrawError}
            </p>
          )}

          <Button
            type="submit"
            variant="secondary"
            className="w-full"
            loading={withdrawing}
            disabled={!withdrawLp || Number(withdrawLp) <= 0}
          >
            Remove Liquidity
          </Button>
        </form>
      </Card>
    </div>
  );
}
