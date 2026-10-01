import React, { useState, useEffect } from 'react';
import { RoyaltyBatch, unpublishBatch } from '../../data/distributionEngine';
import { Button } from './Button';

export interface UnpublishModalProps {
  isOpen: boolean;
  batch: RoyaltyBatch | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const UnpublishModal: React.FC<UnpublishModalProps> = ({
  isOpen,
  batch,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [actor, setActor] = useState<string>('Rudi (Head of Royalty)');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setActor('Rudi (Head of Royalty)');
      setErrorMessage(null);
    }
  }, [isOpen, batch?.batchId]);

  if (!isOpen || !batch) return null;

  const affectedCreators = new Set(
    batch.distributions
      .filter((d) => !d.ipName.toLowerCase().includes('loka'))
      .map((d) => d.ipbaseNo || d.ipName)
  ).size;

  const isReasonValid = reason.trim().length >= 15;
  const canSubmit = isReasonValid && !isSubmitting;

  const handleConfirmUnpublish = () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const res = unpublishBatch(batch.batchId, actor, reason.trim());
    if (res.success) {
      setIsSubmitting(false);
      onSuccess();
    } else {
      setIsSubmitting(false);
      setErrorMessage(res.error || 'Gagal menarik kembali distribusi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-[16px] shadow-2xl border border-rose-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-rose-100 bg-rose-50/50 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-bold text-slate-900">
              Tarik Kembali Distribusi (Unpublish)
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Batch: <span className="font-semibold text-slate-700">{batch.fileName}</span> ({batch.period})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-700 text-sm">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[12px]">
              {errorMessage}
            </div>
          )}

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-[12px] text-amber-900">
            <div className="font-bold flex items-center gap-1.5">
              <span>⚠️</span> Dampak Penarikan Kembali (PB-4.4):
            </div>
            <ul className="list-disc pl-4 space-y-1 text-amber-800">
              <li>
                Data royalti akan <strong>seketika ditarik dari Portal Pencipta</strong>.
              </li>
              <li>
                Saldo sebanyak <strong>{affectedCreators} pencipta</strong> akan kembali ke saldo sebelum batch ini terbit.
              </li>
              <li>
                Status batch akan kembali ke <strong>Siap Terbit (Ready to Publish)</strong>.
              </li>
            </ul>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Otoritas Pembatalan:
            </label>
            <select
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="Rudi (Head of Royalty)">Rudi (Head of Royalty)</option>
              <option value="Budi (Finance Manager)">Budi (Finance Manager)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12px] font-semibold text-slate-700">
                Alasan Penarikan Kembali <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] ${reason.trim().length >= 15 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                {reason.trim().length}/15 karakter minimum
              </span>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Contoh: Ditemukan revisi data klaim dari YouTube CMS untuk penyesuaian split..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleConfirmUnpublish}
            disabled={!canSubmit}
            className={`${
              canSubmit
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-md shadow-rose-500/20'
                : 'bg-slate-100 text-slate-400 border-transparent cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Memproses...' : 'Tarik Kembali dari Pencipta'}
          </Button>
        </div>
      </div>
    </div>
  );
};
