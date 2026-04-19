import { HTMLAttributes, forwardRef } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Width as a Tailwind class, e.g. "w-full" or "w-32" */
  width?: string;
  /** Height as a Tailwind class, e.g. "h-4" or "h-10" */
  height?: string;
  /** Render as a circle */
  circle?: boolean;
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      width = 'w-full',
      height = 'h-4',
      circle = false,
      className = '',
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={`
          animate-pulse bg-gray-100
          ${circle ? 'rounded-full' : 'rounded-lg'}
          ${width} ${height}
          ${className}
        `}
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
