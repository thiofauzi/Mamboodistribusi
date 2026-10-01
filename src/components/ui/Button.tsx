import React, { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconRight?: React.ReactNode;
  iconLeft?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Emil Kowalski & UI/UX Pro Max: Specific transition properties, scale(0.97) press feedback, 160ms ease-out
  const baseStyles =
    'inline-flex items-center justify-center font-sans font-semibold rounded-[8px] transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer disabled:cursor-not-allowed select-none active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-[13px] leading-[18px] px-3.5 py-1.5 h-[36px] gap-1.5',
    md: 'text-[14px] leading-[20px] px-5 py-2.5 h-[44px] gap-2', // UI/UX Pro Max touch target 44px
    lg: 'text-[16px] leading-[24px] px-7 py-3 h-[48px] gap-2.5',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-[#2563EB] text-white shadow-xs hover:bg-[#1D4ED8] active:bg-[#1E40AF] disabled:bg-[#93B4F5] disabled:text-white disabled:active:scale-100',
    secondary:
      'bg-white text-[#111827] border border-[#E5E7EB] shadow-2xs hover:bg-[#F9FAFB] hover:border-[#D1D5DB] active:bg-[#F3F4F6] disabled:text-[#9CA3AF] disabled:border-[#E5E7EB] disabled:active:scale-100',
    ghost:
      'bg-transparent text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827] active:bg-[#E5E7EB] disabled:text-[#9CA3AF] disabled:active:scale-100',
  };

  return (
    <button
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`.trim()}
      {...props}
    >
      {iconLeft && <span className="inline-flex shrink-0">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
    </button>
  );
};
