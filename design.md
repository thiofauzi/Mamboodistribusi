# LOKA Publisher Dashboard: Design System

Diturunkan dari 2 screenshot dashboard (state terisi & state kosong/belum verifikasi).
Semua angka adalah **estimasi** yang dinormalisasi ke frame desktop **1440px** dan dibulatkan ke grid 4/8px. Sesuaikan jika ada file Figma aslinya.

---

## 1. Font

| Item | Nilai |
|---|---|
| Font family | **Inter** (fallback: `system-ui, -apple-system, "Segoe UI", sans-serif`) |
| Weight dipakai | 400 Regular, 500 Medium, 600 SemiBold, 700 Bold |

### Type Scale

| Token | Size / Line height | Weight | Dipakai untuk |
|---|---|---|---|
| `display` | 32 / 40 | 400–500 | Angka statistik (512, 50, 56, 12), nilai Rp |
| `heading-1` | 28 / 36 | 700 | Judul halaman "Dashboard" |
| `heading-2` | 18 / 24 | 500 | Judul card ("Total Lisensi", "Jenis Project") |
| `heading-3` | 18 / 24 | 600 | Judul banner ("Segera Verifikasi Publisher") |
| `nav` | 16 / 24 | 600 | Menu sidebar |
| `table-head` | 16 / 24 | 600 | Header kolom tabel |
| `body` | 14 / 20 | 400 | Subjudul, label kartu, deskripsi |
| `table-cell` | 14 / 20 | 500 | Isi baris tabel |
| `label` | 14 / 20 | 500 | Legend chart, badge status |
| `button` | 14 / 20 | 600 | Teks tombol |

---

## 2. Warna

### Brand & Aksen

| Token | Hex | Dipakai untuk |
|---|---|---|
| `primary-600` | `#2563EB` | Tombol utama, menu aktif (teks/ikon), ikon musik, judul banner, verified badge |
| `primary-500` | `#3B82F6` | Verified badge, hover state |
| `primary-100` | `#E8EEFD` | Background menu aktif |
| `primary-50` | `#EEF2FF` | Background banner verifikasi, empty state |
| `primary-300` | `#93A8F0` | Border banner verifikasi |
| `accent-orange` | `#FF8A00` | Ikon "Lagu Terdaftar" (kartu pertama, highlight) |

### Neutral

| Token | Hex | Dipakai untuk |
|---|---|---|
| `bg-page` | `#FAFAFA` | Background area konten |
| `bg-surface` | `#FFFFFF` | Sidebar, card, tabel |
| `bg-row-alt` | `#F5F8FE` | Baris genap tabel (zebra) |
| `border-default` | `#E5E7EB` | Border card, tabel, sidebar |
| `text-primary` | `#111827` | Judul, angka, isi tabel |
| `text-secondary` | `#4B5563` | Subjudul, label, role "Publisher" |
| `text-disabled` | `#C7CDD6` | Badge "Pemakaian Exclusive" |
| `icon-chip-bg` | `#D6DAE3` | Lingkaran ikon kartu non-highlight |

### Data Visualization (Donut Chart)

| Token | Hex | Arti |
|---|---|---|
| `chart-mechanical` | `#D0382E` | Mechanical |
| `chart-synchron` | `#FFB400` | Synchron / Dalam Penawaran |
| `chart-performing` | `#4B3BE8` | Performing |
| `chart-dsp` | `#3F9468` | DSP / Dalam Penagihan |
| `chart-empty` | `#757575` | Ring abu-abu saat data 0 |

### Status Badge

| Status | Text | Background | Border |
|---|---|---|---|
| Dalam Pemakaian | `#C2610C` | `#FFF8F0` | `#F3D9BF` |
| Tersedia | `#2F855A` | `#F3FBF6` | `#B7DCC5` |
| Tidak Tersedia | `#E5E5E5` | `#C8C8C8` | `#C8C8C8` |
| Pemakaian Exclusive | `#C7CDD6` | `#FFFFFF` | `#E5E7EB` |

---

## 3. Spacing

Skala berbasis 4px.

| Token | Nilai |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |

### Padding per area

