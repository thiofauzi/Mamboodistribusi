import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  bordered = true,
  ...props
}) => {
  const paddingMap = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5', // 20px per design.md (Card statistik & card chart)
    lg: 'p-6',
  };

  return (
    <div
      className={`bg-white rounded-[8px] transition-shadow duration-200 ${
        bordered ? 'border border-[#E5E7EB]' : ''
      } shadow-[0_1px_3px_rgba(16,24,40,0.10),0_1px_2px_rgba(16,24,40,0.06)] ${
        paddingMap[padding]
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};
