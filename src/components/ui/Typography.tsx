import React, { ElementType } from 'react';

export type TypographyVariant =
  | 'display'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'nav'
  | 'table-head'
  | 'body'
  | 'table-cell'
  | 'label'
  | 'button';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'brand'
  | 'white'
  | 'inherit';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  color?: TextColor;
  as?: ElementType;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<TypographyVariant, string> = {
  'display': 'text-[32px] leading-[40px] font-medium tracking-tight',
  'heading-1': 'text-[28px] leading-[36px] font-bold tracking-tight',
  'heading-2': 'text-[18px] leading-[24px] font-medium',
  'heading-3': 'text-[18px] leading-[24px] font-semibold',
  'nav': 'text-[16px] leading-[24px] font-semibold',
  'table-head': 'text-[16px] leading-[24px] font-semibold',
  'body': 'text-[14px] leading-[20px] font-normal',
  'table-cell': 'text-[14px] leading-[20px] font-medium',
  'label': 'text-[14px] leading-[20px] font-medium',
  'button': 'text-[14px] leading-[20px] font-semibold',
};

const colorStyles: Record<TextColor, string> = {
  primary: 'text-[#111827]',
  secondary: 'text-[#4B5563]',
  disabled: 'text-[#C7CDD6]',
  brand: 'text-[#2563EB]',
  white: 'text-white',
  inherit: 'text-inherit',
};

const defaultTagMap: Record<TypographyVariant, ElementType> = {
  'display': 'span',
  'heading-1': 'h1',
  'heading-2': 'h2',
  'heading-3': 'h3',
  'nav': 'span',
  'table-head': 'span',
  'body': 'p',
  'table-cell': 'span',
  'label': 'span',
  'button': 'span',
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = 'primary',
  as,
  children,
  className = '',
  ...props
}) => {
  const Component = as || defaultTagMap[variant] || 'span';
  const variantClass = variantStyles[variant] || variantStyles.body;
  const colorClass = colorStyles[color] || colorStyles.primary;

  return (
    <Component
      className={`font-sans ${variantClass} ${colorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};
