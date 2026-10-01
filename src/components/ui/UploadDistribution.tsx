import React, { useState, useCallback, useRef } from 'react';
import { Card } from './Card';
import { Typography } from './Typography';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';
import {
  DSPCode,
  DSP_CONFIGS,
  DSPReportRow,
  RoyaltyBatch,
  processBatch,
  autoRegisterFromReport,
  autoRegisterRightsFromReport,
  getReconciliation,
  getMemberSummaries,
  ReconciliationReport,
  MemberSummary,
  MatchedSourceRow,
} from '../../data/distributionEngine';

// ─── Excel Parser Utility ─────────────────────────────
async function parseExcelFile(file: File): Promise<Record<string, any>[][]> {
  // Use dynamic import for xlsx
  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheets: Record<string, any>[][] = [];
        for (const name of wb.SheetNames) {
          const ws = wb.Sheets[name];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          sheets.push(rows);
        }
        resolve(sheets);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── Main Component ───────────────────────────────────
export interface UploadDistributionProps {
  onBatchProcessed?: (batch: RoyaltyBatch) => void;
  onBack?: () => void;
}

type Step = 'select-dsp' | 'upload' | 'preview' | 'processing' | 'results';

export const UploadDistribution: React.FC<UploadDistributionProps> = ({
  onBatchProcessed,
  onBack,
}) => {
  const [step, setStep] = useState<Step>('select-dsp');
  const [selectedDsp, setSelectedDsp] = useState<DSPCode | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [period, setPeriod] = useState('');
  const [parsedRows, setParsedRows] = useState<DSPReportRow[]>([]);
  const [rawPreview, setRawPreview] = useState<any[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [allSheets, setAllSheets] = useState<any[][][]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [batch, setBatch] = useState<RoyaltyBatch | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [memberSummaries, setMemberSummaries] = useState<MemberSummary[]>([]);
  const [autoRegisterResults, setAutoRegisterResults] = useState<{ assets: { registered: number; skipped: number }; rights: { registered: number; skipped: number } } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUnmatched, setExpandedUnmatched] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) =>
    'Rp ' + Math.round(val).toLocaleString('id-ID');

  // ─── Step 1: Select DSP ──────────────────────────────
  const handleSelectDsp = (dsp: DSPCode) => {
    setSelectedDsp(dsp);
    setStep('upload');
    setError(null);
  };

  // ─── Step 2: Upload File ─────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const sheets: any[][][] = [];
          for (const name of wb.SheetNames) {
            const ws = wb.Sheets[name];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            sheets.push(rows);
          }
          setAllSheets(sheets);
          setSheetNames(wb.SheetNames);
          if (sheets.length > 0) {
            setRawPreview(sheets[0].slice(0, 20));
          }
        } catch (err) {
          setError('Gagal membaca file Excel. Pastikan format file benar.');
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      setError('Gagal memuat parser Excel.');
    }
  };

  const handlePreview = () => {
    if (!file || allSheets.length === 0) {
      setError('Silakan unggah file terlebih dahulu.');
      return;
    }
    if (!period.trim()) {
      setError('Silakan isi periode laporan (contoh: Mei 2026).');
      return;
    }

    const sheetData = allSheets[selectedSheet];
    if (!sheetData || sheetData.length < 2) {
      setError('Sheet tidak memiliki data yang cukup.');
      return;
    }

    // Find header row (look for common column names)
    let headerIdx = headerRowIndex;
    const config = DSP_CONFIGS[selectedDsp!];
    
    // Try to auto-detect header row
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
      const row = sheetData[i];
      if (row && row.some((cell: any) => {
        const cellStr = String(cell || '').toLowerCase();
        return cellStr.includes('asset') || cellStr.includes('income') || cellStr.includes('revenue') || cellStr.includes('custom id');
      })) {
        headerIdx = i;
        break;
      }
    }
    setHeaderRowIndex(headerIdx);

    const headers = sheetData[headerIdx].map((h: any) => String(h || '').trim());
    
    // Map columns
    const findCol = (name: string): number => {
      const lower = name.toLowerCase();
      return headers.findIndex((h: string) => h.toLowerCase().includes(lower) || h.toLowerCase() === lower);
    };

    const assetIdCol = findCol(config.assetIdColumn);
    const songIdCol = findCol(config.songIdColumn);
    const incomeRevCol = findCol(config.incomeRevColumn);
    const idrRevCol = findCol(config.idrRevColumn);
    const dayCol = findCol(config.dayColumn);
    const countryCol = findCol(config.countryColumn);
    const rightTypeCol = findCol(config.rightTypeColumn);
    const adjustmentCol = findCol(config.adjustmentTypeColumn);
    const writersCol = findCol(config.writersColumn);
    const titleCol = findCol(config.songTitleColumn);

    // Parse data rows
    const rows: DSPReportRow[] = [];
    for (let i = headerIdx + 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row || row.length === 0) continue;

      const incomeRev = Number(row[incomeRevCol] || 0);
      if (incomeRev === 0 && !row[assetIdCol >= 0 ? assetIdCol : 0]) continue;

      rows.push({
        rowIndex: i,
        assetId: String(row[assetIdCol >= 0 ? assetIdCol : 0] || ''),
        customId: String(row[songIdCol >= 0 ? songIdCol : 0] || ''),
        day: String(row[dayCol >= 0 ? dayCol : 0] || ''),
        country: String(row[countryCol >= 0 ? countryCol : 0] || ''),
        rightType: String(row[rightTypeCol >= 0 ? rightTypeCol : 0] || 'Mechanical'),
        adjustmentType: String(row[adjustmentCol >= 0 ? adjustmentCol : 0] || 'None'),
        incomeRev: incomeRev,
        idrRev: Number(row[idrRevCol >= 0 ? idrRevCol : 0] || 0),
        writers: String(row[writersCol >= 0 ? writersCol : 0] || ''),
        songTitle: titleCol >= 0 ? String(row[titleCol] || '') : undefined,
      });
    }

    if (rows.length === 0) {
      setError('Tidak ada baris data valid yang ditemukan. Periksa format kolom dan sheet yang dipilih.');
      return;
    }

    setParsedRows(rows);
    setStep('preview');
    setError(null);
  };

  // ─── Step 3: Process Distribution ────────────────────
  const handleProcess = async () => {
    if (!selectedDsp || parsedRows.length === 0) return;
    
    setIsProcessing(true);
    setStep('processing');
    setError(null);

    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Auto-register assets and rights from the report
      const assetResult = autoRegisterFromReport(selectedDsp, parsedRows);
      const rightsResult = autoRegisterRightsFromReport(parsedRows);
      setAutoRegisterResults({ assets: assetResult, rights: rightsResult });

      // Process the batch
      const result = processBatch(selectedDsp, period, file?.name || 'unknown', parsedRows);
      setBatch(result);

      // Get reconciliation
      const recon = getReconciliation(result.batchId);
      setReconciliation(recon);

      // Get member summaries
      const summaries = getMemberSummaries(result.batchId);
      setMemberSummaries(summaries);

      setStep('results');
      onBatchProcessed?.(result);
    } catch (err) {
      setError('Terjadi kesalahan saat memproses distribusi.');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Reset ───────────────────────────────────────────
  const handleReset = () => {
    setStep('select-dsp');
    setSelectedDsp(null);
    setFile(null);
    setPeriod('');
    setParsedRows([]);
    setRawPreview([]);
    setBatch(null);
    setReconciliation(null);
    setMemberSummaries([]);
    setAutoRegisterResults(null);
    setError(null);
    setExpandedUnmatched(null);
  };

  // ─── DSP Selection Cards ────────────────────────────
  const dspOptions: { code: DSPCode; icon: string; color: string; bgColor: string }[] = [
    { code: 'YOUTUBE', icon: '▶', color: '#EF4444', bgColor: '#FEF2F2' },
    { code: 'SPOTIFY', icon: '●', color: '#22C55E', bgColor: '#F0FDF4' },
    { code: 'APPLE_MUSIC', icon: '♫', color: '#F97316', bgColor: '#FFF7ED' },
    { code: 'OTHER', icon: '◆', color: '#6366F1', bgColor: '#EEF2FF' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors w-fit cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded py-1 px-2 -ml-2"
          >
            <span>←</span> Kembali ke Dashboard
          </button>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Typography variant="heading-1">Upload Distribusi</Typography>
            <Typography variant="body" color="secondary" className="mt-1">
              Unggah laporan DSP, jalankan pencocokan 3 tahap, dan distribusikan royalti ke pencipta
            </Typography>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-1.5">
            {(['select-dsp', 'upload', 'preview', 'results'] as Step[]).map((s, i) => {
              const labels = ['Pilih DSP', 'Unggah', 'Pratinjau', 'Hasil'];
              const stepIdx = ['select-dsp', 'upload', 'preview', 'processing', 'results'].indexOf(step);
              const currentIdx = i;
              const isActive = stepIdx >= currentIdx || (step === 'processing' && currentIdx <= 2);
              const isCurrent = step === s || (step === 'processing' && s === 'preview');

              return (
                <React.Fragment key={s}>
                  {i > 0 && (
                    <div className={`w-8 h-px ${isActive ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'}`} />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                      isCurrent
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : isActive
                        ? 'bg-[#EFF6FF] text-[#2563EB]'
                        : 'bg-[#F3F4F6] text-[#9CA3AF]'
                    }`}
                  >
                    <span>{i + 1}</span>
                    <span className="hidden sm:inline">{labels[i]}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-4 py-3 flex items-start gap-3">
          <span className="text-[#EF4444] text-lg shrink-0">⚠</span>
          <div>
            <p className="text-[14px] font-semibold text-[#991B1B]">Terjadi Kesalahan</p>
            <p className="text-[13px] text-[#B91C1C] mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-[#EF4444] hover:text-[#B91C1C] p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* STEP 1: SELECT DSP                              */}
      {/* ═══════════════════════════════════════════════ */}
      {step === 'select-dsp' && (
        <div className="space-y-4">
          <Card className="p-6">
            <Typography variant="heading-2" className="mb-2">
              Pilih Platform DSP
            </Typography>
            <Typography variant="body" color="secondary" className="mb-6 text-[13px]">
              Pilih Digital Service Provider (DSP) yang sesuai dengan laporan yang akan diunggah.
              Setiap DSP memiliki format kolom berbeda.
            </Typography>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {dspOptions.map((opt) => {
                const config = DSP_CONFIGS[opt.code];
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => handleSelectDsp(opt.code)}
                    className="group relative p-5 rounded-[12px] border-2 border-[#E5E7EB] bg-white hover:border-[#2563EB] hover:shadow-md transition-all duration-200 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: opt.bgColor, color: opt.color }}
                    >
                      <span className="text-xl font-bold">{opt.icon}</span>
                    </div>

                    <h3 className="text-[16px] font-semibold text-[#111827] mb-1">
                      {config.label}
                    </h3>
                    <p className="text-[12px] text-[#6B7280] leading-relaxed">
                      {config.description}
                    </p>

                    {/* Arrow */}
                    <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-[#F3F4F6] group-hover:bg-[#EFF6FF] flex items-center justify-center transition-colors">
                      <span className="text-[#9CA3AF] group-hover:text-[#2563EB] text-xs">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* STEP 2: UPLOAD FILE                             */}
      {/* ═══════════════════════════════════════════════ */}
      {step === 'upload' && selectedDsp && (
        <div className="space-y-4">
          {/* DSP Info Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFF6FF] border border-[#93A8F0] text-[13px] font-medium text-[#2563EB]">
            <span>DSP:</span>
            <span className="font-bold">{DSP_CONFIGS[selectedDsp].label}</span>
            <button
              onClick={() => { setSelectedDsp(null); setStep('select-dsp'); }}
              className="ml-1 text-[#93A8F0] hover:text-[#2563EB]"
            >
              ✕
            </button>
          </div>

          <Card className="p-6">
            <Typography variant="heading-2" className="mb-2">
              Unggah File Laporan
            </Typography>
            <Typography variant="body" color="secondary" className="mb-6 text-[13px]">
              Upload file laporan distribusi dari {DSP_CONFIGS[selectedDsp].label}. Format yang didukung: .xlsx, .xls, .csv
            </Typography>

            {/* Period Input */}
            <div className="mb-5">
              <label className="block text-[13px] font-semibold text-[#111827] mb-1.5">
                Periode Laporan <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="Contoh: Mei 2026"
                className="w-full max-w-xs h-10 px-4 rounded-[8px] border border-[#E5E7EB] bg-white text-[14px] text-[#111827] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all"
              />
            </div>

            {/* File Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) {
                  setFile(droppedFile);
                  const event = { target: { files: [droppedFile] } } as any;
                  handleFileChange(event);
                }
              }}
              className={`border-2 border-dashed rounded-[12px] p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                file
                  ? 'border-[#22C55E] bg-[#F0FDF4]'
                  : 'border-[#D1D5DB] bg-[#FAFAFA] hover:border-[#2563EB] hover:bg-[#EFF6FF]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#22C55E] text-white flex items-center justify-center mb-3">
                    <span className="text-xl">✓</span>
                  </div>
                  <p className="text-[14px] font-semibold text-[#111827]">{file.name}</p>
                  <p className="text-[12px] text-[#6B7280] mt-1">
                    {(file.size / 1024).toFixed(1)} KB · Klik untuk mengganti file
                  </p>
                  {allSheets.length > 0 && (
                    <p className="text-[12px] text-[#22C55E] font-medium mt-2">
                      ✓ {allSheets.length} sheet terdeteksi · {allSheets[selectedSheet]?.length || 0} baris
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#E5E7EB] text-[#6B7280] flex items-center justify-center mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-semibold text-[#111827]">
                    Klik atau seret file ke sini
                  </p>
                  <p className="text-[12px] text-[#6B7280] mt-1">
                    Format: .xlsx, .xls, .csv (maks 50MB)
                  </p>
                </>
              )}
            </div>

            {/* Sheet Selector (if multiple sheets) */}
            {sheetNames.length > 1 && (
              <div className="mt-4">
                <label className="block text-[13px] font-semibold text-[#111827] mb-1.5">
                  Pilih Sheet
                </label>
                <div className="flex flex-wrap gap-2">
                  {sheetNames.map((name, idx) => (
                    <button
                      key={name}
                      onClick={() => {
                        setSelectedSheet(idx);
                        setRawPreview(allSheets[idx]?.slice(0, 20) || []);
                      }}
                      className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-all ${
                        selectedSheet === idx
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Preview Table */}
            {rawPreview.length > 0 && (
              <div className="mt-5 overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                <table className="w-full border-collapse text-[12px]">
                  <tbody>
                    {rawPreview.slice(0, 8).map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx === headerRowIndex ? 'bg-[#EFF6FF] font-semibold' : rIdx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}>
                        <td className="px-2 py-1.5 text-[#9CA3AF] border-r border-[#E5E7EB] w-8 text-center">
                          {rIdx}
                        </td>
                        {(row as any[]).slice(0, 10).map((cell, cIdx) => (
                          <td key={cIdx} className="px-2 py-1.5 border-r border-[#E5E7EB] max-w-[120px] truncate text-[#111827]">
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStep('select-dsp')}
              >
                ← Kembali
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePreview}
              >
                Lanjut: Pratinjau Data →
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* STEP 3: PREVIEW PARSED DATA                     */}
      {/* ═══════════════════════════════════════════════ */}
      {step === 'preview' && parsedRows.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <span className="text-[12px] text-[#6B7280] font-medium">DSP</span>
              <p className="text-[18px] font-bold text-[#111827] mt-1">
                {DSP_CONFIGS[selectedDsp!].label}
              </p>
            </Card>
            <Card className="p-4">
              <span className="text-[12px] text-[#6B7280] font-medium">Periode</span>
              <p className="text-[18px] font-bold text-[#111827] mt-1">{period}</p>
            </Card>
            <Card className="p-4">
              <span className="text-[12px] text-[#6B7280] font-medium">Total Baris Data</span>
              <p className="text-[18px] font-bold text-[#111827] mt-1">
                {parsedRows.length.toLocaleString('id-ID')}
              </p>
            </Card>
            <Card className="p-4">
              <span className="text-[12px] text-[#6B7280] font-medium">Total Income Rev</span>
              <p className="text-[18px] font-bold text-[#111827] mt-1">
                {formatCurrency(parsedRows.reduce((s, r) => s + r.incomeRev, 0))}
              </p>
            </Card>
          </div>

          {/* Preview Table */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Typography variant="heading-2">Pratinjau Data Terparsing</Typography>
                <Typography variant="body" color="secondary" className="text-[13px]">
                  Menampilkan 20 baris pertama. Total: {parsedRows.length} baris.
                </Typography>
              </div>
              <span className="text-[12px] font-semibold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-md">
                ✓ Siap Diproses
              </span>
            </div>

            <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="h-10 bg-[#FAFAFA] border-b border-[#E5E7EB] text-[12px] font-semibold text-[#4B5563]">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Asset ID</th>
                    <th className="px-3 py-2">Custom ID</th>
                    <th className="px-3 py-2">Writers</th>
                    <th className="px-3 py-2">Country</th>
                    <th className="px-3 py-2">Right Type</th>
                    <th className="px-3 py-2 text-right">Income Rev</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {parsedRows.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
                      <td className="px-3 py-2 text-[#9CA3AF] text-center">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-[#111827] max-w-[140px] truncate">{row.assetId}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-[#2563EB]">{row.customId}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate">{row.writers}</td>
                      <td className="px-3 py-2 text-center">{row.country}</td>
                      <td className="px-3 py-2">{row.rightType}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{row.incomeRev.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setStep('upload')}>
                ← Kembali
              </Button>
              <Button variant="primary" size="sm" onClick={handleProcess}>
                🚀 Jalankan Distribusi 3 Tahap
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* STEP 3.5: PROCESSING                            */}
      {/* ═══════════════════════════════════════════════ */}
      {step === 'processing' && (
        <Card className="p-10 text-center">
          <div className="flex flex-col items-center gap-4">
            {/* Animated Spinner */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-[#E5E7EB]" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#2563EB] animate-spin" />
            </div>
            <div>
              <Typography variant="heading-2">Memproses Distribusi...</Typography>
              <Typography variant="body" color="secondary" className="mt-2 text-[13px]">
                Menjalankan pencocokan 3 tahap (Asset ID → IPBASE NO → Song ID)
                <br />dan menghitung distribusi royalti untuk {parsedRows.length.toLocaleString()} baris data
              </Typography>
            </div>
            {/* Progress steps */}
            <div className="flex flex-col items-start gap-2 mt-4 text-[13px]">
              <div className="flex items-center gap-2 text-[#22C55E]">
                <span>✓</span> Tahap 1: Validasi Asset ID per DSP
              </div>
              <div className="flex items-center gap-2 text-[#22C55E]">
                <span>✓</span> Tahap 2: Pencocokan IPBASE NO pencipta
              </div>
              <div className="flex items-center gap-2 text-[#2563EB] animate-pulse">
                <span>⟳</span> Tahap 3: Verifikasi Submitter Work ID
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* STEP 4: RESULTS                                 */}
      {/* ═══════════════════════════════════════════════ */}
      {step === 'results' && batch && (
        <div className="space-y-5">
          {/* Auto-registration Results */}
          {autoRegisterResults && (
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] px-4 py-3">
              <p className="text-[13px] font-semibold text-[#1E40AF]">ℹ️ Auto-Registrasi dari Laporan</p>
              <p className="text-[12px] text-[#1E3A8A] mt-1">
                Asset ID baru didaftarkan: <b>{autoRegisterResults.assets.registered}</b> · 
                Komposisi hak baru: <b>{autoRegisterResults.rights.registered}</b> · 
                Sudah ada: <b>{autoRegisterResults.assets.skipped + autoRegisterResults.rights.skipped}</b>
              </p>
            </div>
          )}

          {/* Reconciliation Summary Cards */}
          {reconciliation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`rounded-[8px] p-5 flex flex-col justify-between h-[132px] border shadow-sm ${
                reconciliation.isBalanced
                  ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                  : 'bg-[#FEF2F2] border-[#FECACA]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#4B5563]">Rekonsiliasi</span>
                  <span className={`text-xl ${reconciliation.isBalanced ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {reconciliation.isBalanced ? '✓' : '⚠'}
                  </span>
                </div>
                <div>
                  <span className={`text-[20px] font-bold ${reconciliation.isBalanced ? 'text-[#166534]' : 'text-[#991B1B]'}`}>
                    {reconciliation.isBalanced ? 'SEIMBANG' : 'SELISIH'}
                  </span>
                  <span className="text-[12px] text-[#6B7280] mt-0.5 block">
                    Selisih: {formatCurrency(reconciliation.difference)}
                  </span>
                </div>
              </div>

              <Card className="p-5 flex flex-col justify-between h-[132px]">
                <span className="text-[13px] font-medium text-[#4B5563]">Total Sumber</span>
                <div>
                  <span className="text-[22px] font-bold text-[#111827] tabular-nums">
                    {formatCurrency(reconciliation.totalSourceRevenue)}
                  </span>
                  <span className="text-[12px] text-[#6B7280] mt-0.5 block">
                    {batch.totalRows.toLocaleString()} baris laporan
                  </span>
                </div>
              </Card>

              <Card className="p-5 flex flex-col justify-between h-[132px]">
                <span className="text-[13px] font-medium text-[#4B5563]">Total Terdistribusi</span>
                <div>
                  <span className="text-[22px] font-bold text-[#059669] tabular-nums">
                    {formatCurrency(reconciliation.totalDistributedRevenue)}
                  </span>
                  <span className="text-[12px] text-[#6B7280] mt-0.5 block">
                    {batch.distributions.length.toLocaleString()} baris distribusi
                  </span>
                </div>
              </Card>

              <Card className="p-5 flex flex-col justify-between h-[132px]">
                <span className="text-[13px] font-medium text-[#4B5563]">Status Pencocokan</span>
                <div>
                  <div className="flex items-center gap-3 text-[13px]">
                    <span className="text-[#22C55E] font-bold">✓ {batch.matchedRows}</span>
                    <span className="text-[#EF4444] font-bold">✗ {batch.unmatchedRows}</span>
                    <span className="text-[#F59E0B] font-bold">⚡ {batch.conflictRows}</span>
                  </div>
                  {reconciliation.unmatchedCount > 0 && (
                    <div className="text-[11px] text-[#6B7280] mt-1">
                      Tahap 1: {reconciliation.unmatchedByStage.stage1} · 
                      Tahap 2: {reconciliation.unmatchedByStage.stage2} · 
                      Tahap 3: {reconciliation.unmatchedByStage.stage3}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Matching Progress Bar */}
          {batch && (
            <Card className="p-5">
              <Typography variant="heading-2" className="mb-3">Hasil Pencocokan 3 Tahap</Typography>
              <div className="w-full h-6 bg-[#F3F4F6] rounded-full overflow-hidden flex">
                {batch.matchedRows > 0 && (
                  <div
                    className="h-full bg-[#22C55E] flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ width: `${(batch.matchedRows / batch.totalRows) * 100}%` }}
                  >
                    {((batch.matchedRows / batch.totalRows) * 100).toFixed(0)}%
                  </div>
                )}
                {batch.unmatchedRows > 0 && (
                  <div
                    className="h-full bg-[#EF4444] flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ width: `${(batch.unmatchedRows / batch.totalRows) * 100}%` }}
                  >
                    {((batch.unmatchedRows / batch.totalRows) * 100).toFixed(0)}%
                  </div>
                )}
                {batch.conflictRows > 0 && (
                  <div
                    className="h-full bg-[#F59E0B] flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ width: `${(batch.conflictRows / batch.totalRows) * 100}%` }}
                  >
                    {((batch.conflictRows / batch.totalRows) * 100).toFixed(0)}%
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6 mt-3 text-[12px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#22C55E]" /> Matched ({batch.matchedRows})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#EF4444]" /> Unmatched ({batch.unmatchedRows})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#F59E0B]" /> Konflik ({batch.conflictRows})
                </span>
              </div>
            </Card>
          )}

          {/* Member Distribution Summary */}
          {memberSummaries.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Typography variant="heading-2">Distribusi per Pencipta</Typography>
                  <Typography variant="body" color="secondary" className="text-[13px]">
                    Hasil grouping per IPBASE NO · {memberSummaries.length} pemegang hak
                  </Typography>
                </div>
                <span className="text-[12px] font-semibold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-md">
                  Terdistribusi
                </span>
              </div>

              <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                <table className="w-full border-collapse text-[14px]">
                  <thead>
                    <tr className="h-11 bg-[#FAFAFA] border-b border-[#E5E7EB] text-[13px] font-semibold text-[#4B5563]">
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2 text-left">Pemegang Hak</th>
                      <th className="px-4 py-2">IPBASE NO</th>
                      <th className="px-4 py-2 text-right">Jumlah Lagu</th>
                      <th className="px-4 py-2 text-right">Total Distribusi (Rp)</th>
                      <th className="px-4 py-2 text-right">% dari Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {memberSummaries.map((ms, idx) => {
                      const pct = batch.totalDistributed > 0
                        ? ((ms.totalRevenue / batch.totalDistributed) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={ms.ipbaseNo} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}>
                          <td className="px-4 py-3 text-center text-[12px] text-[#9CA3AF]">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-[#111827]">{ms.ipName}</td>
                          <td className="px-4 py-3 text-center font-mono text-[12px] text-[#6B7280]">{ms.ipbaseNo}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{ms.songCount}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#111827] tabular-nums">
                            {formatCurrency(ms.totalRevenue)}
                          </td>
                          <td className="px-4 py-3 text-right text-[#4B5563] tabular-nums">{pct}%</td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="bg-[#111827] text-white font-semibold">
                      <td className="px-4 py-3" colSpan={4}>TOTAL DISTRIBUSI</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(batch.totalDistributed)}
                      </td>
                      <td className="px-4 py-3 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Unmatched Rows Detail */}
          {batch.unmatchedRows + batch.conflictRows > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Typography variant="heading-2">Baris Tidak Cocok</Typography>
                  <Typography variant="body" color="secondary" className="text-[13px]">
                    {batch.unmatchedRows + batch.conflictRows} baris gagal pencocokan · Perlu diperbaiki oleh admin
                  </Typography>
                </div>
                <span className="text-[12px] font-semibold text-[#DC2626] bg-[#FEF2F2] px-2.5 py-1 rounded-md">
                  Perlu Tindakan
                </span>
              </div>

              <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="h-10 bg-[#FEF2F2] border-b border-[#FECACA] text-[12px] font-semibold text-[#991B1B]">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2 text-left">Asset ID</th>
                      <th className="px-3 py-2 text-left">Custom ID</th>
                      <th className="px-3 py-2 text-left">Writers</th>
                      <th className="px-3 py-2 text-center">Tahap Gagal</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-right">Income Rev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {batch.sourceRows
                      .filter((r: MatchedSourceRow) => r.matchStatus !== 'matched')
                      .slice(0, 50)
                      .map((row: MatchedSourceRow, idx: number) => (
                        <React.Fragment key={row.rowId}>
                          <tr
                            className={`cursor-pointer hover:bg-[#FEF2F2] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                            onClick={() => setExpandedUnmatched(expandedUnmatched === row.rowId ? null : row.rowId)}
                          >
                            <td className="px-3 py-2 text-center text-[#9CA3AF]">{idx + 1}</td>
                            <td className="px-3 py-2 font-mono text-[11px] max-w-[120px] truncate">{row.originalRow.assetId}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-[#2563EB]">{row.originalRow.customId}</td>
                            <td className="px-3 py-2 max-w-[140px] truncate">{row.originalRow.writers}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                row.failedStage === 1
                                  ? 'bg-[#FEE2E2] text-[#EF4444]'
                                  : row.failedStage === 2
                                  ? 'bg-[#FEF3C7] text-[#D97706]'
                                  : 'bg-[#FDE68A] text-[#92400E]'
                              }`}>
                                Tahap {row.failedStage}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                row.matchStatus === 'conflict'
                                  ? 'bg-[#FEF3C7] text-[#D97706]'
                                  : 'bg-[#FEE2E2] text-[#DC2626]'
                              }`}>
                                {row.matchStatus === 'conflict' ? 'Konflik' : 'Unmatched'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold">
                              {row.originalRow.incomeRev.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                          {expandedUnmatched === row.rowId && (
                            <tr className="bg-[#FEF2F2]">
                              <td colSpan={7} className="px-4 py-3">
                                <div className="text-[12px] text-[#991B1B]">
                                  <p className="font-semibold mb-1">Alasan Kegagalan:</p>
                                  <p>{row.failureReason}</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleReset}>
              ↻ Upload Batch Baru
            </Button>
            {onBack && (
              <Button variant="primary" size="sm" onClick={onBack}>
                ← Kembali ke Dashboard
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
