import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from './Card';
import { Typography } from './Typography';
import { Button } from './Button';
import {
  MatchedSourceRow,
  FailedStage,
  MatchStatus,
  ResolutionScope,
  getExceptionRows,
  getExceptionStats,
  resolveStage1Asset,
  resolveStage2Writer,
  resolveStage3CustomId,
  resolveConflict,
  holdRow,
  ignoreRow,
  undoResolution,
  autoMapExactMatches,
  reprocessBatch,
  getAuditLogs,
  getMasterCatalogSongs,
  getMasterWriters,
  getAllBatches,
  AuditLog,
  MasterCatalogSong,
} from '../../data/distributionEngine';

export interface ExceptionResolverProps {
  onBack?: () => void;
  initialBatchId?: string;
  onRefreshData?: () => void;
  onNavigateToBatchHistory?: () => void;
}

type ViewMode = 'rows' | 'grouped_asset';

// ─── Animated number counter hook ────────────────────────
function useAnimatedValue(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setValue(Math.round(current));
      ref.current = Math.round(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
}

// ─── Circular progress ring ──────────────────────────────
const ProgressRing: React.FC<{
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor?: string;
  label: string;
  sublabel?: string;
}> = ({ value, max, size = 96, strokeWidth = 6, color, bgColor = '#E5E7EB', label, sublabel }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? value / max : 0;
  const offset = circumference - pct * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-gray-900 leading-none">{value}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-semibold text-gray-700 leading-tight">{label}</div>
        {sublabel && <div className="text-[10px] text-gray-400 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
};

// ─── Stage Pipeline Visualization ────────────────────────
const StagePipeline: React.FC<{
  stage1: number;
  stage2: number;
  stage3: number;
  conflicts: number;
  resolved: number;
  total: number;
}> = ({ stage1, stage2, stage3, conflicts, resolved, total }) => {
  const stages = [
    { label: 'Tahap 1', sublabel: 'Asset ID', count: stage1, color: '#E11D48', bgColor: '#FFE4E6', icon: '⛔' },
    { label: 'Tahap 2', sublabel: 'Writer', count: stage2, color: '#D97706', bgColor: '#FEF3C7', icon: '⚠' },
    { label: 'Tahap 3', sublabel: 'Custom ID', count: stage3, color: '#0284C7', bgColor: '#E0F2FE', icon: 'ⓘ' },
    { label: 'Konflik', sublabel: 'Silang', count: conflicts, color: '#7C3AED', bgColor: '#EDE9FE', icon: '⇄' },
    { label: 'Selesai', sublabel: 'Re-process', count: resolved, color: '#059669', bgColor: '#D1FAE5', icon: '✓' },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {stages.map((s, i) => (
        <React.Fragment key={s.label}>
          <button
            className="group flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all hover:scale-105 hover:shadow-md cursor-default"
            style={{
              borderColor: s.count > 0 ? s.color + '40' : '#E5E7EB',
              backgroundColor: s.count > 0 ? s.bgColor : '#F9FAFB',
            }}
          >
            <span className="text-base">{s.icon}</span>
            <span
              className="text-xl font-extrabold leading-none"
              style={{ color: s.count > 0 ? s.color : '#9CA3AF' }}
            >
              {s.count}
            </span>
            <div className="text-center">
              <div className="text-[10px] font-bold text-gray-700">{s.label}</div>
              <div className="text-[9px] text-gray-400">{s.sublabel}</div>
            </div>
          </button>
          {i < stages.length - 1 && (
            <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const ExceptionResolver: React.FC<ExceptionResolverProps> = ({
  onBack,
  initialBatchId,
  onRefreshData,
  onNavigateToBatchHistory,
}) => {
  // Batch & View filter state
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchId || '');
  const [viewMode, setViewMode] = useState<ViewMode>('rows');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDsp, setSelectedDsp] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [filterAgingOnly, setFilterAgingOnly] = useState<boolean>(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Selection for bulk actions
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Inline resolver expand state (replaces modals for better UX)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Resolver Modals state (kept for complex flows like conflict)
  const [activeModalRow, setActiveModalRow] = useState<MatchedSourceRow | null>(null);
  const [activeModalType, setActiveModalType] = useState<
    'stage1' | 'stage2' | 'stage3' | 'conflict' | 'hold' | 'ignore' | 'detail' | null
  >(null);

  // Re-process async modal state
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessProgress, setReprocessProgress] = useState(0);
  const [reprocessResult, setReprocessResult] = useState<{
    reprocessedCount: number;
    distributedRevenue: number;
    diff: number;
  } | null>(null);

  // Audit Log Drawer state
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // Notification Toast state
  const [toasts, setToasts] = useState<{ id: string; text: string; type: 'success' | 'info' | 'error'; leaving?: boolean }[]>([]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = 'toast-' + Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 350);
    }, 4000);
  };

  const batches = getAllBatches();
  const catalogSongs = useMemo(() => getMasterCatalogSongs(), []);
  const masterWriters = useMemo(() => getMasterWriters(), []);

  // Fetch current exceptions & statistics
  const exceptionRows = useMemo(() => {
    return getExceptionRows(selectedBatchId || undefined);
  }, [selectedBatchId, dataVersion]);

  const stats = useMemo(() => {
    return getExceptionStats(selectedBatchId || undefined);
  }, [selectedBatchId, dataVersion]);

  const auditLogs = useMemo(() => {
    return getAuditLogs();
  }, [dataVersion]);

  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  // Animated stat values
  const animOpen = useAnimatedValue(stats.unmatched + stats.conflicts);
  const animRevenue = useAnimatedValue(Math.round(stats.unresolvedRevenue));
  const animResolved = useAnimatedValue(stats.resolved);

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    return exceptionRows.filter((r) => {
      // DSP Filter
      if (selectedDsp !== 'all' && r.dsp !== selectedDsp) return false;

      // Status Filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'stage1' && (r.matchStatus !== 'unmatched' || r.failedStage !== 1)) return false;
        if (selectedStatus === 'stage2' && (r.matchStatus !== 'unmatched' || r.failedStage !== 2)) return false;
        if (selectedStatus === 'stage3' && (r.matchStatus !== 'unmatched' || r.failedStage !== 3)) return false;
        if (selectedStatus === 'conflict' && r.matchStatus !== 'conflict') return false;
        if (selectedStatus === 'on_hold' && r.matchStatus !== 'on_hold') return false;
        if (selectedStatus === 'ignored' && r.matchStatus !== 'ignored') return false;
        if (selectedStatus === 'resolved' && r.matchStatus !== 'resolved') return false;
      }

      // Aging filter (> 30 days)
      if (filterAgingOnly && (!r.ageDays || r.ageDays <= 30)) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = r.originalRow.songTitle?.toLowerCase().includes(q);
        const assetMatch = r.originalRow.assetId?.toLowerCase().includes(q);
        const customMatch = r.originalRow.customId?.toLowerCase().includes(q);
        const writerMatch = r.originalRow.writers?.toLowerCase().includes(q);
        if (!titleMatch && !assetMatch && !customMatch && !writerMatch) return false;
      }

      return true;
    });
  }, [exceptionRows, selectedDsp, selectedStatus, filterAgingOnly, searchQuery]);

  // Grouped by Asset ID for grouped view mode
  const groupedAssetRows = useMemo(() => {
    const map = new Map<
      string,
      {
        assetId: string;
        dsp: string;
        songTitle: string;
        writers: string;
        rows: MatchedSourceRow[];
        totalRevenue: number;
        dominantStatus: MatchStatus;
        failedStage: FailedStage;
      }
    >();

    for (const r of filteredRows) {
      const key = `${r.dsp}::${r.originalRow.assetId}`;
      if (!map.has(key)) {
        map.set(key, {
          assetId: r.originalRow.assetId,
          dsp: r.dsp,
          songTitle: r.originalRow.songTitle || 'Tanpa Judul',
          writers: r.originalRow.writers || '-',
          rows: [],
          totalRevenue: 0,
          dominantStatus: r.matchStatus,
          failedStage: r.failedStage,
        });
      }
      const group = map.get(key)!;
      group.rows.push(r);
      group.totalRevenue += r.originalRow.idrRev;
    }

    return Array.from(map.values());
  }, [filteredRows]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(filteredRows.map((r) => r.rowId));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleToggleRow = (rowId: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  // Open modal resolver based on row failure state
  const handleOpenResolver = (row: MatchedSourceRow) => {
    setActiveModalRow(row);
    if (row.matchStatus === 'conflict') {
      setActiveModalType('conflict');
    } else if (row.failedStage === 1) {
      setActiveModalType('stage1');
    } else if (row.failedStage === 2) {
      setActiveModalType('stage2');
    } else if (row.failedStage === 3) {
      setActiveModalType('stage3');
    } else {
      setActiveModalType('detail');
    }
  };

  // Toggle inline expand
  const toggleExpand = (rowId: string) => {
    setExpandedRowId((prev) => (prev === rowId ? null : rowId));
  };

  // Quick action: Undo
  const handleUndo = (rowId: string) => {
    undoResolution(rowId);
    setDataVersion((v) => v + 1);
    if (onRefreshData) onRefreshData();
    showToast('Resolusi baris dibatalkan kembali ke status pengecualian.', 'info');
  };

  // Bulk action: Ignore
  const handleBulkIgnore = () => {
    let count = 0;
    selectedRowIds.forEach((id) => {
      ignoreRow(id, 'Pengabaian massal oleh Admin Royalti');
      count++;
    });
    setSelectedRowIds([]);
    setDataVersion((v) => v + 1);
    if (onRefreshData) onRefreshData();
    showToast(`${count} baris berhasil ditandai sebagai Diabaikan.`, 'success');
  };

  // Bulk action: Hold
  const handleBulkHold = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    const holdUntil = date.toISOString().split('T')[0];

    let count = 0;
    selectedRowIds.forEach((id) => {
      holdRow(id, 'Penahanan massal menunggu verifikasi hak', holdUntil);
      count++;
    });
    setSelectedRowIds([]);
    setDataVersion((v) => v + 1);
    if (onRefreshData) onRefreshData();
    showToast(`${count} baris berhasil Ditahan hingga ${holdUntil}.`, 'success');
  };

  // Auto-Map Exact Matches
  const handleAutoMap = () => {
    const res = autoMapExactMatches(selectedBatchId || undefined);
    setDataVersion((v) => v + 1);
    if (onRefreshData) onRefreshData();
    if (res.resolvedCount > 0) {
      showToast(
        `Auto-map berhasil: ${res.resolvedCount} baris cocok 100% (${formatCurrency(
          res.resolvedAmount
        )}) dan siap di-reprocess!`,
        'success'
      );
    } else {
      showToast('Tidak ada kecocokan 100% otomatis yang baru pada batch ini.', 'info');
    }
  };

  // Async Re-process Batch
  const handleReprocess = async () => {
    setIsReprocessing(true);
    setReprocessProgress(15);
    setReprocessResult(null);

    const timer1 = setTimeout(() => setReprocessProgress(50), 200);
    const timer2 = setTimeout(() => setReprocessProgress(85), 450);

    try {
      const result = await reprocessBatch(selectedBatchId || undefined);
      setReprocessProgress(100);
      setReprocessResult(result);
      setDataVersion((v) => v + 1);
      if (onRefreshData) onRefreshData();
      showToast(
        `Re-process selesai! ${result.reprocessedCount} baris terdistribusi (${formatCurrency(
          result.distributedRevenue
        )}). Selisih rekonsiliasi = Rp 0.`,
        'success'
      );
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  };

  // Status Badge Helper (Color-blind safe with icon + clear label)
  const renderStatusBadge = (row: MatchedSourceRow, compact = false) => {
    const baseClass = compact
      ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold'
      : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold';

    if (row.matchStatus === 'resolved') {
      return (
        <span className={`${baseClass} bg-emerald-50 text-emerald-700 border border-emerald-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Siap Re-process
        </span>
      );
    }

    if (row.matchStatus === 'on_hold') {
      return (
        <span className={`${baseClass} bg-blue-50 text-blue-700 border border-blue-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Ditahan
        </span>
      );
    }

    if (row.matchStatus === 'ignored') {
      return (
        <span className={`${baseClass} bg-gray-100 text-gray-600 border border-gray-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
          Diabaikan
        </span>
      );
    }

    if (row.matchStatus === 'conflict') {
      return (
        <span className={`${baseClass} bg-purple-50 text-purple-700 border border-purple-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          Konflik
        </span>
      );
    }

    if (row.failedStage === 1) {
      return (
        <span className={`${baseClass} bg-rose-50 text-rose-700 border border-rose-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          T-1 Asset ID
        </span>
      );
    }

    if (row.failedStage === 2) {
      return (
        <span className={`${baseClass} bg-amber-50 text-amber-800 border border-amber-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          T-2 Writer
        </span>
      );
    }

    if (row.failedStage === 3) {
      return (
        <span className={`${baseClass} bg-sky-50 text-sky-700 border border-sky-200`}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
          T-3 Custom ID
        </span>
      );
    }

    return (
      <span className={`${baseClass} bg-gray-100 text-gray-700`}>
        Unmatched
      </span>
    );
  };

  // DSP icon badge
  const renderDspIcon = (dsp: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      YOUTUBE: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'YT' },
      SPOTIFY: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'SP' },
      APPLE_MUSIC: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', label: 'AM' },
      TIKTOK: { bg: 'bg-pink-50 border-pink-200', text: 'text-pink-700', label: 'TT' },
    };
    const c = configs[dsp] || { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', label: dsp?.substring(0, 2) };

    return (
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-[10px] font-black ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const totalOpenIssues = stats.unmatched + stats.conflicts;
  const totalAll = totalOpenIssues + stats.resolved + stats.onHold + stats.ignored;

  return (
    <div className="w-full space-y-5 pb-16">
      {/* ─── Toast Notifications (stacked, animated) ─── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 min-w-[320px] max-w-[420px] backdrop-blur-sm transition-all duration-300 ${
              t.leaving ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
            } ${
              t.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-50 border-emerald-800'
                : t.type === 'error'
                ? 'bg-rose-950/95 text-rose-50 border-rose-800'
                : 'bg-slate-950/95 text-slate-50 border-slate-800'
            }`}
            style={{ animation: t.leaving ? undefined : 'slideInRight 0.3s ease-out' }}
          >
            <span className="text-base flex-shrink-0">
              {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span className="text-xs font-medium leading-snug flex-1">{t.text}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-white/50 hover:text-white ml-1 text-sm flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ─── Page Header ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="mt-1 p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all hover:scale-105"
                  title="Kembali"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Typography variant="heading-2" className="text-gray-900 font-bold tracking-tight">
                    Daftar Pengecualian & Resolver
                  </Typography>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white tracking-wider uppercase">
                    FR-3
                  </span>
                </div>
                <Typography variant="body" className="text-gray-500 mt-1 text-sm">
                  Identifikasi, petakan, dan selesaikan baris tidak cocok untuk distribusi royalti 100% seimbang.
                </Typography>
              </div>
            </div>

            {/* Global Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <button
                onClick={() => setShowAuditLogs(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Riwayat
                {auditLogs.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                    {auditLogs.length}
                  </span>
                )}
              </button>

              <button
                onClick={handleAutoMap}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all"
              >
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Auto-Map
              </button>

              <button
                onClick={handleReprocess}
                disabled={stats.resolved === 0}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  stats.resolved === 0
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-md'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-process ({stats.resolved})
              </button>
            </div>
          </div>
        </div>

        {/* ─── Stats Overview Row (inside header card) ─── */}
        <div className="px-6 pb-5 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Stat: Open Issues */}
            <div className="flex items-center gap-3.5">
              <ProgressRing
                value={animOpen}
                max={Math.max(totalAll, 1)}
                color="#E11D48"
                bgColor="#FEE2E2"
                size={64}
                strokeWidth={5}
                label="Isu Terbuka"
                sublabel="baris bermasalah"
              />
              <div>
                <div className="text-2xl font-extrabold text-gray-900">{animOpen}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {stats.onHold > 0 && <span className="text-blue-600">+{stats.onHold} ditahan</span>}
                  {stats.ignored > 0 && <span className="text-gray-500 ml-1">+{stats.ignored} diabaikan</span>}
                </div>
                {stats.agingCount > 0 && (
                  <div className="text-[10px] font-bold text-rose-600 mt-0.5 flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>
                    {stats.agingCount} menua &gt;30hr
                  </div>
                )}
              </div>
            </div>

            {/* Stat: Held Revenue */}
            <div className="flex items-center gap-3.5">
              <ProgressRing
                value={Math.min(Math.round((stats.unresolvedRevenue / Math.max(stats.unresolvedRevenue + 1, 1)) * 100), 100)}
                max={100}
                color="#D97706"
                bgColor="#FEF3C7"
                size={64}
                strokeWidth={5}
                label="Tertahan"
                sublabel="pendapatan"
              />
              <div>
                <div className="text-lg font-extrabold text-gray-900 leading-tight">
                  {formatCurrency(animRevenue)}
                </div>
                <div className="text-[10px] text-gray-400">
                  USD ~${stats.unresolvedIncomeRev.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Stat: Stage Pipeline (compact) */}
            <div className="col-span-2 lg:col-span-1">
              <StagePipeline
                stage1={stats.byStage.stage1}
                stage2={stats.byStage.stage2}
                stage3={stats.byStage.stage3}
                conflicts={stats.conflicts}
                resolved={stats.resolved}
                total={totalAll}
              />
            </div>

            {/* Stat: Resolution */}
            <div className="flex items-center gap-3.5">
              <ProgressRing
                value={animResolved}
                max={Math.max(totalAll, 1)}
                color="#059669"
                bgColor="#D1FAE5"
                size={64}
                strokeWidth={5}
                label="Siap Proses"
                sublabel="baris resolved"
              />
              <div>
                <div className="text-2xl font-extrabold text-emerald-600">{animResolved}</div>
                <div className="text-[10px] text-gray-400">
                  Rekonsiliasi:{' '}
                  <span className="text-emerald-600 font-bold">Rp 0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Control Bar: Filters, Search, View Mode ─── */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: View Mode Toggle & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setViewMode('rows')}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                viewMode === 'rows'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Per Baris ({filteredRows.length})
            </button>
            <button
              onClick={() => setViewMode('grouped_asset')}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                viewMode === 'grouped_asset'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Per Asset ({groupedAssetRows.length})
            </button>
          </div>

          {/* Batch Selector */}
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="text-[11px] font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Batch</option>
            {batches.map((b) => (
              <option key={b.batchId} value={b.batchId}>
                {b.dspCode} - {b.period}
              </option>
            ))}
          </select>

          {/* DSP Filter */}
          <select
            value={selectedDsp}
            onChange={(e) => setSelectedDsp(e.target.value)}
            className="text-[11px] font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua DSP</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="SPOTIFY">Spotify</option>
            <option value="APPLE_MUSIC">Apple Music</option>
            <option value="TIKTOK">TikTok</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-[11px] font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="stage1">⛔ T-1 Asset</option>
            <option value="stage2">⚠ T-2 Writer</option>
            <option value="stage3">ⓘ T-3 Custom</option>
            <option value="conflict">⇄ Konflik</option>
            <option value="on_hold">⏸ Ditahan</option>
            <option value="ignored">⊘ Diabaikan</option>
            <option value="resolved">✓ Resolved</option>
          </select>

          {/* Aging Toggle */}
          <button
            onClick={() => setFilterAgingOnly((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
              filterAgingOnly
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            🔥 &gt;30 hari
          </button>
        </div>

        {/* Right: Search Input */}
        <div className="relative w-full md:w-56">
          <input
            type="text"
            placeholder="Cari judul, asset, writer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-[11px] border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
          />
          <svg
            className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-[7px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* ─── PB-4.5.2: Celebratory Readiness Banner when open issues = 0 ─── */}
      {totalOpenIssues === 0 && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white p-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shrink-0">
              🎉
            </div>
            <div>
              <div className="font-bold text-[15px] flex items-center gap-2">
                <span>Semua Pengecualian Selesai Diselesaikan!</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">
                  Siap Rilis
                </span>
              </div>
              <p className="text-[12px] text-emerald-100 mt-0.5">
                Batch ini telah bersih tanpa isu terbuka. Anda dapat melanjutkan ke Riwayat Batch untuk memverifikasi dan mendistribusikan royalti ke akun pencipta.
              </p>
            </div>
          </div>
          {onNavigateToBatchHistory && (
            <button
              onClick={onNavigateToBatchHistory}
              className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-bold rounded-xl text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-2"
            >
              <span>Lanjutkan ke Distribusi (Riwayat Batch)</span>
              <span>→</span>
            </button>
          )}
        </div>
      )}

      {/* ─── Bulk Action Toolbar ─── */}
      {selectedRowIds.length > 0 && (
        <div
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ animation: 'slideInRight 0.25s ease-out' }}
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
              {selectedRowIds.length}
            </span>
            <span className="text-xs font-semibold text-blue-900">
              baris terpilih untuk tindakan massal
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkHold}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-all"
            >
              ⏸ Tahan
            </button>
            <button
              onClick={handleBulkIgnore}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              ⊘ Abaikan
            </button>
            <button
              onClick={() => setSelectedRowIds([])}
              className="text-xs text-blue-600 hover:text-blue-800 underline ml-1"
            >
              Batal Seleksi
            </button>
          </div>
        </div>
      )}

      {/* ─── Main Content: Card-based rows or Grouped view ─── */}
      {viewMode === 'rows' ? (
        <div className="space-y-2">
          {filteredRows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl">
                🎉
              </div>
              <Typography variant="heading-3" className="text-gray-900 font-bold">
                Tidak Ada Pengecualian
              </Typography>
              <Typography variant="body" className="text-gray-400 mt-1 text-sm">
                Semua baris laporan telah cocok atau ditangani. Tidak ada pengecualian yang memenuhi filter saat ini.
              </Typography>
            </div>
          ) : (
            filteredRows.map((r) => {
              const isSelected = selectedRowIds.includes(r.rowId);
              const isAging = r.ageDays && r.ageDays > 30;
              const isExpanded = expandedRowId === r.rowId;

              return (
                <div
                  key={r.rowId}
                  className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? 'border-blue-300 shadow-sm ring-1 ring-blue-100'
                      : isExpanded
                      ? 'border-blue-200 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {/* ── Row Card Header ── */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRow(r.rowId)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                    />

                    {/* DSP Icon */}
                    {renderDspIcon(r.dsp)}

                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm truncate max-w-[280px]">
                          {r.originalRow.songTitle || 'Tanpa Judul'}
                        </span>
                        {renderStatusBadge(r, true)}
                        {isAging && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>
                            {r.ageDays}hr
                          </span>
                        )}
                        {r.version > 1 && (
                          <span className="text-[9px] text-gray-400 bg-gray-50 px-1 rounded">v{r.version}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 flex-wrap">
                        <span>Writer: <span className="font-medium text-gray-700">{r.originalRow.writers || '-'}</span></span>
                        <span className="text-gray-300">·</span>
                        <span className="font-mono text-gray-400 text-[10px]">{r.originalRow.assetId}</span>
                        {r.originalRow.customId && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="font-mono text-gray-400 text-[10px]">{r.originalRow.customId}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Revenue */}
                    <div className="text-right flex-shrink-0 mr-2">
                      <div className="font-extrabold text-gray-900 text-sm">{formatCurrency(r.originalRow.idrRev)}</div>
                      <div className="text-[10px] text-gray-400">USD ${r.originalRow.incomeRev.toFixed(2)}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {r.matchStatus === 'resolved' ? (
                        <>
                          <span className="text-[10px] text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">✓</span>
                          <button
                            onClick={() => handleUndo(r.rowId)}
                            className="text-[10px] text-gray-400 hover:text-rose-600 underline px-1"
                          >
                            Undo
                          </button>
                        </>
                      ) : r.matchStatus === 'on_hold' || r.matchStatus === 'ignored' ? (
                        <>
                          <button
                            onClick={() => toggleExpand(r.rowId)}
                            className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => handleUndo(r.rowId)}
                            className="text-[10px] text-gray-400 hover:text-gray-600 px-1"
                          >
                            Undo
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => toggleExpand(r.rowId)}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all shadow-sm ${
                            isExpanded
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-md'
                          }`}
                        >
                          {isExpanded ? 'Tutup' : r.matchStatus === 'conflict' ? 'Selesaikan' : 'Resolve'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Inline Expanded Resolver Panel ── */}
                  {isExpanded && (
                    <div
                      className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white px-5 py-4"
                      style={{ animation: 'slideDown 0.25s ease-out' }}
                    >
                      {/* Show failure reason prominently */}
                      <div className="flex items-start gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">
                          {r.matchStatus === 'conflict' ? '⇄' : r.failedStage === 1 ? '⛔' : r.failedStage === 2 ? '⚠' : 'ⓘ'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900">Alasan Gagal</div>
                          <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{r.failureReason}</div>
                          {r.resolutionReason && (
                            <div className="mt-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-block">
                              Resolusi: {r.resolutionReason}
                            </div>
                          )}
                          {r.holdUntil && (
                            <div className="mt-1 text-[11px] text-blue-700 font-medium">
                              📅 Ditahan s/d: {r.holdUntil}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Buttons for inline resolve */}
                      {(r.matchStatus === 'unmatched' || r.matchStatus === 'conflict') && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenResolver(r)}
                            className="bg-blue-600 hover:bg-blue-700 text-[11px] py-1.5 px-4 rounded-lg font-bold"
                          >
                            🔧 Buka Resolver Penuh
                          </Button>
                          <button
                            onClick={() => {
                              setActiveModalRow(r);
                              setActiveModalType('hold');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-all"
                          >
                            ⏸ Tahan
                          </button>
                          <button
                            onClick={() => {
                              setActiveModalRow(r);
                              setActiveModalType('ignore');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 transition-all"
                          >
                            ⊘ Abaikan
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        // GROUPED MODE: PER ASSET ID UNIK
        <div className="space-y-2">
          {groupedAssetRows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
              <Typography variant="heading-3" className="text-gray-900 font-bold">
                Tidak ada pengecualian per Asset
              </Typography>
              <Typography variant="body" className="text-gray-400 mt-1 text-sm">
                Tidak ada Asset ID unik dalam pengecualian yang cocok dengan filter saat ini.
              </Typography>
            </div>
          ) : (
            groupedAssetRows.map((group) => {
              const representativeRow = group.rows[0];

              return (
                <div
                  key={`${group.dsp}::${group.assetId}`}
                  className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* DSP Icon */}
                    {renderDspIcon(group.dsp)}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm truncate">{group.songTitle}</span>
                        {renderStatusBadge(representativeRow, true)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 flex-wrap">
                        <span>Writers: <span className="font-medium text-gray-700">{group.writers}</span></span>
                        <span className="text-gray-300">·</span>
                        <span className="font-mono text-gray-400 text-[10px]">{group.assetId}</span>
                      </div>
                    </div>

                    {/* Aggregate */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {group.rows.length} baris
                      </span>
                      <div className="text-right">
                        <div className="font-extrabold text-gray-900 text-sm">{formatCurrency(group.totalRevenue)}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenResolver(representativeRow)}
                        className="bg-blue-600 hover:bg-blue-700 text-[11px] py-1.5 px-3 rounded-lg font-bold"
                      >
                        Petakan Semua
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── MODAL RESOLVER TAHAP 1: ASSET ID ─── */}
      {activeModalType === 'stage1' && activeModalRow && (
        <Stage1ResolverModal
          row={activeModalRow}
          catalogSongs={catalogSongs}
          onClose={() => {
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
          onResolved={(count) => {
            setDataVersion((v) => v + 1);
            if (onRefreshData) onRefreshData();
            setExpandedRowId(null);
            showToast(
              `Asset ID berhasil dipetakan ke katalog LOKA (${count} baris siap Re-process).`,
              'success'
            );
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
          onHoldClick={() => setActiveModalType('hold')}
          onIgnoreClick={() => setActiveModalType('ignore')}
        />
      )}

      {/* ─── MODAL RESOLVER TAHAP 2: WRITER ALIAS ─── */}
      {activeModalType === 'stage2' && activeModalRow && (
        <Stage2ResolverModal
          row={activeModalRow}
          masterWriters={masterWriters}
          onClose={() => {
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
          onResolved={(count) => {
            setDataVersion((v) => v + 1);
            if (onRefreshData) onRefreshData();
            setExpandedRowId(null);
            showToast(
              `Alias writer berhasil didaftarkan dan dihubungkan ke IPBASE NO (${count} baris diperbarui).`,
              'success'
            );
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
          onHoldClick={() => setActiveModalType('hold')}
          onIgnoreClick={() => setActiveModalType('ignore')}
        />
      )}

      {/* ─── MODAL RESOLVER TAHAP 3: CUSTOM ID ─── */}
      {activeModalType === 'stage3' && activeModalRow && (
        <Stage3ResolverModal
          row={activeModalRow}
          catalogSongs={catalogSongs}
          onClose={() => {
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
          onResolved={(count) => {
            setDataVersion((v) => v + 1);
            if (onRefreshData) onRefreshData();
            setExpandedRowId(null);
            showToast(
              `Custom ID berhasil diperbaiki ke Song ID katalog LOKA (${count} baris siap re-process).`,
              'success'
            );
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
          onHoldClick={() => setActiveModalType('hold')}
          onIgnoreClick={() => setActiveModalType('ignore')}
        />
      )}

      {/* ─── MODAL RESOLVER KONFLIK ─── */}
      {activeModalType === 'conflict' && activeModalRow && (
        <ConflictResolverModal
          row={activeModalRow}
          catalogSongs={catalogSongs}
          onClose={() => {
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
          onResolved={() => {
            setDataVersion((v) => v + 1);
            if (onRefreshData) onRefreshData();
            setExpandedRowId(null);
            showToast(
              'Konflik validasi berhasil diselesaikan berdasarkan opsi terpilih.',
              'success'
            );
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
          onHoldClick={() => setActiveModalType('hold')}
          onIgnoreClick={() => setActiveModalType('ignore')}
        />
      )}

      {/* ─── MODAL HOLD (TAHAN) ─── */}
      {activeModalType === 'hold' && activeModalRow && (
        <HoldModal
          row={activeModalRow}
          onClose={() => {
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
          onConfirm={(reason, holdUntil) => {
            holdRow(activeModalRow.rowId, reason, holdUntil);
            setDataVersion((v) => v + 1);
            if (onRefreshData) onRefreshData();
            setExpandedRowId(null);
            showToast(
              `Baris berhasil Ditahan hingga ${holdUntil}.`,
              'info'
            );
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
        />
      )}

      {/* ─── MODAL IGNORE (ABAIKAN) ─── */}
      {activeModalType === 'ignore' && activeModalRow && (
        <IgnoreModal
          row={activeModalRow}
          onClose={() => {
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
          onConfirm={(reason) => {
            ignoreRow(activeModalRow.rowId, reason);
            setDataVersion((v) => v + 1);
            if (onRefreshData) onRefreshData();
            setExpandedRowId(null);
            showToast(
              'Baris berhasil ditandai sebagai Diabaikan (Non-katalog LOKA).',
              'info'
            );
            setActiveModalType(null);
            setActiveModalRow(null);
          }}
        />
      )}

      {/* ─── MODAL ASYNC RE-PROCESS PROGRESS ─── */}
      {isReprocessing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-gray-100 text-center"
            style={{ animation: 'scaleIn 0.25s ease-out' }}
          >
            <div className={`w-16 h-16 rounded-2xl ${reprocessProgress < 100 ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center mx-auto mb-5`}>
              <svg
                className={`w-8 h-8 ${reprocessProgress < 100 ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {reprocessProgress < 100 ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                )}
              </svg>
            </div>

            <Typography variant="heading-3" className="font-bold text-gray-900">
              {reprocessProgress < 100 ? 'Menjalankan Re-process...' : 'Re-process Berhasil! 🎉'}
            </Typography>
            <p className="text-xs text-gray-500 mt-2">
              {reprocessProgress < 100
                ? 'Merekalkulasi baris terselesaikan, menerapkan 70:30 split pencipta-publisher...'
                : 'Distribusi royalti telah diperbarui dan diverifikasi seimbang.'}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden my-6">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  reprocessProgress < 100
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    : 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                }`}
                style={{ width: `${reprocessProgress}%` }}
              ></div>
            </div>

            {reprocessResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left text-xs space-y-2.5 mb-5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Baris Diproses:</span>
                  <span className="font-bold text-gray-900">{reprocessResult.reprocessedCount} baris</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tambahan Royalti:</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(reprocessResult.distributedRevenue)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-emerald-200">
                  <span className="text-gray-600 font-semibold">Selisih Rekonsiliasi:</span>
                  <span className="font-bold text-emerald-700">Rp 0 (100% Cocok) ✓</span>
                </div>
              </div>
            )}

            {reprocessProgress === 100 && (
              <Button
                variant="primary"
                onClick={() => {
                  setIsReprocessing(false);
                  setReprocessResult(null);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm py-2.5 rounded-xl font-bold"
              >
                Selesai & Tutup
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ─── AUDIT TRAIL DRAWER ─── */}
      {showAuditLogs && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
          <div
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden"
            style={{ animation: 'slideLeft 0.3s ease-out' }}
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">
                  📋
                </div>
                <div>
                  <Typography variant="heading-3" className="font-bold text-gray-900 text-base">
                    Audit Trail
                  </Typography>
                  <div className="text-[10px] text-gray-400">{auditLogs.length} catatan perubahan</div>
                </div>
              </div>
              <button
                onClick={() => setShowAuditLogs(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {auditLogs.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-xs">
                  <div className="text-3xl mb-3">📭</div>
                  Belum ada catatan riwayat perubahan resolusi.
                </div>
              ) : (
                auditLogs.slice().reverse().map((log: AuditLog) => {
                  const actionColors: Record<string, string> = {
                    resolve: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    hold: 'bg-blue-50 text-blue-700 border-blue-200',
                    ignore: 'bg-gray-100 text-gray-600 border-gray-200',
                    undo: 'bg-amber-50 text-amber-700 border-amber-200',
                    reprocess: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    auto_map: 'bg-cyan-50 text-cyan-700 border-cyan-200',
                  };
                  const colorClass = actionColors[log.action] || 'bg-gray-50 text-gray-600 border-gray-200';

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-gray-100 bg-white text-xs space-y-1.5 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${colorClass}`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <div className="text-gray-700">
                        <span className="font-semibold text-gray-900">{log.actorId}</span>{' '}
                        <span className="text-gray-400">→</span>{' '}
                        <code className="bg-gray-50 px-1 py-0.5 rounded text-[10px] font-mono text-gray-600 border border-gray-100">
                          {log.targetId}
                        </code>
                      </div>
                      {log.reason && (
                        <div className="text-gray-500 italic text-[11px]">"{log.reason}"</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
              <Button
                variant="secondary"
                onClick={() => setShowAuditLogs(false)}
                className="w-full text-xs py-2 rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CSS Animations ─── */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 500px; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-MODAL 1: RESOLVER TAHAP 1 (Asset ID -> Song)
// ─────────────────────────────────────────────────────────────
interface Stage1ResolverModalProps {
  row: MatchedSourceRow;
  catalogSongs: MasterCatalogSong[];
  onClose: () => void;
  onResolved: (affectedCount: number) => void;
  onHoldClick: () => void;
  onIgnoreClick: () => void;
}

const Stage1ResolverModal: React.FC<Stage1ResolverModalProps> = ({
  row,
  catalogSongs,
  onClose,
  onResolved,
  onHoldClick,
  onIgnoreClick,
}) => {
  const [selectedSongId, setSelectedSongId] = useState<string>(
    row.candidateSongIdByAsset || catalogSongs[0]?.songId || ''
  );
  const [scope, setScope] = useState<ResolutionScope>('all_open_batches');
  const [savePermanent, setSavePermanent] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [step, setStep] = useState(1);

  const selectedSong = catalogSongs.find((s) => s.songId === selectedSongId);

  const handleSubmit = () => {
    if (!selectedSongId) return;
    const res = resolveStage1Asset(row.rowId, selectedSongId, scope, savePermanent, notes);
    if (res.success) {
      onResolved(res.affectedCount);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden" style={{ animation: 'scaleIn 0.25s ease-out' }}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg">
                ⛔
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Petakan Asset ID (Tahap 1)</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {row.dsp} · <code className="font-mono font-bold text-gray-700">{row.originalRow.assetId}</code>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <button
                  onClick={() => setStep(s)}
                  className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                    step === s
                      ? 'bg-blue-600 text-white shadow-sm'
                      : step > s
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {step > s ? '✓' : s}
                </button>
                {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-emerald-300' : 'bg-gray-200'}`}></div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-5">
          {step === 1 && (
            <>
              {/* Source Row Summary */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs space-y-2">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Laporan DSP</div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Judul:</span>
                  <span className="font-bold text-gray-900">{row.originalRow.songTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pencipta:</span>
                  <span className="font-medium text-gray-800">{row.originalRow.writers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nilai Tertahan:</span>
                  <span className="font-bold text-emerald-700">
                    Rp {Math.round(row.originalRow.idrRev).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Song selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Pilih Lagu dari Master Hak LOKA:
                </label>
                <select
                  value={selectedSongId}
                  onChange={(e) => setSelectedSongId(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {catalogSongs.map((s) => (
                    <option key={s.songId} value={s.songId}>
                      [{s.songId}] {s.songTitle} · {s.writers.map((w) => w.ipName).join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rights Preview */}
              {selectedSong && (
                <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-200 text-xs space-y-2">
                  <div className="font-semibold text-blue-900 flex items-center justify-between">
                    <span>Pembagian Hak (70% Pencipta / 30% Publisher):</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg font-mono">
                      {selectedSong.songId}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedSong.writers.map((w) => (
                      <div key={w.ipbaseNo} className="flex justify-between items-center text-gray-700">
                        <div>
                          <span className="font-medium">{w.ipName}</span>
                          <span className="text-gray-400 ml-1.5 text-[10px]">({w.ipbaseNo})</span>
                        </div>
                        <span className="font-bold text-blue-800">{w.mecOwn}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              {/* Scope Selector */}
              <div className="space-y-2 text-xs">
                <label className="block font-semibold text-gray-700">Cakupan Resolusi:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScope('all_open_batches')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                      scope === 'all_open_batches'
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-gray-900">🌐 Semua Batch</div>
                    <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      Petakan Asset ID ini ke seluruh baris laporan yang sama
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('row')}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                      scope === 'row'
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-gray-900">📌 Hanya Baris Ini</div>
                    <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      Override sekali pakai pada baris #{row.originalRow.rowIndex}
                    </div>
                  </button>
                </div>
              </div>

              {/* Permanent */}
              <label className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer bg-gray-50 rounded-xl p-3 border border-gray-200">
                <input
                  type="checkbox"
                  checked={savePermanent}
                  onChange={(e) => setSavePermanent(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-gray-800">Simpan ke Master DSP Asset</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Laporan bulan berikutnya akan cocok otomatis</div>
                </div>
              </label>
            </>
          )}

          {step === 3 && (
            <>
              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Catatan Resolusi (Opsional):</label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Asset ID versi remaster akustik resmi dari YouTube CMS"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-200 text-xs space-y-1.5">
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Ringkasan Resolusi</div>
                <div className="flex justify-between"><span className="text-gray-600">Lagu:</span><span className="font-bold text-gray-900">{selectedSong?.songTitle}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Cakupan:</span><span className="font-medium">{scope === 'all_open_batches' ? 'Semua batch' : 'Hanya baris ini'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Permanen:</span><span className="font-medium">{savePermanent ? 'Ya' : 'Tidak'}</span></div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onHoldClick} className="text-xs text-amber-600 hover:text-amber-800 font-medium">
              ⏸ Tahan
            </button>
            <span className="text-gray-300">·</span>
            <button type="button" onClick={onIgnoreClick} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
              ⊘ Abaikan
            </button>
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="secondary" size="sm" onClick={() => setStep((s) => s - 1)} className="text-xs py-1.5 px-3 rounded-lg">
                ← Kembali
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3 rounded-lg">
              Batal
            </Button>
            {step < 3 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-xs py-1.5 px-4 font-bold rounded-lg"
              >
                Lanjut →
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-xs py-1.5 px-4 font-bold rounded-lg"
              >
                ✓ Simpan Resolusi
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-MODAL 2: RESOLVER TAHAP 2 (Writer Alias -> IPBASE NO)
// ─────────────────────────────────────────────────────────────
interface Stage2ResolverModalProps {
  row: MatchedSourceRow;
  masterWriters: { ipbaseNo: string; ipName: string }[];
  onClose: () => void;
  onResolved: (affectedCount: number) => void;
  onHoldClick: () => void;
  onIgnoreClick: () => void;
}

const Stage2ResolverModal: React.FC<Stage2ResolverModalProps> = ({
  row,
  masterWriters,
  onClose,
  onResolved,
  onHoldClick,
  onIgnoreClick,
}) => {
  const unmappedName = row.unmappedWriters?.[0] || row.originalRow.writers || '';
  const [selectedIpbaseNo, setSelectedIpbaseNo] = useState<string>(masterWriters[0]?.ipbaseNo || '');
  const [scope, setScope] = useState<ResolutionScope>('all_open_batches');
  const [notes, setNotes] = useState<string>('');

  const selectedWriter = masterWriters.find((w) => w.ipbaseNo === selectedIpbaseNo);

  const handleSubmit = () => {
    if (!selectedWriter) return;
    const res = resolveStage2Writer(
      row.rowId,
      unmappedName,
      selectedWriter.ipbaseNo,
      selectedWriter.ipName,
      scope,
      row.dsp,
      notes
    );
    if (res.success) {
      onResolved(res.affectedCount);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden" style={{ animation: 'scaleIn 0.25s ease-out' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg">⚠</div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Daftarkan Alias Writer (Tahap 2)</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Nama tidak dikenal: <span className="font-bold text-rose-600">"{unmappedName}"</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200 text-xs text-gray-700">
            Laporan dari <strong>{row.dsp}</strong> menggunakan nama variasi/alias yang belum terhubung ke database hak cipta.
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Pilih Member Resmi LOKA (IPBASE NO):
            </label>
            <select
              value={selectedIpbaseNo}
              onChange={(e) => setSelectedIpbaseNo(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {masterWriters.map((w) => (
                <option key={w.ipbaseNo} value={w.ipbaseNo}>
                  {w.ipName} (IPBASE: {w.ipbaseNo})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 text-xs">
            <label className="block font-semibold text-gray-700">Cakupan Alias:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('all_open_batches')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  scope === 'all_open_batches' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-900">🌐 Semua Batch & Masa Depan</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Simpan sebagai alias resmi permanen</div>
              </button>
              <button
                type="button"
                onClick={() => setScope('row')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  scope === 'row' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-900">📌 Hanya Baris Ini</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Baris #{row.originalRow.rowIndex} saja</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Alasan Alias:</label>
            <input
              type="text"
              placeholder="Contoh: Singkatan nama resmi pencipta di platform streaming"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onHoldClick} className="text-xs text-amber-600 hover:text-amber-800 font-medium">⏸ Tahan</button>
            <span className="text-gray-300">·</span>
            <button type="button" onClick={onIgnoreClick} className="text-xs text-gray-500 hover:text-gray-700 font-medium">⊘ Abaikan</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3 rounded-lg">Batal</Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-xs py-1.5 px-4 font-bold rounded-lg">
              ✓ Hubungkan Alias
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-MODAL 3: RESOLVER TAHAP 3 (Custom ID / Song ID Override)
// ─────────────────────────────────────────────────────────────
interface Stage3ResolverModalProps {
  row: MatchedSourceRow;
  catalogSongs: MasterCatalogSong[];
  onClose: () => void;
  onResolved: (affectedCount: number) => void;
  onHoldClick: () => void;
  onIgnoreClick: () => void;
}

const Stage3ResolverModal: React.FC<Stage3ResolverModalProps> = ({
  row,
  catalogSongs,
  onClose,
  onResolved,
  onHoldClick,
  onIgnoreClick,
}) => {
  const [selectedSongId, setSelectedSongId] = useState<string>(catalogSongs[0]?.songId || '');
  const [scope, setScope] = useState<ResolutionScope>('all_open_batches');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = () => {
    if (!selectedSongId) return;
    const res = resolveStage3CustomId(row.rowId, selectedSongId, scope, false, notes);
    if (res.success) {
      onResolved(res.affectedCount);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden" style={{ animation: 'scaleIn 0.25s ease-out' }}>
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-sky-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center text-lg">ⓘ</div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Perbaiki Custom ID (Tahap 3)</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Custom ID tidak valid: <code className="font-mono text-rose-600 font-bold">{row.originalRow.customId}</code>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Pilih Song ID Katalog LOKA yang Benar:
            </label>
            <select
              value={selectedSongId}
              onChange={(e) => setSelectedSongId(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-xl p-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {catalogSongs.map((s) => (
                <option key={s.songId} value={s.songId}>
                  [{s.songId}] {s.songTitle}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 text-xs">
            <label className="block font-semibold text-gray-700">Cakupan Perbaikan:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('all_open_batches')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  scope === 'all_open_batches' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-900">Semua Baris dengan Custom ID ini</div>
              </button>
              <button
                type="button"
                onClick={() => setScope('row')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  scope === 'row' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-900">Hanya Baris Ini Saja</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan:</label>
            <input
              type="text"
              placeholder="Contoh: Typo pada laporan DSP, dipetakan ke Song ID L000705"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onHoldClick} className="text-xs text-amber-600 hover:text-amber-800 font-medium">⏸ Tahan</button>
            <span className="text-gray-300">·</span>
            <button type="button" onClick={onIgnoreClick} className="text-xs text-gray-500 hover:text-gray-700 font-medium">⊘ Abaikan</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3 rounded-lg">Batal</Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-xs py-1.5 px-4 font-bold rounded-lg">
              ✓ Perbarui Custom ID
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-MODAL 4: RESOLVER KONFLIK (Side-by-side comparison)
// ─────────────────────────────────────────────────────────────
interface ConflictResolverModalProps {
  row: MatchedSourceRow;
  catalogSongs: MasterCatalogSong[];
  onClose: () => void;
  onResolved: () => void;
  onHoldClick: () => void;
  onIgnoreClick: () => void;
}

const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  row,
  catalogSongs,
  onClose,
  onResolved,
  onHoldClick,
  onIgnoreClick,
}) => {
  const songByAsset = catalogSongs.find((s) => s.songId === row.candidateSongIdByAsset);
  const songByCustom = catalogSongs.find((s) => s.songId === row.candidateSongIdByCustomId);

  const [chosenOption, setChosenOption] = useState<'asset' | 'custom' | 'manual'>('asset');
  const [manualSongId, setManualSongId] = useState<string>(catalogSongs[0]?.songId || '');
  const [fixMaster, setFixMaster] = useState<boolean>(true);
  const [reason, setReason] = useState<string>('');

  const handleSubmit = () => {
    let targetSongId = '';
    if (chosenOption === 'asset' && songByAsset) {
      targetSongId = songByAsset.songId;
    } else if (chosenOption === 'custom' && songByCustom) {
      targetSongId = songByCustom.songId;
    } else {
      targetSongId = manualSongId;
    }

    if (!targetSongId) return;

    const res = resolveConflict(
      row.rowId,
      targetSongId,
      reason || `Konflik diselesaikan dengan memilih opsi ${chosenOption.toUpperCase()}`,
      fixMaster
    );

    if (res.success) {
      onResolved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden" style={{ animation: 'scaleIn 0.25s ease-out' }}>
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-lg">⇄</div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Penyelesaian Konflik Validasi</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Asset ID & Custom ID mengarah ke lagu yang berbeda</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A */}
            <div
              onClick={() => setChosenOption('asset')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                chosenOption === 'asset' ? 'border-purple-500 bg-purple-50/30 shadow-sm' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-purple-800 uppercase bg-purple-100 px-2 py-0.5 rounded-md">Opsi A: Asset ID</span>
                <input type="radio" name="conflictChoice" checked={chosenOption === 'asset'} onChange={() => setChosenOption('asset')} className="text-purple-600 focus:ring-purple-500" />
              </div>
              <div className="font-extrabold text-gray-900 text-sm">{songByAsset?.songTitle || 'N/A'}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{songByAsset?.songId || row.candidateSongIdByAsset}</div>
              <div className="mt-3 pt-2 border-t border-purple-100 text-xs text-gray-700 space-y-1">
                {songByAsset?.writers.map((w) => (
                  <div key={w.ipbaseNo} className="flex justify-between">
                    <span>{w.ipName}</span>
                    <span className="font-semibold">{w.mecOwn}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Option B */}
            <div
              onClick={() => setChosenOption('custom')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                chosenOption === 'custom' ? 'border-purple-500 bg-purple-50/30 shadow-sm' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-purple-800 uppercase bg-purple-100 px-2 py-0.5 rounded-md">Opsi B: Custom ID</span>
                <input type="radio" name="conflictChoice" checked={chosenOption === 'custom'} onChange={() => setChosenOption('custom')} className="text-purple-600 focus:ring-purple-500" />
              </div>
              <div className="font-extrabold text-gray-900 text-sm">{songByCustom?.songTitle || 'N/A'}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{songByCustom?.songId || row.candidateSongIdByCustomId}</div>
              <div className="mt-3 pt-2 border-t border-purple-100 text-xs text-gray-700 space-y-1">
                {songByCustom?.writers.map((w) => (
                  <div key={w.ipbaseNo} className="flex justify-between">
                    <span>{w.ipName}</span>
                    <span className="font-semibold">{w.mecOwn}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-xs text-gray-700 cursor-pointer bg-gray-50 rounded-xl p-3 border border-gray-200">
            <input
              type="checkbox"
              checked={fixMaster}
              onChange={(e) => setFixMaster(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-0.5"
            />
            <div>
              <div className="font-semibold text-gray-800">Sinkronkan ke Master</div>
              <div className="text-[10px] text-gray-500">Asset ID ini akan dipetakan permanen ke lagu opsi terpilih</div>
            </div>
          </label>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Alasan Penentuan Opsi:</label>
            <input
              type="text"
              placeholder="Contoh: Berdasarkan judul audio mashup YouTube, klaim terverifikasi"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onHoldClick} className="text-xs text-amber-600 hover:text-amber-800 font-medium">⏸ Tahan</button>
            <span className="text-gray-300">·</span>
            <button type="button" onClick={onIgnoreClick} className="text-xs text-gray-500 hover:text-gray-700 font-medium">⊘ Abaikan</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3 rounded-lg">Batal</Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-xs py-1.5 px-4 font-bold rounded-lg text-white">
              ✓ Konfirmasi Opsi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-MODAL 5: HOLD (TAHAN)
// ─────────────────────────────────────────────────────────────
interface HoldModalProps {
  row: MatchedSourceRow;
  onClose: () => void;
  onConfirm: (reason: string, holdUntil: string) => void;
}

const HoldModal: React.FC<HoldModalProps> = ({ row, onClose, onConfirm }) => {
  const [reason, setReason] = useState('Menunggu verifikasi surat kuasa hak cipta komposer tambahan');
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 30);
  const [holdUntil, setHoldUntil] = useState(defaultDate.toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden" style={{ animation: 'scaleIn 0.25s ease-out' }}>
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg">⏸</div>
              <div className="font-bold text-gray-900 text-sm">Tahan Baris Royalti</div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            Dana royalti baris ini akan tersimpan di rekening penampung publisher hingga status penahanan dicabut.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Alasan Penahanan:</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tinjau Ulang Pada Tanggal:</label>
            <input
              type="date"
              value={holdUntil}
              onChange={(e) => setHoldUntil(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3 rounded-lg">
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(reason, holdUntil)}
            className="bg-blue-600 hover:bg-blue-700 text-xs py-1.5 px-4 font-bold rounded-lg"
          >
            ⏸ Tahan Baris
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-MODAL 6: IGNORE (ABAIKAN)
// ─────────────────────────────────────────────────────────────
interface IgnoreModalProps {
  row: MatchedSourceRow;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const IgnoreModal: React.FC<IgnoreModalProps> = ({ row, onClose, onConfirm }) => {
  const [reason, setReason] = useState('Bukan karya katalog publisher LOKA (Lagu cover pihak ketiga)');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden" style={{ animation: 'scaleIn 0.25s ease-out' }}>
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center text-lg">⊘</div>
              <div className="font-bold text-gray-900 text-sm">Abaikan Baris Laporan</div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 leading-relaxed">
            Baris yang diabaikan akan dikeluarkan dari perhitungan selisih rekonsiliasi. Gunakan untuk lagu non-LOKA atau duplikasi.
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih / Masukkan Alasan:</label>
            <select
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Bukan karya katalog publisher LOKA (Lagu cover pihak ketiga)">
                Bukan karya katalog publisher LOKA (Lagu cover pihak ketiga)
              </option>
              <option value="Duplikasi laporan DSP (Laporan ganda)">Duplikasi laporan DSP</option>
              <option value="Klaim sengketa pihak ketiga di luar yurisdiksi LOKA">
                Klaim sengketa pihak ketiga
              </option>
              <option value="Nominal royalti nihil / penyesuaian teknis DSP">
                Nominal royalti nihil / penyesuaian teknis
              </option>
            </select>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Alasan spesifik..."
              className="w-full text-xs border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3 rounded-lg">
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(reason)}
            className="bg-gray-800 hover:bg-gray-900 text-xs py-1.5 px-4 font-bold text-white rounded-lg"
          >
            ⊘ Abaikan Baris
          </Button>
        </div>
      </div>
    </div>
  );
};
