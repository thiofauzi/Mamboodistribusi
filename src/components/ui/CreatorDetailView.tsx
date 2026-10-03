import React, { useState, useMemo } from 'react';
import { Creator, SongItem } from '../../data/royaltyData';
import { StatCard } from './StatCard';
import { Card } from './Card';
import { Button } from './Button';
import { Typography } from './Typography';
import { StatusBadge } from './StatusBadge';

export interface CreatorDetailViewProps {
  creator: Creator;
  onBack: () => void;
  onOpenCreatorPortal?: () => void;
}

export const CreatorDetailView: React.FC<CreatorDetailViewProps> = ({
  creator,
  onBack,
  onOpenCreatorPortal,
}) => {
  const [songSearch, setSongSearch] = useState('');
  const [expandedSong, setExpandedSong] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  const taxAmount = creator.totalRoyalty - creator.netRoyalty;

  const filteredSongs = useMemo(() => {
    if (!songSearch.trim()) return creator.songsList;
    return creator.songsList.filter((s: SongItem) =>
      s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
      (s.customId && s.customId.toLowerCase().includes(songSearch.toLowerCase()))
    );
  }, [creator.songsList, songSearch]);

  const topSongs = useMemo(() => {
    return creator.songsList.slice(0, 6);
  }, [creator.songsList]);

  const maxTopSongAmount = topSongs.length > 0 ? topSongs[0].amount : 1;

  const toggleSongExpand = (title: string) => {
    setExpandedSong((prev) => (prev === title ? null : title));
  };

  const handleExportCSV = () => {
    try {
      const csvHeader = 'Rank,Custom ID,Judul Lagu,Views,Ads Rev (Rp),Subs Rev (Rp),Total Royalti (Rp),Kontribusi\n';
      const rows = creator.songsList
        .map((s, index) => {
          const pct = ((s.amount / creator.totalRoyalty) * 100).toFixed(2);
          return `${index + 1},"${s.customId || '-'}",${s.title.replace(/"/g, '""')},${s.views},${s.adsRev},${s.subsRev},${s.amount},"${pct}%"`;
        })
        .join('\n');

      const blob = new Blob([csvHeader + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `statement-${creator.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-mei-2026.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Ekspor CSV gagal di browser ini.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back button and Header */}
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors w-fit cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded py-1 px-2 -ml-2"
        >
          <span>←</span> Kembali ke daftar pencipta
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Typography variant="heading-1">{creator.name}</Typography>
              <StatusBadge status={creator.status} size="sm" />
            </div>
            <Typography variant="body" color="secondary" className="mt-1">
              ID {creator.id} · Periode Mei 2026
            </Typography>
          </div>

          <div className="flex items-center gap-3">
            {onOpenCreatorPortal && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenCreatorPortal}
                iconLeft={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              >
                Buka Portal Pencipta
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Royalti Gross"
          value={formatCurrency(creator.totalRoyalty)}
          isHighlighted={true}
        />
        <StatCard
          label="Hak Pencipta (70%)"
          value={formatCurrency(creator.netRoyalty)}
          isDark={true}
        />
        <StatCard
          label="Publisher LOKA (30%)"
          value={formatCurrency(Math.round(creator.totalRoyalty * 0.30))}
        />
        <StatCard
          label="Katalog Lagu"
          value={`${creator.songsCount} Lagu`}
        />
      </div>

      {/* 2-Column Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top 6 Songs */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="heading-2">Lagu Teratas</Typography>
            <span className="text-[12px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-md">
              Top Songs
            </span>
          </div>

          <div className="space-y-3.5">
            {topSongs.map((song, index) => {
              const pct = (song.amount / maxTopSongAmount) * 100;
              const shareOfTotal = ((song.amount / creator.totalRoyalty) * 100).toFixed(1);

              return (
                <div key={song.title} className="text-[13px]">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="w-5 text-[12px] font-bold text-[#6B7280]">
                        #{index + 1}
                      </span>
                      <span className="font-semibold text-[#111827] truncate">
                        {song.title}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-[#111827] tabular-nums">
                        {formatCurrency(song.amount)}
                      </span>
                      <span className="text-[11px] text-[#6B7280] ml-1.5 tabular-nums">
                        ({shareOfTotal}%)
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Monetization & Geographic Distribution */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <Typography variant="heading-2">Kanal Pendapatan & Geografi</Typography>
              <span className="text-[12px] font-semibold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-md">
                {creator.dspPlatforms && creator.dspPlatforms.length > 1 ? 'Multi-DSP Split' : 'DSP Split'}
              </span>
            </div>

            {/* Multi-DSP & Platform split bars */}
            <div className="space-y-3 mb-6">
              {creator.dspPlatforms && creator.dspPlatforms.length > 0 ? (
                creator.dspPlatforms.map((p) => (
                  <div key={p.name}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <div className="flex items-center gap-1.5 font-medium text-[#111827]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span>{p.name}</span>
                      </div>
                      <span className="font-semibold text-[#111827] tabular-nums">
                        {formatCurrency(p.amount)} ({p.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(p.percentage, 2)}%`,
                          backgroundColor: p.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="font-medium text-[#111827]">YouTube Advertising (Ads)</span>
                      <span className="font-semibold text-[#111827] tabular-nums">
                        {formatCurrency(creator.adsRev)} ({creator.youtubeBreakdown.adsPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#EF4444] rounded-full"
                        style={{ width: `${creator.youtubeBreakdown.adsPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="font-medium text-[#111827]">YouTube Premium / Subscription</span>
                      <span className="font-semibold text-[#111827] tabular-nums">
                        {formatCurrency(creator.subsRev)} ({creator.youtubeBreakdown.subsPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3B82F6] rounded-full"
                        style={{ width: `${creator.youtubeBreakdown.subsPct}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Top Countries */}
            {creator.topCountries && creator.topCountries.length > 0 && (
              <div className="pt-4 border-t border-[#F3F4F6]">
                <h5 className="text-[13px] font-semibold text-[#111827] mb-2.5">
                  Top Negara:
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {creator.topCountries.map((c) => (
                    <div key={c.code} className="bg-[#F9FAFB] p-2 rounded border border-[#E5E7EB] text-center">
                      <div className="text-[11px] font-bold text-[#6B7280]">{c.code}</div>
                      <div className="text-[12px] font-bold text-[#111827] tabular-nums">
                        {formatCurrency(c.rev)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* All Songs Catalog Table */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <Typography variant="heading-2">Semua Lagu ({creator.songsCount})</Typography>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <input
                type="search"
                value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
                placeholder="Cari judul lagu atau ID..."
                aria-label="Cari judul lagu"
                className="h-10 pl-9 pr-4 rounded-[8px] border border-[#E5E7EB] bg-white text-[14px] text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all w-60"
              />
              <svg
                className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              iconLeft={
                <svg className="w-4 h-4 text-[#4B5563]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              Ekspor CSV
            </Button>
          </div>
        </div>

        {/* Songs Table with accordion row */}
        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="h-11 bg-[#FAFAFA] border-b border-[#E5E7EB] text-[13px] font-semibold text-[#4B5563]">
                <th className="px-4 py-2 w-12 text-center">#</th>
                <th className="px-4 py-2 font-semibold text-[#111827]">Judul Lagu</th>
                <th className="px-4 py-2 text-right font-semibold text-[#111827]">Views</th>
                <th className="px-4 py-2 text-right font-semibold text-[#111827]">Royalti (Rp)</th>
                <th className="px-4 py-2 text-right font-semibold text-[#111827]">Kontribusi</th>
                <th className="px-4 py-2 w-16 text-center">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredSongs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                    Tidak ditemukan lagu dengan judul "{songSearch}".
                  </td>
                </tr>
              ) : (
                filteredSongs.map((song: SongItem, idx: number) => {
                  const isExpanded = expandedSong === song.title;
                  const pct = ((song.amount / creator.totalRoyalty) * 100).toFixed(2);

                  return (
                    <React.Fragment key={song.title}>
                      <tr
                        tabIndex={0}
                        role="button"
                        aria-expanded={isExpanded}
                        onClick={() => toggleSongExpand(song.title)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleSongExpand(song.title);
                          }
                        }}
                        className={`transition-[background-color] duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-inset ${
                          isExpanded
                            ? 'bg-[#EFF6FF]'
                            : idx % 2 === 1
                            ? 'bg-[#F9FAFB] hover:bg-[#F3F4F6]'
                            : 'bg-white hover:bg-[#F3F4F6]'
                        }`}
                      >
                        <td className="px-4 py-3 text-center text-[12px] text-[#6B7280] font-medium tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#111827]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{song.title}</span>
                            {song.dsp && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                                {song.dsp}
                              </span>
                            )}
                            {song.customId && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F3F4F6] text-[#6B7280] font-mono">
                                {song.customId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#4B5563] tabular-nums">
                          {song.views.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#111827] tabular-nums">
                          {formatCurrency(song.amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#4B5563] tabular-nums">
                          {pct}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            aria-label={`Rincian platform ${song.title}`}
                            className="p-1 rounded text-[#6B7280] hover:text-[#111827] transition-transform duration-150"
                          >
                            <span className={`inline-block transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Breakdown Row */}
                      {isExpanded && (
                        <tr className="bg-[#F8FAFC]">
                          <td colSpan={6} className="p-4 border-b border-[#E2E8F0]">
                            <div className="animate-in fade-in duration-200">
                              <h6 className="text-[13px] font-semibold text-[#1E293B] mb-2 flex items-center gap-2">
                                <span>Rincian Pendapatan DSP Platform untuk:</span>
                                <span className="text-[#2563EB]">"{song.title}"</span>
                              </h6>
                              {song.dspBreakdown && Object.keys(song.dspBreakdown).length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                                  {Object.entries(song.dspBreakdown).map(([platName, amt]) => {
                                    const platPct = song.amount > 0 ? ((amt / song.amount) * 100).toFixed(0) : 0;
                                    const badgeColor =
                                      platName.includes('Spotify') ? 'text-[#10B981]'
                                      : platName.includes('YouTube') ? 'text-[#EF4444]'
                                      : platName.includes('Apple') ? 'text-[#F59E0B]'
                                      : 'text-[#6366F1]';
                                    return (
                                      <div key={platName} className="bg-white p-3 rounded-md border border-[#E2E8F0] shadow-2xs">
                                        <div className="flex justify-between items-center text-[12px] mb-1">
                                          <span className={`font-semibold ${badgeColor}`}>{platName}</span>
                                          <span className="text-[#64748B] tabular-nums">{platPct}%</span>
                                        </div>
                                        <div className="text-[14px] font-bold text-[#0F172A] tabular-nums">
                                          {formatCurrency(amt)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                                  <div className="bg-white p-3 rounded-md border border-[#E2E8F0] shadow-2xs">
                                    <div className="flex justify-between items-center text-[12px] mb-1">
                                      <span className="font-medium text-[#EF4444]">YouTube Ads</span>
                                      <span className="text-[#64748B] tabular-nums">
                                        {song.amount > 0 ? ((song.adsRev / song.amount) * 100).toFixed(0) : 0}%
                                      </span>
                                    </div>
                                    <div className="text-[14px] font-bold text-[#0F172A] tabular-nums">
                                      {formatCurrency(song.adsRev)}
                                    </div>
                                  </div>
                                  <div className="bg-white p-3 rounded-md border border-[#E2E8F0] shadow-2xs">
                                    <div className="flex justify-between items-center text-[12px] mb-1">
                                      <span className="font-medium text-[#3B82F6]">YouTube Subscription</span>
                                      <span className="text-[#64748B] tabular-nums">
                                        {song.amount > 0 ? ((song.subsRev / song.amount) * 100).toFixed(0) : 0}%
                                      </span>
                                    </div>
                                    <div className="text-[14px] font-bold text-[#0F172A] tabular-nums">
                                      {formatCurrency(song.subsRev)}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
