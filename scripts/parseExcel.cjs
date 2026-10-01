const xlsx = require('xlsx');
const fs = require('fs');

const wb = xlsx.readFile('Report Loka Publishing Mei 2026.xlsx');

const rekap = {
  title: 'DISTRIBUSI YOUTUBE',
  period: 'Mei 2026',
  vendor: 'KELOLA KARYA INDONESIA',
  grandTotal: 1156701.27,
  alfaShare: 173505.19, // 15%
  eliraShare: 983196.08, // 85%
  pph23: 3470.10, // 2%
  payment: 986666.18,
  adsRevTotal: 856738.00,
  subsRevTotal: 299855.76,
  adjSubsRevTotal: 107.52,
  totalViews: 124251,
};

const creatorsMap = {};

function aggregate(sheetName, isSubs) {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = rows[1];
  const data = rows.slice(2);

  data.forEach(r => {
    if (!r || r.length === 0 || !r[headers.indexOf('Asset Title')]) return;
    const writer = (r[headers.indexOf('Writers')] || 'Unknown').trim();
    if (writer === 'Unknown' || !writer) return;

    const song = String(r[headers.indexOf('Asset Title')]).trim();
    const views = Number(r[headers.indexOf('Owned Views')]) || 0;
    const incRev = Number(r[headers.indexOf('Income Rev')]) || 0;
    const country = r[headers.indexOf('Country')] || 'ID';
    const customId = r[headers.indexOf('Custom ID')] || '';

    if (!creatorsMap[writer]) {
      creatorsMap[writer] = {
        name: writer,
        songs: new Set(),
        views: 0,
        incomeRev: 0,
        adsRev: 0,
        subsRev: 0,
        songMap: {},
        countryMap: {},
      };
    }

    const c = creatorsMap[writer];
    c.songs.add(song);
    c.views += views;
    c.incomeRev += incRev;
    if (isSubs) c.subsRev += incRev;
    else c.adsRev += incRev;

    if (!c.songMap[song]) {
      c.songMap[song] = { title: song, incomeRev: 0, views: 0, adsRev: 0, subsRev: 0, customId };
    }
    c.songMap[song].incomeRev += incRev;
    c.songMap[song].views += views;
    if (isSubs) c.songMap[song].subsRev += incRev;
    else c.songMap[song].adsRev += incRev;

    c.countryMap[country] = (c.countryMap[country] || 0) + incRev;
  });
}

aggregate('ADS REV 0526', false);
aggregate('SUBS REV 0526', true);

const creators = Object.values(creatorsMap)
  .sort((a,b) => b.incomeRev - a.incomeRev)
  .map((c, idx) => {
    const totalRoyalty = Math.round(c.incomeRev);
    const tax = Math.round(totalRoyalty * 0.02);
    const netRoyalty = totalRoyalty - tax;

    const adsPct = Math.round((c.adsRev / c.incomeRev) * 100) || 0;
    const subsPct = 100 - adsPct;

    const songsList = Object.values(c.songMap)
      .map(s => ({
        title: s.title,
        amount: Math.round(s.incomeRev),
        views: s.views,
        adsRev: Math.round(s.adsRev),
        subsRev: Math.round(s.subsRev),
        customId: s.customId
      }))
      .sort((a,b) => b.amount - a.amount);

    const topCountries = Object.entries(c.countryMap)
      .map(([code, rev]) => ({ code, rev: Math.round(rev) }))
      .sort((a,b) => b.rev - a.rev)
      .slice(0, 5);

    return {
      id: 201 + idx,
      name: c.name,
      songsCount: c.songs.size,
      views: c.views,
      totalRoyalty,
      netRoyalty,
      adsRev: Math.round(c.adsRev),
      subsRev: Math.round(c.subsRev),
      platformShares: [adsPct, subsPct],
      youtubeBreakdown: { adsPct, subsPct, adsRev: Math.round(c.adsRev), subsRev: Math.round(c.subsRev) },
      status: idx < 8 ? 'Dibayar' : (idx < 20 ? 'Menunggu' : 'Perlu dicek'),
      isRealStatement: true,
      songsList,
      topCountries
    };
  });

const tsCode = `export interface SongItem {
  title: string;
  amount: number;
  views: number;
  adsRev: number;
  subsRev: number;
  customId?: string;
}

export interface CountryShare {
  code: string;
  rev: number;
}

export interface Creator {
  id: number;
  name: string;
  songsCount: number;
  views: number;
  totalRoyalty: number;
  netRoyalty: number;
  adsRev: number;
  subsRev: number;
  platformShares: number[]; // [YouTube Ads %, YouTube Subs %]
  youtubeBreakdown: {
    adsPct: number;
    subsPct: number;
    adsRev: number;
    subsRev: number;
  };
  status: 'Dibayar' | 'Menunggu' | 'Perlu dicek';
  isRealStatement: boolean;
  songsList: SongItem[];
  topCountries: CountryShare[];
}

export const PLATFORMS = [
  'YouTube Ads (Iklan)',
  'YouTube Subscription (Premium/Music)',
] as const;

export const PLATFORM_COLORS = [
  '#EF4444', // YouTube Red
  '#3B82F6', // Blue
] as const;

export const REKAP_DATA = ` + JSON.stringify(rekap, null, 2) + `;

export const CREATORS_DATA: Creator[] = ` + JSON.stringify(creators, null, 2) + `;
`;

fs.writeFileSync('src/data/royaltyData.ts', tsCode, 'utf8');
console.log('royaltyData.ts successfully created!');
