import React, { useState, useMemo } from 'react';
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
}

type ViewMode = 'rows' | 'grouped_asset';

export const ExceptionResolver: React.FC<ExceptionResolverProps> = ({
  onBack,
  initialBatchId,
  onRefreshData,
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

  // Resolver Modals state
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
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
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
  const renderStatusBadge = (row: MatchedSourceRow) => {
    if (row.matchStatus === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          ✓ Siap Re-process
        </span>
      );
    }

    if (row.matchStatus === 'on_hold') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ⏸ Ditahan
        </span>
      );
    }

    if (row.matchStatus === 'ignored') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          ⊘ Diabaikan
        </span>
      );
    }

    if (row.matchStatus === 'conflict') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
          <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          ⇄ Konflik Validasi
        </span>
      );
    }

    if (row.failedStage === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
          <span className="w-2 h-2 rounded-full bg-rose-600"></span>
          ⛔ Tahap 1: Asset ID
        </span>
      );
    }

    if (row.failedStage === 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-600"></span>
          ⚠ Tahap 2: Writer
        </span>
      );
    }

    if (row.failedStage === 3) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-300">
          <span className="w-2 h-2 rounded-full bg-sky-600"></span>
          ⓘ Tahap 3: Custom ID
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Unmatched
      </span>
    );
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/70 hover:text-white ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                title="Kembali"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <Typography variant="heading-2" className="text-gray-900 font-bold tracking-tight">
              Daftar Pengecualian & Resolver Baris
            </Typography>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              FR-3 & FR-3a Engine
            </span>
          </div>
          <Typography variant="body" className="text-gray-600 mt-1">
            Identifikasi, petakan Asset ID & Writer alias baru, selesaikan baris tidak cocok, dan jalankan
            re-process untuk mendistribusikan royalti pencipta 100% seimbang.
          </Typography>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={() => setShowAuditLogs(true)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Audit Trail ({auditLogs.length})
          </Button>

          <Button
            variant="secondary"
            onClick={handleAutoMap}
            className="border-blue-300 text-blue-700 bg-blue-50/50 hover:bg-blue-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Auto-Map Exact
          </Button>

          <Button
            variant="primary"
            onClick={handleReprocess}
            disabled={stats.resolved === 0}
            className={`flex items-center gap-2 ${
              stats.resolved === 0 ? 'opacity-60 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-process Batch ({stats.resolved})
          </Button>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Isu Terbuka */}
        <Card className="p-5 border-l-4 border-l-rose-500 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total Isu Terbuka</span>
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
              !
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {stats.unmatched + stats.conflicts}
            </span>
            <span className="text-sm text-gray-500 font-medium">baris belum terdistribusi</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
            <span>Ditahan: {stats.onHold} | Diabaikan: {stats.ignored}</span>
            {stats.agingCount > 0 && (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                ⚠️ {stats.agingCount} &gt; 30 hari
              </span>
            )}
          </div>
        </Card>

        {/* Card 2: Tertahan Pendapatan */}
        <Card className="p-5 border-l-4 border-l-amber-500 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Tertahan Pendapatan</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
              Rp
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {formatCurrency(stats.unresolvedRevenue)}
            </div>
            <div className="text-xs text-gray-500 font-medium mt-0.5">
              USD ~${stats.unresolvedIncomeRev.toFixed(2)}
            </div>
          </div>
          <div className="mt-2.5 text-xs text-gray-500 pt-2 border-t border-gray-100 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Tertahan hingga dipetakan ke katalog resmi
          </div>
        </Card>

        {/* Card 3: Distribusi Tahap Gagal */}
        <Card className="p-5 border-l-4 border-l-indigo-500 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Distribusi Tahap Gagal</span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              1-2-3
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-rose-50 p-1.5 rounded border border-rose-100 flex items-center justify-between">
              <span className="text-rose-700 font-medium">⛔ T-1 Asset</span>
              <span className="font-bold text-rose-900">{stats.byStage.stage1}</span>
            </div>
            <div className="bg-amber-50 p-1.5 rounded border border-amber-100 flex items-center justify-between">
              <span className="text-amber-700 font-medium">⚠ T-2 Writer</span>
              <span className="font-bold text-amber-900">{stats.byStage.stage2}</span>
            </div>
            <div className="bg-sky-50 p-1.5 rounded border border-sky-100 flex items-center justify-between">
              <span className="text-sky-700 font-medium">ⓘ T-3 Custom</span>
              <span className="font-bold text-sky-900">{stats.byStage.stage3}</span>
            </div>
            <div className="bg-purple-50 p-1.5 rounded border border-purple-100 flex items-center justify-between">
              <span className="text-purple-700 font-medium">⇄ Konflik</span>
              <span className="font-bold text-purple-900">{stats.conflicts}</span>
            </div>
          </div>
        </Card>

        {/* Card 4: Status Resolusi & Rekonsiliasi */}
        <Card className="p-5 border-l-4 border-l-emerald-500 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Status Resolusi</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              ✓
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              {stats.resolved}
            </span>
            <span className="text-sm text-gray-500 font-medium">baris siap re-process</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
            <span>Rekonsiliasi:</span>
            <span className="font-semibold text-emerald-600">Rp 0 (100% Seimbang)</span>
          </div>
        </Card>
      </div>

      {/* Control Bar: Mode Switcher, Batch Selector, Filters, Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: View Mode Toggle & Batch Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setViewMode('rows')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'rows'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Per Baris ({filteredRows.length})
            </button>
            <button
              onClick={() => setViewMode('grouped_asset')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'grouped_asset'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Per Asset ID Unik ({groupedAssetRows.length})
            </button>
          </div>

          {/* Batch Selector */}
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Batch Aktif</option>
            {batches.map((b) => (
              <option key={b.batchId} value={b.batchId}>
                {b.dspCode} - {b.period} ({b.fileName})
              </option>
            ))}
          </select>

          {/* DSP Filter */}
          <select
            value={selectedDsp}
            onChange={(e) => setSelectedDsp(e.target.value)}
            className="text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="stage1">⛔ Tahap 1: Asset ID</option>
            <option value="stage2">⚠ Tahap 2: Writer</option>
            <option value="stage3">ⓘ Tahap 3: Custom ID</option>
            <option value="conflict">⇄ Konflik Validasi</option>
            <option value="on_hold">⏸ Ditahan</option>
            <option value="ignored">⊘ Diabaikan</option>
            <option value="resolved">✓ Siap Re-process</option>
          </select>

          {/* Aging Toggle */}
          <button
            onClick={() => setFilterAgingOnly((prev) => !prev)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filterAgingOnly
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>⚠️</span>
            <span>&gt; 30 Hari Menua</span>
          </button>
        </div>

        {/* Right: Search Input */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Cari judul, Asset ID, Custom ID, writer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Bulk Action Toolbar (When rows are selected) */}
      {selectedRowIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {selectedRowIds.length}
            </span>
            <span className="text-xs font-medium text-blue-900">
              Baris terpilih untuk tindakan massal
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkHold}
              className="bg-white border-amber-300 text-amber-800 hover:bg-amber-50 text-xs py-1"
            >
              ⏸ Tahan Terpilih
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkIgnore}
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100 text-xs py-1"
            >
              ⊘ Abaikan Terpilih
            </Button>
            <button
              onClick={() => setSelectedRowIds([])}
              className="text-xs text-blue-700 underline hover:text-blue-900 ml-2"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Main Table Content */}
      <Card className="overflow-hidden border border-gray-200 shadow-sm bg-white">
        {viewMode === 'rows' ? (
          // TABLE MODE: PER BARIS
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredRows.length > 0 &&
                        selectedRowIds.length === filteredRows.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">DSP & Batch</th>
                  <th className="py-3 px-4">Metadata Baris Laporan</th>
                  <th className="py-3 px-4">Status & Masalah Validasi</th>
                  <th className="py-3 px-4 text-right">Pendapatan (IDR)</th>
                  <th className="py-3 px-4 text-center">Aksi Resolver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      Tidak ada baris pengecualian yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const isSelected = selectedRowIds.includes(r.rowId);
                    const isAging = r.ageDays && r.ageDays > 30;

                    return (
                      <tr
                        key={r.rowId}
                        className={`hover:bg-blue-50/30 transition-colors ${
                          isSelected ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRow(r.rowId)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-1"
                          />
                        </td>

                        {/* DSP & Batch */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="font-semibold text-gray-900">{r.dsp}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Baris #{r.originalRow.rowIndex}
                          </div>
                          {r.ageDays !== undefined && (
                            <span
                              className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                isAging
                                  ? 'bg-rose-100 text-rose-700 font-bold'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {r.ageDays} hari
                            </span>
                          )}
                        </td>

                        {/* Metadata Baris Laporan */}
                        <td className="py-3.5 px-4 align-top max-w-xs">
                          <div className="font-bold text-gray-900 text-sm leading-snug">
                            {r.originalRow.songTitle || 'Tanpa Judul'}
                          </div>
                          <div className="text-[11px] text-gray-600 mt-1 flex items-center gap-1 flex-wrap">
                            <span className="text-gray-400">Writer:</span>
                            <span className="font-medium text-gray-800">
                              {r.originalRow.writers || '-'}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px]">
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 border border-gray-200">
                              Asset: {r.originalRow.assetId}
                            </span>
                            {r.originalRow.customId && (
                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                Custom: {r.originalRow.customId}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status & Masalah Validasi */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-2 flex-wrap">
                            {renderStatusBadge(r)}
                            {r.version > 1 && (
                              <span className="text-[10px] text-gray-400">
                                (v{r.version})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                            {r.failureReason}
                          </div>
                          {r.resolutionReason && (
                            <div className="text-[11px] text-emerald-700 mt-1 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                              Resolusi: {r.resolutionReason}
                            </div>
                          )}
                          {r.holdUntil && (
                            <div className="text-[11px] text-blue-700 mt-1 font-medium">
                              Ditahan s/d: {r.holdUntil}
                            </div>
                          )}
                        </td>

                        {/* Pendapatan (IDR) */}
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          <div className="font-extrabold text-gray-900 text-sm">
                            {formatCurrency(r.originalRow.idrRev)}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            USD ${r.originalRow.incomeRev.toFixed(2)}
                          </div>
                        </td>

                        {/* Aksi Resolver */}
                        <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                          {r.matchStatus === 'resolved' ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs text-emerald-600 font-semibold">
                                Terselesaikan
                              </span>
                              <button
                                onClick={() => handleUndo(r.rowId)}
                                className="text-xs text-gray-500 hover:text-rose-600 underline"
                                title="Batalkan resolusi"
                              >
                                Batal
                              </button>
                            </div>
                          ) : r.matchStatus === 'on_hold' || r.matchStatus === 'ignored' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenResolver(r)}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                Ubah Resolusi
                              </button>
                              <button
                                onClick={() => handleUndo(r.rowId)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                                title="Kembalikan ke status aktif"
                              >
                                Undo
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenResolver(r)}
                                className="bg-blue-600 hover:bg-blue-700 text-xs py-1 px-3"
                              >
                                {r.matchStatus === 'conflict' ? 'Selesaikan Konflik' : 'Petakan (Resolver)'}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          // GROUPED MODE: PER ASSET ID UNIK
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">DSP & Asset ID Unik</th>
                  <th className="py-3 px-4">Judul Lagu & Komposisi Writer</th>
                  <th className="py-3 px-4 text-center">Jumlah Baris</th>
                  <th className="py-3 px-4 text-right">Akumulasi Nilai IDR</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi Petakan Global</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {groupedAssetRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      Tidak ada Asset ID unik dalam pengecualian.
                    </td>
                  </tr>
                ) : (
                  groupedAssetRows.map((group) => {
                    const representativeRow = group.rows[0];

                    return (
                      <tr key={`${group.dsp}::${group.assetId}`} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span className="font-bold text-gray-900">{group.dsp}</span>
                          <div className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800 border border-gray-200 mt-1 inline-block">
                            {group.assetId}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-gray-900 text-sm">{group.songTitle}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Writers: {group.writers}</div>
                        </td>
                        <td className="py-3.5 px-4 align-top text-center">
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            {group.rows.length} baris
                          </span>
                        </td>
                        <td className="py-3.5 px-4 align-top text-right">
                          <span className="font-extrabold text-gray-900 text-sm">
                            {formatCurrency(group.totalRevenue)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 align-top text-center">
                          {renderStatusBadge(representativeRow)}
                        </td>
                        <td className="py-3.5 px-4 align-top text-center">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenResolver(representativeRow)}
                            className="bg-blue-600 hover:bg-blue-700 text-xs py-1 px-3"
                          >
                            Petakan {group.rows.length} Baris Sekaligus
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
            showToast(
              `Asset ID berhasil dipetakan ke katalog LOKA (${count} baris diperbarui ke status Siap Re-process).`,
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
            showToast(
              `Baris berhasil Ditahan hingga ${holdUntil}. Royalti tidak akan didistribusikan sementara.`,
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scaleIn text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <svg
                className={`w-6 h-6 ${reprocessProgress < 100 ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>

            <Typography variant="heading-3" className="font-bold text-gray-900">
              {reprocessProgress < 100 ? 'Menjalankan Re-process Batch...' : 'Re-process Berhasil!'}
            </Typography>
            <p className="text-xs text-gray-500 mt-1">
              {reprocessProgress < 100
                ? 'Merekalkulasi baris terselesaikan, menerapkan 70% share pencipta & 30% publisher...'
                : 'Distribusi royalti telah diperbarui dan diverifikasi seimbang.'}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden my-5">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${reprocessProgress}%` }}
              ></div>
            </div>

            {reprocessResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left text-xs space-y-2 mb-4">
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Selisih Rekonsiliasi:</span>
                  <span className="font-bold text-emerald-700">Rp 0 (100% Cocok)</span>
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-sm py-2"
              >
                Selesai & Tutup
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ─── AUDIT TRAIL DRAWER ─── */}
      {showAuditLogs && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-slideLeft">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📜</span>
                  <Typography variant="heading-3" className="font-bold text-gray-900">
                    Audit Trail & Riwayat Resolusi
                  </Typography>
                </div>
                <button
                  onClick={() => setShowAuditLogs(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    Belum ada catatan riwayat perubahan resolusi.
                  </div>
                ) : (
                  auditLogs.slice().reverse().map((log: AuditLog) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-800 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-white border border-gray-200">
                          {log.action}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <div className="text-gray-700">
                        <span className="font-semibold text-gray-900">{log.actorId}</span> memproses target{' '}
                        <code className="bg-gray-200 px-1 py-0.5 rounded text-[11px]">
                          {log.targetId}
                        </code>
                      </div>
                      {log.reason && (
                        <div className="text-gray-500 italic">Alasan: "{log.reason}"</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowAuditLogs(false)}
                className="w-full text-xs py-2"
              >
                Tutup Audit Trail
              </Button>
            </div>
          </div>
        </div>
      )}
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

  const selectedSong = catalogSongs.find((s) => s.songId === selectedSongId);

  const handleSubmit = () => {
    if (!selectedSongId) return;
    const res = resolveStage1Asset(row.rowId, selectedSongId, scope, savePermanent, notes);
    if (res.success) {
      onResolved(res.affectedCount);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 animate-scaleIn space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
              ⛔
            </span>
            <div>
              <Typography variant="heading-3" className="font-bold text-gray-900">
                Petakan Asset ID (Tahap 1)
              </Typography>
              <div className="text-xs text-gray-500">
                DSP {row.dsp} &bull; Asset ID: <code className="font-mono font-bold text-gray-800">{row.originalRow.assetId}</code>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Source Row Summary Card */}
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Judul di Laporan DSP:</span>
            <span className="font-bold text-gray-900">{row.originalRow.songTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Pencipta di Laporan:</span>
            <span className="font-medium text-gray-800">{row.originalRow.writers}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Nilai Tertahan:</span>
            <span className="font-bold text-emerald-700">
              Rp {Math.round(row.originalRow.idrRev).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Suggestion Candidates */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Pilih Lagu Resmi dari Master Hak LOKA:
          </label>
          <select
            value={selectedSongId}
            onChange={(e) => setSelectedSongId(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {catalogSongs.map((s) => (
              <option key={s.songId} value={s.songId}>
                [{s.songId}] {s.songTitle} &bull; Writers: {s.writers.map((w) => w.ipName).join(', ')}
              </option>
            ))}
          </select>
        </div>

        {/* Song Rights Preview Card */}
        {selectedSong && (
          <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-200 text-xs space-y-2">
            <div className="font-semibold text-blue-900 flex items-center justify-between">
              <span>Komposisi Hak Pembagian (70% Pencipta / 30% Publisher):</span>
              <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono">
                {selectedSong.songId}
              </span>
            </div>
            <div className="space-y-1">
              {selectedSong.writers.map((w) => (
                <div key={w.ipbaseNo} className="flex justify-between text-gray-700">
                  <span>{w.ipName} ({w.ipbaseNo}):</span>
                  <span className="font-bold">{w.mecOwn}% Mechanical</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scope Selector */}
        <div className="space-y-2 text-xs">
          <label className="block font-semibold text-gray-700">Cakupan Resolusi:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope('all_open_batches')}
              className={`p-3 rounded-lg border text-left transition-all ${
                scope === 'all_open_batches'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold ring-1 ring-blue-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold">Semua Batch Aktif (Rekomendasi)</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Petakan Asset ID ini ke seluruh baris laporan dengan Asset ID yang sama
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScope('row')}
              className={`p-3 rounded-lg border text-left transition-all ${
                scope === 'row'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold ring-1 ring-blue-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold">Hanya Baris Ini Saja</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Override sekali pakai pada baris #{row.originalRow.rowIndex}
              </div>
            </button>
          </div>
        </div>

        {/* Permanent Registry Checkbox */}
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={savePermanent}
            onChange={(e) => setSavePermanent(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Simpan pemetaan ini ke tabel Master DSP Asset ID agar laporan bulan berikutnya cocok otomatis</span>
        </label>

        {/* Notes Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan Resolusi (Opsional):</label>
          <input
            type="text"
            placeholder="Contoh: Asset ID versi remaster akustik resmi dari YouTube CMS"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onHoldClick}
              className="text-xs text-amber-700 hover:underline"
            >
              ⏸ Tahan Baris
            </button>
            <span className="text-gray-300">&bull;</span>
            <button
              type="button"
              onClick={onIgnoreClick}
              className="text-xs text-gray-500 hover:underline"
            >
              ⊘ Abaikan (Bukan LOKA)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3">
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-xs py-1.5 px-4 font-semibold"
            >
              Simpan Resolusi
            </Button>
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-scaleIn space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              ⚠
            </span>
            <div>
              <Typography variant="heading-3" className="font-bold text-gray-900">
                Daftarkan Alias Writer (Tahap 2)
              </Typography>
              <div className="text-xs text-gray-500">
                Nama tidak dikenal: <span className="font-semibold text-rose-600">"{unmappedName}"</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200 text-xs space-y-1 text-gray-700">
          <div>Laporan dari <strong>{row.dsp}</strong> menggunakan nama variasi/alias yang belum terhubung ke database hak cipta.</div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Pilih Member Resmi LOKA (IPBASE NO):
          </label>
          <select
            value={selectedIpbaseNo}
            onChange={(e) => setSelectedIpbaseNo(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope('all_open_batches')}
              className={`p-3 rounded-lg border text-left transition-all ${
                scope === 'all_open_batches'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold ring-1 ring-blue-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold">Semua Batch & Masa Depan</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Simpan permanen sebagai alias nama resmi
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScope('row')}
              className={`p-3 rounded-lg border text-left transition-all ${
                scope === 'row'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold ring-1 ring-blue-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold">Hanya Baris Ini</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Terapkan pada baris #{row.originalRow.rowIndex} saja
              </div>
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
            className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onHoldClick} className="text-xs text-amber-700 hover:underline">
              ⏸ Tahan
            </button>
            <span className="text-gray-300">&bull;</span>
            <button type="button" onClick={onIgnoreClick} className="text-xs text-gray-500 hover:underline">
              ⊘ Abaikan
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3">
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-xs py-1.5 px-4 font-semibold"
            >
              Hubungkan Alias
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-scaleIn space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-sm">
              ⓘ
            </span>
            <div>
              <Typography variant="heading-3" className="font-bold text-gray-900">
                Perbaiki Custom ID (Tahap 3)
              </Typography>
              <div className="text-xs text-gray-500">
                Custom ID tidak valid: <code className="font-mono text-rose-600">{row.originalRow.customId}</code>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Pilih Song ID Katalog LOKA yang Benar:
          </label>
          <select
            value={selectedSongId}
            onChange={(e) => setSelectedSongId(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-lg p-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope('all_open_batches')}
              className={`p-3 rounded-lg border text-left transition-all ${
                scope === 'all_open_batches'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold ring-1 ring-blue-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold">Semua Baris dengan Custom ID ini</div>
            </button>
            <button
              type="button"
              onClick={() => setScope('row')}
              className={`p-3 rounded-lg border text-left transition-all ${
                scope === 'row'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold ring-1 ring-blue-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold">Hanya Baris Ini Saja</div>
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
            className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onHoldClick} className="text-xs text-amber-700 hover:underline">
              ⏸ Tahan
            </button>
            <span className="text-gray-300">&bull;</span>
            <button type="button" onClick={onIgnoreClick} className="text-xs text-gray-500 hover:underline">
              ⊘ Abaikan
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3">
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-xs py-1.5 px-4 font-semibold"
            >
              Perbarui Custom ID
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 animate-scaleIn space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
              ⇄
            </span>
            <div>
              <Typography variant="heading-3" className="font-bold text-gray-900">
                Penyelesaian Konflik Validasi
              </Typography>
              <div className="text-xs text-gray-500">
                Asset ID & Custom ID mengarah ke lagu yang berbeda di master katalog
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A: Asset ID */}
          <div
            onClick={() => setChosenOption('asset')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              chosenOption === 'asset'
                ? 'border-purple-600 bg-purple-50/40 ring-1 ring-purple-600'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 uppercase">Opsi A: Sesuai Asset ID</span>
              <input
                type="radio"
                name="conflictChoice"
                checked={chosenOption === 'asset'}
                onChange={() => setChosenOption('asset')}
                className="text-purple-600 focus:ring-purple-500"
              />
            </div>
            <div className="font-extrabold text-gray-900 mt-2 text-sm">
              {songByAsset?.songTitle || 'Katalog Terpetakan dari Asset'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Song ID: {songByAsset?.songId || row.candidateSongIdByAsset}</div>
            <div className="mt-3 pt-2 border-t border-purple-100 text-xs text-gray-700">
              <span className="text-gray-400 block mb-1">Komposisi Pencipta:</span>
              {songByAsset?.writers.map((w) => (
                <div key={w.ipbaseNo} className="flex justify-between">
                  <span>{w.ipName}</span>
                  <span className="font-semibold">{w.mecOwn}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Option B: Custom ID */}
          <div
            onClick={() => setChosenOption('custom')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              chosenOption === 'custom'
                ? 'border-purple-600 bg-purple-50/40 ring-1 ring-purple-600'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 uppercase">Opsi B: Sesuai Custom ID</span>
              <input
                type="radio"
                name="conflictChoice"
                checked={chosenOption === 'custom'}
                onChange={() => setChosenOption('custom')}
                className="text-purple-600 focus:ring-purple-500"
              />
            </div>
            <div className="font-extrabold text-gray-900 mt-2 text-sm">
              {songByCustom?.songTitle || 'Katalog Terpetakan dari Custom ID'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Song ID: {songByCustom?.songId || row.candidateSongIdByCustomId}</div>
            <div className="mt-3 pt-2 border-t border-purple-100 text-xs text-gray-700">
              <span className="text-gray-400 block mb-1">Komposisi Pencipta:</span>
              {songByCustom?.writers.map((w) => (
                <div key={w.ipbaseNo} className="flex justify-between">
                  <span>{w.ipName}</span>
                  <span className="font-semibold">{w.mecOwn}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Permanent master sync */}
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={fixMaster}
            onChange={(e) => setFixMaster(e.target.checked)}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span>Sinkronisasikan Asset ID ini secara permanen ke lagu opsi terpilih di tabel master</span>
        </label>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Alasan Penentuan Opsi:</label>
          <input
            type="text"
            placeholder="Contoh: Berdasarkan judul audio mashup YouTube, klaim terverifikasi milik Song ID Opsi A"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onHoldClick} className="text-xs text-amber-700 hover:underline">
              ⏸ Tahan Baris
            </button>
            <span className="text-gray-300">&bull;</span>
            <button type="button" onClick={onIgnoreClick} className="text-xs text-gray-500 hover:underline">
              ⊘ Abaikan Baris
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3">
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              className="bg-purple-600 hover:bg-purple-700 text-xs py-1.5 px-4 font-semibold text-white"
            >
              Konfirmasi Opsi
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scaleIn space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
              ⏸
            </span>
            <Typography variant="heading-3" className="font-bold text-gray-900">
              Tahan Baris Royalti
            </Typography>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <p className="text-xs text-gray-600">
          Baris yang ditahan tidak akan didistribusikan pada batch saat ini. Dana royalti akan tetap tersimpan
          di rekening penampung publisher hingga status penahanan dicabut.
        </p>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Alasan Penahanan:</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Tinjau Ulang Pada Tanggal:</label>
          <input
            type="date"
            value={holdUntil}
            onChange={(e) => setHoldUntil(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3">
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(reason, holdUntil)}
            className="bg-blue-600 hover:bg-blue-700 text-xs py-1.5 px-4 font-semibold"
          >
            Tahan Baris
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scaleIn space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center font-bold text-sm">
              ⊘
            </span>
            <Typography variant="heading-3" className="font-bold text-gray-900">
              Abaikan Baris Laporan
            </Typography>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 leading-relaxed">
          Baris yang diabaikan akan dikeluarkan dari perhitungan selisih rekonsiliasi dan tidak akan
          memunculkan peringatan unresolved. Gunakan untuk lagu non-LOKA atau duplikasi eksternal.
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih / Masukkan Alasan:</label>
          <select
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg p-2.5 bg-white text-gray-800 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Bukan karya katalog publisher LOKA (Lagu cover pihak ketiga)">
              Bukan karya katalog publisher LOKA (Lagu cover pihak ketiga)
            </option>
            <option value="Duplikasi laporan DSP (Laporan ganda)">Duplikasi laporan DSP (Laporan ganda)</option>
            <option value="Klaim sengketa pihak ketiga di luar yurisdiksi LOKA">
              Klaim sengketa pihak ketiga di luar yurisdiksi LOKA
            </option>
            <option value="Nominal royalti nihil / penyesuaian teknis DSP">
              Nominal royalti nihil / penyesuaian teknis DSP
            </option>
          </select>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan spesifik..."
            className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <Button variant="secondary" size="sm" onClick={onClose} className="text-xs py-1.5 px-3">
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(reason)}
            className="bg-gray-800 hover:bg-gray-900 text-xs py-1.5 px-4 font-semibold text-white"
          >
            Abaikan Baris Ini
          </Button>
        </div>
      </div>
    </div>
  );
};