| Area | Padding |
|---|---|
| Konten utama (dari sisi sidebar & atas) | 32px kiri/kanan, 40px atas |
| Card statistik | 20px |
| Card chart / banner | 20px |
| Sidebar (container) | 16px kiri/kanan, 32px atas |
| Item menu sidebar | 12px vertikal, 16px horizontal |
| Sel tabel | 16px vertikal, 16px horizontal |
| Badge status | 8px vertikal, 24px horizontal |
| Tombol utama | 12px vertikal, 24px horizontal |

### Gap / Jarak antar elemen

| Antar | Nilai |
|---|---|
| Judul halaman ke subjudul | 4px |
| Header ke baris kartu statistik | 32px |
| Antar kartu statistik | 20px |
| Baris statistik ke baris chart | 20px |
| Chart ke tabel | 20px |
| Ikon ke label di kartu | 12px |
| Label ke angka di kartu | 8px |
| Antar item menu sidebar | 4px |
| Tabel ke tombol "Lihat Katalog Lagu" | 32px |

---

## 4. Stroke, Radius & Shadow

### Stroke

| Elemen | Ketebalan | Warna |
|---|---|---|
| Card, tabel, header tabel | 1px | `border-default` |
| Sidebar (garis kanan) | 1px | `border-default` |
| Banner verifikasi | 1.5px | `primary-300` |
| Badge status | 1px | sesuai tabel status |
| Donut chart ring | 20px (stroke lebar) | warna chart |
| Ikon (Lucide/outline) | 1.5–2px | `text-primary` / `primary-600` |

### Radius

| Elemen | Radius |
|---|---|
| Card & tabel | 8px |
| Banner verifikasi | 12px |
| Tombol | 8px |
| Badge status | 4px |
| Ikon chip (lingkaran) | 999px |
| Item menu aktif | 8px |

### Shadow

| Elemen | Shadow |
|---|---|
| Card | `0 1px 3px rgba(16, 24, 40, 0.10), 0 1px 2px rgba(16, 24, 40, 0.06)` |
| Tabel | tanpa shadow (hanya border) |

---

## 5. Layout

| Bagian | Ukuran |
|---|---|
| Frame desktop | 1440px |
| Sidebar | 216px fixed |
| Area konten | fluid, `max-width` mengikuti sisa lebar |
| Grid kartu statistik | 4 kolom sama lebar, gap 20px |
| Grid chart | 2 kolom sama lebar (state kosong: 2 kolom, kiri chart, kanan banner), gap 20px |
| Tinggi kartu statistik | ±132px |
| Tinggi kartu chart | ±190px |

---

## 6. Komponen

### 6.1 Sidebar
- Background putih, border kanan 1px.
- Atas: logo LOKA (±64px), nama publisher (`heading-3`) + verified badge biru, role "Publisher" (`body`, `text-secondary`) rata tengah.
- Menu: ikon 20px + label `nav`. Ada chevron untuk menu dengan submenu (Anggota, Katalog Lagu, Laporan).
- **Aktif**: background `primary-100`, teks & ikon `primary-600`.
- **Default**: teks `text-primary`, tanpa background.
- Logout menempel di bawah, ikon + label `nav`.

### 6.2 Page Header
- Kiri: "Dashboard" (`heading-1`) + "Welcome back, ..." (`body`, `text-secondary`).
- Kanan: tombol ikon lonceng, lingkaran 44px, background `#F3F4F6`.

### 6.3 Stat Card
- Ikon chip lingkaran 32px + ikon musik.
- Kartu pertama: chip `accent-orange`, ikon putih. Kartu lain: chip `icon-chip-bg`, ikon `primary-600`.
- Label `body`, angka `display`.

### 6.4 Chart Card (Total Lisensi / Lisensi On Progress)
- Donut 120px di kiri, konten di kanan.
- Judul `heading-2`, subjudul `body`.
- Nilai uang `display` (24–28px), disembunyikan `Rp ********` dengan ikon mata (eye / eye-off) 20px di kanan.
- Legend: titik warna 16px + label `label`, satu baris, gap 24px.
- State kosong: ring abu-abu `chart-empty`, nilai `Rp 0`.

