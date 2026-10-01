import React from 'react';

export type BadgeStatus =
  | 'dalam-pemakaian'
  | 'tersedia'
  | 'tidak-tersedia'
  | 'pemakaian-exclusive'
  | 'Dibayar'
  | 'Menunggu'
  | 'Perlu dicek';

export interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<
  BadgeStatus,
  { defaultLabel: string; bg: string; text: string; border: string; dotColor?: string }
> = {
  // LOKA Catalog statuses
  'dalam-pemakaian': {
    defaultLabel: 'Dalam Pemakaian',
    bg: 'bg-[#FFF8F0]',
    text: 'text-[#C2610C]',
    border: 'border-[#F3D9BF]',
    dotColor: '#C2610C',
  },
  'tersedia': {
    defaultLabel: 'Tersedia',
    bg: 'bg-[#F3FBF6]',
    text: 'text-[#2F855A]',
    border: 'border-[#B7DCC5]',
    dotColor: '#2F855A',
  },
  'tidak-tersedia': {
    defaultLabel: 'Tidak Tersedia',
    bg: 'bg-[#F3F4F6]',
    text: 'text-[#4B5563]',
    border: 'border-[#E5E7EB]',
    dotColor: '#9CA3AF',
  },
  'pemakaian-exclusive': {
    defaultLabel: 'Pemakaian Exclusive',
    bg: 'bg-[#FFFFFF]',
    text: 'text-[#4B5563]',
    border: 'border-[#E5E7EB]',
    dotColor: '#6B7280',
  },
  // Admin Royalti statuses
  'Dibayar': {
    defaultLabel: 'Dibayar',
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#065F46]',
    border: 'border-[#A7F3D0]',
    dotColor: '#10B981',
  },
  'Menunggu': {
    defaultLabel: 'Menunggu',
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#92400E]',
    border: 'border-[#FDE68A]',
    dotColor: '#F59E0B',
  },
  'Perlu dicek': {
    defaultLabel: 'Perlu dicek',
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#991B1B]',
    border: 'border-[#FECACA]',
    dotColor: '#EF4444',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className = '',
  size = 'md',
}) => {
  const config = statusConfig[status] || statusConfig['tidak-tersedia'];

  const sizeClasses =
    size === 'sm'
      ? 'h-[28px] px-3 text-[12px] min-w-[90px]'
      : 'h-[36px] px-4 text-[13px] min-w-[120px]';

  return (
    <div
      className={`inline-flex items-center justify-center gap-1.5 rounded-[999px] border font-medium select-none ${sizeClasses} ${config.bg} ${config.text} ${config.border} ${className}`.trim()}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: config.dotColor }}
      />
      <span>{label || config.defaultLabel}</span>
    </div>
  );
};
