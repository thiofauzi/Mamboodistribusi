import React, { useState, useEffect, useMemo } from 'react';
import {
  RoyaltyBatch,
  DSP_CONFIGS,
  checkGatekeeperStatus,
  publishBatch,
  GatekeeperResult,
} from '../../data/distributionEngine';
import { Button } from './Button';

export interface PublishModalProps {
  isOpen: boolean;
  batch: RoyaltyBatch | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  batch,
  onClose,
  onSuccess,
}) => {
  // Approver selection (Four-Eyes Principle)
  const [selectedApprover, setSelectedApprover] = useState<string>('Budi (Finance Manager)');
  const [notes, setNotes] = useState<string>('');
  const [isAgreementChecked, setIsAgreementChecked] = useState<boolean>(false);
  const [isOverrideChecked, setIsOverrideChecked] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedApprover('Budi (Finance Manager)');
      setNotes('');
      setIsAgreementChecked(false);
      setIsOverrideChecked(false);
      setOverrideReason('');
      setErrorMessage(null);
    }
  }, [isOpen, batch?.batchId]);

  // Compute Gatekeeper status whenever batch or approver changes
  const gatekeeper: GatekeeperResult | null = useMemo(() => {
    if (!batch) return null;
    return checkGatekeeperStatus(batch.batchId, selectedApprover);
  }, [batch, selectedApprover]);

  if (!isOpen || !batch || !gatekeeper) return null;

  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  const dspInfo = DSP_CONFIGS[batch.dspCode] || { label: batch.dspCode, color: '#3B82F6' };
  const uploader = batch.uploadedBy || 'Sarah (Copyright Admin)';

  // Determine if publish button should be enabled
  const isFourEyesPassed = gatekeeper.summary.isFourEyesSatisfied;
  const canSubmit =
    isAgreementChecked &&
    (gatekeeper.canPublish || (isOverrideChecked && overrideReason.trim().length >= 10)) &&
    !isSubmitting;

  const handleConfirmPublish = () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const fullNotes = isOverrideChecked
      ? `[OVERRIDE HEAD OF ROYALTY: ${overrideReason}] ${notes}`
      : notes;

    const res = publishBatch(
      batch.batchId,
      selectedApprover,
      fullNotes,
      gatekeeper.checksum,
      isOverrideChecked
    );

    if (res.success) {
      setIsSubmitting(false);
      onSuccess();
    } else {
      setIsSubmitting(false);
      setErrorMessage(res.error || 'Gagal mempublikasikan distribusi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-[16px] shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* ── Modal Header ─────────────────────────────────────── */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">
                  Otorisasi Publikasi Distribusi Royalti
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 tracking-wide uppercase">
                  PB-4.3
                </span>
              </div>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Batch: <span className="font-semibold text-slate-700">{batch.fileName}</span> · {dspInfo.label} ({batch.period})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Modal Content (Scrollable) ─────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[13px] flex items-center gap-2.5 animate-in fade-in">
              <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Ringkasan Finansial Card Grid */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              1. Ringkasan Finansial yang Diterbitkan
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-[11px] font-medium text-slate-500">Total DSP Bruto</div>
                <div className="text-[15px] font-bold text-slate-900 mt-1 tabular-nums">
                  {formatCurrency(gatekeeper.summary.totalSource)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{batch.totalRows.toLocaleString()} baris DSP</div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="text-[11px] font-medium text-emerald-800">Hak Pencipta (Net)</div>
                <div className="text-[15px] font-bold text-emerald-700 mt-1 tabular-nums">
                  {formatCurrency(gatekeeper.summary.creatorNetPayout)}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  {gatekeeper.summary.recipientCount} musisi penerima
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <div className="text-[11px] font-medium text-blue-800">LOKA Publisher</div>
                <div className="text-[15px] font-bold text-blue-700 mt-1 tabular-nums">
                  {formatCurrency(gatekeeper.summary.publisherShare)}
                </div>
                <div className="text-[10px] text-blue-600 font-medium mt-0.5">30% Publisher Share</div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div className="text-[11px] font-medium text-amber-800">Ditahan / Ignored</div>
                <div className="text-[15px] font-bold text-amber-700 mt-1 tabular-nums">
                  {formatCurrency(gatekeeper.summary.totalOnHold + gatekeeper.summary.totalIgnored)}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5">
                  Hold: {formatCurrency(gatekeeper.summary.totalOnHold)}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Gatekeeper Checklist Verification */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                2. Pra-Syarat Gatekeeper (PB-4.2)
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Checksum: <span className="text-slate-600 font-semibold">{gatekeeper.checksum}</span>
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {gatekeeper.checks.map((chk) => (
                <div key={chk.id} className="p-3 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {chk.passed ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[12px] font-bold">
                        ✓
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[12px] font-bold">
                        ✗
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-slate-900">{chk.label}</span>
                      {chk.passed ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          Lolos
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                          Memblokir
                        </span>
                      )}
                    </div>
                    <p className={`text-[12px] mt-0.5 ${chk.passed ? 'text-slate-500' : 'text-rose-600 font-medium'}`}>
                      {chk.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Prinsip Persetujuan Dua Orang (Four-Eyes Principle PB-4.3) */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-bold text-slate-900">
                  3. Otorisasi & Persetujuan (Four-Eyes Principle)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Diunggah oleh: <span className="font-semibold text-slate-700">{uploader}</span>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                isFourEyesPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {isFourEyesPassed ? '✓ Lolos Four-Eyes' : '⚠️ Perlu Approver Berbeda'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Penerbit / Approver yang Bertindak:
                </label>
                <select
                  value={selectedApprover}
                  onChange={(e) => setSelectedApprover(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Budi (Finance Manager)">Budi (Finance Manager)</option>
                  <option value="Rudi (Head of Royalty)">Rudi (Head of Royalty)</option>
                  <option value="Sarah (Copyright Admin)">Sarah (Copyright Admin - Pengunggah)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Catatan Memo Rilis (Opsional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Laporan Mei 2026 telah diverifikasi..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Override Option for Head of Royalty if same as uploader */}
            {!isFourEyesPassed && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOverrideChecked}
                    onChange={(e) => setIsOverrideChecked(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-[12px]">
                    <span className="font-bold text-amber-900">
                      Gunakan Otoritas Khusus (Head of Royalty Override)
                    </span>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      Pengecualian ini akan dicatat secara permanen di Audit Log sebagai event BATCH_PUBLISH_OVERRIDE.
                    </p>
                  </div>
                </label>

                {isOverrideChecked && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Masukkan alasan otorisasi darurat (minimal 10 karakter)..."
                      className="w-full bg-white border border-amber-300 rounded-md px-3 py-1.5 text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Konfirmasi Legal & Tanggung Jawab */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAgreementChecked}
                onChange={(e) => setIsAgreementChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-[12px] text-slate-700 leading-snug">
                Saya menyatakan telah memeriksa rekonsiliasi keuangan, komposisi hak lagu, dan seluruh pengecualian. Saya mengonfirmasi royalti ini **sah untuk diterbitkan ke Portal & Akun Pencipta**.
              </span>
            </label>
          </div>
        </div>

        {/* ── Modal Footer ─────────────────────────────────────── */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {canSubmit ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Siap didistribusikan
              </span>
            ) : (
              <span className="text-slate-400">
                Lengkapi seluruh checklist dan centang persetujuan untuk melanjutkan.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmPublish}
              disabled={!canSubmit}
              className={`${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 text-white'
                  : 'bg-slate-200 text-slate-400 border-transparent cursor-not-allowed'
              }`}
              iconLeft={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              }
            >
              {isSubmitting ? 'Menerbitkan...' : 'Konfirmasi & Terbitkan Distribusi'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
