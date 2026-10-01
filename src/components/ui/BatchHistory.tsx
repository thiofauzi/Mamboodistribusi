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
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const batches = getAllBatches();

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
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
    showToast(`Distribusi batch "${unpublishedName}" berhasil ditarik kembali ke status peninjauan.`, 'info');
    onDataChange?.();
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
    distributed: {
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200" key={refreshTrigger}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-3 duration-300">
          <div
            className={`p-4 rounded-xl shadow-xl border flex items-center gap-3 text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
                : 'bg-blue-50 border-blue-200 text-blue-900 shadow-blue-500/10'
            }`}
          >
            <span>{toastMessage.type === 'success' ? '✅' : 'ℹ️'}</span>
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
            <Card className="p-5 overflow-hidden">
              <div className="overflow-x-auto border border-[#E5E7EB] rounded-[10px]">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="h-11 bg-slate-50 border-b border-[#E5E7EB] text-[12px] font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="px-4 py-2 text-left">DSP & File</th>
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
                      const cfg = statusConfig[b.status] || {
                        label: b.status,
                        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
                        icon: '•',
                      };
                      const isReady = b.status === 'ready_to_publish';
                      const isPublished = b.status === 'published' || b.status === 'distributed';
                      const isInReview = b.status === 'in_review';
                      const openIssues = b.openIssuesCount ?? (b.unmatchedRows + b.conflictRows);

                      return (
                        <tr
                          key={b.batchId}
                          className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/40 transition-colors`}
                        >
                          {/* DSP & File */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{DSP_CONFIGS[b.dspCode].label}</span>
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
                                <button
                                  type="button"
                                  onClick={() => setModalUnpublishBatch(b)}
                                  title="Tarik kembali dari akun pencipta (PB-4.4)"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-[12px]"
                                >
                                  ↩
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
            const isPublished = selectedBatch.status === 'published' || selectedBatch.status === 'distributed';
            const isInReview = selectedBatch.status === 'in_review';
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
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setModalPublishBatch(selectedBatch)}
                    className="bg-white hover:bg-blue-50 text-blue-700 font-bold border-transparent shrink-0 shadow-md cursor-pointer"
                    iconLeft={<span>🚀</span>}
                  >
                    Distribusikan ke Pencipta Sekarang
                  </Button>
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
                      </div>
                      <p className="text-[13px] text-emerald-800 mt-0.5">
                        Diterbitkan pada: <span className="font-semibold">{formatDate(selectedBatch.publishedAt)}</span> oleh <span className="font-semibold">{selectedBatch.publishedBy || 'Approver'}</span>. Data resmi tampil di Portal Pencipta.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setModalUnpublishBatch(selectedBatch)}
                    className="text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 shrink-0"
                    iconLeft={<span>↩</span>}
                  >
                    Tarik Kembali (Unpublish)
                  </Button>
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
                  {onNavigateToResolver && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigateToResolver(selectedBatch.batchId)}
                      className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                    >
                      Buka Resolver ({openIssues}) →
                    </Button>
                  )}
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
