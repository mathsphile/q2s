'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Token = 'QUEST' | 'XLM';

// ---------------------------------------------------------------------------
// Mock pool data — will be replaced with contract calls
// ---------------------------------------------------------------------------

const POOL = {
  questReserve: 500_000,
  xlmReserve: 250_000,
  swapFeeBps: 30, // 0.3%
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

/**
 * Constant-product AMM output calculation with fee.
 * output = (reserveOut * amountIn * (10000 - feeBps)) / (reserveIn * 10000 + amountIn * (10000 - feeBps))
 */
function calculateSwapOutput(
  amountIn: number,
  reserveIn: number,
  reserveOut: number,
  feeBps: number,
): { amountOut: number; priceImpact: number; fee: number } {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) {
    return { amountOut: 0, priceImpact: 0, fee: 0 };
  }

  const fee = (amountIn * feeBps) / 10000;
  const amountInAfterFee = amountIn - fee;
  const amountOut =
    (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee);

  // Price impact = 1 - (effective price / spot price)
  const spotPrice = reserveOut / reserveIn;
  const effectivePrice = amountOut / amountIn;
  const priceImpact = Math.max(0, (1 - effectivePrice / spotPrice) * 100);

  return { amountOut, priceImpact, fee };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Token Swap Interface
 *
 * Swap form with token selection (QUEST ↔ XLM), amount input, price impact,
 * fee, and slippage display. Executes swap via Liquidity Pool Contract.
 *
 * Requirements: 13.1–13.4, 13.7, 14.1
 */
export default function SwapPage() {
  const [tokenIn, setTokenIn] = useState<Token>('QUEST');
  const [amountIn, setAmountIn] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('0.5');
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenOut: Token = tokenIn === 'QUEST' ? 'XLM' : 'QUEST';

  const reserveIn =
    tokenIn === 'QUEST' ? POOL.questReserve : POOL.xlmReserve;
  const reserveOut =
    tokenIn === 'QUEST' ? POOL.xlmReserve : POOL.questReserve;

  const spotPrice = reserveOut / reserveIn;

  const swapResult = useMemo(() => {
    const amount = Number(amountIn);
    if (isNaN(amount) || amount <= 0) {
      return { amountOut: 0, priceImpact: 0, fee: 0 };
    }
    return calculateSwapOutput(amount, reserveIn, reserveOut, POOL.swapFeeBps);
  }, [amountIn, reserveIn, reserveOut]);

  const minAmountOut = useMemo(() => {
    const slippage = Number(slippageTolerance) / 100;
    return swapResult.amountOut * (1 - slippage);
  }, [swapResult.amountOut, slippageTolerance]);

  const handleFlip = () => {
    setTokenIn(tokenOut);
    setAmountIn('');
    setError(null);
  };

  const handleSwap = async () => {
    setError(null);
    const amount = Number(amountIn);

    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (swapResult.amountOut <= 0) {
      setError('Insufficient liquidity for this trade');
      return;
    }

    if (swapResult.priceImpact > 15) {
      setError('Price impact too high (>15%). Try a smaller amount.');
      return;
    }

    setSwapping(true);
    try {
      // TODO: Call Liquidity Pool Contract swap via wallet signing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setAmountIn('');
    } catch {
      setError('Swap failed. Please try again.');
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      {/* Page header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Swap</h1>
        <p className="mt-1 text-sm text-gray-500">
          Trade QUEST and XLM tokens
        </p>
        <div className="mt-2">
          <Link
            href="/swap/liquidity"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Manage Liquidity →
          </Link>
        </div>
      </div>

      <Card>
        <div className="space-y-4">
          {/* Token In */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-foreground">You Pay</label>
              <Badge variant="default">{tokenIn}</Badge>
            </div>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={amountIn}
              onChange={(e) => {
                setAmountIn(e.target.value);
                setError(null);
              }}
            />
          </div>

          {/* Flip button */}
          <div className="flex justify-center">
            <button
              onClick={handleFlip}
              className="tap-target rounded-full border border-gray-200 bg-gray-50 p-2 text-gray-500 hover:text-foreground hover:border-indigo-400 transition-colors"
              aria-label="Swap token direction"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Token Out */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-foreground">You Receive</label>
              <Badge variant="default">{tokenOut}</Badge>
            </div>
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-foreground">
              {swapResult.amountOut > 0
                ? formatNumber(swapResult.amountOut)
                : '0.00'}
            </div>
          </div>

          {/* Swap details */}
          {Number(amountIn) > 0 && swapResult.amountOut > 0 && (
            <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Rate</span>
                <span className="text-foreground">
                  1 {tokenIn} = {formatNumber(spotPrice, 4)} {tokenOut}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Price Impact</span>
                <span
                  className={
                    swapResult.priceImpact > 5
                      ? 'text-error'
                      : swapResult.priceImpact > 2
                        ? 'text-warning'
                        : 'text-foreground'
                  }
                >
                  {formatNumber(swapResult.priceImpact)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fee (0.3%)</span>
                <span className="text-foreground">
                  {formatNumber(swapResult.fee)} {tokenIn}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Min. received ({slippageTolerance}% slippage)
                </span>
                <span className="text-foreground">
                  {formatNumber(minAmountOut)} {tokenOut}
                </span>
              </div>
            </div>
          )}

          {/* Slippage tolerance */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Slippage:</span>
            {['0.1', '0.5', '1.0'].map((val) => (
              <button
                key={val}
                onClick={() => setSlippageTolerance(val)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${
                  slippageTolerance === val
                    ? 'bg-indigo-100 text-indigo-300 border border-indigo-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:text-foreground'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          )}

          {/* Swap button */}
          <Button
            variant="primary"
            className="w-full"
            size="lg"
            loading={swapping}
            onClick={handleSwap}
            disabled={!amountIn || Number(amountIn) <= 0}
          >
            Swap
          </Button>
        </div>
      </Card>

      {/* Pool info */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Pool Reserves</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">
              {formatNumber(POOL.questReserve, 0)}
            </p>
            <p className="text-xs text-gray-500">QUEST</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">
              {formatNumber(POOL.xlmReserve, 0)}
            </p>
            <p className="text-xs text-gray-500">XLM</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
