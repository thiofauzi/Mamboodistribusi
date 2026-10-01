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
  MatchedSourceRow,
  getExceptionStats,
} from '../../data/distributionEngine';

export interface BatchHistoryProps {
  onBack?: () => void;
  onClearData?: () => void;
  onNavigateToResolver?: (batchId?: string) => void;
}

export const BatchHistory: React.FC<BatchHistoryProps> = ({
  onBack,
  onClearData,
  onNavigateToResolver,
}) => {
  const [selectedBatch, setSelectedBatch] = useState<RoyaltyBatch | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [memberSummaries, setMemberSummaries] = useState<MemberSummary[]>([]);
  
  const batches = getAllBatches();

  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  const formatDate = (dateStr: string) => {
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

  const statusStyles: Record<string, string> = {
    uploaded: 'bg-[#FEF3C7] text-[#92400E]',
    validated: 'bg-[#EFF6FF] text-[#1E40AF]',
    distributed: 'bg-[#ECFDF5] text-[#065F46]',
    failed: 'bg-[#FEE2E2] text-[#991B1B]',
  };

  const statusLabels: Record<string, string> = {
    uploaded: 'Terunggah',
    validated: 'Tervalidasi',
    distributed: 'Terdistribusi',
    failed: 'Gagal',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
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
              {selectedBatch ? `Detail Batch: ${selectedBatch.fileName}` : 'Riwayat Batch'}
            </Typography>
            <Typography variant="body" color="secondary" className="mt-1">
              {selectedBatch
                ? `Batch ${selectedBatch.batchId.slice(0, 16)}... · ${DSP_CONFIGS[selectedBatch.dspCode].label} · ${selectedBatch.period}`
                : `${batches.length} batch telah diproses`}
            </Typography>
          </div>
          {!selectedBatch && batches.length > 0 && onClearData && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (window.confirm('Hapus semua riwayat batch dan hasil distribusi?')) {
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
              Hapus Semua Batch
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
            <Card className="p-5">
              <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                <table className="w-full border-collapse text-[14px]">
                  <thead>
                    <tr className="h-11 bg-[#FAFAFA] border-b border-[#E5E7EB] text-[13px] font-semibold text-[#4B5563]">
                      <th className="px-4 py-2 text-left">DSP</th>
                      <th className="px-4 py-2 text-left">Nama File</th>
                      <th className="px-4 py-2">Periode</th>
                      <th className="px-4 py-2 text-right">Baris</th>
                      <th className="px-4 py-2 text-center">Matched</th>
                      <th className="px-4 py-2 text-right">Total Sumber</th>
                      <th className="px-4 py-2 text-right">Terdistribusi</th>
                      <th className="px-4 py-2 text-center">Status</th>
                      <th className="px-4 py-2 text-center">Tanggal</th>
                      <th className="px-4 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {batches.map((b, idx) => (
                      <tr
                        key={b.batchId}
                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-[#F3F4F6] transition-colors`}
                      >
                        <td className="px-4 py-3 font-semibold">{DSP_CONFIGS[b.dspCode].label}</td>
                        <td className="px-4 py-3 text-[13px] max-w-[200px] truncate">{b.fileName}</td>
                        <td className="px-4 py-3 text-center">{b.period}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{b.totalRows.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[#22C55E] font-bold">{b.matchedRows}</span>
                          <span className="text-[#9CA3AF]">/</span>
                          <span className="text-[#6B7280]">{b.totalRows}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(b.totalSource)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#059669]">{formatCurrency(b.totalDistributed)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${statusStyles[b.status] || ''}`}>
                            {statusLabels[b.status] || b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-[12px] text-[#6B7280]">
                          {formatDate(b.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewBatch(b)}
                            className="text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                          >
                            Detail →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Batch Detail View ────────────────────────── */}
      {selectedBatch && (
        <>
          {/* Reconciliation Cards */}
          {reconciliation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`rounded-[8px] p-5 flex flex-col justify-between h-[120px] border shadow-sm ${
                reconciliation.isBalanced
                  ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                  : 'bg-[#FEF2F2] border-[#FECACA]'
              }`}>
                <span className="text-[12px] font-medium text-[#4B5563]">Rekonsiliasi</span>
                <span className={`text-[18px] font-bold ${reconciliation.isBalanced ? 'text-[#166534]' : 'text-[#991B1B]'}`}>
                  {reconciliation.isBalanced ? '✓ SEIMBANG' : '⚠ SELISIH'}
                </span>
              </div>
              <Card className="p-5 flex flex-col justify-between h-[120px]">
                <span className="text-[12px] font-medium text-[#4B5563]">Total Sumber</span>
                <span className="text-[18px] font-bold text-[#111827] tabular-nums">
                  {formatCurrency(reconciliation.totalSourceRevenue)}
                </span>
              </Card>
              <Card className="p-5 flex flex-col justify-between h-[120px]">
                <span className="text-[12px] font-medium text-[#4B5563]">Terdistribusi</span>
                <span className="text-[18px] font-bold text-[#059669] tabular-nums">
                  {formatCurrency(reconciliation.totalDistributedRevenue)}
                </span>
              </Card>
              <Card className="p-5 flex flex-col justify-between h-[120px]">
                <span className="text-[12px] font-medium text-[#4B5563]">Match Rate</span>
                <span className="text-[18px] font-bold text-[#111827]">
                  {selectedBatch.totalRows > 0
                    ? ((selectedBatch.matchedRows / selectedBatch.totalRows) * 100).toFixed(1)
                    : 0}%
                </span>
              </Card>
            </div>
          )}

          {/* Unmatched / Conflict Resolution Alert Banner */}
          {(reconciliation?.unmatchedCount || 0) + (reconciliation?.conflictCount || 0) > 0 && onNavigateToResolver && (
            <div className="bg-amber-50 border border-amber-200 rounded-[8px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  ⚠️
                </span>
                <div>
                  <div className="font-bold text-amber-950 text-sm">
                    Terdapat {(reconciliation?.unmatchedCount || 0) + (reconciliation?.conflictCount || 0)} baris pengecualian pada batch ini
                  </div>
                  <div className="text-xs text-amber-800 mt-0.5">
                    {reconciliation?.unmatchedCount || 0} baris unmatched & {reconciliation?.conflictCount || 0} baris konflik validasi perlu dipetakan sebelum royalti dapat didistribusikan.
                  </div>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigateToResolver(selectedBatch.batchId)}
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              >
                Buka Resolver Baris Ini →
              </Button>
            </div>
          )}

          {/* Member Summary */}
          {memberSummaries.length > 0 && (
            <Card className="p-5">
              <Typography variant="heading-2" className="mb-4">Distribusi per Pemegang Hak</Typography>
              <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                <table className="w-full border-collapse text-[14px]">
                  <thead>
                    <tr className="h-10 bg-[#FAFAFA] border-b border-[#E5E7EB] text-[12px] font-semibold text-[#4B5563]">
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2 text-left">Pemegang Hak</th>
                      <th className="px-4 py-2">IPBASE NO</th>
                      <th className="px-4 py-2 text-right">Lagu</th>
                      <th className="px-4 py-2 text-right">Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {memberSummaries.map((ms, idx) => (
                      <tr key={ms.ipbaseNo} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
                        <td className="px-4 py-3 text-center text-[12px] text-[#9CA3AF]">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-[#111827]">{ms.ipName}</td>
                        <td className="px-4 py-3 text-center font-mono text-[12px] text-[#6B7280]">{ms.ipbaseNo}</td>
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
        </>
      )}
    </div>
  );
};
