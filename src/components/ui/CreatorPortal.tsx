import React, { useState, useMemo } from 'react';
import { Card } from './Card';
import { Typography } from './Typography';
import { Button } from './Button';
import { StatCard } from './StatCard';
import { StatusBadge } from './StatusBadge';
import {
  getCreatorsFromAllBatches,
  getPendingBatches,
  getAllBatches,
  RoyaltyBatch,
} from '../../data/distributionEngine';
import { PublishModal } from './PublishModal';
import {
  getCreatorPortalData,
  AVAILABLE_PERIODS,
  SongDetailItem,
} from '../../data/creatorStatementData';

export interface CreatorPortalProps {
  initialCreatorId?: number | null;
  onBackToAdmin?: () => void;
}

type TabType = 'summary' | 'songs' | 'platforms';

export const CreatorPortal: React.FC<CreatorPortalProps> = ({
  initialCreatorId,
  onBackToAdmin,
}) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalPublishBatch, setModalPublishBatch] = useState<RoyaltyBatch | null>(null);

  // PB-1.1: Only reads published and locked batches
  const allCreators = useMemo(() => getCreatorsFromAllBatches(true), [refreshTrigger]);
  const pendingBatches = useMemo(() => getPendingBatches(), [refreshTrigger]);
  const publishedBatches = useMemo(() => {
    return getAllBatches().filter((b) => b.status === 'published' || b.status === 'locked');
  }, [refreshTrigger]);

  // Selected creator state
  const [selectedCreatorId, setSelectedCreatorId] = useState<number>(() => {
    if (initialCreatorId && allCreators.some((c) => c.id === initialCreatorId)) {
      return initialCreatorId;
    }
    return allCreators.length > 0 ? allCreators[0].id : 1;
  });

  // Active Tab state: 'summary' | 'songs' | 'platforms'
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Distribution Period Filter state: 'Mei 2026' | '1Q26' | 'Semua'
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Mei 2026');

  // Songs tab search & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [dspFilter, setDspFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = highest rev, 'asc' = title A-Z

  // Song drill-down detail selection
  const [selectedSongDetail, setSelectedSongDetail] = useState<SongDetailItem | null>(null);

  // Active creator from batch list
  const currentCreator = useMemo(() => {
    return allCreators.find((c) => c.id === selectedCreatorId) || allCreators[0] || null;
  }, [allCreators, selectedCreatorId]);

  // Dynamic portal data based on selected creator AND selected period
  const portalData = useMemo(() => {
    if (!currentCreator) return null;
    return getCreatorPortalData(currentCreator, selectedPeriod);
  }, [currentCreator, selectedPeriod]);

  // PB-1.2: Check if any batch in current or selected period is still in review/ready_to_publish
  const pendingForSelectedPeriod = useMemo(() => {
    return pendingBatches.find(
      (b) =>
        b.period.toLowerCase().includes(selectedPeriod.toLowerCase()) ||
        selectedPeriod.toLowerCase().includes(b.period.toLowerCase()) ||
        (selectedPeriod === 'Mei 2026' && b.period === 'Mei 2026')
    );
  }, [pendingBatches, selectedPeriod]);

  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  // Filter & Sort songs for the 'Lagu' tab
  const filteredSongs = useMemo(() => {
    if (!portalData) return [];
    let list = portalData.songs.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.customId && s.customId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDsp =
        !dspFilter ||
        s.dsp.toLowerCase().includes(dspFilter.toLowerCase()) ||
        (s.platformBreakdown && Object.keys(s.platformBreakdown).some((p) => p.toLowerCase().includes(dspFilter.toLowerCase())));

      return matchesSearch && matchesDsp;
    });

    if (sortOrder === 'asc') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list = [...list].sort((a, b) => b.netAmount - a.netAmount);
    }

    return list;
  }, [portalData, searchQuery, dspFilter, sortOrder]);

  // Export personalized statement to CSV
  const handleExportStatement = () => {
    if (!portalData || !currentCreator) return;
    try {
      const header = 'No,Judul Lagu,Song ID,Hak Cipta (%),Royalti Kotor Lagu (Rp),Bagian Bersih Pencipta 70% (Rp),Kontribusi (%),DSP\n';
      const rows = portalData.songs
        .map(
          (s, idx) =>
            `${idx + 1},"${s.title.replace(/"/g, '""')}",${s.customId || '-'},70%,${s.grossAmount},${s.netAmount},${s.contributionPct}%,"${s.dsp}"`
        )
        .join('\n');

      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `statement-royalti-${currentCreator.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${selectedPeriod.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert('Gagal mengekspor statement.');
    }
  };

  // If no creators / empty state
  if (allCreators.length === 0 || !currentCreator || !portalData) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="heading-1">Portal Pencipta Lagu</Typography>
            <Typography variant="body" color="secondary" className="mt-1">
              LOKA Publishing · Portal Transparansi Royalti Member
            </Typography>
          </div>
          {onBackToAdmin && (
            <Button variant="secondary" size="sm" onClick={onBackToAdmin}>
              Kembali ke Admin
            </Button>
          )}
        </div>

        {/* PB-1.2: Verification Banner when there are pending batches awaiting publication */}
        {pendingBatches.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-[12px] p-4 flex items-start gap-3.5 shadow-2xs animate-in fade-in">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 text-lg">
              ℹ️
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-amber-950">
                  Laporan royalti periode [{pendingBatches[0].period}] sedang dalam tahap verifikasi & rekonsiliasi oleh Tim LOKA Publishing. Saldo akan diperbarui setelah proses verifikasi selesai.
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 tracking-wide">
                  PB-1.2
                </span>
              </div>
              <p className="text-[12px] text-amber-800/90 mt-1 leading-relaxed">
                Laporan distribusi DSP ({pendingBatches[0].fileName}) masih dalam status peninjauan internal. Seluruh saldo royalti dan slip statement baru akan tampil di portal setelah batch dinyatakan resmi terbit (Published).
              </p>
            </div>
          </div>
        )}

        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <Typography variant="heading-2">Belum Ada Data Distribusi Terpublikasi</Typography>
          <Typography variant="body" color="secondary" className="max-w-md mx-auto mt-2">
            {pendingBatches.length > 0
              ? 'Laporan royalti saat ini sedang diverifikasi internal oleh Tim LOKA Publishing. Silakan periksa kembali setelah status batch diterbitkan resmi.'
              : 'Belum ada data distribusi. Unggah laporan DSP melalui dashboard Admin.'}
          </Typography>
          {onBackToAdmin && (
            <div className="mt-6">
              <Button variant="primary" size="md" onClick={onBackToAdmin}>
                Buka Dashboard Admin
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const maxTopSong = portalData.topSongs.length > 0 ? portalData.topSongs[0].amount : 1;
  const maxPlatformAmt = portalData.platforms.length > 0 ? portalData.platforms[0].amount : 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Bar: Account Switcher, Period Filter & Actions ────────── */}
      <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Creator Switcher + Period Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Creator Selector */}
          <div className="flex items-center gap-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3 py-1.5">
            <span className="text-[12px] font-medium text-[#6B7280] whitespace-nowrap">Lihat Akun:</span>
            <select
              aria-label="Pilih akun pencipta"
              value={selectedCreatorId}
              onChange={(e) => {
                setSelectedCreatorId(Number(e.target.value));
                setSelectedSongDetail(null);
              }}
              className="bg-transparent text-[13px] font-semibold text-[#111827] focus:outline-none cursor-pointer max-w-[220px] sm:max-w-[260px] truncate"
            >
              {allCreators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter (Requested Feature) */}
          <div className="flex items-center gap-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] px-3 py-1.5">
            <span className="text-[12px] font-medium text-[#1E40AF] whitespace-nowrap flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Periode:
            </span>
            <select
              aria-label="Filter Periode Distribusi"
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setSelectedSongDetail(null);
              }}
              className="bg-transparent text-[13px] font-bold text-[#1E40AF] focus:outline-none cursor-pointer"
            >
              {AVAILABLE_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportStatement}
            iconLeft={
              <svg className="w-4 h-4 text-[#4B5563]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          >
            Unduh Statement (CSV)
          </Button>

          {onBackToAdmin && (
            <Button variant="ghost" size="sm" onClick={onBackToAdmin}>
              Ke Admin Royalti →
            </Button>
          )}
        </div>
      </div>

      {/* ── PB-1.2: Informative Verification Banner ─────────────────── */}
      {pendingForSelectedPeriod && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/90 rounded-[12px] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 shadow-2xs animate-in fade-in">
          <div className="flex items-start gap-3.5 flex-1">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 text-lg">
              ℹ️
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-amber-950">
                  Laporan royalti periode [{pendingForSelectedPeriod.period}] sedang dalam tahap verifikasi & rekonsiliasi oleh Tim LOKA Publishing. Saldo akan diperbarui setelah proses verifikasi selesai.
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 tracking-wide">
                  PB-1.2
                </span>
              </div>
              <p className="text-[12px] text-amber-800/90 mt-1 leading-relaxed">
                Batch ({pendingForSelectedPeriod.fileName}) saat ini sedang dalam peninjauan internal tim Hak Cipta & Finance LOKA. Saldo resmi dan rincian slip lagu pada periode ini akan diperbarui segera setelah proses otorisasi publikasi selesai.
              </p>
            </div>
          </div>

          {/* Action button if ready to publish */}
          {pendingForSelectedPeriod.openIssuesCount === 0 && (
            <div className="shrink-0 w-full md:w-auto">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setModalPublishBatch(pendingForSelectedPeriod)}
                className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-blue-500/20 whitespace-nowrap cursor-pointer"
                iconLeft={<span>🚀</span>}
              >
                Distribusikan Resmi Sekarang
              </Button>
            </div>
          )}

          {/* Action button if still in review with issues */}
          {(pendingForSelectedPeriod.openIssuesCount ?? 0) > 0 && onBackToAdmin && (
            <div className="shrink-0 w-full md:w-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={onBackToAdmin}
                className="w-full md:w-auto bg-white text-amber-900 border-amber-300 hover:bg-amber-100 font-bold whitespace-nowrap text-xs cursor-pointer"
              >
                Periksa {pendingForSelectedPeriod.openIssuesCount} Isu di Resolver →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Navigation Bar (Ringkasan, Lagu, Platform) ──────────── */}
      <div className="border-b border-[#E5E7EB] flex items-center justify-between gap-4">
        <nav className="inline-flex gap-2 bg-[#F3F4F6] p-1.5 rounded-[12px]">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
            className={`px-5 py-2 rounded-[9px] text-[14px] font-semibold transition-all duration-150 flex items-center gap-2 ${
              activeTab === 'summary'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-white/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Ringkasan
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'songs'}
            onClick={() => setActiveTab('songs')}
            className={`px-5 py-2 rounded-[9px] text-[14px] font-semibold transition-all duration-150 flex items-center gap-2 ${
              activeTab === 'songs'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-white/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Lagu ({portalData.totalSongs})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'platforms'}
            onClick={() => setActiveTab('platforms')}
            className={`px-5 py-2 rounded-[9px] text-[14px] font-semibold transition-all duration-150 flex items-center gap-2 ${
              activeTab === 'platforms'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-white/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Platform ({portalData.platforms.length})
          </button>
        </nav>

        {/* Status Distribusi oleh Publisher */}
        <div className="hidden sm:inline-flex items-center gap-2">
          {currentCreator.status === 'Dibayar' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              Distribusi Selesai (Dibayarkan)
            </span>
          ) : currentCreator.status === 'Menunggu' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
              Sedang Diproses Publisher
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              Verifikasi Publisher
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: RINGKASAN (OVERVIEW)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 4 StatCards Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Hak Royalti Pencipta 70% (Dark Highlight Card) */}
            <StatCard
              label="Hak Pencipta (70%)"
              value={formatCurrency(portalData.totalNet)}
              isDark={true}
              icon={
                <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            {/* Card 2: Total Royalti Lagu (Gross) */}
            <StatCard
              label="Royalti Gross"
              value={formatCurrency(portalData.totalGross)}
              icon={
                <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />

            {/* Card 3: Platform Utama (Top Platform) */}
            {(() => {
              const topPlatform = portalData.platforms.length > 0 ? portalData.platforms[0] : null;
              const platName = topPlatform
                ? topPlatform.name.split(' (')[0].replace('Musixmatch/', '')
                : '-';
              const platPct = topPlatform ? topPlatform.percentage : 0;

              return (
                <StatCard
                  label="Platform Utama"
                  value={
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[22px] sm:text-[24px] font-bold text-[#111827] truncate">
                        {platName}
                      </span>
                      <span className="text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full shrink-0">
                        {platPct}%
                      </span>
                    </div>
                  }
                  icon={
                    <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              );
            })()}

            {/* Card 4: Jumlah Lagu Aktif */}
            <StatCard
              label="Katalog Lagu"
              value={`${portalData.totalSongs} Lagu`}
              isHighlighted={true}
              icon={
                <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              }
            />
          </section>

          {/* Side-by-side Grid: Top Songs vs Platform Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Lagu Teratas (Horizontal Animated Bars) */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Typography variant="heading-2" className="text-[16px]">Lagu Teratas</Typography>
                  <button
                    onClick={() => setActiveTab('songs')}
                    className="text-[12px] font-semibold text-[#2563EB] hover:underline"
                  >
                    Semua →
                  </button>
                </div>

                <div className="space-y-3.5 mt-2">
                  {portalData.topSongs.map((song, idx) => {
                    const barWidth = maxTopSong > 0 ? (song.amount / maxTopSong) * 100 : 0;
                    return (
                      <div
                        key={song.title + idx}
                        onClick={() => {
                          const target = portalData.songs.find((s) => s.title === song.title);
                          if (target) setSelectedSongDetail(target);
                          setActiveTab('songs');
                        }}
                        className="group cursor-pointer p-2 rounded-[8px] hover:bg-[#F9FAFB] transition-colors"
                      >
                        <div className="flex items-center justify-between text-[13px] mb-1.5">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="w-5 text-[12px] font-bold text-[#9CA3AF] group-hover:text-[#2563EB]">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-[#111827] truncate group-hover:text-[#2563EB]">
                              {song.title}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-[#111827] tabular-nums">
                              {formatCurrency(song.amount)}
                            </span>
                            <span className="text-[11px] text-[#6B7280] ml-1.5 tabular-nums">
                              ({song.percentage}%)
                            </span>
                          </div>
                        </div>
                        {/* Animated Bar */}
                        <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2563EB] rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${Math.max(barWidth, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>


            </Card>

            {/* Platform Streaming Breakdown */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Typography variant="heading-2" className="text-[16px]">Platform DSP</Typography>
                  <button
                    onClick={() => setActiveTab('platforms')}
                    className="text-[12px] font-semibold text-[#2563EB] hover:underline"
                  >
                    Rincian →
                  </button>
                </div>

                <div className="space-y-4 mt-2">
                  {portalData.platforms.map((p) => {
                    const barWidth = maxPlatformAmt > 0 ? (p.amount / maxPlatformAmt) * 100 : 0;
                    return (
                      <div key={p.name} className="p-2 rounded-[8px] hover:bg-[#F9FAFB] transition-colors">
                        <div className="flex items-center justify-between text-[13px] mb-1.5">
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="font-semibold text-[#111827] truncate">
                              {p.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-[#111827] tabular-nums">
                              {formatCurrency(p.amount)}
                            </span>
                            <span className="text-[11px] text-[#6B7280] ml-1.5 tabular-nums">
                              ({p.percentage}%)
                            </span>
                          </div>
                        </div>
                        {/* Animated Platform Bar */}
                        <div className="w-full h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.max(barWidth, 4)}%`,
                              backgroundColor: p.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>


            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: LAGU (SONGS CATALOG & DRILL-DOWN)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'songs' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Tools & Search Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-[10px] border border-[#E5E7EB] shadow-2xs">
            <div className="flex-1 flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative min-w-[220px] flex-1">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul lagu atau ID lagu..."
                  aria-label="Cari lagu"
                  className="w-full h-10 pl-9 pr-4 rounded-[8px] border border-[#E5E7EB] bg-[#FAFAFA] text-[14px] text-[#111827] focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
                />
                <svg
                  className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Sort Order */}
              <select
                aria-label="Urutkan lagu"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                className="h-10 px-3 rounded-[8px] border border-[#E5E7EB] bg-[#FAFAFA] text-[13px] text-[#111827] focus:bg-white focus:outline-none focus:border-[#2563EB] transition-all cursor-pointer font-medium"
              >
                <option value="desc">Pendapatan Tertinggi</option>
                <option value="asc">Judul A - Z</option>
              </select>

              {/* Filter DSP */}
              <select
                aria-label="Filter DSP"
                value={dspFilter}
                onChange={(e) => setDspFilter(e.target.value)}
                className="h-10 px-3 rounded-[8px] border border-[#E5E7EB] bg-[#FAFAFA] text-[13px] text-[#111827] focus:bg-white focus:outline-none focus:border-[#2563EB] transition-all cursor-pointer font-medium"
              >
                <option value="">Semua DSP</option>
                <option value="Spotify">Spotify</option>
                <option value="YouTube">YouTube</option>
                <option value="Apple">Apple Music</option>
                <option value="TikTok">TikTok / ByteDance</option>
                <option value="Lainnya">DSP Lainnya (Joox/Deezer)</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#6B7280] font-medium shrink-0">
                Menampilkan <strong className="text-[#111827]">{filteredSongs.length}</strong> lagu
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportStatement}
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

          {/* Drill-down Detail Panel (Expanded when a row is clicked) */}
          {selectedSongDetail && (
            <Card className="p-4 border-2 border-[#2563EB] bg-[#F8FAFC] shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3 mb-3">
                <div className="flex items-center gap-3">
                  <Typography variant="heading-2" className="text-[16px]">
                    {selectedSongDetail.title}
                  </Typography>
                  <span className="text-[13px] text-[#6B7280] tabular-nums">
                    {formatCurrency(selectedSongDetail.netAmount)} · {selectedSongDetail.contributionPct}%
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSongDetail(null)}
                  className="self-start sm:self-center text-[#6B7280]"
                >
                  ✕ Tutup
                </Button>
              </div>

              {/* Platform breakdown for this specific song */}
              <div>
                {selectedSongDetail.platformBreakdown && Object.keys(selectedSongDetail.platformBreakdown).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(selectedSongDetail.platformBreakdown).map(([platName, amt]) => {
                      const platPct = selectedSongDetail.netAmount > 0
                        ? ((amt / selectedSongDetail.netAmount) * 100).toFixed(1)
                        : '0';
                      return (
                        <div
                          key={platName}
                          className="bg-white border border-[#E2E8F0] rounded-[8px] p-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[13px] mb-1">
                            <span className="font-semibold text-[#1E293B]">{platName}</span>
                            <span className="text-[11px] text-[#64748B] tabular-nums font-medium">
                              {platPct}%
                            </span>
                          </div>
                          <div className="text-[15px] font-bold text-[#0F172A] tabular-nums">
                            {formatCurrency(amt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[13px] text-[#64748B]">Sumber: {selectedSongDetail.dsp}</p>
                )}
              </div>
            </Card>
          )}

          {/* Interactive Songs Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr className="h-11 bg-[#FAFAFA] border-b border-[#E5E7EB] text-[13px] font-semibold text-[#4B5563]">
                    <th className="px-5 py-3 text-left w-[55px]">#</th>
                    <th className="px-5 py-3 text-left">Judul Lagu</th>
                    <th className="px-4 py-3 text-left">DSP</th>
                    <th className="px-4 py-3 text-center">Hak Cipta</th>
                    <th className="px-5 py-3 text-right">Royalti Gross</th>
                    <th className="px-5 py-3 text-right">Hak Bersih (70%)</th>
                    <th className="px-4 py-3 text-right">Kontribusi</th>
                    <th className="px-4 py-3 text-center w-[100px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredSongs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center bg-[#FAFAFA]">
                        <Typography variant="body" color="secondary">
                          Tidak ada lagu yang cocok dengan kriteria pencarian Anda.
                        </Typography>
                      </td>
                    </tr>
                  ) : (
                    filteredSongs.map((song, idx) => {
                      const isSelected = selectedSongDetail?.title === song.title;
                      return (
                        <tr
                          key={song.title + idx}
                          onClick={() => setSelectedSongDetail(song)}
                          className={`h-[58px] transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#EFF6FF] border-l-4 border-l-[#2563EB]'
                              : idx % 2 === 1
                              ? 'bg-[#F9FAFB] hover:bg-[#F3F4F6]'
                              : 'bg-white hover:bg-[#F3F4F6]'
                          }`}
                        >
                          {/* No */}
                          <td className="px-5 py-3 text-[#6B7280] font-medium text-[13px]">
                            {idx + 1}
                          </td>

                          {/* Title & Custom ID */}
                          <td className="px-5 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#111827] group-hover:text-[#2563EB]">
                                {song.title}
                              </span>
                              <span className="text-[12px] font-mono text-[#6B7280]">
                                {song.customId || `LOKA-REG-${idx + 1}`}
                              </span>
                            </div>
                          </td>

                          {/* DSP & Right Type */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#374151] bg-[#F3F4F6] px-2.5 py-1 rounded-[6px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                              {song.dsp}
                            </span>
                          </td>

                          {/* Ownership % */}
                          <td className="px-4 py-3 text-center font-bold text-[13px] text-[#059669]">
                            70%
                          </td>

                          {/* Gross Revenue */}
                          <td className="px-5 py-3 text-right font-medium text-[#6B7280] tabular-nums">
                            {formatCurrency(song.grossAmount)}
                          </td>

                          {/* Net Creator 70% */}
                          <td className="px-5 py-3 text-right font-bold text-[#059669] text-[15px] tabular-nums">
                            {formatCurrency(song.netAmount)}
                          </td>

                          {/* Contribution % */}
                          <td className="px-4 py-3 text-right font-semibold text-[#111827] tabular-nums">
                            {song.contributionPct}%
                          </td>

                          {/* Action Button */}
                          <td className="px-4 py-3 text-center">
                            <span className="text-[12px] font-semibold text-[#2563EB] hover:underline">
                              {isSelected ? 'Terpilih' : 'Detail'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 3: PLATFORM (DSP STREAMING BREAKDOWN)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'platforms' && (
        <div className="space-y-6 animate-in fade-in duration-150">


          {/* Platform Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portalData.platforms.map((plat) => {
              return (
                <Card key={plat.name} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: plat.color }}
                        />
                        <span className="font-bold text-[#111827] text-[15px]">
                          {plat.name}
                        </span>
                      </div>
                      <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">
                        {plat.percentage}%
                      </span>
                    </div>

                    <div className="text-[22px] font-bold text-[#111827] tabular-nums mt-1">
                      {formatCurrency(plat.amount)}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden mt-4">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(plat.percentage, 3)}%`,
                          backgroundColor: plat.color,
                        }}
                      />
                    </div>
                  </div>


                </Card>
              );
            })}
          </div>

          {/* DSP Revenue Split Bar */}
          <Card className="p-5">
            <Typography variant="heading-2" className="text-[14px] mb-2 text-[#6B7280] font-medium">
              Proporsi Platform
            </Typography>
            <div className="w-full h-4 bg-[#F3F4F6] rounded-full overflow-hidden flex shadow-inner">
              {portalData.platforms.map((plat) => (
                <div
                  key={plat.name}
                  className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${plat.percentage}%`,
                    backgroundColor: plat.color,
                  }}
                  title={`${plat.name}: ${formatCurrency(plat.amount)} (${plat.percentage}%)`}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-[13px]">
              {portalData.platforms.map((plat) => (
                <div key={plat.name} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: plat.color }}
                  />
                  <span className="text-[#4B5563]">{plat.name}:</span>
                  <strong className="text-[#111827] tabular-nums">
                    {formatCurrency(plat.amount)} ({plat.percentage}%)
                  </strong>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Publish Modal inside CreatorPortal ── */}
      {modalPublishBatch && (
        <PublishModal
          isOpen={!!modalPublishBatch}
          batch={modalPublishBatch}
          onClose={() => setModalPublishBatch(null)}
          onSuccess={() => {
            setModalPublishBatch(null);
            setRefreshTrigger((v) => v + 1);
          }}
        />
      )}
    </div>
  );
};
