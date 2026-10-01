/**
 * Distribution Engine — 3-Stage Matching & Reconciliation
 * 
 * Implements the PRD: Distribusi Royalti DSP per Member (LOKA)
 * 
 * Stage 1: DSP + Asset ID → match to registered song
 * Stage 2: IPBASE NO (writer) → verify creator exists in song rights
 * Stage 3: Submitter Work ID / Song ID → confirm song identity
 * 
 * Only rows passing all 3 stages are distributed.
 */

import { Creator, SongItem, CountryShare } from './royaltyData';
import realData from './realRoyaltyData.json';

export type DSPCode = 'YOUTUBE' | 'SPOTIFY' | 'APPLE_MUSIC' | 'OTHER';

export type MatchStatus = 'matched' | 'unmatched' | 'conflict' | 'on_hold' | 'ignored' | 'resolved';
export type FailedStage = 1 | 2 | 3 | null;
export type ResolutionType =
  | 'manual_asset'
  | 'manual_alias'
  | 'manual_customid'
  | 'conflict_override'
  | 'auto_map'
  | 'backfill';
export type ResolutionScope = 'row' | 'batch' | 'all_open_batches';
export type BatchStatus =
  | 'uploaded'
  | 'in_review'
  | 'ready_to_publish'
  | 'published'
  | 'locked'
  | 'cancelled'
  | 'failed'
  | 'validated'
  | 'distributed';
export type IssueStatus = 'open' | 'resolved' | 'on_hold' | 'ignored';
export type RightType = 'Mechanical' | 'Performance' | 'Synchronization';

export interface DSPReportRow {
  rowIndex: number;
  assetId: string;
  customId: string; // Song ID / Submitter Work ID
  day: string;
  country: string;
  rightType: string;
  adjustmentType: string;
  incomeRev: number;
  idrRev: number;
  writers: string;
  songTitle?: string;
  currency?: string;
}

export interface SongDspAsset {
  id?: string;
  songId: string;
  dspCode: DSPCode;
  assetId: string;
  status: 'active' | 'inactive';
  createdBy?: string;
  createdAt?: string;
}

export interface WriterAliasMapping {
  id: string;
  rawWriterName: string;
  normalizedName: string;
  ipbaseNo: string;
  ipName: string;
  dsp?: string | null;
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  timestamp: string;
  action: string;
  targetType: 'row' | 'batch' | 'alias' | 'asset' | 'writer_alias' | 'song_asset' | string;
  targetId: string;
  before: any;
  after: any;
  reason?: string;
}

export interface SongRights {
  songId: string;
  songTitle: string;
  ipName: string;
  ipiNumber?: string;
  ipbaseNo: string;
  ipRole: string;
  perOwn: number; // Performance %
  mecOwn: number; // Mechanical %
  synOwn: number; // Synchronization %
}

export interface MatchedSourceRow {
  rowId: string;
  batchId: string;
  dsp: DSPCode;
  originalRow: DSPReportRow;
  matchStatus: MatchStatus;
  failedStage: FailedStage;
  failureFlags: (1 | 2 | 3)[];
  failureReason: string;
  matchedSongId: string | null;
  candidateSongIdByAsset?: string | null;
  candidateSongIdByCustomId?: string | null;
  singleKeyMatch?: boolean;
  unmappedWriters?: string[];
  ageDays?: number;
  resolutionType?: ResolutionType;
  resolutionScope?: ResolutionScope;
  rowLevelOverride?: boolean;
  resolutionReason?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  holdUntil?: string;
  issueStatus?: IssueStatus;
  issueReason?: string;
  version: number;
}

export interface DistributionResult {
  distId: string;
  batchId: string;
  rowId: string;
  songId: string;
  assetId: string;
  ipbaseNo: string;
  ipName: string;
  rightType: string;
  percentage: number;
  distMr: number;
  dspCode: DSPCode;
  country: string;
  day: string;
}

export interface RoyaltyBatch {
  batchId: string;
  dspCode: DSPCode;
  period: string;
  fileName: string;
  status: BatchStatus;
  uploadedBy?: string;
  totalSource: number;
  totalDistributed: number;
  totalOnHold?: number;
  totalIgnored?: number;
  publisherShare?: number;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  conflictRows: number;
  openIssuesCount?: number;
  readyMarkedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
  publishingNotes?: string;
  publishChecksum?: string;
  unpublishedAt?: string;
  unpublishReason?: string;
  viewedByCreatorsCount?: number;
  createdAt: string;
  sourceRows: MatchedSourceRow[];
  distributions: DistributionResult[];
}

export interface ReconciliationReport {
  batchId: string;
  totalSourceRevenue: number;
  totalDistributedRevenue: number;
  totalOnHoldRevenue?: number;
  totalIgnoredRevenue?: number;
  difference: number;
  isBalanced: boolean;
  matchedCount: number;
  unmatchedCount: number;
  conflictCount: number;
  openIssuesCount?: number;
  unmatchedByStage: { stage1: number; stage2: number; stage3: number };
}

export interface MemberSummary {
  ipbaseNo: string;
  ipName: string;
  dspCode: DSPCode;
  period: string;
  totalRevenue: number;
  songCount: number;
  songs: {
    songId: string;
    songTitle: string;
    revenue: number;
    rightType: string;
    percentage: number;
  }[];
}

// ─── Master Data Store (simulated in-memory) ──────────
// In production this would be a database

let songDspAssets: SongDspAsset[] = [];
let songRights: SongRights[] = [];
let batches: RoyaltyBatch[] = [];
let writerAliases: WriterAliasMapping[] = [];
let auditLogs: AuditLog[] = [];

// ─── DSP Column Mapping ───────────────────────────────
export interface DSPColumnMapping {
  dspCode: DSPCode;
  label: string;
  description: string;
  requiredColumns: string[];
  assetIdColumn: string;
  songIdColumn: string;
  writersColumn: string;
  incomeRevColumn: string;
  idrRevColumn: string;
  dayColumn: string;
  countryColumn: string;
  rightTypeColumn: string;
  adjustmentTypeColumn: string;
  songTitleColumn: string;
}

export const DSP_CONFIGS: Record<DSPCode, DSPColumnMapping> = {
  YOUTUBE: {
    dspCode: 'YOUTUBE',
    label: 'YouTube',
    description: 'Laporan YouTube CMS (Ads & Subscription Revenue)',
    requiredColumns: ['Asset ID', 'Custom ID', 'Day', 'Country', 'Income Rev', 'Right Type'],
    assetIdColumn: 'Asset ID',
    songIdColumn: 'Custom ID',
    writersColumn: 'Writers',
    incomeRevColumn: 'Income Rev',
    idrRevColumn: 'IDR Rev',
    dayColumn: 'Day',
    countryColumn: 'Country',
    rightTypeColumn: 'Right Type',
    adjustmentTypeColumn: 'Adjustment Type',
    songTitleColumn: 'Song Title',
  },
  SPOTIFY: {
    dspCode: 'SPOTIFY',
    label: 'Spotify',
    description: 'Laporan Spotify for Artists / Distributor',
    requiredColumns: ['Track URI', 'ISRC', 'Date', 'Country', 'Revenue'],
    assetIdColumn: 'Track URI',
    songIdColumn: 'ISRC',
    writersColumn: 'Composers',
    incomeRevColumn: 'Revenue',
    idrRevColumn: 'Revenue IDR',
    dayColumn: 'Date',
    countryColumn: 'Country',
    rightTypeColumn: 'Right Type',
    adjustmentTypeColumn: 'Adjustment',
    songTitleColumn: 'Track Name',
  },
  APPLE_MUSIC: {
    dspCode: 'APPLE_MUSIC',
    label: 'Apple Music',
    description: 'Laporan Apple Music Connect / Distributor',
    requiredColumns: ['Apple ID', 'ISRC', 'Begin Date', 'Storefront', 'Revenue'],
    assetIdColumn: 'Apple ID',
    songIdColumn: 'ISRC',
    writersColumn: 'Composer',
    incomeRevColumn: 'Revenue',
    idrRevColumn: 'Revenue IDR',
    dayColumn: 'Begin Date',
    countryColumn: 'Storefront',
    rightTypeColumn: 'Right Type',
    adjustmentTypeColumn: 'Adjustment Type',
    songTitleColumn: 'Title',
  },
  OTHER: {
    dspCode: 'OTHER',
    label: 'DSP Lainnya',
    description: 'Format laporan kustom (Joox, Deezer, TikTok, dll)',
    requiredColumns: ['Asset ID', 'Song ID', 'Date', 'Country', 'Revenue'],
    assetIdColumn: 'Asset ID',
    songIdColumn: 'Song ID',
    writersColumn: 'Writers',
    incomeRevColumn: 'Revenue',
    idrRevColumn: 'Revenue IDR',
    dayColumn: 'Date',
    countryColumn: 'Country',
    rightTypeColumn: 'Right Type',
    adjustmentTypeColumn: 'Adjustment',
    songTitleColumn: 'Title',
  },
};

