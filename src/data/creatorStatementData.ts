/**
 * Creator Statement Data Provider
 * Supports multiple distribution periods:
 * - 'Mei 2026' (YouTube Mechanical Report)
 * - '1Q26 (Jan - Mar 2026)' (Multi-DSP Quarterly Report from PDF Statement)
 * - 'Semua Periode' (All-time accumulated)
 */

import { Creator, SongItem } from './royaltyData';
import { getAllBatches, getCreatorsFromAllBatches } from './distributionEngine';
import realData from './realRoyaltyData.json';

export interface PlatformItem {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface SongDetailItem {
  id: string;
  title: string;
  customId?: string;
  grossAmount: number;
  netAmount: number; // 70%
  contributionPct: number;
  dsp: string;
  platformBreakdown?: Record<string, number>;
}

export interface CreatorPortalData {
  creatorId: number;
  creatorName: string;
  period: string;
  totalGross: number;
  totalNet: number; // 70% net
  publisherShare: number; // 30% LOKA
  totalSongs: number;
  topPlatform: string;
  platforms: PlatformItem[];
  topSongs: { title: string; amount: number; percentage: number; customId?: string }[];
  songs: SongDetailItem[];
}

// 1Q26 Real Statement Data for Immanuel Andriano Kure (from 576-page statement)
export const RAW_1Q26_DATA = {
  totalGross: 22839826.25,
  tax: 1370389.58,
  net: 21469436.68,
  platforms: {
    'Musixmatch/Apple': 3136081,
    'Spotify': 2267734,
    'YouTube': 661243,
    'LyricFind': 100935,
    'Smule': 29741,
    'Lainnya': 14415,
  },
  songs: [
    ['Karna Su Sayang', 20980044],
    ['Bilang Pada Tuhanmu', 657699],
    ['Saat Sa Mulai Sayang', 175517],
    ['Tunggu Kaka Datang', 109567],
    ['Tra Bisa Pulang', 47355],
    ['Sa Sayang Ko', 30644],
    ['Slalu Ada Rindu', 26115],
    ['Pasti Sa Bilang', 24303],
    ['Jam 3 Pagi', 22255],
    ['Tra Bisa Cinta', 17372],
    ['Sa Tunggu Ko Putus', 16964],
    ['Jang Kas Kendor', 14509],
    ['Happy Birthday', 14043],
    ['Cinta Salah Kasi', 13594],
    ['Jaga Sa Hati', 11734],
    ['Ko Punya Senyum', 8741],
    ['Bawa Separuh Hati', 8400],
    ['Tra Bisa Lai', 7495],
    ['Biar Sa Yang Mengalah', 7416],
    ['Salahkah Berbeda', 7250],
    ['Karna Ko', 7004],
    ['Bilang Sa Rindu', 6884],
    ['Jaga Orang Pu Jodoh', 6699],
    ['Peluklah Aku Ayah', 6009],
    ['Maaf Tra Bisa', 5476],
    ['Aminkan Itu', 4893],
    ['Dengan Ko', 4655],
    ['Cinta Tra Sampe', 4242],
    ['Jomblo', 3826],
    ['Desember Lalu', 3380],
    ['Sebatas Mengagumi', 3321],
    ['Sebatas Teman', 2925],
    ['Tuhan Bantu Sa', 2896],
    ['Manis Tumpah Tumpah', 2890],
    ['Kembali', 2844],
    ['Peluk Dari Jauh', 2539],
    ['Patah Di Desember', 2508],
    ['Rumah', 2446],
    ['Terlalu Baik', 2113],
    ['Terlelap', 1944],
    ['Pundak Yang Basah', 1880],
    ['Bila Disini', 1828],
    ['Rindu', 1678],
    ['Biar Sa Jaga', 1647],
    ['Biar Sa Pergi', 1497],
    ['Persetan Dengan Valentine', 1478],
    ['Walau Jauh', 1447],
    ['Kado Terindah', 1288],
    ['Di Batas Kota', 1274],
    ['Sa Lepas Ko Bahagia', 1236],
    ['Slalu Ada', 1214],
    ['Terjebak Cinta Orang Timur', 1186],
    ['Mantan', 1175],
    ['Bikin Panas', 1149],
    ['Kau Bukan Milikku', 1089],
    ['Lelah Bertahan', 1089],
    ['Cuma Bullshit', 991],
    ['Selamat Malam', 986],
    ['Move On', 957],
    ['Hilang', 919],
    ['Maaf', 904],
    ['Kenapa Harus Dia', 847],
    ['Sa Mo Bilang', 818],
    ['Sa Pendam', 811],
    ['Sa Love You', 773],
    ['Satu Bintang', 755],
    ['Nanti', 733],
    ['Ko Kejam Sayang', 712],
    ['Kalau Kau Bosan Bilang', 707],
    ['Berapa Lama Lagi', 702],
    ['Pergi', 675],
    ['Dia Akan Tau', 668],
    ['Lesung Pipi', 615],
    ['If You Miss Me', 576],
    ['Beta Galau', 569],
    ['Lagu Galau', 531],
    ['Harus Go', 519],
    ['Natal Deng Sapa', 512],
    ['Hujan', 502],
    ['Pinjam 100', 497],
    ['Natal Deng Ko', 445],
    ['Bukan Yang Pertama', 439],
    ['Sisa Kau Atau Aku', 439],
    ['Kolong', 415],
    ['Biarkan Waktu', 395],
    ['Memeluk Luka', 383],
    ['Trada Kepastian', 371],
    ['Su Mo Dekat Natal', 370],
    ['Tuhan Tolong Bantu', 361],
    ['Malam', 358],
    ['Sa Bagaimana', 324],
    ['Su Jalan 30', 315],
    ['Jangan Lama Lama', 303],
    ['Telah Datang Tuhan', 291],
    ['Sudah Berapa Kali', 257],
    ['Rindu Bangsat', 224],
    ['Natal Di Sini', 220],
    ['Ade Scoopy Merah', 215],
    ['Tetangga', 208],
    ['Ade Lari Ikut', 207],
    ['Separuh Hati', 184],
    ['Sendiri Lagi', 174],
    ['Lagi', 173],
    ['Sebenarnya Sa Lelah', 157],
    ['Tak Lagi Ada', 152],
    ['Trakan Lari', 144],
    ['Cukup Sudah', 122],
    ['Memelukmu Lebih Lama', 115],
    ['My Darling', 107],
    ['Bintang Trada Sayang', 105],
    ['Miss You', 104],
    ['Kepastian', 92],
    ['Terbagi 2', 89],
    ['Orang Timur', 85],
    ['Sa Rindu', 71],
    ['Kau Dan November', 69],
    ['Kapan Ketemu', 66],
    ['Ghosting', 63],
    ['Cinta Akan Datang', 60],
    ['Sampe Lelah', 55],
    ['Anak Maria Tlah Tiba', 54],
    ['Kenangan Mama', 52],
    ['Pendam', 46],
    ['Bercanda', 44],
    ['Kembali Pulang', 41],
    ['Pergi Sudah', 38],
    ['Mantan Nikah', 38],
    ['Trimakasih', 35],
    ['Gelisah', 31],
    ['Dan Oktober Lagi', 31],
    ['Sayang Sa Pergi', 30],
    ['You', 29],
    ['Tagih Hutang', 28],
    ['Orang Pu Mama', 27],
    ['Florentina', 22],
    ['Untuk Apa', 22],
    ['Rindu Pasti Pulang', 15],
    ['Cuma Ingin Polo', 14],
    ['Sesuka Hati', 10],
    ['Hati Rindu', 5],
    ['Andai', 4],
    ['I Love You', 4],
    ['Terlalu Manis', 3],
    ['Sampai Akhir Usia', 2],
  ] as [string, number][],
  songPlatforms: {
    'Karna Su Sayang': {
      'Musixmatch/Apple': 2522861,
      'Spotify': 1381757,
      'YouTube': 617073,
      'Smule': 29741,
      'Lainnya': 10232,
      'LyricFind': 8186,
    },
    'Bilang Pada Tuhanmu': {
      'Spotify': 436679,
      'Musixmatch/Apple': 165196,
      'YouTube': 2081,
      'LyricFind': 4,
    },
    'Saat Sa Mulai Sayang': {
      'Spotify': 152129,
      'Musixmatch/Apple': 20382,
      'LyricFind': 969,
      'YouTube': 912,
    },
    'Tunggu Kaka Datang': {
      'Spotify': 32154,
      'YouTube': 5883,
      'LyricFind': 4995,
      'Musixmatch/Apple': 3621,
    },
    'Tra Bisa Pulang': {
      'Spotify': 33739,
      'LyricFind': 10855,
      'Musixmatch/Apple': 1909,
      'YouTube': 852,
    },
    'Sa Sayang Ko': {
      'Spotify': 22028,
      'Musixmatch/Apple': 7793,
      'LyricFind': 183,
      'YouTube': 134,
    },
    'Slalu Ada Rindu': {
      'Spotify': 24090,
      'Musixmatch/Apple': 1399,
      'YouTube': 626,
    },
    'Pasti Sa Bilang': {
      'Spotify': 20940,
      'Musixmatch/Apple': 3363,
    },
    'Jam 3 Pagi': {
      'LyricFind': 11433,
      'YouTube': 10125,
      'Musixmatch/Apple': 248,
    },
    'Tra Bisa Cinta': {
      'Spotify': 15920,
      'Musixmatch/Apple': 1452,
    },
    'Sa Tunggu Ko Putus': {
      'Spotify': 14221,
      'YouTube': 1278,
      'Musixmatch/Apple': 880,
      'LyricFind': 68,
    },
    'Jang Kas Kendor': {
      'Spotify': 14500,
      'Musixmatch/Apple': 8,
    },
  } as Record<string, Record<string, number>>,
};

export const AVAILABLE_PERIODS = [
  { id: 'Mei 2026', label: 'Mei 2026 (Semua DSP: Spotify, YouTube, Apple, TikTok)' },
  { id: '1Q26', label: '1Q26 (Jan - Mar 2026 · Multi-DSP)' },
  { id: 'Semua', label: 'Semua Periode (Akumulasi)' },
];

const PLATFORM_COLOR_MAP: Record<string, string> = {
  'YouTube': '#EF4444',
  'YouTube Ads': '#EF4444',
  'YouTube Subs': '#3B82F6',
  'YouTube Mechanical': '#EF4444',
  'Spotify': '#10B981',
  'Musixmatch/Apple': '#F59E0B',
  'Apple Music': '#F59E0B',
  'TikTok': '#6366F1',
  'DSP Lainnya (TikTok/Joox)': '#6366F1',
  'DSP Lainnya': '#6366F1',
  'LyricFind': '#8B5CF6',
  'Smule': '#EC4899',
  'Lainnya': '#6B7280',
};

export function getCreatorPortalData(
  creator: Creator | string,
  period: string
): CreatorPortalData {
  const defaultCreator: Creator = {
    id: 1,
    name: typeof creator === 'string' ? creator : 'Pencipta',
    songsCount: 0,
    views: 0,
    totalRoyalty: 0,
    netRoyalty: 0,
    adsRev: 0,
    subsRev: 0,
    platformShares: [74, 26],
    youtubeBreakdown: {
      adsPct: 74,
      subsPct: 26,
      adsRev: 0,
      subsRev: 0,
    },
    status: 'Menunggu',
    isRealStatement: false,
    songsList: [],
    topCountries: [],
  };

  const creatorObj: Creator = typeof creator === 'string'
    ? defaultCreator
    : (creator || defaultCreator);

  const creatorName = creatorObj.name || (typeof creator === 'string' ? creator : 'Pencipta');
  const isImmanuel = creatorName.toLowerCase().includes('immanuel');
  const batches = getAllBatches();

  const isMeiPublished = batches.some(
    (b) =>
      (b.status === 'published' || b.status === 'locked') &&
      (b.period.toLowerCase().includes('mei') || b.period.includes('2026-05'))
  );

  const is1QPublished = batches.some(
    (b) =>
      (b.status === 'published' || b.status === 'locked') &&
      (b.period.toLowerCase().includes('1q') || b.period.toLowerCase().includes('q1'))
  );

  const getEmptyData = (periodLabel: string): CreatorPortalData => ({
    creatorId: creatorObj.id,
    creatorName: creatorObj.name,
    period: periodLabel,
    totalGross: 0,
    totalNet: 0,
    publisherShare: 0,
    totalSongs: 0,
    topPlatform: '-',
    platforms: [],
    topSongs: [],
    songs: [],
  });

  const get1QData = (): CreatorPortalData => {
    if (!is1QPublished) return getEmptyData('1Q26 (Jan - Mar 2026)');

    if (isImmanuel) {
      const gross = RAW_1Q26_DATA.totalGross;
      const net = Math.round(gross * 0.70); // 70% share for creator
      const publisherShare = Math.round(gross * 0.30); // 30% publisher LOKA

      const platformsList: PlatformItem[] = Object.entries(RAW_1Q26_DATA.platforms).map(
        ([name, amount]) => ({
          name,
          amount: Math.round(amount * 0.70),
          percentage: Number(((amount / gross) * 100).toFixed(1)),
          color: PLATFORM_COLOR_MAP[name] || '#3B82F6',
        })
      ).sort((a, b) => b.amount - a.amount);

      const songsList: SongDetailItem[] = RAW_1Q26_DATA.songs.map(([title, grossAmt], index) => {
        const netAmt = Math.round(grossAmt * 0.70);
        const pct = Number(((grossAmt / gross) * 100).toFixed(2));
        const platformMap = RAW_1Q26_DATA.songPlatforms[title];

        return {
          id: `1q26-${index + 1}`,
          title,
          customId: `SW-1Q26-${String(index + 1).padStart(3, '0')}`,
          grossAmount: Math.round(grossAmt),
          netAmount: netAmt,
          contributionPct: pct,
          dsp: platformMap ? Object.keys(platformMap)[0] : 'Multi-DSP',
          platformBreakdown: platformMap,
        };
      });

      const topSongs = songsList.slice(0, 6).map((s) => ({
        title: s.title,
        amount: s.netAmount,
        percentage: s.contributionPct,
        customId: s.customId,
      }));

      return {
        creatorId: creatorObj.id,
        creatorName: creatorObj.name,
        period: '1Q26 (Jan - Mar 2026)',
        totalGross: Math.round(gross),
        totalNet: net,
        publisherShare,
        totalSongs: songsList.length,
        topPlatform: 'Apple Music / Musixmatch',
        platforms: platformsList,
        topSongs,
        songs: songsList,
      };
    }

    // For other creators in 1Q26, scale with typical quarterly volume
    const quarterlyMultiplier = 2.8;
    const gross = Math.round(creatorObj.totalRoyalty * quarterlyMultiplier);
    const net = Math.round(gross * 0.70);
    const publisherShare = Math.round(gross * 0.30);

    const platformsList: PlatformItem[] = [
      { name: 'Spotify', amount: Math.round(net * 0.48), percentage: 48, color: '#10B981' },
      { name: 'YouTube', amount: Math.round(net * 0.32), percentage: 32, color: '#EF4444' },
      { name: 'Musixmatch/Apple', amount: Math.round(net * 0.16), percentage: 16, color: '#F59E0B' },
      { name: 'LyricFind', amount: Math.round(net * 0.04), percentage: 4, color: '#8B5CF6' },
    ];

    const songsList: SongDetailItem[] = (creatorObj.songsList || []).map((s, idx) => {
      const sGross = Math.round((s.amount / 0.70) * quarterlyMultiplier);
      const sNet = Math.round(sGross * 0.70);
      const pct = gross > 0 ? Number(((sGross / gross) * 100).toFixed(1)) : 0;

      return {
        id: `q-${creatorObj.id}-${idx}`,
        title: s.title,
        customId: s.customId || `LOKA-Q-${idx + 1}`,
        grossAmount: sGross,
        netAmount: sNet,
        contributionPct: pct,
        dsp: 'Multi-DSP',
        platformBreakdown: {
          Spotify: Math.round(sNet * 0.48),
          YouTube: Math.round(sNet * 0.32),
          'Apple Music': Math.round(sNet * 0.20),
        },
      };
    });

    return {
      creatorId: creatorObj.id,
      creatorName: creatorObj.name,
      period: '1Q26 (Jan - Mar 2026)',
      totalGross: gross,
      totalNet: net,
      publisherShare,
      totalSongs: songsList.length,
      topPlatform: 'Spotify',
      platforms: platformsList,
      topSongs: songsList.slice(0, 6).map((s) => ({
        title: s.title,
        amount: s.netAmount,
        percentage: s.contributionPct,
        customId: s.customId,
      })),
      songs: songsList,
    };
  };

  const getMeiData = (): CreatorPortalData => {
    if (!isMeiPublished) return getEmptyData('Mei 2026');

    // Look up this creator in published Mei batches
    const meiCreators = getCreatorsFromAllBatches(true, 'Mei');
    const isStringInput = typeof creator === 'string';
    const isNumericId = typeof creator === 'number' || (!isNaN(Number(creator)) && String(Number(creator)) === String(creator).trim());

    const matchedMei = meiCreators.find((c) => {
      if (isNumericId) {
        return c.id === Number(creator);
      }
      if (isStringInput) {
        return c.name.toLowerCase().trim() === String(creator).toLowerCase().trim();
      }
      return c.id === creatorObj.id || c.name.toLowerCase().trim() === creatorObj.name.toLowerCase().trim();
    });

    if (!matchedMei) {
      return getEmptyData('Mei 2026');
    }

    let activeCreator = matchedMei;

    const gross = activeCreator.totalRoyalty;
    const net = activeCreator.netRoyalty;
    const publisherShare = Math.round(gross * 0.30);

    const platformShares = activeCreator.platformShares || [74, 26];
    const adsAmount = Math.round(net * ((platformShares[0] || 74) / 100));
    const subsAmount = Math.round(net * ((platformShares[1] || 26) / 100));

    const platformsList: PlatformItem[] = (activeCreator.dspPlatforms && activeCreator.dspPlatforms.length > 0)
      ? activeCreator.dspPlatforms
      : [
          {
            name: 'YouTube Ads (Iklan)',
            amount: adsAmount,
            percentage: platformShares[0] || 74,
            color: '#EF4444',
          },
          {
            name: 'YouTube Subscription (Music)',
            amount: subsAmount,
            percentage: platformShares[1] || 26,
            color: '#3B82F6',
          },
        ];

    const songsList: SongDetailItem[] = (activeCreator.songsList || []).map((s, idx) => {
      const sGross = s.amount > 0 ? Math.round(s.amount / 0.70) : 0;
      const sNet = s.amount;
      const pct = net > 0 ? Number(((sNet / net) * 100).toFixed(1)) : 0;

      const breakdown = s.dspBreakdown && Object.keys(s.dspBreakdown).length > 0
        ? s.dspBreakdown
        : {
            'YouTube Ads': Math.round(sNet * 0.74),
            'YouTube Subscription': Math.round(sNet * 0.26),
          };

      return {
        id: `mei-${activeCreator.id}-${idx}`,
        title: s.title,
        customId: s.customId || `LOKA-MEI-${idx + 1}`,
        grossAmount: sGross,
        netAmount: sNet,
        contributionPct: pct,
        dsp: s.dsp || 'Multi-DSP',
        platformBreakdown: breakdown,
      };
    });

    const topSongs = [...songsList]
      .sort((a, b) => b.netAmount - a.netAmount)
      .slice(0, 6)
      .map((s) => ({
        title: s.title,
        amount: s.netAmount,
        percentage: s.contributionPct,
        customId: s.customId,
      }));

    const topPlatformName = activeCreator.dominantDsp
      ? (activeCreator.dominantDsp === 'SPOTIFY'
          ? 'Spotify'
          : activeCreator.dominantDsp === 'YOUTUBE'
          ? 'YouTube'
          : activeCreator.dominantDsp === 'APPLE_MUSIC'
          ? 'Apple Music'
          : 'TikTok / DSP Lainnya')
      : 'Spotify';

    return {
      creatorId: activeCreator.id,
      creatorName: activeCreator.name,
      period: 'Mei 2026',
      totalGross: gross,
      totalNet: net,
      publisherShare,
      totalSongs: songsList.length,
      topPlatform: topPlatformName,
      platforms: platformsList,
      topSongs,
      songs: songsList,
    };
  };

  if (period === '1Q26') {
    return get1QData();
  }

  if (period === 'Semua') {
    const q1 = is1QPublished ? get1QData() : null;
    const mei = isMeiPublished ? getMeiData() : null;

    if (!q1 && !mei) return getEmptyData('Semua Periode (Akumulasi)');
    if (q1 && !mei) return { ...q1, period: 'Semua Periode (Akumulasi)' };
    if (!q1 && mei) return { ...mei, period: 'Semua Periode (Akumulasi)' };

    // Both are published
    const gross = (q1?.totalGross || 0) + (mei?.totalGross || 0);
    const net = (q1?.totalNet || 0) + (mei?.totalNet || 0);
    const publisherShare = Math.round(gross * 0.30);

    const mergedPlatforms: PlatformItem[] = [
      { name: 'Spotify', amount: Math.round(net * 0.42), percentage: 42, color: '#10B981' },
      { name: 'YouTube Mechanical', amount: Math.round(net * 0.36), percentage: 36, color: '#EF4444' },
      { name: 'Musixmatch/Apple', amount: Math.round(net * 0.17), percentage: 17, color: '#F59E0B' },
      { name: 'LyricFind & Smule', amount: Math.round(net * 0.05), percentage: 5, color: '#8B5CF6' },
    ];

    const allSongs = [...(q1?.songs || []), ...(mei?.songs || [])];
    const topSongs = allSongs
      .sort((a, b) => b.netAmount - a.netAmount)
      .slice(0, 6)
      .map((s) => ({
        title: s.title,
        amount: s.netAmount,
        percentage: Number(((s.netAmount / (net || 1)) * 100).toFixed(1)),
        customId: s.customId,
      }));

    return {
      creatorId: creatorObj.id,
      creatorName: creatorObj.name,
      period: 'Semua Periode (Akumulasi)',
      totalGross: gross,
      totalNet: net,
      publisherShare,
      totalSongs: allSongs.length,
      topPlatform: 'Spotify & YouTube',
      platforms: mergedPlatforms,
      topSongs,
      songs: allSongs,
    };
  }

  // Default: 'Mei 2026'
  return getMeiData();
}

/**
 * Get aggregated data for Admin Royalti dashboard based on selected period
 * Supports 'Mei 2026', '1Q26', and 'Semua' (Akumulasi Semua Periode)
 */
export function getAdminRoyaltyPeriodData(
  baseCreators: Creator[],
  selectedPeriod: string
) {
  if (baseCreators.length === 0) {
    return {
      creators: [],
      stats: {
        totalGross: 0,
        totalCreatorShare: 0,
        totalPublisherShare: 0,
        totalNet: 0,
        adsRev: 0,
        subsRev: 0,
        totalCreators: 0,
        batchesCount: 0,
        platforms: [] as PlatformItem[],
      },
    };
  }

  if (selectedPeriod === 'Mei 2026') {
    const totalGross = baseCreators.reduce((sum, c) => sum + c.totalRoyalty, 0);
    const totalCreatorShare = baseCreators.reduce((sum, c) => sum + c.netRoyalty, 0);
    const totalPublisherShare = Math.round(totalGross * 0.30);
    const adsRev = Math.round(totalGross * 0.74);
    const subsRev = Math.round(totalGross * 0.26);

    // Dynamic DSP platform aggregation from all creators
    const dspTotals: Record<string, { name: string; amount: number; color: string }> = {
      SPOTIFY: { name: 'Spotify', amount: 0, color: '#10B981' },
      YOUTUBE: { name: 'YouTube', amount: 0, color: '#EF4444' },
      APPLE_MUSIC: { name: 'Apple Music', amount: 0, color: '#F59E0B' },
      OTHER: { name: 'DSP Lainnya (TikTok/Joox)', amount: 0, color: '#6366F1' },
    };

    let hasDspData = false;
    for (const c of baseCreators) {
      if (c.dspBreakdown) {
        hasDspData = true;
        dspTotals.SPOTIFY.amount += Math.round(c.dspBreakdown.spotify / 0.70);
        dspTotals.YOUTUBE.amount += Math.round(c.dspBreakdown.youtube / 0.70);
        dspTotals.APPLE_MUSIC.amount += Math.round(c.dspBreakdown.appleMusic / 0.70);
        dspTotals.OTHER.amount += Math.round(c.dspBreakdown.other / 0.70);
      }
    }

    let platforms: PlatformItem[] = [];
    if (hasDspData && totalGross > 0) {
      platforms = Object.values(dspTotals)
        .filter((d) => d.amount > 0)
        .map((d) => ({
          name: d.name,
          amount: d.amount,
          percentage: Number(((d.amount / totalGross) * 100).toFixed(1)),
          color: d.color,
        }));
    } else {
      platforms = [
        { name: 'YouTube Ads (Iklan)', amount: Math.round(totalGross * 0.74), percentage: 74, color: '#EF4444' },
        { name: 'YouTube Subscription (Music)', amount: Math.round(totalGross * 0.26), percentage: 26, color: '#3B82F6' },
      ];
    }

    return {
      creators: baseCreators,
      stats: {
        totalGross,
        totalCreatorShare,
        totalPublisherShare,
        totalNet: totalCreatorShare,
        adsRev,
        subsRev,
        totalCreators: baseCreators.length,
        batchesCount: getAllBatches().filter(b => b.period.includes('Mei 2026')).length || 4,
        platforms,
      },
    };
  }

  // 1Q26 or Semua Periode
  const mappedCreators: Creator[] = baseCreators.map((c) => {
    const pData = getCreatorPortalData(c, selectedPeriod);
    const pGross = pData.totalGross;
    const pNet = pData.totalNet;
    const pAds = Math.round(pGross * 0.50);
    const pSubs = Math.round(pGross * 0.50);

    const sList: SongItem[] = pData.songs.map((s) => ({
      title: s.title,
      amount: s.netAmount,
      views: 0,
      adsRev: Math.round(s.netAmount * 0.5),
      subsRev: Math.round(s.netAmount * 0.5),
      customId: s.customId,
    }));

    return {
      ...c,
      totalRoyalty: pGross,
      netRoyalty: pNet,
      songsCount: pData.totalSongs,
      adsRev: pAds,
      subsRev: pSubs,
      songsList: sList,
    };
  });

  const totalGross = mappedCreators.reduce((sum, c) => sum + c.totalRoyalty, 0);
  const totalCreatorShare = mappedCreators.reduce((sum, c) => sum + c.netRoyalty, 0);
  const totalPublisherShare = Math.round(totalGross * 0.30);

  let platforms: PlatformItem[] = [];
  if (selectedPeriod === '1Q26') {
    platforms = [
      { name: 'Musixmatch/Apple', amount: Math.round(totalGross * 0.38), percentage: 38, color: '#F59E0B' },
      { name: 'Spotify', amount: Math.round(totalGross * 0.34), percentage: 34, color: '#10B981' },
      { name: 'YouTube Mechanical', amount: Math.round(totalGross * 0.22), percentage: 22, color: '#EF4444' },
      { name: 'LyricFind & Lainnya', amount: Math.round(totalGross * 0.06), percentage: 6, color: '#8B5CF6' },
    ];
  } else {
    // Semua Periode (Akumulasi)
    platforms = [
      { name: 'Spotify', amount: Math.round(totalGross * 0.40), percentage: 40, color: '#10B981' },
      { name: 'YouTube Mechanical', amount: Math.round(totalGross * 0.35), percentage: 35, color: '#EF4444' },
      { name: 'Musixmatch/Apple', amount: Math.round(totalGross * 0.18), percentage: 18, color: '#F59E0B' },
      { name: 'LyricFind & Smule', amount: Math.round(totalGross * 0.07), percentage: 7, color: '#8B5CF6' },
    ];
  }

  return {
    creators: mappedCreators.sort((a, b) => b.netRoyalty - a.netRoyalty),
    stats: {
      totalGross,
      totalCreatorShare,
      totalPublisherShare,
      totalNet: totalCreatorShare,
      adsRev: Math.round(totalGross * 0.5),
      subsRev: Math.round(totalGross * 0.5),
      totalCreators: mappedCreators.length,
      batchesCount: selectedPeriod === 'Semua' ? 2 : 1,
      platforms,
    },
  };
}
