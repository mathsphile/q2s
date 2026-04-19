import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`
        bg-white rounded-xl border border-gray-100 shadow-sm p-6
        ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  ),
);

Card.displayName = 'Card';

export default Card;
