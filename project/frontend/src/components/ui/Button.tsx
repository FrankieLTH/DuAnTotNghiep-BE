import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'dark' | 'filter-active' | 'filter-inactive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-5 py-2.5 text-base rounded-xl gap-2',
    lg: 'px-7 py-3 text-lg rounded-xl gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary: 'bg-brand-terracotta text-white hover:bg-[#b04a25] shadow-md hover:shadow-lg',
    outline: 'border-2 border-brand-terracotta text-brand-terracotta hover:bg-brand-tint',
    ghost: 'bg-secondary-sand/60 text-brand-earth hover:bg-secondary-sand',
    dark: 'bg-brand-earth text-white hover:bg-[#2c1e18] shadow-md',
    'filter-active': 'bg-brand-earth text-white rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm',
    'filter-inactive': 'bg-white border border-secondary-sand text-brand-earth hover:bg-secondary-cream rounded-full px-4 py-1.5 text-sm',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
