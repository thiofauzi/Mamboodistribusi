import React, { useState } from 'react';
import { Card } from './Card';
import { Typography } from './Typography';
import { PLATFORMS, PLATFORM_COLORS } from '../../data/royaltyData';
import { PlatformItem } from '../../data/creatorStatementData';

export interface PlatformCompositionCardProps {
  totalAmount: number;
  platformShares?: number[]; // percentage for each platform
  platformAmounts?: number[]; // absolute nominal amount for each
  platforms?: PlatformItem[]; // dynamic platforms list
  className?: string;
}

export const PlatformCompositionCard: React.FC<PlatformCompositionCardProps> = ({
  totalAmount,
  platformShares = [],
  platformAmounts,
  platforms,
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  const displayList = platforms && platforms.length > 0
    ? platforms
    : PLATFORMS.map((name, idx) => ({
        name,
        percentage: platformShares[idx] || 0,
        amount: platformAmounts ? platformAmounts[idx] : (totalAmount * (platformShares[idx] || 0)) / 100,
        color: PLATFORM_COLORS[idx] || '#6B7280',
      }));

  return (
    <Card className={`p-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <Typography variant="heading-2" color="primary">
            Komposisi Kanal Pendapatan
          </Typography>
        </div>
        <div className="sm:text-right">
          <span className="text-[12px] text-[#4B5563] font-medium block">Total Royalti Gross</span>
          <span className="text-[18px] font-bold text-[#111827] tabular-nums">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* Stacked Interactive Bar */}
      <div className="w-full h-4 bg-[#E5E7EB] rounded-full overflow-hidden flex relative my-3 shadow-inner">
        {displayList.map((item, idx) => {
          if (item.percentage <= 0) return null;
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={item.name + idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color,
              }}
              className={`h-full transition-all duration-200 cursor-pointer ${
                isHovered ? 'brightness-110 scale-y-110' : 'opacity-95 hover:opacity-100'
              }`}
              title={`${item.name}: ${item.percentage.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* Interactive Legend with values */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 pt-2 border-t border-[#F3F4F6]">
        {displayList.map((item, idx) => {
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={item.name + idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center gap-2 text-[13px] px-2 py-1 rounded-md transition-colors cursor-pointer ${
                isHovered ? 'bg-[#F3F4F6]' : 'hover:bg-[#FAFAFA]'
              }`}
            >
              <span
                className="w-3 h-3 rounded-[3px] shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-[#111827]">{item.name}</span>
              <span className="text-[#4B5563] tabular-nums font-semibold">
                {item.percentage.toFixed(1)}%
              </span>
              <span className="text-[12px] text-[#6B7280] tabular-nums hidden sm:inline">
                ({formatCurrency(item.amount)})
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
