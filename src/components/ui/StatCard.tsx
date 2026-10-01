import React from 'react';
import { Card } from './Card';
import { Typography } from './Typography';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  isHighlighted?: boolean; // Card highlight (accent-orange chip)
  isDark?: boolean; // Dark card variant
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  isHighlighted = false,
  isDark = false,
  className = '',
}) => {
  if (isDark) {
    return (
      <div
        className={`bg-[#111827] text-white rounded-[8px] p-5 flex flex-col justify-between h-[132px] border border-[#1F2937] shadow-[0_1px_3px_rgba(16,24,40,0.10)] ${className}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#9CA3AF]">{label}</span>
          <div className="w-8 h-8 rounded-full bg-[#1F2937] text-[#60A5FA] flex items-center justify-center shrink-0">
            {icon}
          </div>
        </div>
        <div>
          <span className="text-[28px] font-semibold tracking-tight text-white block tabular-nums leading-tight">
            {value}
          </span>
          {subtitle && (
            <span className="text-[12px] text-[#9CA3AF] mt-0.5 block">{subtitle}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`flex flex-col justify-between h-[132px] p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <Typography variant="body" color="secondary" className="truncate font-medium">
          {label}
        </Typography>

        {/* Icon Chip 32px */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform ${
            isHighlighted ? 'bg-[#FF8A00] text-white shadow-sm' : 'bg-[#D6DAE3] text-[#2563EB]'
          }`}
        >
          {icon || (
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          )}
        </div>
      </div>

      <div className="mt-1">
        <span className="text-[28px] leading-[34px] font-semibold tracking-tight text-[#111827] block tabular-nums">
          {value}
        </span>
        {subtitle && (
          <Typography variant="body" color="secondary" className="text-[12px] mt-0.5">
            {subtitle}
          </Typography>
        )}
      </div>
    </Card>
  );
};