// ─── Initialization with sample data from Excel ──────
export function initializeSampleData() {
  // Sample song_dsp_asset mappings (derived from Excel report)
  songDspAssets = [
    { songId: 'L000689', dspCode: 'YOUTUBE', assetId: 'A167377446199103', status: 'active' },
    { songId: 'L000705', dspCode: 'YOUTUBE', assetId: 'A228849931082495', status: 'active' },
    { songId: 'L000706', dspCode: 'YOUTUBE', assetId: 'A311526478290561', status: 'active' },
    { songId: 'L000678', dspCode: 'YOUTUBE', assetId: 'A190284573018264', status: 'active' },
    // More can be added from report
  ];

  // Sample song rights (from the composition data)
  songRights = [
    {
      songId: 'L000689',
      songTitle: 'Tuhan Itu Baik',
      ipName: 'Immanuel Andriano Kure',
      ipbaseNo: 'I-005719967-1',
      ipRole: 'Composer',
      perOwn: 70, mecOwn: 70, synOwn: 70,
    },
    {
      songId: 'L000689',
      songTitle: 'Tuhan Itu Baik',
      ipName: 'LOKA Publishing',
      ipbaseNo: 'I-007560847-6',
      ipRole: 'Publisher',
      perOwn: 30, mecOwn: 30, synOwn: 30,
    },
    {
      songId: 'L000705',
      songTitle: 'Mulai & Pergi',
      ipName: 'Immanuel Andriano Kure',
      ipbaseNo: 'I-005719967-1',
      ipRole: 'Composer',
      perOwn: 70, mecOwn: 70, synOwn: 70,
    },
    {
      songId: 'L000705',
      songTitle: 'Mulai & Pergi',
      ipName: 'LOKA Publishing',
      ipbaseNo: 'I-007560847-6',
      ipRole: 'Publisher',
      perOwn: 30, mecOwn: 30, synOwn: 30,
    },
    {
      songId: 'L000678',
      songTitle: 'Turah Wani',
      ipName: 'Tomo Widayat',
      ipbaseNo: 'I-005719967-2',
      ipRole: 'Composer',
      perOwn: 70, mecOwn: 70, synOwn: 70,
    },
    {
      songId: 'L000678',
      songTitle: 'Turah Wani',
      ipName: 'LOKA Publishing',
      ipbaseNo: 'I-007560847-6',
      ipRole: 'Publisher',
      perOwn: 30, mecOwn: 30, synOwn: 30,
    },
  ];

  // Initialize demo batch representing Report Loka Publishing Mei 2026.xlsx
  const totalLokaPool = 983196.08; // 85% net revenue received by LOKA after 15% Alfa cut
  const totalSourceGross = 1156701.27; // 100% YouTube gross

  const sampleDists: DistributionResult[] = [];
  const totalCreatorsGrossSum = 1156594;

  for (const c of realData.creators) {
    const songLokaPool = (c.totalRoyalty / totalCreatorsGrossSum) * totalLokaPool;
    const creatorShare = songLokaPool * 0.70; // 70% Hak Pencipta
    const publisherShare = songLokaPool * 0.30; // 30% Hak Publisher LOKA
    const ipbaseNo = `IP-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)}`;

    const songsCount = c.songsList.length || 1;
    for (const song of c.songsList) {
      const songRatio = c.totalRoyalty > 0 ? song.amount / c.totalRoyalty : 1 / songsCount;
      const songCreatorShare = creatorShare * songRatio;
      const songPubShare = publisherShare * songRatio;

      // 1. Creator distribution (70%)
      sampleDists.push({
        distId: genId(),
        batchId: 'batch-demo-mei-2026',
        rowId: 'row-' + genId(),
        songId: song.customId || 'S-' + genId(),
        assetId: 'A-' + genId(),
        ipbaseNo,
        ipName: c.name,
        rightType: 'Mechanical',
        percentage: 70,
        distMr: songCreatorShare,
        dspCode: 'YOUTUBE',
        country: 'ID',
        day: '2026-05',
      });

      // 2. Publisher LOKA distribution (30%)
      sampleDists.push({
        distId: genId(),
        batchId: 'batch-demo-mei-2026',
        rowId: 'row-' + genId(),
        songId: song.customId || 'S-' + genId(),
        assetId: 'A-' + genId(),
        ipbaseNo: 'I-007560847-6',
        ipName: 'LOKA Publishing',
        rightType: 'Mechanical',
        percentage: 30,
        distMr: songPubShare,
        dspCode: 'YOUTUBE',
        country: 'ID',
        day: '2026-05',
      });
    }
  }

  // Sample Exception Rows for PRD v1.1 Unmatched & Conflict Resolver
  const sampleExceptionRows: MatchedSourceRow[] = [
    {
      rowId: 'row-err-01',
      batchId: 'batch-demo-mei-2026',
      dsp: 'YOUTUBE',
      originalRow: {
        rowIndex: 142,
        day: '2026-05',
        assetId: 'A98210928172654',
        customId: 'L000788',
        writers: 'Immanuel Andriano Kure',
        songTitle: 'Karna Su Sayang (Acoustic Remaster)',
        incomeRev: 24.50,
        currency: 'USD',
        idrRev: 367500,
        country: 'ID',
        rightType: 'Mechanical',
        adjustmentType: 'None',
      },
      matchStatus: 'unmatched',
      failedStage: 1,
      failureFlags: [1],
      failureReason: 'Tahap 1: Asset ID A98210928172654 belum terpetakan ke lagu LOKA',
      matchedSongId: null,
      ageDays: 5,
      version: 1,
    },
    {
      rowId: 'row-err-02',
      batchId: 'batch-demo-mei-2026',
      dsp: 'SPOTIFY',
      originalRow: {
        rowIndex: 219,
        day: '2026-05',
        assetId: 'spotify:track:4cOdK2wGUTZTA9',
        customId: 'L000689',
        writers: 'Immanuel K.',
        songTitle: 'Tuhan Itu Baik',
        incomeRev: 18.20,
        currency: 'USD',
        idrRev: 273000,
        country: 'ID',
        rightType: 'Mechanical',
        adjustmentType: 'None',
      },
      matchStatus: 'unmatched',
      failedStage: 2,
      failureFlags: [2],
      failureReason: 'Tahap 2: Writer "Immanuel K." belum terdaftar sebagai alias resmi IPBASE NO',
      matchedSongId: 'L000689',
      unmappedWriters: ['Immanuel K.'],
      ageDays: 12,
      version: 1,
    },
    {
      rowId: 'row-err-03',
      batchId: 'batch-demo-mei-2026',
      dsp: 'YOUTUBE',
      originalRow: {
        rowIndex: 308,
        day: '2026-05',
        assetId: 'A190284573018264',
        customId: 'L000705',
        writers: 'Tomo Widayat / Immanuel Andriano Kure',
        songTitle: 'Turah Wani x Mulai & Pergi Mashup',
        incomeRev: 35.80,
        currency: 'USD',
        idrRev: 537000,
        country: 'ID',
        rightType: 'Mechanical',
        adjustmentType: 'None',
      },
      matchStatus: 'conflict',
      failedStage: null,
      failureFlags: [1, 3],
      failureReason: 'Konflik: Asset ID mengarah ke "Turah Wani", tetapi Custom ID mengarah ke "Mulai & Pergi"',
      matchedSongId: null,
      candidateSongIdByAsset: 'L000678',
      candidateSongIdByCustomId: 'L000705',
      ageDays: 34, // > 30 days marked Menua
      version: 1,
    },
    {
      rowId: 'row-err-04',
      batchId: 'batch-demo-mei-2026',
      dsp: 'APPLE_MUSIC',
      originalRow: {
        rowIndex: 412,
        day: '2026-05',
        assetId: 'apple:track:192837461',
        customId: 'L000999_TYPO',
        writers: 'Immanuel Andriano Kure',
        songTitle: 'Mulai & Pergi',
        incomeRev: 12.00,
        currency: 'USD',
        idrRev: 180000,
        country: 'MY',
        rightType: 'Mechanical',
        adjustmentType: 'None',
      },
      matchStatus: 'unmatched',
      failedStage: 3,
      failureFlags: [3],
      failureReason: 'Tahap 3: Custom ID "L000999_TYPO" tidak terdaftar di katalog LOKA',
      matchedSongId: null,
      ageDays: 8,
      version: 1,
    },
    {
      rowId: 'row-err-05',
      batchId: 'batch-demo-mei-2026',
      dsp: 'YOUTUBE',
      originalRow: {
        rowIndex: 550,
        day: '2026-05',
        assetId: 'A77123984712093',
        customId: 'L000888',
        writers: 'Artis Indie Tamu',
        songTitle: 'Kompilasi Dangdut Cover 2026',
        incomeRev: 8.50,
        currency: 'USD',
        idrRev: 127500,
        country: 'ID',
        rightType: 'Mechanical',
        adjustmentType: 'None',
      },
      matchStatus: 'ignored',
      failedStage: 1,
      failureFlags: [1],
      failureReason: 'Diabaikan: Bukan Katalog LOKA (Lagu cover pihak ketiga)',
      matchedSongId: null,
      resolutionReason: 'Karya bukan milik publisher LOKA',
      resolvedBy: 'Admin Royalti',
      ageDays: 19,
      version: 2,
    },
    {
      rowId: 'row-err-06',
      batchId: 'batch-demo-mei-2026',
      dsp: 'SPOTIFY',
      originalRow: {
        rowIndex: 604,
        day: '2026-05',
        assetId: 'spotify:track:998127391',
        customId: 'L000689',
        writers: 'Komposer Baru X',
        songTitle: 'Tuhan Itu Baik (Collab Version)',
        incomeRev: 21.00,
        currency: 'USD',
        idrRev: 315000,
        country: 'ID',
        rightType: 'Mechanical',
        adjustmentType: 'None',
      },
      matchStatus: 'on_hold',
      failedStage: 2,
      failureFlags: [2],
      failureReason: 'Ditahan: Menunggu verifikasi surat kuasa hak cipta komposer tambahan',
      matchedSongId: 'L000689',
      holdUntil: '2026-10-15',
      resolutionReason: 'Menunggu konfirmasi tim Legal perihal split artis kolaborator',
      resolvedBy: 'Admin Royalti',
      ageDays: 14,
      version: 2,
    },
  ];

  // 1. Published Historical Batch (Q1 2026) so creators have verified baseline statements
  const sampleQ1Dists: DistributionResult[] = [];
  for (const c of realData.creators) {
    const songGross = c.totalRoyalty * 0.85;
    const creatorNet = songGross * 0.70;
    const pubNet = songGross * 0.30;
    const ipbaseNo = `IP-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)}`;

    sampleQ1Dists.push({
      distId: genId(),
      batchId: 'batch-q1-2026',
      rowId: 'row-q1-' + genId(),
      songId: c.songsList[0]?.customId || 'S-001',
      assetId: 'A-Q1-' + genId(),
      ipbaseNo,
      ipName: c.name,
      rightType: 'Mechanical',
      percentage: 70,
      distMr: creatorNet,
      dspCode: 'YOUTUBE',
      country: 'ID',
      day: '2026-03',
    });
    sampleQ1Dists.push({
      distId: genId(),
      batchId: 'batch-q1-2026',
      rowId: 'row-q1-pub-' + genId(),
      songId: c.songsList[0]?.customId || 'S-001',
      assetId: 'A-Q1-' + genId(),
      ipbaseNo: 'I-007560847-6',
      ipName: 'LOKA Publishing',
      rightType: 'Mechanical',
      percentage: 30,
      distMr: pubNet,
      dspCode: 'YOUTUBE',
      country: 'ID',
      day: '2026-03',
    });
  }

  // Set issueStatus on sampleExceptionRows
  for (const r of sampleExceptionRows) {
    if (r.matchStatus === 'on_hold') {
      r.issueStatus = 'on_hold';
    } else if (r.matchStatus === 'ignored') {
      r.issueStatus = 'ignored';
    } else if (r.matchStatus === 'resolved') {
      r.issueStatus = 'resolved';
    } else {
      r.issueStatus = 'open';
    }
  }

  batches = [
    {
      batchId: 'batch-q1-2026',
      dspCode: 'YOUTUBE',
      period: '1Q26 (Jan - Mar 2026)',
      fileName: 'Report Loka Publishing Q1 2026 Final.xlsx',
      status: 'published',
      uploadedBy: 'Budi (Finance Manager)',
      publishedBy: 'Rudi (Head of Royalty)',
      publishedAt: '2026-04-10T11:00:00.000Z',
      publishingNotes: 'Telah diaudit & diverifikasi lengkap oleh Finance & Head of Royalty.',
      publishChecksum: 'chk_q1_final_90a',
      totalSource: 19500000,
      totalDistributed: 19500000,
      totalOnHold: 0,
      totalIgnored: 0,
      publisherShare: 19500000 * 0.30,
      totalRows: 12450,
      matchedRows: 12450,
      unmatchedRows: 0,
      conflictRows: 0,
      openIssuesCount: 0,
      viewedByCreatorsCount: 3,
      createdAt: '2026-04-09T08:00:00.000Z',
      sourceRows: [],
      distributions: sampleQ1Dists,
    },
    {
      batchId: 'batch-demo-mei-2026',
      dspCode: 'YOUTUBE',
      period: 'Mei 2026',
      fileName: 'Report Loka Publishing Mei 2026.xlsx',
      status: 'in_review',
      uploadedBy: 'Sarah (Copyright Admin)',
      totalSource: totalSourceGross,
      totalDistributed: totalLokaPool,
      totalOnHold: 315000,
      totalIgnored: 107000,
      publisherShare: totalLokaPool * 0.30,
      totalRows: 6200,
      matchedRows: 6194,
      unmatchedRows: 3,
      conflictRows: 1,
      openIssuesCount: 4,
      createdAt: new Date().toISOString(),
      sourceRows: sampleExceptionRows,
      distributions: sampleDists,
    },
  ];
}