### 6.5 Banner Verifikasi (state belum verifikasi)
- Background `primary-50`, border 1.5px `primary-300`, radius 12px.
- Ilustrasi ikon di kiri (±72px, warna `primary-600`).
- Judul `heading-3` warna `primary-600`; deskripsi `body` `primary-600`.
- Tombol "Verifikasi Sekarang": tombol utama versi kecil (padding 8px 16px).

### 6.6 Tabel Katalog
- Container putih, border 1px, radius 8px.
- Header terpisah (card sendiri), tinggi ±56px, teks `table-head` rata tengah, ikon sort (▼▲) di kolom Pencipta, Judul Lagu, Tanggal.
- Baris: tinggi ±64px, teks rata tengah, zebra dengan `bg-row-alt`, pemisah 1px `border-default`.
- Kolom: Pencipta, Judul Lagu, Genre, Tanggal (format `08 June 2022`), Status.
- Empty state: satu baris background `primary-50`, teks "Belum Ada Katalog Lagu" `table-head` rata tengah.
- Urutan kolom: state terisi = Pencipta, Judul Lagu; state kosong = Judul Lagu, Pencipta. **Samakan** di implementasi (rekomendasi: Judul Lagu dulu).

### 6.7 Tombol Utama ("Lihat Katalog Lagu >")
- Background `primary-600`, teks putih `button`, ikon chevron kanan 16px, gap 8px.
- Radius 8px, tinggi 48px, rata kanan di bawah tabel.
- Hover `#1D4ED8`, pressed `#1E40AF`, disabled `#93B4F5`.

### 6.8 Status Badge
- Lebar seragam (±160px), tinggi 40px, teks rata tengah `label`.
- Warna sesuai tabel status di bagian 2.

---

## 7. Design Tokens (siap pakai)

### CSS Variables

```css
:root {
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;

  /* Brand */
  --primary-600: #2563EB;
  --primary-500: #3B82F6;
  --primary-300: #93A8F0;
  --primary-100: #E8EEFD;
  --primary-50:  #EEF2FF;
  --accent-orange: #FF8A00;

  /* Neutral */
  --bg-page: #FAFAFA;
  --bg-surface: #FFFFFF;
  --bg-row-alt: #F5F8FE;
  --border-default: #E5E7EB;
  --text-primary: #111827;
  --text-secondary: #4B5563;
  --text-disabled: #C7CDD6;
  --icon-chip-bg: #D6DAE3;

  /* Chart */
  --chart-mechanical: #D0382E;
  --chart-synchron: #FFB400;
  --chart-performing: #4B3BE8;
  --chart-dsp: #3F9468;
  --chart-empty: #757575;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadow */
  --shadow-card: 0 1px 3px rgba(16,24,40,.10), 0 1px 2px rgba(16,24,40,.06);
}

body {
  font-family: var(--font-sans);
  background: var(--bg-page);
  color: var(--text-primary);
}
```

### Tailwind (`tailwind.config.js`)

```js
export default {
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        primary: {
          50: "#EEF2FF", 100: "#E8EEFD", 300: "#93A8F0",
          500: "#3B82F6", 600: "#2563EB",
        },
        accent: { orange: "#FF8A00" },
        surface: { page: "#FAFAFA", rowAlt: "#F5F8FE" },
        chart: {
          mechanical: "#D0382E", synchron: "#FFB400",
          performing: "#4B3BE8", dsp: "#3F9468", empty: "#757575",
        },
      },
      borderRadius: { sm: "4px", md: "8px", lg: "12px" },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,.10), 0 1px 2px rgba(16,24,40,.06)",
      },
    },
  },
};
```

---

## 8. Catatan Konsistensi

- Urutan kolom tabel berbeda antar dua screenshot; pilih satu.
- Label kartu keempat berbeda ("Lisensi Aktif" vs "Proyek Aktif"); tentukan satu istilah.
- Ukuran ikon menu & nilai `display` sebaiknya dikunci di Figma agar tidak berbeda antar state.
- Kontras teks badge "Tidak Tersedia" (`#E5E5E5` di `#C8C8C8`) dan "Pemakaian Exclusive" (`#C7CDD6` di putih) **di bawah WCAG AA**. Jika dimaksudkan sebagai disabled itu wajar, tetapi pertimbangkan teks lebih gelap agar tetap terbaca.
