import React, { useState } from 'react';
import { Card } from './Card';
import { Typography } from './Typography';
import { Button } from './Button';
import {
  RoyaltyBatch,
  DSP_CONFIGS,
  getAllBatches,
  getReconciliation,
  getMemberSummaries,
  ReconciliationReport,
  MemberSummary,
  getExceptionStats,
  checkGatekeeperStatus,
  cancelBatch,
  lockBatch,
  toggleBatchPayout,
  getAuditLogs,
  AuditLog,
} from '../../data/distributionEngine';
import { PublishModal } from './PublishModal';
import { UnpublishModal } from './UnpublishModal';

export interface BatchHistoryProps {
  onBack?: () => void;
  onClearData?: () => void;
  onNavigateToResolver?: (batchId?: string) => void;
  onDataChange?: () => void;
}

export const BatchHistory: React.FC<BatchHistoryProps> = ({
  onBack,
  onClearData,
  onNavigateToResolver,
  onDataChange,
}) => {
  const [selectedBatch, setSelectedBatch] = useState<RoyaltyBatch | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [memberSummaries, setMemberSummaries] = useState<MemberSummary[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [modalPublishBatch, setModalPublishBatch] = useState<RoyaltyBatch | null>(null);
  const [modalUnpublishBatch, setModalUnpublishBatch] = useState<RoyaltyBatch | null>(null);
  const [modalCancelBatch, setModalCancelBatch] = useState<RoyaltyBatch | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [showAuditLogsModal, setShowAuditLogsModal] = useState<boolean>(false);
  const [auditFilterBatchId, setAuditFilterBatchId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const batches = getAllBatches();

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewBatch = (batch: RoyaltyBatch) => {
    setSelectedBatch(batch);
    const recon = getReconciliation(batch.batchId);
    setReconciliation(recon);
    const summaries = getMemberSummaries(batch.batchId);
    setMemberSummaries(summaries);
  };

  const handlePublishSuccess = () => {
    const publishedName = modalPublishBatch?.fileName || 'Batch';
    setModalPublishBatch(null);
    setRefreshTrigger((v) => v + 1);
    if (selectedBatch && modalPublishBatch && selectedBatch.batchId === modalPublishBatch.batchId) {
      const updated = getAllBatches().find((b) => b.batchId === selectedBatch.batchId);
      if (updated) handleViewBatch(updated);
    }
    showToast(`Batch "${publishedName}" berhasil didistribusikan resmi ke akun pencipta! 🎉`, 'success');
    onDataChange?.();
  };

  const handleUnpublishSuccess = () => {
    const unpublishedName = modalUnpublishBatch?.fileName || 'Batch';
    setModalUnpublishBatch(null);
    setRefreshTrigger((v) => v + 1);
    if (selectedBatch && modalUnpublishBatch && selectedBatch.batchId === modalUnpublishBatch.batchId) {
      const updated = getAllBatches().find((b) => b.batchId === selectedBatch.batchId);
      if (updated) handleViewBatch(updated);
    }
    showToast(`Distribusi batch "${unpublishedName}" berhasil ditarik kembali ke status peninjauan (PB-4.4).`, 'info');
    onDataChange?.();
  };

  const handleConfirmCancel = () => {
    if (!modalCancelBatch) return;
    if (cancelReason.trim().length < 5) {
      alert('Alasan pembatalan minimal 5 karakter');
      return;
    }
    const res = cancelBatch(modalCancelBatch.batchId, 'Sarah (Copyright Admin)', cancelReason.trim());
    if (res.success) {
      const bName = modalCancelBatch.fileName;
      setModalCancelBatch(null);
      setCancelReason('');
      setRefreshTrigger((v) => v + 1);
      if (selectedBatch && selectedBatch.batchId === modalCancelBatch.batchId) {
        const updated = getAllBatches().find((b) => b.batchId === selectedBatch.batchId);
        if (updated) handleViewBatch(updated);
      }
      showToast(`Batch "${bName}" berhasil dibatalkan (cancelled).`, 'warning');
      onDataChange?.();
    } else {
      alert(res.error || 'Gagal membatalkan batch');
    }
  };

  const handleConfirmLock = (batch: RoyaltyBatch) => {
    if (
      !window.confirm(
        `Tutup periode permanen (Close Period) untuk batch ${batch.fileName}?\n\nSetelah dikunci oleh Finance, data batch tidak dapat diubah maupun di-unpublish.`
      )
    ) {
      return;
    }
    const res = lockBatch(batch.batchId, 'Budi (Finance Manager)');
    if (res.success) {
      setRefreshTrigger((v) => v + 1);
      if (selectedBatch && selectedBatch.batchId === batch.batchId) {
        const updated = getAllBatches().find((b) => b.batchId === selectedBatch.batchId);
        if (updated) handleViewBatch(updated);
      }
      showToast(`Periode batch "${batch.fileName}" resmi dikunci permanen (Locked) oleh Finance.`, 'info');
      onDataChange?.();
    } else {
      alert(res.error || 'Gagal mengunci batch');
    }
  };

  const handleTogglePayout = (batch: RoyaltyBatch) => {
    const isNowActive = toggleBatchPayout(batch.batchId);
    setRefreshTrigger((v) => v + 1);
    if (selectedBatch && selectedBatch.batchId === batch.batchId) {
      const updated = getAllBatches().find((b) => b.batchId === selectedBatch.batchId);
      if (updated) handleViewBatch(updated);
    }
    showToast(
      isNowActive
        ? `Simulasi Payout: Pengajuan pencairan dana untuk "${batch.period}" DIAKTIFKAN. Aturan PB-4.4.4 kini MEMBLOKIR unpublish.`
        : `Simulasi Payout: Pengajuan pencairan dana DINONAKTIFKAN. Unpublish diizinkan kembali.`,
      isNowActive ? 'warning' : 'info'
    );
  };

  // Status configuration per PRD v1.1 PB-4.5.1
  const statusConfig: Record<
    string,
    { label: string; badgeClass: string; icon: string }
  > = {
    in_review: {
      label: 'DRAFT / DALAM REVIEW',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      icon: '⏳',
    },
    ready_to_publish: {
      label: 'SIAP DIDISTRIBUSIKAN',
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 font-bold',
      icon: '✓',
    },
    published: {
      label: 'TERDISTRIBUSI KE PENCIPTA',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold',
      icon: '🚀',
    },
    locked: {
      label: 'TERKUNCI',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
      icon: '🔒',
    },
    uploaded: {
      label: 'TERUNGGAH',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
      icon: '📄',
    },
    cancelled: {
      label: 'DIBATALKAN',
      badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
      icon: '⊘',
    },
    failed: {
      label: 'GAGAL',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
      icon: '✗',
    },
  };

  const auditLogsList = getAuditLogs().filter(
    (l) => !auditFilterBatchId || l.targetId === auditFilterBatchId
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200" key={refreshTrigger}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-3 duration-300">
          <div
            className={`p-4 rounded-xl shadow-xl border flex items-center gap-3 text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
                : toastMessage.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-amber-500/10'
                : 'bg-blue-50 border-blue-200 text-blue-900 shadow-blue-500/10'
            }`}
          >
            <span>
              {toastMessage.type === 'success' ? '✅' : toastMessage.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        {onBack && !selectedBatch && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors w-fit cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded py-1 px-2 -ml-2"
          >
            <span>←</span> Kembali ke Dashboard
          </button>
        )}
        {selectedBatch && (
          <button
            type="button"
            onClick={() => setSelectedBatch(null)}
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors w-fit cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded py-1 px-2 -ml-2"
          >
            <span>←</span> Kembali ke Daftar Batch
          </button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Typography variant="heading-1">
              {selectedBatch ? `Detail Batch: ${selectedBatch.fileName}` : 'Riwayat Batch & Kontrol Distribusi'}
            </Typography>
            <Typography variant="body" color="secondary" className="mt-1">
              {selectedBatch
                ? `Batch ${selectedBatch.batchId.slice(0, 16)}... · ${DSP_CONFIGS[selectedBatch.dspCode].label} · ${selectedBatch.period}`
                : `${batches.length} batch terdata · Pemisahan status Impor vs Status Terbit (PB-1.1)`}
            </Typography>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Audit Log Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAuditFilterBatchId(selectedBatch?.batchId || null);
                setShowAuditLogsModal(true);
              }}
              className="text-slate-700 hover:text-slate-900 border-slate-300"
              iconLeft={
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
            >
              Audit Log (PB-5.2)
            </Button>

            {!selectedBatch && batches.length > 0 && onClearData && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (window.confirm('Hapus semua riwayat batch dan reset data?')) {
                    onClearData();
                  }
                }}
                className="text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#FEF2F2] border-[#FCA5A5]"
                iconLeft={
                  <svg className="w-4 h-4 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
              >
                Reset Data Batch
              </Button>
            )}
          </div>
        </div>

        {/* Sub-menu Navigation Tabs */}
        {!selectedBatch && onNavigateToResolver && (
          <div className="flex items-center gap-2 border-b border-gray-200 mt-4">
            <button
              type="button"
              className="px-4 py-2.5 text-sm font-bold text-blue-600 border-b-2 border-blue-600 -mb-[1px] flex items-center gap-2"
            >
              <span>Riwayat Batch</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                {batches.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToResolver()}
              className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900 border-b-2 border-transparent -mb-[1px] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Daftar Pengecualian & Resolver</span>
              {(() => {
                const s = getExceptionStats();
                const count = s.unmatched + s.conflicts;
                return count > 0 ? (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700 font-bold">
                    {count}
                  </span>
                ) : null;
              })()}
            </button>
          </div>
        )}
      </div>

      {/* ── Batch List ───────────────────────────────── */}
      {!selectedBatch && (
        <>
          {batches.length === 0 ? (
            <Card className="p-10 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                  <span className="text-2xl">📭</span>
                </div>
                <Typography variant="heading-2" color="secondary">
                  Belum Ada Batch
                </Typography>
                <Typography variant="body" color="secondary" className="text-[13px]">
                  Upload laporan DSP pertama Anda melalui menu Upload Distribusi.
                </Typography>
              </div>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden shadow-xs border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="h-11 bg-slate-50 border-b border-slate-200 text-[12px] font-semibold text-slate-600">
                      <th className="px-4 py-2 text-left">Platform & File</th>
                      <th className="px-4 py-2 text-center">Periode</th>
                      <th className="px-4 py-2 text-right">Baris</th>
                      <th className="px-4 py-2 text-center">Hasil Matching</th>
                      <th className="px-4 py-2 text-right">Total Sumber</th>
                      <th className="px-4 py-2 text-right">Didistribusikan</th>
                      <th className="px-4 py-2 text-center">Status Terbit</th>
                      <th className="px-4 py-2 text-center">Aksi Distribusi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map((b, idx) => {
                      const isPublished = b.status === 'published';
                      const isLocked = b.status === 'locked';
                      const isCancelled = b.status === 'cancelled';
                      const openIssues = b.openIssuesCount ?? (b.unmatchedRows + b.conflictRows);
                      const isReady = b.status === 'ready_to_publish' || (openIssues === 0 && !isPublished && !isLocked && !isCancelled);
                      const isInReview = b.status === 'in_review' && openIssues > 0;
                      const displayStatus = isReady && !isPublished && !isLocked && !isCancelled ? 'ready_to_publish' : b.status;
                      const cfg = statusConfig[displayStatus] || {
                        label: b.status,
                        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
                        icon: '•',
                      };

                      return (
                        <tr
                          key={b.batchId}
                          className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/40 transition-colors`}
                        >
                          {/* DSP & File */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{DSP_CONFIGS[b.dspCode].label}</span>
                              {b.hasActivePayout && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                                  Payout Aktif
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] text-slate-500 max-w-[210px] truncate mt-0.5" title={b.fileName}>
                              {b.fileName}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Oleh: {b.uploadedBy || 'Admin Hak Cipta'}
                            </div>
                          </td>

                          {/* Periode */}
                          <td className="px-4 py-3.5 text-center font-medium text-slate-700">
                            {b.period}
                          </td>

                          {/* Baris */}
                          <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">
                            {b.totalRows.toLocaleString()}
                          </td>

                          {/* Hasil Matching */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-[12px]">
                              <span className="text-emerald-600 font-bold">{b.matchedRows}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-slate-500">{b.totalRows}</span>
                            </div>
                            {openIssues > 0 && (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 mt-0.5">
                                {openIssues} isu terbuka
                              </span>
                            )}
                          </td>

                          {/* Total Sumber */}
                          <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-800">
                            {formatCurrency(b.totalSource)}
                          </td>

                          {/* Didistribusikan */}
                          <td className="px-4 py-3.5 text-right tabular-nums font-bold text-emerald-600">
                            {formatCurrency(b.totalDistributed)}
                          </td>

                          {/* Status Terbit */}
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] ${cfg.badgeClass}`}
                            >
                              <span>{cfg.icon}</span>
                              <span>{cfg.label}</span>
                            </span>
                            {isPublished && b.publishedAt && (
                              <div className="text-[10px] text-slate-400 mt-1">
                                {formatDate(b.publishedAt)}
                              </div>
                            )}
                          </td>

                          {/* Aksi Distribusi */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 1. If Ready to Publish -> Big Publish Action */}
                              {isReady && (
                                <button
                                  type="button"
                                  onClick={() => setModalPublishBatch(b)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <span>🚀</span>
                                  <span>Distribusikan</span>
                                </button>
                              )}

                              {/* 2. If in review with issues -> Go to Resolver */}
                              {isInReview && onNavigateToResolver && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToResolver(b.batchId)}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer"
                                >
                                  Periksa Isu →
                                </button>
                              )}

                              {/* 3. Detail View Button */}
                              <button
                                type="button"
                                onClick={() => handleViewBatch(b)}
                                className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-[12px] font-medium transition-colors cursor-pointer"
                              >
                                Detail
                              </button>

                              {/* 4. If Published -> Option to Unpublish (PB-4.4) */}
                              {isPublished && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setModalUnpublishBatch(b)}
                                    title="Tarik kembali dari akun pencipta (PB-4.4)"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-[12px]"
                                  >
                                    ↩
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmLock(b)}
                                    title="Kunci periode laporan permanen oleh Finance (Close Period)"
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-[12px]"
                                  >
                                    🔒
                                  </button>
                                </>
                              )}

                              {/* 5. Cancel batch if in draft / review */}
                              {(isInReview || isReady) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalCancelBatch(b);
                                    setCancelReason('');
                                  }}
                                  title="Batalkan batch sebelum terbit (PB-3.1)"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-[12px]"
                                >
                                  ⊘
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Batch Detail View ────────────────────────── */}
      {selectedBatch && (
        <div className="space-y-6">
          {/* Status Hero Banner with Gatekeeper CTA */}
          {(() => {
            const isReady = selectedBatch.status === 'ready_to_publish';
            const isPublished = selectedBatch.status === 'published';
            const isInReview = selectedBatch.status === 'in_review';
            const isLocked = selectedBatch.status === 'locked';
            const isCancelled = selectedBatch.status === 'cancelled';
            const openIssues = selectedBatch.openIssuesCount ?? (selectedBatch.unmatchedRows + selectedBatch.conflictRows);

            if (isReady) {
              return (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[14px] p-5 shadow-lg shadow-blue-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="text-[16px] font-bold">
                        Batch Siap Didistribusikan ke Akun Pencipta!
                      </div>
                      <p className="text-[13px] text-blue-100 mt-0.5">
                        Semua baris pengecualian telah selesai diselesaikan dan rekonsiliasi seimbang (Rp 0). Tekan tombol untuk menjalankan otorisasi Four-Eyes.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setModalCancelBatch(selectedBatch);
                        setCancelReason('');
                      }}
                      className="bg-blue-800/60 hover:bg-blue-900 text-white border-blue-400/40"
                    >
                      Batalkan Batch
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setModalPublishBatch(selectedBatch)}
                      className="bg-white hover:bg-blue-50 text-blue-700 font-bold border-transparent shadow-md cursor-pointer"
                      iconLeft={<span>🚀</span>}
                    >
                      Distribusikan ke Pencipta Sekarang
                    </Button>
                  </div>
                </div>
              );
            }

            if (isPublished) {
              return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-[14px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl shrink-0">
                      🚀
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-emerald-950 flex items-center gap-2">
                        <span>Resmi Terdistribusi ke Akun Pencipta</span>
                        <span className="text-[11px] font-semibold bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full">
                          Published
                        </span>
                        {selectedBatch.hasActivePayout && (
                          <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                            ⚠️ Payout Aktif (Unpublish Diblokir)
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-emerald-800 mt-0.5">
                        Diterbitkan pada: <span className="font-semibold">{formatDate(selectedBatch.publishedAt)}</span> oleh <span className="font-semibold">{selectedBatch.publishedBy || 'Approver'}</span>. {selectedBatch.viewedByCreatorsCount || 0} pencipta telah berinteraksi dengan laporan ini.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTogglePayout(selectedBatch)}
                      className={`text-[12px] ${
                        selectedBatch.hasActivePayout
                          ? 'bg-amber-100 border-amber-300 text-amber-900'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                      title="Uji coba aturan PB-4.4.4: saat payout aktif, aksi unpublish akan diblokir"
                    >
                      {selectedBatch.hasActivePayout ? '✓ Simulasi Payout Aktif' : 'Simulasi Payout (PB-4.4.4)'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleConfirmLock(selectedBatch)}
                      className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-300"
                      iconLeft={<span>🔒</span>}
                    >
                      Tutup Periode (Lock)
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setModalUnpublishBatch(selectedBatch)}
                      className="text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200"
                      iconLeft={<span>↩</span>}
                    >
                      Tarik Kembali (Unpublish)
                    </Button>
                  </div>
                </div>
              );
            }

            if (isLocked) {
              return (
                <div className="bg-slate-100 border border-slate-300 rounded-[14px] p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-2xl shrink-0">
                      🔒
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                        <span>Periode Laporan Resmi Dikunci (Locked)</span>
                        <span className="text-[11px] font-semibold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
                          Closed Period
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-600 mt-0.5">
                        Dikunci oleh Finance pada <span className="font-semibold">{formatDate(selectedBatch.lockedAt)}</span>. Batch ini permanen dan tidak dapat diubah maupun di-unpublish (PB-4.4.2).
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            if (isCancelled) {
              return (
                <div className="bg-slate-100 border border-slate-300 rounded-[14px] p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-2xl shrink-0">
                      ⊘
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-slate-900">
                        Batch Dibatalkan Sebelum Terbit (Cancelled)
                      </div>
                      <p className="text-[13px] text-slate-600 mt-0.5">
                        Dibatalkan oleh <span className="font-semibold">{selectedBatch.cancelledBy || 'Admin'}</span> pada {formatDate(selectedBatch.cancelledAt)}. Alasan: <em>"{selectedBatch.cancelReason || 'Tidak disebutkan'}"</em>
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            if (isInReview) {
              return (
                <div className="bg-amber-50 border border-amber-200 rounded-[14px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl shrink-0">
                      ⏳
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-amber-950">
                        Batch dalam Tahap Peninjauan (Draft)
                      </div>
                      <p className="text-[13px] text-amber-800 mt-0.5">
                        Terdapat {openIssues} baris pengecualian yang harus diputuskan sebelum royalti dapat didistribusikan. Data batch ini <strong>masih tersembunyi</strong> dari Portal Pencipta.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setModalCancelBatch(selectedBatch);
                        setCancelReason('');
                      }}
                      className="text-rose-700 border-rose-300 hover:bg-rose-50"
                    >
                      Batalkan Batch
                    </Button>
                    {onNavigateToResolver && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onNavigateToResolver(selectedBatch.batchId)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Buka Resolver ({openIssues}) →
                      </Button>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })()}

          {/* Reconciliation Cards */}
          {reconciliation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className={`rounded-[12px] p-5 flex flex-col justify-between h-[120px] border shadow-xs ${
                  reconciliation.isBalanced
                    ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                    : 'bg-[#FEF2F2] border-[#FECACA]'
                }`}
              >
                <span className="text-[12px] font-medium text-[#4B5563]">Rekonsiliasi (Zero-Diff)</span>
                <div>
                  <span
                    className={`text-[18px] font-bold ${
                      reconciliation.isBalanced ? 'text-[#166534]' : 'text-[#991B1B]'
                    }`}
                  >
                    {reconciliation.isBalanced ? '✓ SEIMBANG (Rp 0)' : '⚠ ADA SELISIH'}
                  </span>
                  {!reconciliation.isBalanced && (
                    <span className="text-[11px] text-rose-700 block mt-0.5 font-mono">
                      Selisih: {formatCurrency(reconciliation.difference)}
                    </span>
                  )}
                </div>
              </div>
              <Card className="p-5 flex flex-col justify-between h-[120px]">
                <span className="text-[12px] font-medium text-[#4B5563]">Total Sumber DSP</span>
                <span className="text-[18px] font-bold text-[#111827] tabular-nums">
                  {formatCurrency(reconciliation.totalSourceRevenue)}
                </span>
              </Card>
              <Card className="p-5 flex flex-col justify-between h-[120px]">
                <span className="text-[12px] font-medium text-[#4B5563]">Total Didistribusikan</span>
                <span className="text-[18px] font-bold text-[#059669] tabular-nums">
                  {formatCurrency(reconciliation.totalDistributedRevenue)}
                </span>
              </Card>
              <Card className="p-5 flex flex-col justify-between h-[120px]">
                <span className="text-[12px] font-medium text-[#4B5563]">Match Rate Baris</span>
                <span className="text-[18px] font-bold text-[#111827]">
                  {selectedBatch.totalRows > 0
                    ? ((selectedBatch.matchedRows / selectedBatch.totalRows) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </Card>
            </div>
          )}

          {/* Member Summary */}
          {memberSummaries.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Typography variant="heading-2">Rincian Pembagian per Pemegang Hak</Typography>
                  <Typography variant="body" color="secondary" className="text-[13px] mt-0.5">
                    {memberSummaries.length} penerima hak cipta terdaftar pada batch ini
                  </Typography>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-slate-400 block">Total Hak Pencipta:</span>
                  <span className="text-[16px] font-bold text-slate-900 tabular-nums">
                    {formatCurrency(memberSummaries.reduce((s, m) => s + m.totalRevenue, 0))}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                <table className="w-full border-collapse text-[14px]">
                  <thead>
                    <tr className="h-10 bg-[#FAFAFA] border-b border-[#E5E7EB] text-[12px] font-semibold text-[#4B5563]">
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2 text-left">Pemegang Hak</th>
                      <th className="px-4 py-2">IPBASE NO</th>
                      <th className="px-4 py-2 text-right">Jumlah Lagu</th>
                      <th className="px-4 py-2 text-right">Total Bersih (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {memberSummaries.map((ms, idx) => (
                      <tr key={ms.ipbaseNo} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
                        <td className="px-4 py-3 text-center text-[12px] text-[#9CA3AF]">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-[#111827]">{ms.ipName}</td>
                        <td className="px-4 py-3 text-center font-mono text-[12px] text-[#6B7280]">
                          {ms.ipbaseNo}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{ms.songCount}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#111827] tabular-nums">
                          {formatCurrency(ms.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Cancel Batch Modal (PB-3.1 & 5.2) ────────────────── */}
      {modalCancelBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg">
                ⊘
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Batalkan Batch</h3>
                <p className="text-xs text-slate-500">
                  {modalCancelBatch.fileName} ({modalCancelBatch.period})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Batch yang dibatalkan tidak akan diterbitkan ke portal pencipta dan tidak akan dihitung dalam laporan keuangan. Aksi ini akan dicatat di Audit Log sebagai event <strong>BATCH_CANCELLED</strong>.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alasan Pembatalan <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Format file salah atau ada duplikasi impor data..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModalCancelBatch(null)}
              >
                Kembali
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmCancel}
                disabled={cancelReason.trim().length < 5}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Konfirmasi Batalkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Log Viewer Modal (PB-5.2) ───────────────────── */}
      {showAuditLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  📜
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Audit Log Distribusi &amp; Publikasi Royalti
                  </h3>
                  <p className="text-xs text-slate-500">
                    {auditFilterBatchId
                      ? `Filter: Batch ${auditFilterBatchId}`
                      : 'Semua rekam jejak otorisasi, penarikan, pembatalan, dan lock period (PB-5.2)'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {auditFilterBatchId && (
                  <button
                    onClick={() => setAuditFilterBatchId(null)}
                    className="text-xs text-blue-600 hover:underline px-2 py-1"
                  >
                    Tampilkan Semua Batch
                  </button>
                )}
                <button
                  onClick={() => setShowAuditLogsModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {auditLogsList.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  Belum ada catatan aktivitas audit.
                </div>
              ) : (
                auditLogsList.slice().reverse().map((log: AuditLog) => {
                  const isHigh = log.priority === 'HIGH' || log.action === 'BATCH_UNPUBLISHED';
                  const isPublish = log.action === 'BATCH_PUBLISHED' || log.action === 'BATCH_PUBLISH_OVERRIDE';
                  const isLock = log.action === 'BATCH_LOCKED';
                  const isCancel = log.action === 'BATCH_CANCELLED';

                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                        isHigh
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                          : isPublish
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : isLock
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : isCancel
                          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <span className="text-base shrink-0 mt-0.5">
                        {isHigh ? '🚨' : isPublish ? '🚀' : isLock ? '🔒' : isCancel ? '⊘' : '📝'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold tracking-tight text-[12px] uppercase">
                            {log.action}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          Aktor: <span className="font-semibold text-slate-800">{log.actorId}</span> · Target: <span className="font-mono">{log.targetType} ({log.targetId})</span>
                        </div>
                        {log.reason && (
                          <div className="text-[11px] text-slate-700 mt-1 bg-white/70 p-2 rounded border border-black/5">
                            <strong>Alasan:</strong> {log.reason}
                          </div>
                        )}
                        {log.after && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                            Data: {JSON.stringify(log.after)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAuditLogsModal(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Publishing Modal (PB-4.3) ─────────────────────────── */}
      <PublishModal
        isOpen={!!modalPublishBatch}
        batch={modalPublishBatch}
        onClose={() => setModalPublishBatch(null)}
        onSuccess={handlePublishSuccess}
      />

      {/* ── Unpublishing Modal (PB-4.4) ───────────────────────── */}
      <UnpublishModal
        isOpen={!!modalUnpublishBatch}
        batch={modalUnpublishBatch}
        onClose={() => setModalUnpublishBatch(null)}
        onSuccess={handleUnpublishSuccess}
      />
    </div>
  );
};