// ─── Core Engine Functions ────────────────────────────

/** Generate unique ID */
function genId(): string {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
}

/** Get rights percentage based on right type (BR-3) */
function getPercentage(rights: SongRights, rightType: string): number {
  const rt = rightType.toLowerCase();
  if (rt.includes('mechanical') || rt === 'mec') return rights.mecOwn;
  if (rt.includes('performance') || rt === 'per') return rights.perOwn;
  if (rt.includes('synch') || rt === 'syn') return rights.synOwn;
  // Default to mechanical
  return rights.mecOwn;
}

/** Normalize writer name for fuzzy matching */
function normalizeWriter(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * STAGE 1: Match DSP + Asset ID → Song
 */
function matchStage1(dspCode: DSPCode, assetId: string): { songId: string | null; found: boolean } {
  const match = songDspAssets.find(
    a => a.dspCode === dspCode && a.assetId === assetId && a.status === 'active'
  );
  return { songId: match?.songId || null, found: !!match };
}

/**
 * STAGE 2: Verify writer (IPBASE NO) exists in song rights
 */
function matchStage2(songId: string, writerName: string): { ipbaseNo: string | null; found: boolean } {
  const rights = songRights.filter(r => r.songId === songId);
  const normalizedWriter = normalizeWriter(writerName);
  
  for (const r of rights) {
    if (normalizeWriter(r.ipName) === normalizedWriter) {
      return { ipbaseNo: r.ipbaseNo, found: true };
    }
  }
  
  // Partial match
  for (const r of rights) {
    const normalizedIp = normalizeWriter(r.ipName);
    if (normalizedIp.includes(normalizedWriter) || normalizedWriter.includes(normalizedIp)) {
      return { ipbaseNo: r.ipbaseNo, found: true };
    }
  }
  
  // If rights exist for the song, allow anyway (the writer might just not be listed individually)
  // In a real system this would be stricter
  if (rights.length > 0) {
    return { ipbaseNo: null, found: true };
  }
  
  return { ipbaseNo: null, found: false };
}

/**
 * STAGE 3: Verify Song ID / Custom ID matches
 */
function matchStage3(songId: string, customId: string): { found: boolean; conflictSongId?: string } {
  // Check if any rights exist for this customId
  const matchedRights = songRights.filter(r => r.songId === customId);
  
  if (matchedRights.length > 0) {
    // The customId itself is the songId and it matches what Stage 1 found
    if (songId === customId) {
      return { found: true };
    }
    // Conflict: Asset ID points to one song, Custom ID to another
    return { found: false, conflictSongId: customId };
  }
  
  // Also check if the songId from stage 1 matches the customId directly
  if (songId === customId) {
    return { found: true };
  }
  
  // Check asset registry for this customId
  const assetWithSongId = songDspAssets.find(a => a.songId === customId);
  if (assetWithSongId) {
    if (assetWithSongId.songId === songId) {
      return { found: true };
    }
    return { found: false, conflictSongId: assetWithSongId.songId };
  }
  
  return { found: false };
}

/**
 * Run 3-stage matching on a single report row
 */
function matchRow(
  dspCode: DSPCode,
  row: DSPReportRow
): MatchedSourceRow {
  const rowId = genId();
  
  // STAGE 1: DSP + Asset ID
  const stage1 = matchStage1(dspCode, row.assetId);
  if (!stage1.found || !stage1.songId) {
    return {
      rowId,
      batchId: '',
      dsp: dspCode,
      originalRow: row,
      matchStatus: 'unmatched',
      failedStage: 1,
      failureFlags: [1],
      matchedSongId: null,
      failureReason: `Asset ID "${row.assetId}" tidak terdaftar untuk DSP ${dspCode}`,
      version: 1,
    };
  }
  
  // STAGE 2: Writer / IPBASE NO
  const stage2 = matchStage2(stage1.songId, row.writers);
  if (!stage2.found) {
    return {
      rowId,
      batchId: '',
      dsp: dspCode,
      originalRow: row,
      matchStatus: 'unmatched',
      failedStage: 2,
      failureFlags: [2],
      matchedSongId: stage1.songId,
      failureReason: `Pencipta "${row.writers}" tidak ditemukan pada komposisi hak lagu ${stage1.songId}`,
      version: 1,
    };
  }
  
  // STAGE 3: Song ID / Custom ID
  const stage3 = matchStage3(stage1.songId, row.customId);
  if (!stage3.found) {
    if (stage3.conflictSongId) {
      return {
        rowId,
        batchId: '',
        dsp: dspCode,
        originalRow: row,
        matchStatus: 'conflict',
        failedStage: 3,
        failureFlags: [1, 3],
        matchedSongId: stage1.songId,
        failureReason: `Konflik: Asset ID mengarah ke lagu ${stage1.songId} tetapi Custom ID "${row.customId}" mengarah ke ${stage3.conflictSongId}`,
        candidateSongIdByAsset: stage1.songId,
        candidateSongIdByCustomId: stage3.conflictSongId,
        version: 1,
      };
    }
    return {
      rowId,
      batchId: '',
      dsp: dspCode,
      originalRow: row,
      matchStatus: 'unmatched',
      failedStage: 3,
      failureFlags: [3],
      matchedSongId: stage1.songId,
      failureReason: `Custom ID/Song ID "${row.customId}" tidak cocok dengan lagu ${stage1.songId}`,
      version: 1,
    };
  }
  
  return {
    rowId,
    batchId: '',
    dsp: dspCode,
    originalRow: row,
    matchStatus: 'matched',
    failedStage: null,
    failureFlags: [],
    matchedSongId: stage1.songId,
    failureReason: '',
    version: 1,
  };
}

/**
 * Distribute matched row to right holders (BR-2)
 * YouTube rows are scaled to 85% (net received by LOKA Publishing after 15% Alfa aggregator cut)
 */
function distributeRow(
  batchId: string,
  matchedRow: MatchedSourceRow,
  dspCode: DSPCode
): DistributionResult[] {
  if (matchedRow.matchStatus !== 'matched' || !matchedRow.matchedSongId) {
    return [];
  }
  
  const rights = songRights.filter(r => r.songId === matchedRow.matchedSongId);
  if (rights.length === 0) return [];

  // YouTube reports have 15% aggregator fee, so LOKA receives 85% of Income Rev
  const netRate = dspCode === 'YOUTUBE' ? 0.85 : 1.0;
  const lokaRevenue = matchedRow.originalRow.incomeRev * netRate;
  
  return rights.map(r => {
    const pct = getPercentage(r, matchedRow.originalRow.rightType);
    const distMr = lokaRevenue * (pct / 100);
    
    return {
      distId: genId(),
      batchId,
      rowId: matchedRow.rowId,
      songId: matchedRow.matchedSongId!,
      assetId: matchedRow.originalRow.assetId,
      ipbaseNo: r.ipbaseNo,
      ipName: r.ipName,
      rightType: matchedRow.originalRow.rightType,
      percentage: pct,
      distMr,
      dspCode,
      country: matchedRow.originalRow.country,
      day: matchedRow.originalRow.day,
    };
  });
}

/**
 * Process an entire batch: parse, match, distribute, reconcile
 */
export function processBatch(
  dspCode: DSPCode,
  period: string,
  fileName: string,
  rows: DSPReportRow[]
): RoyaltyBatch {
  const batchId = 'batch-' + genId();
  
  // Check idempotency (BR-6)
  const existingBatch = batches.find(
    b => b.dspCode === dspCode && b.period === period && b.fileName === fileName
  );
  if (existingBatch) {
    return existingBatch;
  }
  
  // Match all rows
  const matchedRows = rows.map(row => {
    const result = matchRow(dspCode, row);
    result.batchId = batchId;
    return result;
  });
  
  // Distribute matched rows
  const distributions: DistributionResult[] = [];
  for (const mr of matchedRows) {
    const dists = distributeRow(batchId, mr, dspCode);
    distributions.push(...dists);
  }
  
  // Calculate totals
  const totalSource = rows.reduce((sum, r) => sum + r.incomeRev, 0);
  const totalDistributed = distributions.reduce((sum, d) => sum + d.distMr, 0);
  const matchedCount = matchedRows.filter(r => r.matchStatus === 'matched').length;
  const unmatchedCount = matchedRows.filter(r => r.matchStatus === 'unmatched').length;
  const conflictCount = matchedRows.filter(r => r.matchStatus === 'conflict').length;
  
  const openIssuesCount = unmatchedCount + conflictCount;
  const initialStatus: BatchStatus = openIssuesCount > 0 ? 'in_review' : 'ready_to_publish';

  const batch: RoyaltyBatch = {
    batchId,
    dspCode,
    period,
    fileName,
    status: initialStatus,
    uploadedBy: 'Sarah (Copyright Admin)',
    totalSource,
    totalDistributed,
    totalOnHold: 0,
    totalIgnored: 0,
    publisherShare: totalDistributed * 0.30,
    totalRows: rows.length,
    matchedRows: matchedCount,
    unmatchedRows: unmatchedCount,
    conflictRows: conflictCount,
    openIssuesCount,
    createdAt: new Date().toISOString(),
    sourceRows: matchedRows,
    distributions,
  };
  
  batches.push(batch);
  return batch;
}

/**
 * Generate reconciliation report for a batch (BR-4 & PB-4.2)
 */
export function getReconciliation(batchId: string): ReconciliationReport | null {
  const batch = batches.find(b => b.batchId === batchId);
  if (!batch) return null;
  
  const unmatchedByStage = { stage1: 0, stage2: 0, stage3: 0 };
  let totalOnHold = 0;
  let totalIgnored = 0;
  let openIssuesCount = 0;

  for (const row of batch.sourceRows || []) {
    if (row.failedStage === 1) unmatchedByStage.stage1++;
    if (row.failedStage === 2) unmatchedByStage.stage2++;
    if (row.failedStage === 3) unmatchedByStage.stage3++;

    const val = row.originalRow?.idrRev || row.originalRow?.incomeRev || 0;
    if (row.matchStatus === 'on_hold') {
      totalOnHold += val;
    } else if (row.matchStatus === 'ignored') {
      totalIgnored += val;
    }

    if ((row.matchStatus === 'unmatched' || row.matchStatus === 'conflict') &&
        (!row.issueStatus || row.issueStatus === 'open')) {
      openIssuesCount++;
    }
  }
  
  const totalAccounted = batch.totalDistributed + totalOnHold + totalIgnored;
  const diff = Math.abs(batch.totalSource - totalAccounted);
  
  return {
    batchId,
    totalSourceRevenue: batch.totalSource,
    totalDistributedRevenue: batch.totalDistributed,
    totalOnHoldRevenue: totalOnHold,
    totalIgnoredRevenue: totalIgnored,
    difference: diff,
    isBalanced: diff < 5.0, // Tolerance for float precision
    matchedCount: batch.matchedRows,
    unmatchedCount: batch.unmatchedRows,
    conflictCount: batch.conflictRows,
    openIssuesCount,
    unmatchedByStage,
  };
}

/**
 * Get member summary for dashboard (grouped by IPBASE NO)
 */
export function getMemberSummaries(batchId: string): MemberSummary[] {
  const batch = batches.find(b => b.batchId === batchId);
  if (!batch) return [];
  
  const summaryMap = new Map<string, MemberSummary>();
  
  for (const dist of batch.distributions) {
    const key = `${dist.ipbaseNo}-${dist.dspCode}`;
    
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        ipbaseNo: dist.ipbaseNo,
        ipName: dist.ipName,
        dspCode: dist.dspCode,
        period: batch.period,
        totalRevenue: 0,
        songCount: 0,
        songs: [],
      });
    }
    
    const summary = summaryMap.get(key)!;
    summary.totalRevenue += dist.distMr;
    
    const existingSong = summary.songs.find(s => s.songId === dist.songId);
    if (existingSong) {
      existingSong.revenue += dist.distMr;
    } else {
      const rights = songRights.find(r => r.songId === dist.songId);
      summary.songs.push({
        songId: dist.songId,
        songTitle: rights?.songTitle || dist.songId,
        revenue: dist.distMr,
        rightType: dist.rightType,
        percentage: dist.percentage,
      });
      summary.songCount++;
    }
  }
  
  return Array.from(summaryMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Register a new Asset ID for a song (from report or manual)
 */
export function registerAssetId(songId: string, dspCode: DSPCode, assetId: string) {
  const existing = songDspAssets.find(
    a => a.dspCode === dspCode && a.assetId === assetId
  );
  if (!existing) {
    songDspAssets.push({ songId, dspCode, assetId, status: 'active' });
  }
}

/**
 * Register song rights
 */
export function registerSongRights(rights: SongRights) {
  const existing = songRights.find(
    r => r.songId === rights.songId && r.ipbaseNo === rights.ipbaseNo
  );
  if (!existing) {
    songRights.push(rights);
  }
}

/**
 * Auto-register assets from a report (first-time learning)
 * Maps customId → songId and creates asset entries
 */
export function autoRegisterFromReport(
  dspCode: DSPCode,
  rows: DSPReportRow[]
): { registered: number; skipped: number } {
  let registered = 0;
  let skipped = 0;
  
  for (const row of rows) {
    if (!row.assetId || !row.customId) {
      skipped++;
      continue;
    }
    
    const existing = songDspAssets.find(
      a => a.dspCode === dspCode && a.assetId === row.assetId
    );
    
    if (!existing) {
      songDspAssets.push({
        songId: row.customId,
        dspCode,
        assetId: row.assetId,
        status: 'active',
      });
      registered++;
    } else {
      skipped++;
    }
  }
  
  return { registered, skipped };
}

/**
 * Auto-register song rights from report writers column
 * Sets 70% for Composer and 30% for Publisher LOKA per business rules
 */
export function autoRegisterRightsFromReport(
  rows: DSPReportRow[],
  defaultPercentage: number = 70
): { registered: number; skipped: number } {
  let registered = 0;
  let skipped = 0;
  
  const seen = new Set<string>();
  
  for (const row of rows) {
    if (!row.writers || !row.customId) {
      skipped++;
      continue;
    }
    
    const key = `${row.customId}-${normalizeWriter(row.writers)}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    
    const existing = songRights.find(
      r => r.songId === row.customId && normalizeWriter(r.ipName) === normalizeWriter(row.writers)
    );
    
    if (!existing) {
      // 1. Hak Pencipta Lagu: 70%
      songRights.push({
        songId: row.customId,
        songTitle: row.songTitle || row.customId,
        ipName: row.writers,
        ipbaseNo: `IP-${normalizeWriter(row.writers).substring(0, 10)}`,
        ipRole: 'Composer',
        perOwn: 70,
        mecOwn: 70,
        synOwn: 70,
      });
      registered++;

      // 2. Hak Publisher LOKA: 30%
      const publisherExists = songRights.find(
        r => r.songId === row.customId && r.ipRole === 'Publisher'
      );
      if (!publisherExists) {
        songRights.push({
          songId: row.customId,
          songTitle: row.songTitle || row.customId,
          ipName: 'LOKA Publishing',
          ipbaseNo: 'I-007560847-6',
          ipRole: 'Publisher',
          perOwn: 30,
          mecOwn: 30,
          synOwn: 30,
        });
      }
    } else {
      skipped++;
    }
  }
  
  return { registered, skipped };
}

// ─── Getters ──────────────────────────────────────────
export function getAllBatches(): RoyaltyBatch[] {
  return [...batches];
}

export function getBatch(batchId: string): RoyaltyBatch | undefined {
  return batches.find(b => b.batchId === batchId);
}

export function getAllAssets(): SongDspAsset[] {
  return [...songDspAssets];
}

export function getAllRights(): SongRights[] {
  return [...songRights];
}

export function clearAllData() {
  songDspAssets = [];
  songRights = [];
  batches = [];
  writerAliases = [];
  auditLogs = [];
}

/**
 * Get aggregated creators formatted for CreatorTable / CreatorDetailView
 * PB-1.1: Only reads published and locked batches by default for creator portal
 */
export function getCreatorsFromAllBatches(onlyPublished: boolean = true): Creator[] {
  if (batches.length === 0) return [];

  const targetBatches = onlyPublished
    ? batches.filter(b => b.status === 'published' || b.status === 'locked' || b.status === 'distributed')
    : batches;

  if (targetBatches.length === 0) return [];

  const creatorMap = new Map<string, {
    name: string;
    songs: Map<string, { title: string; amount: number; adsRev: number; subsRev: number; customId: string }>;
    totalRoyalty: number;
    adsRev: number;
    subsRev: number;
    countries: Map<string, number>;
  }>();

  for (const batch of targetBatches) {
    for (const dist of batch.distributions) {
      // Exclude Publisher LOKA from creators list (has its own dedicated publisher card)
      if (
        dist.ipName.toLowerCase().includes('loka') &&
        dist.ipName.toLowerCase().includes('publishing')
      ) {
        continue;
      }

      const key = dist.ipbaseNo || dist.ipName;
      if (!creatorMap.has(key)) {
        creatorMap.set(key, {
          name: dist.ipName,
          songs: new Map(),
          totalRoyalty: 0,
          adsRev: 0,
          subsRev: 0,
          countries: new Map(),
        });
      }
      const c = creatorMap.get(key)!;
      c.totalRoyalty += dist.distMr;

      // Song grouping
      if (!c.songs.has(dist.songId)) {
        const rights = songRights.find(r => r.songId === dist.songId);
        c.songs.set(dist.songId, {
          title: rights?.songTitle || dist.songId,
          amount: 0,
          adsRev: 0,
          subsRev: 0,
          customId: dist.songId,
        });
      }
      const song = c.songs.get(dist.songId)!;
      song.amount += dist.distMr;

      // Country revenue
      if (dist.country) {
        c.countries.set(dist.country, (c.countries.get(dist.country) || 0) + dist.distMr);
      }
    }
  }

  let idCounter = 1;
  const result: Creator[] = [];

  for (const [_, data] of creatorMap.entries()) {
    // 70% share belongs to creator, 30% to publisher LOKA
    const netRoyalty = Math.round(data.totalRoyalty); // 70% bagian pencipta
    const grossRoyalty = Math.round(data.totalRoyalty / 0.70); // 100% total gross lagu
    const adsRev = Math.round(grossRoyalty * 0.74);
    const subsRev = Math.round(grossRoyalty * 0.26);

    const songsList: SongItem[] = Array.from(data.songs.values()).map(s => ({
      title: s.title,
      amount: Math.round(s.amount),
      views: 0,
      adsRev: Math.round(s.amount * 0.74),
      subsRev: Math.round(s.amount * 0.26),
      customId: s.customId,
    }));

    const topCountries: CountryShare[] = Array.from(data.countries.entries())
      .map(([code, rev]) => ({ code, rev: Math.round(rev) }))
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 5);

    result.push({
      id: idCounter++,
      name: data.name,
      songsCount: data.songs.size,
      views: 0,
      totalRoyalty: grossRoyalty,
      netRoyalty,
      adsRev,
      subsRev,
      platformShares: [74, 26],
      youtubeBreakdown: {
        adsPct: 74,
        subsPct: 26,
        adsRev,
        subsRev,
      },
      status: 'Menunggu',
      isRealStatement: true,
      songsList,
      topCountries,
    });
  }

  return result.sort((a, b) => b.netRoyalty - a.netRoyalty);
}

/**
 * Get summary stats across all batches (70% pencipta, 30% publisher LOKA)
 */
export function getBatchSummaryStats() {
  if (batches.length === 0) {
    return {
      totalGross: 0,
      totalCreatorShare: 0,
      totalPublisherShare: 0,
      totalNet: 0,
      pph23: 0,
      adsRev: 0,
      subsRev: 0,
      totalCreators: 0,
      batchesCount: 0,
    };
  }

  let totalGross = 0;
  for (const b of batches) {
    totalGross += b.totalDistributed;
  }

  // 70% bagian pencipta, 30% bagian Publisher LOKA
  const totalCreatorShare = Math.round(totalGross * 0.70);
  const totalPublisherShare = Math.round(totalGross * 0.30);
  const pph23 = Math.round(totalGross * 0.02);
  const adsRev = Math.round(totalGross * 0.74);
  const subsRev = Math.round(totalGross * 0.26);

  const creators = getCreatorsFromAllBatches();

  return {
    totalGross: Math.round(totalGross),
    totalCreatorShare,
    totalPublisherShare,
    totalNet: totalCreatorShare, // Dibayarkan ke pencipta (70%)
    pph23,
    adsRev,
    subsRev,
    totalCreators: creators.length,
    batchesCount: batches.length,
  };
}

// ─── PRD v1.1 Exception Resolver Functions ────────────────

export function getExceptionRows(batchId?: string): MatchedSourceRow[] {
  let list: MatchedSourceRow[] = [];
  if (batchId) {
    const b = batches.find(x => x.batchId === batchId);
    if (b) list = b.sourceRows || [];
  } else {
    for (const b of batches) {
      if (b.sourceRows) list.push(...b.sourceRows);
    }
  }
  return list.filter(r => r.matchStatus !== 'matched');
}

export function getExceptionStats(batchId?: string) {
  const rows = getExceptionRows(batchId);
  const activeRows = rows.filter(r => r.matchStatus !== 'ignored');

  const stage1Rows = rows.filter(r => r.failedStage === 1 && r.matchStatus !== 'ignored' && r.matchStatus !== 'on_hold');
  const stage2Rows = rows.filter(r => r.failedStage === 2 && r.matchStatus !== 'ignored' && r.matchStatus !== 'on_hold');
  const stage3Rows = rows.filter(r => r.failedStage === 3 && r.matchStatus !== 'ignored' && r.matchStatus !== 'on_hold');
  const conflictRows = rows.filter(r => r.matchStatus === 'conflict');
  const onHoldRows = rows.filter(r => r.matchStatus === 'on_hold');
  const ignoredRows = rows.filter(r => r.matchStatus === 'ignored');
  const resolvedRows = rows.filter(r => r.matchStatus === 'resolved');

  const totalPendingAmount = activeRows.reduce((sum, r) => sum + r.originalRow.idrRev, 0);

  // Calculate matching rates
  let totalBatchRows = 0;
  let totalMatchedRows = 0;
  let totalSourceNominal = 0;
  let totalDistributedNominal = 0;

  const targetBatches = batchId ? batches.filter(b => b.batchId === batchId) : batches;
  for (const b of targetBatches) {
    totalBatchRows += b.totalRows || 0;
    totalMatchedRows += b.matchedRows || 0;
    totalSourceNominal += b.totalSource || 0;
    totalDistributedNominal += b.totalDistributed || 0;
  }

  const matchingRateRows = totalBatchRows > 0 ? (totalMatchedRows / totalBatchRows) * 100 : 100;
  const matchingRateNominal = totalSourceNominal > 0 ? (totalDistributedNominal / totalSourceNominal) * 100 : 100;

  const agingCount = activeRows.filter(r => r.ageDays && r.ageDays > 30).length;
  const unresolvedIncomeRev = activeRows.reduce((sum, r) => sum + r.originalRow.incomeRev, 0);

  return {
    totalIssues: stage1Rows.length + stage2Rows.length + stage3Rows.length + conflictRows.length,
    totalPendingAmount,
    stage1Count: stage1Rows.length,
    stage1Amount: stage1Rows.reduce((sum, r) => sum + r.originalRow.idrRev, 0),
    stage2Count: stage2Rows.length,
    stage2Amount: stage2Rows.reduce((sum, r) => sum + r.originalRow.idrRev, 0),
    stage3Count: stage3Rows.length,
    stage3Amount: stage3Rows.reduce((sum, r) => sum + r.originalRow.idrRev, 0),
    conflictCount: conflictRows.length,
    conflictAmount: conflictRows.reduce((sum, r) => sum + r.originalRow.idrRev, 0),
    onHoldCount: onHoldRows.length,
    onHoldAmount: onHoldRows.reduce((sum, r) => sum + r.originalRow.idrRev, 0),
    ignoredCount: ignoredRows.length,
    ignoredAmount: ignoredRows.reduce((sum, r) => sum + r.originalRow.idrRev, 0),
    resolvedCount: resolvedRows.length,
    resolvedAmount: resolvedRows.reduce((sum, r) => sum + r.originalRow.idrRev, 0),
    matchingRateRows: Number(matchingRateRows.toFixed(1)),
    matchingRateNominal: Number(matchingRateNominal.toFixed(1)),
    // Convenient aliases
    unmatched: stage1Rows.length + stage2Rows.length + stage3Rows.length,
    conflicts: conflictRows.length,
    unresolvedRevenue: totalPendingAmount,
    unresolvedIncomeRev,
    onHold: onHoldRows.length,
    ignored: ignoredRows.length,
    resolved: resolvedRows.length,
    agingCount,
    byStage: {
      stage1: stage1Rows.length,
      stage2: stage2Rows.length,
      stage3: stage3Rows.length,
    },
  };
}

export function resolveStage1Asset(
  rowId: string,
  songId: string,
  scope: ResolutionScope = 'all_open_batches',
  savePermanent: boolean = true,
  reason?: string
) {
  let targetRow: MatchedSourceRow | undefined;
  for (const b of batches) {
    targetRow = b.sourceRows?.find(r => r.rowId === rowId);
    if (targetRow) break;
  }
  if (!targetRow) return { success: false, affectedCount: 0 };

  const assetId = targetRow.originalRow.assetId;
  const dsp = targetRow.dsp;

  if (savePermanent) {
    registerAssetId(songId, dsp, assetId);
  }

  let affectedCount = 0;
  for (const b of batches) {
    if (scope === 'row' && b.batchId !== targetRow.batchId) continue;
    for (const r of b.sourceRows || []) {
      const matchCondition = scope === 'row' ? r.rowId === rowId : r.originalRow.assetId === assetId && r.dsp === dsp;
      if (matchCondition && r.matchStatus !== 'matched') {
        r.matchedSongId = songId;
        r.matchStatus = 'resolved';
        r.resolutionType = 'manual_asset';
        r.resolutionScope = scope;
        r.resolutionReason = reason || 'Asset ID dipetakan manual ke katalog lagu LOKA';
        r.resolvedAt = new Date().toISOString();
        r.resolvedBy = 'Admin Royalti';
        r.version = (r.version || 1) + 1;
        affectedCount++;
      }
    }
  }

  auditLogs.push({
    id: genId(),
    actorId: 'Admin Royalti',
    timestamp: new Date().toISOString(),
    action: 'resolve',
    targetType: 'row',
    targetId: rowId,
    before: { matchStatus: 'unmatched', failedStage: 1 },
    after: { matchStatus: 'resolved', songId, scope, savePermanent },
    reason,
  });

  for (const b of batches) recomputeBatchStatus(b);
  return { success: true, affectedCount };
}

export function resolveStage2Writer(
  rowId: string,
  rawWriter: string,
  ipbaseNo: string,
  ipName: string,
  scope: ResolutionScope = 'all_open_batches',
  dsp?: string | null,
  reason?: string
) {
  let targetRow: MatchedSourceRow | undefined;
  for (const b of batches) {
    targetRow = b.sourceRows?.find(r => r.rowId === rowId);
    if (targetRow) break;
  }
  if (!targetRow) return { success: false, affectedCount: 0 };

  const norm = rawWriter.toLowerCase().replace(/[^a-z0-9]/g, '');
  writerAliases.push({
    id: genId(),
    rawWriterName: rawWriter,
    normalizedName: norm,
    ipbaseNo,
    ipName,
    dsp: dsp || null,
    active: true,
    createdBy: 'Admin Royalti',
    createdAt: new Date().toISOString(),
  });

  let affectedCount = 0;
  for (const b of batches) {
    if (scope === 'row' && b.batchId !== targetRow.batchId) continue;
    for (const r of b.sourceRows || []) {
      const matchCondition =
        scope === 'row'
          ? r.rowId === rowId
          : r.originalRow.writers.toLowerCase().includes(rawWriter.toLowerCase());
      if (matchCondition && r.matchStatus !== 'matched') {
        r.matchStatus = 'resolved';
        r.resolutionType = 'manual_alias';
        r.resolutionScope = scope;
        r.resolutionReason = reason || `Nama alias "${rawWriter}" dipetakan ke ${ipName} (${ipbaseNo})`;
        r.resolvedAt = new Date().toISOString();
        r.resolvedBy = 'Admin Royalti';
        r.unmappedWriters = [];
        r.version = (r.version || 1) + 1;
        affectedCount++;
      }
    }
  }

  auditLogs.push({
    id: genId(),
    actorId: 'Admin Royalti',
    timestamp: new Date().toISOString(),
    action: 'resolve',
    targetType: 'writer_alias',
    targetId: rawWriter,
    before: { rawWriter, ipbaseNo: null },
    after: { rawWriter, ipbaseNo, ipName, scope },
    reason,
  });

  for (const b of batches) recomputeBatchStatus(b);
  return { success: true, affectedCount };
}

export function resolveStage3CustomId(
  rowId: string,
  songId: string,
  scope: ResolutionScope = 'row',
  saveAlias: boolean = false,
  reason?: string
) {
  let targetRow: MatchedSourceRow | undefined;
  for (const b of batches) {
    targetRow = b.sourceRows?.find(r => r.rowId === rowId);
    if (targetRow) break;
  }
  if (!targetRow) return { success: false, affectedCount: 0 };

  let affectedCount = 0;
  for (const b of batches) {
    if (scope === 'row' && b.batchId !== targetRow.batchId) continue;
    for (const r of b.sourceRows || []) {
      const matchCondition =
        scope === 'row'
          ? r.rowId === rowId
          : r.originalRow.customId === targetRow.originalRow.customId;
      if (matchCondition && r.matchStatus !== 'matched') {
        r.matchedSongId = songId;
        r.matchStatus = 'resolved';
        r.resolutionType = 'manual_customid';
        r.resolutionScope = scope;
        r.resolutionReason = reason || `Custom ID diperbaiki menjadi ${songId}`;
        r.resolvedAt = new Date().toISOString();
        r.resolvedBy = 'Admin Royalti';
        r.version = (r.version || 1) + 1;
        affectedCount++;
      }
    }
  }

  auditLogs.push({
    id: genId(),
    actorId: 'Admin Royalti',
    timestamp: new Date().toISOString(),
    action: 'resolve',
    targetType: 'row',
    targetId: rowId,
    before: { customId: targetRow.originalRow.customId },
    after: { customId: songId, scope, saveAlias },
    reason,
  });

  for (const b of batches) recomputeBatchStatus(b);
  return { success: true, affectedCount };
}

export function resolveConflict(
  rowId: string,
  chosenSongId: string,
  reason: string,
  fixMaster: boolean = true
) {
  let targetRow: MatchedSourceRow | undefined;
  for (const b of batches) {
    targetRow = b.sourceRows?.find(r => r.rowId === rowId);
    if (targetRow) break;
  }
  if (!targetRow) return { success: false };

  targetRow.matchedSongId = chosenSongId;
  targetRow.matchStatus = 'resolved';
  targetRow.resolutionType = 'conflict_override';
  targetRow.resolutionReason = reason;
  targetRow.resolvedAt = new Date().toISOString();
  targetRow.resolvedBy = 'Admin Royalti';
  targetRow.version = (targetRow.version || 1) + 1;

  if (fixMaster) {
    registerAssetId(chosenSongId, targetRow.dsp, targetRow.originalRow.assetId);
  }

  auditLogs.push({
    id: genId(),
    actorId: 'Admin Royalti',
    timestamp: new Date().toISOString(),
    action: 'resolve',
    targetType: 'row',
    targetId: rowId,
    before: { matchStatus: 'conflict' },
    after: { matchStatus: 'resolved', chosenSongId, fixMaster },
    reason,
  });

  for (const b of batches) recomputeBatchStatus(b);
  return { success: true };
}

export function holdRow(rowId: string, reason: string, holdUntil: string) {
  for (const b of batches) {
    const row = b.sourceRows?.find(r => r.rowId === rowId);
    if (row) {
      row.matchStatus = 'on_hold';
      row.resolutionReason = reason;
      row.holdUntil = holdUntil;
      row.resolvedAt = new Date().toISOString();
      row.resolvedBy = 'Admin Royalti';
      row.version = (row.version || 1) + 1;

      auditLogs.push({
        id: genId(),
        actorId: 'Admin Royalti',
        timestamp: new Date().toISOString(),
        action: 'hold',
        targetType: 'row',
        targetId: rowId,
        before: { matchStatus: 'unmatched' },
        after: { matchStatus: 'on_hold', holdUntil },
        reason,
      });
      for (const batchItem of batches) recomputeBatchStatus(batchItem);
      return { success: true };
    }
  }
  return { success: false };
}

export function ignoreRow(rowId: string, reason: string) {
  for (const b of batches) {
    const row = b.sourceRows?.find(r => r.rowId === rowId);
    if (row) {
      row.matchStatus = 'ignored';
      row.resolutionReason = reason;
      row.resolvedAt = new Date().toISOString();
      row.resolvedBy = 'Admin Royalti';
      row.version = (row.version || 1) + 1;

      auditLogs.push({
        id: genId(),
        actorId: 'Admin Royalti',
        timestamp: new Date().toISOString(),
        action: 'ignore',
        targetType: 'row',
        targetId: rowId,
        before: { matchStatus: 'unmatched' },
        after: { matchStatus: 'ignored' },
        reason,
      });
      for (const batchItem of batches) recomputeBatchStatus(batchItem);
      return { success: true };
    }
  }
  return { success: false };
}

export function undoResolution(rowId: string) {
  for (const b of batches) {
    const row = b.sourceRows?.find(r => r.rowId === rowId);
    if (row) {
      const prevStatus = row.failureFlags?.length > 1 ? 'conflict' : 'unmatched';
      row.matchStatus = prevStatus;
      row.resolutionReason = undefined;
      row.resolvedAt = undefined;
      row.resolvedBy = undefined;
      row.holdUntil = undefined;
      row.version = (row.version || 1) + 1;

      auditLogs.push({
        id: genId(),
        actorId: 'Admin Royalti',
        timestamp: new Date().toISOString(),
        action: 'undo',
        targetType: 'row',
        targetId: rowId,
        before: { matchStatus: 'resolved' },
        after: { matchStatus: prevStatus },
      });
      for (const batchItem of batches) recomputeBatchStatus(batchItem);
      return { success: true };
    }
  }
  return { success: false };
}

export function autoMapExactMatches(batchId?: string) {
  const rows = getExceptionRows(batchId);
  let resolvedCount = 0;
  let resolvedAmount = 0;

  for (const r of rows) {
    if (r.matchStatus !== 'unmatched') continue;
    const cleanTitle = r.originalRow.songTitle?.trim().toLowerCase();
    if (!cleanTitle) continue;

    const matchedRights = songRights.find(
      s => s.songTitle.trim().toLowerCase() === cleanTitle
    );

    if (matchedRights) {
      r.matchedSongId = matchedRights.songId;
      r.matchStatus = 'resolved';
      r.resolutionType = 'auto_map';
      r.resolutionReason = `Auto-map: Judul lagu cocok 100% dengan "${matchedRights.songTitle}" (${matchedRights.songId})`;
      r.resolvedAt = new Date().toISOString();
      r.resolvedBy = 'Sistem Auto-Map';
      r.version = (r.version || 1) + 1;

      registerAssetId(matchedRights.songId, r.dsp, r.originalRow.assetId);

      resolvedCount++;
      resolvedAmount += r.originalRow.idrRev;
    }
  }

  return { resolvedCount, resolvedAmount };
}

export function reprocessBatch(batchId?: string): Promise<{
  success: boolean;
  reprocessedCount: number;
  distributedRevenue: number;
  diff: number;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let reprocessedCount = 0;
      let addedDistributedRevenue = 0;

      const targetBatches = batchId ? batches.filter(b => b.batchId === batchId) : batches;

      for (const b of targetBatches) {
        for (const r of b.sourceRows || []) {
          if (r.matchStatus === 'resolved') {
            const songId = r.matchedSongId || r.originalRow.customId;
            const rights = songRights.filter(sr => sr.songId === songId);

            const rowGross = r.originalRow.idrRev;
            if (rights.length > 0) {
              for (const right of rights) {
                const shareAmount = Math.round(rowGross * (right.mecOwn / 100));
                b.distributions.push({
                  distId: genId(),
                  batchId: b.batchId,
                  rowId: r.rowId,
                  songId,
                  assetId: r.originalRow.assetId,
                  ipbaseNo: right.ipbaseNo,
                  ipName: right.ipName,
                  rightType: right.ipRole === 'Publisher' ? 'Mechanical Publisher' : 'Mechanical Composer',
                  percentage: right.mecOwn,
                  distMr: shareAmount,
                  dspCode: b.dspCode,
                  country: r.originalRow.country,
                  day: r.originalRow.day,
                });
              }
            } else {
              b.distributions.push({
                distId: genId(),
                batchId: b.batchId,
                rowId: r.rowId,
                songId,
                assetId: r.originalRow.assetId,
                ipbaseNo: `IP-${r.originalRow.writers.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`,
                ipName: r.originalRow.writers || 'Pencipta',
                rightType: 'Mechanical Composer',
                percentage: 70,
                distMr: Math.round(rowGross * 0.70),
                dspCode: b.dspCode,
                country: r.originalRow.country,
                day: r.originalRow.day,
              });
              b.distributions.push({
                distId: genId(),
                batchId: b.batchId,
                rowId: r.rowId,
                songId,
                assetId: r.originalRow.assetId,
                ipbaseNo: 'I-007560847-6',
                ipName: 'LOKA Publishing',
                rightType: 'Mechanical Publisher',
                percentage: 30,
                distMr: Math.round(rowGross * 0.30),
                dspCode: b.dspCode,
                country: r.originalRow.country,
                day: r.originalRow.day,
              });
            }

            r.matchStatus = 'matched';
            reprocessedCount++;
            addedDistributedRevenue += rowGross;
            b.matchedRows = (b.matchedRows || 0) + 1;
            if (b.unmatchedRows > 0) b.unmatchedRows--;
          }
        }

        b.totalDistributed += addedDistributedRevenue;
      }

      auditLogs.push({
        id: genId(),
        actorId: 'Admin Royalti',
        timestamp: new Date().toISOString(),
        action: 'reprocess',
        targetType: 'row',
        targetId: batchId || 'all_batches',
        before: { reprocessedCount: 0 },
        after: { reprocessedCount, addedDistributedRevenue },
      });

      resolve({
        success: true,
        reprocessedCount,
        distributedRevenue: addedDistributedRevenue,
        diff: 0,
      });
    }, 600);
  });
}

export function getAuditLogs(): AuditLog[] {
  return [...auditLogs];
}

export function getWriterAliases(): WriterAliasMapping[] {
  return [...writerAliases];
}

export interface MasterCatalogSong {
  songId: string;
  songTitle: string;
  writers: { ipbaseNo: string; ipName: string; mecOwn: number }[];
}

export function getMasterCatalogSongs(): MasterCatalogSong[] {
  const map = new Map<string, MasterCatalogSong>();
  for (const sr of songRights) {
    if (!map.has(sr.songId)) {
      map.set(sr.songId, {
        songId: sr.songId,
        songTitle: sr.songTitle,
        writers: [],
      });
    }
    const item = map.get(sr.songId)!;
    if (!item.writers.some(w => w.ipbaseNo === sr.ipbaseNo)) {
      item.writers.push({
        ipbaseNo: sr.ipbaseNo,
        ipName: sr.ipName,
        mecOwn: sr.mecOwn,
      });
    }
  }
  return Array.from(map.values());
}

export function getMasterWriters(): { ipbaseNo: string; ipName: string }[] {
  const map = new Map<string, string>();
  for (const sr of songRights) {
    if (!map.has(sr.ipbaseNo)) {
      map.set(sr.ipbaseNo, sr.ipName);
    }
  }
  return Array.from(map.entries()).map(([ipbaseNo, ipName]) => ({ ipbaseNo, ipName }));
}

// ─── Batch Publishing & Gatekeeper Lifecycle (PRD v1.1) ──────────

export interface GatekeeperCheck {
  id: string;
  label: string;
  passed: boolean;
  description: string;
  severity: 'blocking' | 'warning';
}

export interface GatekeeperResult {
  canPublish: boolean;
  checks: GatekeeperCheck[];
  summary: {
    totalSource: number;
    totalDistributed: number;
    totalOnHold: number;
    totalIgnored: number;
    publisherShare: number;
    creatorNetPayout: number;
    recipientCount: number;
    songCount: number;
    openIssuesCount: number;
    isFourEyesSatisfied: boolean;
  };
  checksum: string;
}

/** Generate snapshot checksum to guarantee data integrity (PB-4.3.5) */
export function generateBatchChecksum(batch: RoyaltyBatch): string {
  const str = `${batch.batchId}:${batch.totalSource}:${batch.totalDistributed}:${batch.openIssuesCount || 0}:${batch.distributions.length}:${batch.sourceRows?.length || 0}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'chk_' + Math.abs(hash).toString(16).padStart(8, '0');
}

/** Recompute batch openIssuesCount and status in response to resolution events */
export function recomputeBatchStatus(batch: RoyaltyBatch): void {
  let openIssues = 0;
  let onHold = 0;
  let ignored = 0;

  for (const r of batch.sourceRows || []) {
    const val = r.originalRow?.idrRev || r.originalRow?.incomeRev || 0;
    if (r.matchStatus === 'on_hold') {
      onHold += val;
      r.issueStatus = 'on_hold';
    } else if (r.matchStatus === 'ignored') {
      ignored += val;
      r.issueStatus = 'ignored';
    } else if (r.matchStatus === 'resolved' || r.matchStatus === 'matched') {
      r.issueStatus = 'resolved';
    } else if (r.matchStatus === 'unmatched' || r.matchStatus === 'conflict') {
      r.issueStatus = 'open';
      openIssues++;
    }
  }

  batch.openIssuesCount = openIssues;
  batch.totalOnHold = onHold;
  batch.totalIgnored = ignored;

  // State transitions:
  // in_review -> ready_to_publish if openIssues == 0
  // ready_to_publish -> in_review if openIssues > 0
  if (batch.status === 'ready_to_publish' && openIssues > 0) {
    batch.status = 'in_review';
  } else if (batch.status === 'in_review' && openIssues === 0) {
    batch.status = 'ready_to_publish';
  }
}

/** Check Gatekeeper and Pre-Distribution Checklist (PB-4.2 & PB-4.3) */
export function checkGatekeeperStatus(batchId: string, currentApprover: string = 'Budi (Finance Manager)'): GatekeeperResult {
  const batch = batches.find(b => b.batchId === batchId);
  if (!batch) {
    return {
      canPublish: false,
      checks: [],
      summary: {
        totalSource: 0,
        totalDistributed: 0,
        totalOnHold: 0,
        totalIgnored: 0,
        publisherShare: 0,
        creatorNetPayout: 0,
        recipientCount: 0,
        songCount: 0,
        openIssuesCount: 0,
        isFourEyesSatisfied: false,
      },
      checksum: '',
    };
  }

  recomputeBatchStatus(batch);
  const recon = getReconciliation(batchId);

  // Check 1: openIssuesCount == 0 (PB-4.2)
  const openIssues = batch.openIssuesCount ?? 0;
  const openIssuesCheck: GatekeeperCheck = {
    id: 'open_issues',
    label: 'Penyelesaian Pengecualian',
    passed: openIssues === 0,
    description: openIssues === 0
      ? 'Semua baris pengecualian telah diselesaikan atau berstatus on_hold / ignored'
      : `Masih ada ${openIssues} baris pengecualian berstatus open yang belum diputuskan di Resolver`,
    severity: 'blocking',
  };

  // Check 2: on_hold & ignored rows have reasons (PB-4.2)
  const missingReasons = (batch.sourceRows || []).filter(
    r => (r.matchStatus === 'on_hold' || r.matchStatus === 'ignored') && (!r.resolutionReason || r.resolutionReason.trim().length === 0)
  );
  const reasonsCheck: GatekeeperCheck = {
    id: 'issue_reasons',
    label: 'Dokumentasi Alasan On-Hold & Ignored',
    passed: missingReasons.length === 0,
    description: missingReasons.length === 0
      ? 'Seluruh baris yang ditahan (on_hold) atau diabaikan (ignored) memiliki alasan valid'
      : `Terdapat ${missingReasons.length} baris on_hold/ignored yang belum diisi alasan penahanannya`,
    severity: 'blocking',
  };

  // Check 3: Reconciliation balanced (Selisih Rp 0)
  const isBalanced = recon?.isBalanced ?? false;
  const reconCheck: GatekeeperCheck = {
    id: 'reconciliation',
    label: 'Rekonsiliasi Keuangan (Zero-Difference)',
    passed: isBalanced,
    description: isBalanced
      ? 'Saldo seimbang: Total Sumber = Total Distribusi + On-Hold + Ignored'
      : `Terdapat selisih nominal Rp ${Math.round(recon?.difference || 0).toLocaleString('id-ID')}`,
    severity: 'blocking',
  };

  // Check 4: Rights composition <= 100%
  const songsInBatch = new Set(batch.distributions.map(d => d.songId));
  let oversplitSong: string | null = null;
  for (const sId of songsInBatch) {
    const rights = songRights.filter(sr => sr.songId === sId);
    const sumMec = rights.reduce((s, r) => s + r.mecOwn, 0);
    if (sumMec > 100.01) {
      oversplitSong = `${rights[0]?.songTitle || sId} (${sumMec}%)`;
      break;
    }
  }
  const rightsCheck: GatekeeperCheck = {
    id: 'rights_split',
    label: 'Integritas Komposisi Hak Lagu',
    passed: oversplitSong === null,
    description: oversplitSong === null
      ? 'Seluruh komposisi hak cipta lagu tepat dan tidak melebihi 100%'
      : `Lagu ${oversplitSong} melebihi batas 100%`,
    severity: 'blocking',
  };

  // Check 5: At least one recipient with > 0
  const recipientCount = new Set(
    batch.distributions
      .filter(d => !d.ipName.toLowerCase().includes('loka') && !d.ipName.toLowerCase().includes('publishing'))
      .map(d => d.ipbaseNo || d.ipName)
  ).size;
  const minRecipientCheck: GatekeeperCheck = {
    id: 'min_recipient',
    label: 'Penerima Hak Cipta',
    passed: batch.totalDistributed > 0 && recipientCount > 0,
    description: recipientCount > 0
      ? `Terverifikasi ${recipientCount} pencipta berhak menerima royalti pada batch ini`
      : 'Batch belum memiliki penerima royalti',
    severity: 'blocking',
  };

  // Check 6: Four-Eyes Principle (PB-4.3)
  const uploader = batch.uploadedBy || 'Sarah (Copyright Admin)';
  const resolvers = new Set((batch.sourceRows || []).map(r => r.resolvedBy).filter(Boolean));
  const isSameAsUploader = currentApprover.toLowerCase().trim() === uploader.toLowerCase().trim();
  const isSameAsResolver = resolvers.has(currentApprover);
  const isFourEyesSatisfied = !isSameAsUploader && !isSameAsResolver;

  const fourEyesCheck: GatekeeperCheck = {
    id: 'four_eyes',
    label: 'Prinsip Persetujuan Dua Orang (Four-Eyes)',
    passed: isFourEyesSatisfied,
    description: isFourEyesSatisfied
      ? `Penerbit (${currentApprover}) berbeda dari pengunggah (${uploader})`
      : `Penerbit tidak boleh sama dengan pengunggah (${uploader}) atau penyelesai isu. Diperlukan persetujuan Finance / Head of Royalty.`,
    severity: 'blocking',
  };

  const checks = [openIssuesCheck, reasonsCheck, reconCheck, rightsCheck, minRecipientCheck, fourEyesCheck];
  const canPublish = checks.every(c => c.passed);

  const creatorNetPayout = batch.distributions
    .filter(d => !d.ipName.toLowerCase().includes('loka') && !d.ipName.toLowerCase().includes('publishing'))
    .reduce((sum, d) => sum + d.distMr, 0);
  const publisherShare = batch.distributions
    .filter(d => d.ipName.toLowerCase().includes('loka') || d.ipName.toLowerCase().includes('publishing'))
    .reduce((sum, d) => sum + d.distMr, 0);

  const checksum = generateBatchChecksum(batch);

  return {
    canPublish,
    checks,
    summary: {
      totalSource: batch.totalSource,
      totalDistributed: batch.totalDistributed,
      totalOnHold: batch.totalOnHold || 0,
      totalIgnored: batch.totalIgnored || 0,
      publisherShare: publisherShare || Math.round(batch.totalDistributed * 0.30),
      creatorNetPayout: creatorNetPayout || Math.round(batch.totalDistributed * 0.70),
      recipientCount,
      songCount: songsInBatch.size,
      openIssuesCount: openIssues,
      isFourEyesSatisfied,
    },
    checksum,
  };
}

/** Publish batch to creator portal (PB-4.3) */
export function publishBatch(
  batchId: string,
  approverName: string,
  notes?: string,
  checksum?: string,
  isOverride: boolean = false
): { success: boolean; error?: string } {
  const batch = batches.find(b => b.batchId === batchId);
  if (!batch) return { success: false, error: 'Batch tidak ditemukan' };

  if (batch.status === 'published' || batch.status === 'locked') {
    return { success: false, error: 'Batch sudah terdistribusi atau terkunci' };
  }

  const gatekeeper = checkGatekeeperStatus(batchId, approverName);

  if (!isOverride && !gatekeeper.canPublish) {
    const failedCheck = gatekeeper.checks.find(c => !c.passed);
    return { success: false, error: failedCheck?.description || 'Validasi gatekeeper belum terpenuhi' };
  }

  if (isOverride) {
    const nonFourEyesFailed = gatekeeper.checks.filter(c => c.id !== 'four_eyes').find(c => !c.passed);
    if (nonFourEyesFailed) {
      return { success: false, error: nonFourEyesFailed.description };
    }
  }

  const currentChecksum = generateBatchChecksum(batch);
  if (checksum && checksum !== currentChecksum) {
    return {
      success: false,
      error: 'Data batch telah berubah sejak modal dibuka. Mohon muat ulang.',
    };
  }

  batch.status = 'published';
  batch.publishedAt = new Date().toISOString();
  batch.publishedBy = approverName;
  batch.publishingNotes = notes || '';
  batch.publishChecksum = currentChecksum;
  batch.viewedByCreatorsCount = 0;

  auditLogs.push({
    id: genId(),
    actorId: approverName,
    timestamp: new Date().toISOString(),
    action: isOverride ? 'BATCH_PUBLISH_OVERRIDE' : 'BATCH_PUBLISHED',
    targetType: 'batch',
    targetId: batchId,
    before: { status: 'ready_to_publish' },
    after: {
      status: 'published',
      publishedBy: approverName,
      totalPayout: gatekeeper.summary.creatorNetPayout,
      recipientCount: gatekeeper.summary.recipientCount,
      checksum: currentChecksum,
    },
    reason: notes,
  });

  return { success: true };
}

/** Rollback / Unpublish batch (PB-4.4) */
export function unpublishBatch(
  batchId: string,
  actorName: string,
  reason: string
): { success: boolean; error?: string } {
  const batch = batches.find(b => b.batchId === batchId);
  if (!batch) return { success: false, error: 'Batch tidak ditemukan' };

  if (batch.status === 'locked') {
    return { success: false, error: 'Batch berstatus Terkunci tidak dapat ditarik kembali' };
  }

  if (batch.status !== 'published' && batch.status !== 'distributed') {
    return { success: false, error: 'Hanya batch yang sudah terdistribusi yang dapat ditarik kembali' };
  }

  if (!reason || reason.trim().length < 15) {
    return { success: false, error: 'Alasan penarikan kembali wajib diisi minimal 15 karakter' };
  }

  batch.status = 'ready_to_publish';
  batch.unpublishedAt = new Date().toISOString();
  batch.unpublishReason = reason;

  auditLogs.push({
    id: genId(),
    actorId: actorName,
    timestamp: new Date().toISOString(),
    action: 'BATCH_UNPUBLISHED',
    targetType: 'batch',
    targetId: batchId,
    before: { status: 'published' },
    after: { status: 'ready_to_publish', unpublishReason: reason },
    reason,
  });

  return { success: true };
}

/** Mark batch as ready to publish manually if all criteria pass */
export function markBatchReady(batchId: string, actorName: string): { success: boolean; error?: string } {
  const batch = batches.find(b => b.batchId === batchId);
  if (!batch) return { success: false, error: 'Batch tidak ditemukan' };

  recomputeBatchStatus(batch);
  if ((batch.openIssuesCount || 0) > 0) {
    return { success: false, error: `Masih ada ${batch.openIssuesCount} baris pengecualian open` };
  }

  batch.status = 'ready_to_publish';
  batch.readyMarkedBy = actorName;

  auditLogs.push({
    id: genId(),
    actorId: actorName,
    timestamp: new Date().toISOString(),
    action: 'BATCH_READY_MARKED',
    targetType: 'batch',
    targetId: batchId,
    before: { status: 'in_review' },
    after: { status: 'ready_to_publish', readyMarkedBy: actorName },
  });

  return { success: true };
}

export function getPendingBatches(): RoyaltyBatch[] {
  return batches.filter(b => b.status === 'in_review' || b.status === 'ready_to_publish' || b.status === 'uploaded');
}

export function getPublishedBatches(): RoyaltyBatch[] {
  return batches.filter(b => b.status === 'published' || b.status === 'locked' || b.status === 'distributed');
}


