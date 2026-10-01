import React from 'react';
import { StatusBadge, BadgeStatus } from './StatusBadge';
import { Typography } from './Typography';

export interface CatalogItem {
  id: string | number;
  creator: string;
  songTitle: string;
  genre: string;
  date: string;
  status: BadgeStatus;
}

export interface CatalogTableProps {
  items: CatalogItem[];
  onSort?: (column: string) => void;
  className?: string;
}

export const CatalogTable: React.FC<CatalogTableProps> = ({
  items,
  onSort,
  className = '',
}) => {
  const isEmpty = items.length === 0;

  return (
    <div className={`w-full overflow-hidden border border-[#E5E7EB] rounded-[8px] bg-white ${className}`}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="h-[56px] border-b border-[#E5E7EB] bg-white text-center">
            <th className="px-4 py-3 font-semibold text-[#111827] text-[16px] text-center">
              <button
                type="button"
                onClick={() => onSort?.('creator')}
                className="inline-flex items-center gap-1 hover:text-[#2563EB] mx-auto font-semibold"
              >
                Pencipta <span>⇅</span>
              </button>
            </th>
            <th className="px-4 py-3 font-semibold text-[#111827] text-[16px] text-center">
              <button
                type="button"
                onClick={() => onSort?.('songTitle')}
                className="inline-flex items-center gap-1 hover:text-[#2563EB] mx-auto font-semibold"
              >
                Judul Lagu <span>⇅</span>
              </button>
            </th>
            <th className="px-4 py-3 font-semibold text-[#111827] text-[16px] text-center">
              Genre
            </th>
            <th className="px-4 py-3 font-semibold text-[#111827] text-[16px] text-center">
              <button
                type="button"
                onClick={() => onSort?.('date')}
                className="inline-flex items-center gap-1 hover:text-[#2563EB] mx-auto font-semibold"
              >
                Tanggal <span>⇅</span>
              </button>
            </th>
            <th className="px-4 py-3 font-semibold text-[#111827] text-[16px] text-center">
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={5} className="py-12 text-center bg-[#EEF2FF]">
                <Typography variant="table-head" className="text-[#2563EB]">
                  Belum Ada Katalog Lagu
                </Typography>
              </td>
            </tr>
          ) : (
            items.map((row, index) => {
              const isEven = index % 2 === 1;
              return (
                <tr
                  key={row.id}
                  className={`h-[64px] border-b border-[#E5E7EB] last:border-b-0 text-center transition-colors ${
                    isEven ? 'bg-[#F5F8FE]' : 'bg-white'
                  }`}
                >
                  <td className="px-4 py-3 text-[14px] font-medium text-[#111827]">
                    {row.creator}
                  </td>
                  <td className="px-4 py-3 text-[14px] font-medium text-[#111827]">
                    {row.songTitle}
                  </td>
                  <td className="px-4 py-3 text-[14px] font-medium text-[#111827]">
                    {row.genre}
                  </td>
                  <td className="px-4 py-3 text-[14px] font-medium text-[#111827]">
                    {row.date}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={row.status} className="mx-auto" />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
