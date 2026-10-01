import React, { useEffect } from 'react';
import { Creator, PLATFORMS, PLATFORM_COLORS } from '../../data/royaltyData';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { Typography } from './Typography';

export interface CreatorDrawerProps {
  creator: Creator | null;
  onClose: () => void;
  onViewDeepDetail?: (creator: Creator) => void;
  className?: string;
}

export const CreatorDrawer: React.FC<CreatorDrawerProps> = ({
  creator,
  onClose,
  onViewDeepDetail,
  className = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!creator) return null;

  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  const taxAmount = creator.totalRoyalty - creator.netRoyalty;

  return (
    <aside
      className={`w-full lg:w-[360px] bg-white border border-[#E5E7EB] rounded-[12px] p-5 shadow-sm flex flex-col justify-between self-start sticky top-6 transition-[opacity,transform] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 ${className}`}
      aria-label="Detail Panel Pencipta"
      aria-live="polite"
    >
      <div>
        {/* Header & Close */}
        <div className="flex items-start justify-between pb-3 border-b border-[#F3F4F6]">
          <div>
            <div className="flex items-center gap-2">
              <Typography variant="heading-3" color="primary">
                {creator.name}
              </Typography>
            </div>
            <p className="text-[13px] text-[#6B7280] mt-0.5">
              ID {creator.id} · {creator.songsCount} lagu terdaftar · {creator.views.toLocaleString('id-ID')} views
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Panel"
            className="w-10 h-10 -mr-2 -mt-2 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] active:scale-[0.95] transition-[transform,background-color,color] duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            ✕
          </button>
        </div>

        {/* Status */}
        <div className="my-4 flex items-center justify-between">
          <span className="text-[13px] text-[#4B5563] font-medium">Status Pembayaran</span>
          <StatusBadge status={creator.status} size="sm" />
        </div>

        {/* Financial Summary Breakdown */}
        <div className="bg-[#FAFAFA] rounded-[8px] p-3.5 border border-[#E5E7EB] space-y-2.5">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[#6B7280]">Total Royalti Kotor</span>
            <span className="font-semibold text-[#111827] tabular-nums">
              {formatCurrency(creator.totalRoyalty)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[#6B7280]">Pajak PPh 23 (2%)</span>
            <span className="font-semibold text-[#EF4444] tabular-nums">
              -{formatCurrency(taxAmount)}
            </span>
          </div>
          <div className="pt-2 border-t border-[#E5E7EB] flex justify-between items-center text-[14px]">
            <span className="font-semibold text-[#111827]">Saldo Bersih Dibayar</span>
            <span className="font-bold text-[#059669] tabular-nums text-[16px]">
              {formatCurrency(creator.netRoyalty)}
            </span>
          </div>
        </div>

        {/* YouTube Monetization Breakdown */}
        <div className="mt-5">
          <h4 className="text-[14px] font-semibold text-[#111827] mb-2.5">
            Komposisi Monetisasi YouTube
          </h4>
          <div className="space-y-2">
            {PLATFORMS.map((plat, idx) => {
              const share = creator.platformShares[idx] || 0;
              const nominal = idx === 0 ? creator.adsRev : creator.subsRev;
              return (
                <div
                  key={plat}
                  className="flex items-center justify-between text-[13px] py-1 border-b border-[#F3F4F6] last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-[2px]"
                      style={{ backgroundColor: PLATFORM_COLORS[idx] }}
                    />
                    <span className="text-[#374151] truncate max-w-[170px]" title={plat}>
                      {plat}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#6B7280] mr-2 text-[12px] tabular-nums">
                      {share}%
                    </span>
                    <span className="font-medium text-[#111827] tabular-nums">
                      {formatCurrency(nominal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 3 Songs Preview */}
        {creator.songsList && creator.songsList.length > 0 && (
          <div className="mt-5">
            <h4 className="text-[14px] font-semibold text-[#111827] mb-2">
              Lagu Teratas
            </h4>
            <div className="space-y-1.5">
              {creator.songsList.slice(0, 3).map((song, i) => (
                <div
                  key={song.title}
                  className="flex items-center justify-between text-[12px] bg-[#F9FAFB] p-2 rounded border border-[#E5E7EB]"
                >
                  <span className="font-medium text-[#111827] truncate pr-2">
                    #{i + 1} {song.title}
                  </span>
                  <span className="font-semibold text-[#2563EB] tabular-nums shrink-0">
                    {formatCurrency(song.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="mt-6 pt-4 border-t border-[#F3F4F6]">
        <Button
          variant="primary"
          size="md"
          onClick={() => onViewDeepDetail?.(creator)}
          className="w-full text-center"
          iconRight={<span>→</span>}
        >
          Buka Detail Statement ({creator.songsCount} Lagu)
        </Button>
        <p className="text-[11px] text-[#6B7280] text-center mt-2 leading-tight">
          Data riil hasil rekapitulasi distribusi YouTube Music & Ads Mei 2026.
        </p>
      </div>
    </aside>
  );
};
