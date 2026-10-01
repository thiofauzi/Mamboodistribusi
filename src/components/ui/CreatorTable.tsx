import React from 'react';
import { Creator } from '../../data/royaltyData';
import { StatusBadge } from './StatusBadge';
import { Typography } from './Typography';

export interface CreatorTableProps {
  creators: Creator[];
  selectedCreatorId?: number | null;
  onSelectCreator: (creator: Creator) => void;
  sortKey: 'name' | 'songsCount' | 'totalRoyalty' | 'netRoyalty';
  sortOrder: 'asc' | 'desc';
  onSort: (key: 'name' | 'songsCount' | 'totalRoyalty' | 'netRoyalty') => void;
  className?: string;
}

const AVATAR_BG_COLORS = [
  'bg-[#FB923C] text-white',
  'bg-[#EC4899] text-white',
  'bg-[#8B5CF6] text-white',
  'bg-[#10B981] text-white',
  'bg-[#3B82F6] text-white',
];

export const CreatorTable: React.FC<CreatorTableProps> = ({
  creators,
  selectedCreatorId,
  onSelectCreator,
  sortKey,
  sortOrder,
  onSort,
  className = '',
}) => {
  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const renderSortIndicator = (key: string) => {
    if (sortKey !== key) {
      return <span className="opacity-30 ml-1 text-xs">↕</span>;
    }
    return (
      <span className="text-[#2563EB] ml-1 text-xs font-bold">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div
      className={`w-full overflow-hidden border border-[#E5E7EB] rounded-[8px] bg-white shadow-sm ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="h-[52px] border-b border-[#E5E7EB] bg-[#FAFAFA] text-[13px] font-semibold text-[#4B5563]">
              <th className="px-5 py-3 font-semibold text-[#111827]">
                <button
                  type="button"
                  onClick={() => onSort('name')}
                  className="inline-flex items-center hover:text-[#2563EB] transition-colors font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1 -mx-1"
                >
                  Pencipta {renderSortIndicator('name')}
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-[#111827]">
                <button
                  type="button"
                  onClick={() => onSort('songsCount')}
                  className="inline-flex items-center hover:text-[#2563EB] transition-colors font-semibold ml-auto outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1 -mx-1"
                >
                  Lagu {renderSortIndicator('songsCount')}
                </button>
              </th>
              <th className="px-5 py-3 text-right font-semibold text-[#111827]">
                <button
                  type="button"
                  onClick={() => onSort('totalRoyalty')}
                  className="inline-flex items-center hover:text-[#2563EB] transition-colors font-semibold ml-auto outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1 -mx-1"
                >
                  Royalti Gross {renderSortIndicator('totalRoyalty')}
                </button>
              </th>
              <th className="px-5 py-3 text-right font-semibold text-[#111827]">
                <button
                  type="button"
                  onClick={() => onSort('netRoyalty')}
                  className="inline-flex items-center hover:text-[#2563EB] transition-colors font-semibold ml-auto outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1 -mx-1"
                >
                  Hak Bersih (70%) {renderSortIndicator('netRoyalty')}
                </button>
              </th>
              <th className="px-5 py-3 font-semibold text-[#111827] text-center w-[130px]">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E5E7EB]">
            {creators.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center bg-[#FAFAFA]">
                  <Typography variant="body" color="secondary">
                    Tidak ada data pencipta lagu yang sesuai filter.
                  </Typography>
                </td>
              </tr>
            ) : (
              creators.map((c, idx) => {
                const isSelected = selectedCreatorId === c.id;
                const avatarColorClass =
                  AVATAR_BG_COLORS[c.id % AVATAR_BG_COLORS.length];

                return (
                  <tr
                    key={c.id}
                    tabIndex={0}
                    role="button"
                    aria-selected={isSelected}
                    onClick={() => onSelectCreator(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectCreator(c);
                      }
                    }}
                    className={`h-[64px] transition-[background-color,border-color] duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-inset group ${
                      isSelected
                        ? 'bg-[#EFF6FF] border-l-4 border-l-[#2563EB]'
                        : idx % 2 === 1
                        ? 'bg-[#F9FAFB] hover:bg-[#F3F4F6]'
                        : 'bg-white hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {/* Creator with Avatar */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarColorClass}`}
                        >
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[14px] text-[#111827] group-hover:text-[#2563EB] transition-colors">
                              {c.name}
                            </span>
                          </div>
                          <span className="text-[12px] text-[#6B7280]">
                            ID {c.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Songs Count */}
                    <td className="px-4 py-3 text-right font-medium text-[14px] text-[#111827] tabular-nums">
                      {c.songsCount}
                    </td>

                    {/* Total Royalty Gross */}
                    <td className="px-5 py-3 text-right font-semibold text-[14px] text-[#111827] tabular-nums">
                      {formatCurrency(c.totalRoyalty)}
                    </td>

                    {/* Net Royalty */}
                    <td className="px-5 py-3 text-right font-semibold text-[14px] text-[#059669] tabular-nums">
                      {formatCurrency(c.netRoyalty)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={c.status} size="sm" className="mx-auto" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
