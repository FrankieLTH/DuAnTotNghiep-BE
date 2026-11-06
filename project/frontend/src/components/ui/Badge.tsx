import React from 'react';

interface BadgeProps {
  variant?: 'signature' | 'discount' | 'smartpin' | 'feature-green' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'signature',
  children,
  icon,
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full tracking-wide shadow-xs';

  const variantStyles = {
    signature: 'bg-[#FFF8E7] text-[#9A7210] border border-[#F7E5A9]',
    discount: 'bg-semantic-errorBg text-semantic-error border border-semantic-errorBg font-bold',
    smartpin: 'bg-white/90 text-brand-earth border border-secondary-sand shadow-xs',
    'feature-green': 'bg-semantic-successBg text-semantic-success border border-semantic-successBg',
    success: 'bg-semantic-successBg text-semantic-success',
    warning: 'bg-semantic-warningBg text-semantic-warning',
    error: 'bg-semantic-errorBg text-semantic-error',
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {icon && <span className="text-sm">{icon}</span>}
      {children}
    </span>
  );
};
