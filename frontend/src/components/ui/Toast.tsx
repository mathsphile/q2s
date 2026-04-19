'use client';

import { useEffect } from 'react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  open: boolean;
  onClose: () => void;
  /** Auto-dismiss duration in ms. Set to 0 to disable. */
  duration?: number;
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-l-emerald-500 text-emerald-700',
  error: 'border-l-red-500 text-red-700',
  warning: 'border-l-amber-500 text-amber-700',
  info: 'border-l-indigo-500 text-indigo-700',
};

export default function Toast({
  message,
  variant = 'info',
  open,
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (open && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-3
        bg-white border border-border border-l-4 rounded-lg
        shadow-lg px-4 py-3 animate-fade-in
        ${variantStyles[variant]}
      `}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="tap-target ml-2 rounded p-1 hover:bg-gray-100 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
