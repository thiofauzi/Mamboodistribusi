import React, { useState, useMemo } from 'react';
import {
  Sidebar,
  Typography,
  StatCard,
  PlatformCompositionCard,
  CreatorTable,
  CreatorDetailView,
  Button,
  UploadDistribution,
  BatchHistory,
  CreatorPortal,
  ExceptionResolver,
} from './components/ui';
import { Creator, PLATFORMS } from './data/royaltyData';
import {
  getCreatorsFromAllBatches,
  getBatchSummaryStats,
  getExceptionStats,
  clearAllData,
  initializeSampleData,
  getAllBatches,
} from './data/distributionEngine';
import {
  AVAILABLE_PERIODS,
  getAdminRoyaltyPeriodData,
} from './data/creatorStatementData';

export const App: React.FC = () => {
  // Navigation & selection state
  const [activeNav, setActiveNav] = useState('dashboard');
  const [deepDetailCreator, setDeepDetailCreator] = useState<Creator | null>(null);
  const [portalCreatorId, setPortalCreatorId] = useState<number | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [showClearModal, setShowClearModal] = useState(false);
  const [adminPeriod, setAdminPeriod] = useState<string>('Mei 2026');
  const [resolverBatchId, setResolverBatchId] = useState<string | undefined>(undefined);

  // PB-1.3: Batch status metrics
  const allBatches = useMemo(() => getAllBatches(), [dataVersion]);
  const publishedBatches = useMemo(
    () => allBatches.filter((b) => b.status === 'published' || b.status === 'locked'),
    [allBatches]
  );
  const pendingBatches = useMemo(
    () => allBatches.filter((b) => b.status === 'in_review' || b.status === 'ready_to_publish' || b.status === 'uploaded'),
    [allBatches]
  );

  const totalPublishedRoyalty = useMemo(
    () => publishedBatches.reduce((s, b) => s + b.totalDistributed, 0),
    [publishedBatches]
  );
  const totalPendingRoyalty = useMemo(
    () => pendingBatches.reduce((s, b) => s + b.totalDistributed, 0),
    [pendingBatches]
  );
  const totalPotentialRoyalty = totalPublishedRoyalty + totalPendingRoyalty;

  // Unmatched & Conflict Exception Stats
  const exceptionStats = useMemo(() => getExceptionStats(), [dataVersion]);
  const openIssuesCount = exceptionStats.unmatched + exceptionStats.conflicts;

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sorting
  const [sortKey, setSortKey] = useState<
    'name' | 'songsCount' | 'totalRoyalty' | 'netRoyalty'
  >('totalRoyalty');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const navItems = [
    {
      id: 'dashboard',
      label: 'Admin Royalti',
      active: activeNav === 'dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      onClick: () => {
        setActiveNav('dashboard');
        setDeepDetailCreator(null);
      },
    },
    {
      id: 'creator-portal',
      label: 'Portal Pencipta',
      active: activeNav === 'creator-portal',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onClick: () => {
        setActiveNav('creator-portal');
        setDeepDetailCreator(null);
      },
    },
    {
      id: 'upload',
      label: 'Upload Distribusi',
      active: activeNav === 'upload',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      onClick: () => {
        setActiveNav('upload');
        setDeepDetailCreator(null);
      },
    },
    {
      id: 'batches',
      label: 'Riwayat Batch',
      active: activeNav === 'batches',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      onClick: () => {
        setActiveNav('batches');
        setDeepDetailCreator(null);
      },
    },
    {
      id: 'resolver',
      label: 'Pengecualian',
      active: activeNav === 'resolver',
      badge: openIssuesCount > 0 ? openIssuesCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-700 font-bold',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      onClick: () => {
        setActiveNav('resolver');
        setResolverBatchId(undefined);
        setDeepDetailCreator(null);
      },
    },
  ];

  // Dynamic batch statistics & creators
  const rawCreators = useMemo(() => {
    return getCreatorsFromAllBatches();
  }, [dataVersion]);

  // Aggregate by selected period (Mei 2026, 1Q26, or Semua)
  const periodData = useMemo(() => {
    return getAdminRoyaltyPeriodData(rawCreators, adminPeriod);
  }, [rawCreators, adminPeriod]);

  const creators = periodData.creators;
  const stats = periodData.stats;

  const totalGrossRoyalty = stats.totalGross;
  const totalCreatorShare = stats.totalCreatorShare;
  const totalPublisherShare = stats.totalPublisherShare;
  const totalNetRoyalty = stats.totalNet;

  // Filtering & Sorting Creators
  const filteredCreators = useMemo(() => {
    return creators.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.id).includes(searchQuery.trim());

      const matchesPlatform =
        platformFilter === '' ||
        (platformFilter === 'SPOTIFY' && (c.dominantDsp === 'SPOTIFY' || (c.dspBreakdown && c.dspBreakdown.spotify > 0))) ||
        (platformFilter === 'YOUTUBE' && (c.dominantDsp === 'YOUTUBE' || (c.dspBreakdown && c.dspBreakdown.youtube > 0))) ||
        (platformFilter === 'APPLE_MUSIC' && (c.dominantDsp === 'APPLE_MUSIC' || (c.dspBreakdown && c.dspBreakdown.appleMusic > 0))) ||
        (platformFilter === 'OTHER' && (c.dominantDsp === 'OTHER' || (c.dspBreakdown && c.dspBreakdown.other > 0)));

      const matchesStatus = statusFilter === '' || c.status === statusFilter;

      return matchesSearch && matchesPlatform && matchesStatus;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a[sortKey] - b[sortKey];
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [creators, searchQuery, platformFilter, statusFilter, sortKey, sortOrder]);

  const handleSort = (key: 'name' | 'songsCount' | 'totalRoyalty' | 'netRoyalty') => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleExportCSV = () => {
    try {
      const header = 'ID,Pencipta,Lagu,Views,Ads Rev (Rp),Subs Rev (Rp),Total Royalti (Rp),Dibayarkan Net (Rp),Status\n';
      const rows = filteredCreators
        .map(
          (c) =>
            `${c.id},"${c.name.replace(/"/g, '""')}",${c.songsCount},${c.views},${c.adsRev},${c.subsRev},${c.totalRoyalty},${c.netRoyalty},"${c.status}"`
        )
        .join('\n');

      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `loka-distribusi-${adminPeriod.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Ekspor CSV gagal di browser ini.');
    }
  };

  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] text-[#111827]">
      {/* 1. LOKA Sidebar (216px fixed desktop) */}
      <Sidebar
        publisherName="LOKA Publishing"
        role="Music Publisher"
        items={navItems}
        onLogout={() => alert('Logout sesi publisher')}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 px-6 sm:px-10 pt-8 pb-16 overflow-y-auto max-w-[1440px] mx-auto">
        {/* ═══ Creator Portal Page ═══ */}
        {activeNav === 'creator-portal' && (
          <CreatorPortal
            key={dataVersion}
            initialCreatorId={portalCreatorId}
            onBackToAdmin={() => {
              setActiveNav('dashboard');
              setPortalCreatorId(null);
            }}
          />
        )}

        {/* ═══ Upload Distribution Page ═══ */}
        {activeNav === 'upload' && (
          <UploadDistribution
            onBack={() => setActiveNav('dashboard')}
            onBatchProcessed={() => {
              setDataVersion((v) => v + 1);
            }}
          />
        )}

        {/* ═══ Batch History Page ═══ */}
        {activeNav === 'batches' && (
          <BatchHistory
            onBack={() => setActiveNav('dashboard')}
            onNavigateToResolver={(batchId) => {
              setResolverBatchId(batchId);
              setActiveNav('resolver');
            }}
            onClearData={() => {
              clearAllData();
              setDataVersion((v) => v + 1);
            }}
            onDataChange={() => setDataVersion((v) => v + 1)}
          />
        )}

        {/* ═══ Exception Resolver Page (FR-3 & FR-3a) ═══ */}
        {activeNav === 'resolver' && (
          <ExceptionResolver
            initialBatchId={resolverBatchId}
            onBack={() => setActiveNav('dashboard')}
            onRefreshData={() => setDataVersion((v) => v + 1)}
            onNavigateToBatchHistory={() => setActiveNav('batches')}
            onNavigateToCreatorPortal={() => setActiveNav('creator-portal')}
          />
        )}

        {/* ═══ Dashboard Page ═══ */}
        {activeNav === 'dashboard' && (
          <>
            {deepDetailCreator ? (
              /* Deep Detail View Mode */
              <CreatorDetailView
                creator={deepDetailCreator}
                onBack={() => setDeepDetailCreator(null)}
                onOpenCreatorPortal={() => {
                  setPortalCreatorId(deepDetailCreator.id);
                  setActiveNav('creator-portal');
                  setDeepDetailCreator(null);
                }}
              />
            ) : (
              /* Dashboard & Creators List Mode */
              <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <Typography variant="heading-1">Admin Royalti</Typography>
                    <Typography variant="body" color="secondary" className="mt-1">
                      {rawCreators.length > 0
                        ? `LOKA Publishing · ${adminPeriod === 'Semua' ? 'Akumulasi Semua Periode' : `Periode ${adminPeriod}`}`
                        : 'LOKA Publishing · Sistem Distribusi Royalti DSP'}
                    </Typography>
                  </div>

                  {/* Header Right Action */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Period Filter Dropdown (Mei 2026, 1Q26, Akumulasi Semua Periode) */}
                    {rawCreators.length > 0 && (
                      <div className="flex items-center gap-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] px-3 py-1.5 shadow-2xs">
                        <span className="text-[12px] font-medium text-[#1E40AF] whitespace-nowrap flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Periode:
                        </span>
                        <select
                          aria-label="Filter Periode Distribusi Admin"
                          value={adminPeriod}
                          onChange={(e) => setAdminPeriod(e.target.value)}
                          className="bg-transparent text-[13px] font-bold text-[#1E40AF] focus:outline-none cursor-pointer"
                        >
                          {AVAILABLE_PERIODS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Clear Data Button (visible when data exists) */}
                    {rawCreators.length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowClearModal(true)}
                        className="text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#FEF2F2] border-[#FCA5A5]"
                        iconLeft={
                          <svg className="w-4 h-4 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        }
                      >
                        Hapus Data
                      </Button>
                    )}

                    {/* Quick Upload Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveNav('upload')}
                      iconLeft={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      }
                    >
                      Upload Laporan DSP
                    </Button>
                  </div>
                </div>

                {/* Clear Data Confirmation Modal */}
                {showClearModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-[12px] p-6 max-w-md w-full border border-[#E5E7EB] shadow-xl">
                      <div className="w-12 h-12 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mb-4">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <Typography variant="heading-2">Bersihkan Semua Data?</Typography>
                      <Typography variant="body" color="secondary" className="mt-2 text-[14px]">
                        Tindakan ini akan mengosongkan seluruh data distribusi royalti, batch terunggah, serta pemetaan hak cipta dari memori sistem. Anda dapat mengunggah laporan baru kapan saja.
                      </Typography>
                      <div className="mt-6 flex justify-end gap-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowClearModal(false)}
                        >
                          Batal
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white border-transparent"
                          onClick={() => {
                            clearAllData();
                            setDataVersion((v) => v + 1);
                            setShowClearModal(false);
                          }}
                        >
                          Ya, Bersihkan Data
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Exception Alert Banner on Admin Dashboard */}
                {openIssuesCount > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-[12px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-base shrink-0">
                        ⚠️
                      </span>
                      <div>
                        <div className="text-sm font-bold text-rose-950">
                          {openIssuesCount} Baris Laporan DSP Butuh Pemetaan Resolver
                        </div>
                        <div className="text-xs text-rose-800 mt-0.5">
                          Terdapat pendapatan sebesar {formatCurrency(exceptionStats.unresolvedRevenue)} yang tertahan dan belum dapat didistribusikan ke komposer.
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setResolverBatchId(undefined);
                        setActiveNav('resolver');
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white shrink-0 text-xs font-semibold py-2 px-4 shadow-sm"
                    >
                      Buka Resolver & Selesaikan →
                    </Button>
                  </div>
                )}

                {/* PB-1.3: Tri-Metric Status Strip (Total Potensi, Terpublikasi Resmi, Pending Otorisasi) */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 px-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 tracking-wide uppercase">
                      PB-1.3
                    </span>
                    <span className="font-semibold text-slate-800">Status Otorisasi Distribusi:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Total Potensi:</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatCurrency(totalPotentialRoyalty)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-emerald-800">Terpublikasi Resmi:</span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        {formatCurrency(totalPublishedRoyalty)}
                      </span>
                      <span className="text-[10px] text-slate-400">({publishedBatches.length} batch)</span>
                    </div>

                    {pendingBatches.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-amber-800">Pending Otorisasi:</span>
                        <span className="font-bold text-amber-700 tabular-nums">
                          {formatCurrency(totalPendingRoyalty)}
                        </span>
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {pendingBatches.length} batch draft
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4 StatCards Grid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Pencipta Lagu"
                    value={`${creators.length} Komposer`}
                    isHighlighted={true}
                    icon={
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Royalti Gross"
                    value={formatCurrency(totalGrossRoyalty)}
                    icon={
                      <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Hak Pencipta (70%)"
                    value={formatCurrency(totalCreatorShare)}
                    icon={
                      <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Publisher LOKA (30%)"
                    value={formatCurrency(totalPublisherShare)}
                    isDark={true}
                    icon={
                      <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    }
                  />
                </section>

                {/* Platform Composition Card */}
                <PlatformCompositionCard
                  totalAmount={totalGrossRoyalty}
                  platforms={stats.platforms}
                />

                {/* When creators exist, show filters & table; when empty, show empty state */}
                {creators.length === 0 ? (
                  <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-10 text-center shadow-xs">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <Typography variant="heading-2">Data Distribusi Bersih (0 Data)</Typography>
                    <Typography variant="body" color="secondary" className="max-w-md mx-auto mt-2">
                      Belum ada laporan royalti DSP yang diproses. Silakan unggah laporan Excel/CSV dari DSP untuk memulai kalkulasi dan pembagian royalti per pencipta lagu secara otomatis.
                    </Typography>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => setActiveNav('upload')}
                        iconLeft={
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        }
                      >
                        Upload Laporan DSP Sekarang
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={() => {
                          initializeSampleData();
                          setDataVersion((v) => v + 1);
                        }}
                      >
                        Muat Data Demo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-[8px] border border-[#E5E7EB] shadow-2xs">
                      <div className="flex-1 flex flex-wrap items-center gap-3">
                        {/* Search Box */}
                        <div className="relative min-w-[220px] flex-1">
                          <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama komposer/pencipta atau ID..."
                            aria-label="Cari nama pencipta atau ID"
                            className="w-full h-10 pl-9 pr-4 rounded-[8px] border border-[#E5E7EB] bg-[#FAFAFA] text-[14px] text-[#111827] focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
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

                        {/* Filter Platform */}
                        <select
                          value={platformFilter}
                          onChange={(e) => setPlatformFilter(e.target.value)}
                          aria-label="Filter Platform DSP"
                          className="h-10 px-3 rounded-[8px] border border-[#E5E7EB] bg-[#FAFAFA] text-[13px] text-[#111827] focus:bg-white focus:outline-none focus:border-[#2563EB] transition-all cursor-pointer font-medium"
                        >
                          <option value="">Semua Platform DSP</option>
                          <option value="SPOTIFY">Spotify</option>
                          <option value="YOUTUBE">YouTube</option>
                          <option value="APPLE_MUSIC">Apple Music</option>
                          <option value="OTHER">DSP Lainnya (TikTok/Joox)</option>
                        </select>

                        {/* Filter Status */}
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          aria-label="Filter status pembayaran"
                          className="h-10 px-3 rounded-[8px] border border-[#E5E7EB] bg-[#FAFAFA] text-[13px] text-[#111827] focus:bg-white focus:outline-none focus:border-[#2563EB] transition-all cursor-pointer"
                        >
                          <option value="">Semua Status</option>
                          <option value="Dibayar">Dibayar</option>
                          <option value="Menunggu">Menunggu</option>
                          <option value="Perlu dicek">Perlu dicek</option>
                        </select>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
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

                    {/* Creators Table */}
                    <div className="w-full">
                      <CreatorTable
                        creators={filteredCreators}
                        selectedCreatorId={null}
                        onSelectCreator={(c) => setDeepDetailCreator(c)}
                        sortKey={sortKey}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
