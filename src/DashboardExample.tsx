import React, { useState } from 'react';
import {
  Sidebar,
  Typography,
  Button,
  StatCard,
  ChartCard,
  VerificationBanner,
  CatalogTable,
  CatalogItem,
} from './components/ui';

export const DashboardExample: React.FC = () => {
  const [isVerified, setIsVerified] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', active: true },
    { id: 'anggota', label: 'Anggota', hasSubmenu: true },
    { id: 'katalog', label: 'Katalog Lagu', hasSubmenu: true },
    { id: 'laporan', label: 'Laporan', hasSubmenu: true },
  ];

  const dummyCatalog: CatalogItem[] = [
    {
      id: 1,
      creator: 'Danilla Riyadi',
      songTitle: 'Ada Di Sana',
      genre: 'Indie Pop',
      date: '08 June 2022',
      status: 'tersedia',
    },
    {
      id: 2,
      creator: 'Hindia',
      songTitle: 'Secukupnya',
      genre: 'Alternative',
      date: '12 July 2022',
      status: 'dalam-pemakaian',
    },
    {
      id: 3,
      creator: 'Pamungkas',
      songTitle: 'To the Bone',
      genre: 'Pop / Soul',
      date: '24 Aug 2022',
      status: 'pemakaian-exclusive',
    },
    {
      id: 4,
      creator: 'Kunto Aji',
      songTitle: 'Rehat',
      genre: 'Pop',
      date: '01 Nov 2022',
      status: 'tidak-tersedia',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#FAFAFA] text-[#111827]">
      {/* 1. Sidebar (216px fixed) */}
      <Sidebar
        publisherName="Musica Studios"
        role="Publisher"
        items={navItems}
        onLogout={() => alert('Logout clicked')}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 px-8 pt-10 pb-16 overflow-y-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Typography variant="heading-1">Dashboard</Typography>
            <Typography variant="body" color="secondary" className="mt-1">
              Welcome back, Musica Studios Publisher Team
            </Typography>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Demo toggle for verification state */}
            <button
              onClick={() => setIsVerified(!isVerified)}
              className="text-xs text-[#2563EB] bg-[#E8EEFD] px-3 py-1.5 rounded-full font-medium"
            >
              Toggle State: {isVerified ? 'Terverifikasi' : 'Belum Verifikasi'}
            </button>

            {/* Notification Bell (44px) */}
            <button
              type="button"
              className="w-11 h-11 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#4B5563] hover:text-[#111827] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards Grid (4 Columns, 20px gap) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
          <StatCard
            label="Lagu Terdaftar"
            value="512"
            isHighlighted={true}
          />
          <StatCard
            label="Pencipta Terdaftar"
            value="50"
          />
          <StatCard
            label="Total Lisensi"
            value="56"
          />
          <StatCard
            label="Lisensi Aktif"
            value="12"
          />
        </section>

        {/* Chart / Verification Banner Section (2 Columns, 20px gap) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <ChartCard
            title="Total Lisensi"
            subtitle="Ringkasan pendapatan royalti"
            amount={145800000}
            isEmpty={!isVerified}
          />

          {!isVerified ? (
            <VerificationBanner
              onAction={() => setIsVerified(true)}
            />
          ) : (
            <ChartCard
              title="Lisensi On Progress"
              subtitle="Dalam penagihan & negosiasi"
              amount={42500000}
            />
          )}
        </section>

        {/* Catalog Table Section */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="heading-2">Katalog Lagu Terbaru</Typography>
          </div>

          <CatalogTable items={isVerified ? dummyCatalog : []} />

          {/* Button "Lihat Katalog Lagu >" */}
          <div className="flex justify-end mt-8">
            <Button
              variant="primary"
              size="md"
              iconRight={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              Lihat Katalog Lagu
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardExample;
