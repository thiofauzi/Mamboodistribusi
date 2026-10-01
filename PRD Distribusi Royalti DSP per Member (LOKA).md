# PRD: Distribusi Royalti DSP per Member (LOKA)

|  |  |
| --- | --- |
| **Status** | Draft v0.1 |
| **Tanggal** | 30 September 2026 |
| **Sumber** | File simulasi `SIMULASI_DISTRIBUSI.xlsx` (contoh lagu "Turah Wani", DSP YouTube) |

---

## 1. Latar Belakang

LOKA menerima laporan pendapatan (usage source report) dari rekanan DSP seperti YouTube dan Spotify. Laporan ini berisi pendapatan per lagu, per negara, per hari, tetapi belum dibagi ke masing-masing pemegang hak (pencipta dan publisher).

Simulasi di Excel sudah membuktikan alurnya bisa berjalan dan totalnya konsisten: total laporan **4.433,06** sama dengan total hasil distribusi **4.433,06**. Dokumen ini mengubah simulasi tersebut menjadi kebutuhan produk agar prosesnya otomatis, dapat diaudit, dan hasilnya tampil di dashboard tiap member.

## 2. Tujuan dan Non-Tujuan

**Tujuan**

1. Mengimpor laporan pendapatan DSP dan memetakannya ke lagu LOKA melalui **pencocokan 3 tahap**: Asset ID (per DSP), IPBASE NO pencipta, dan Submitter Work ID / Song ID dari publisher. Hanya baris yang lolos ketiga tahap yang didistribusikan.
2. Menghitung bagian royalti tiap pemegang hak berdasarkan komposisi hak per lagu.
3. Meng-grouping hasil per `IPBASE NO` dan menampilkannya di dashboard masing-masing member.
4. Menjamin total hasil distribusi selalu sama dengan total laporan sumber (rekonsiliasi).

**Non-Tujuan (fase ini)**

- Pembayaran atau transfer dana ke member.
- Perhitungan pajak dan potongan administrasi.
- Data hub multi-DSP penuh (dibahas terpisah), fase ini memakai YouTube sebagai acuan format.

## 3. Pengguna

| Peran | Kebutuhan |
| --- | --- |
| **Admin / Staf Royalti LOKA** | Mengunggah laporan, menjalankan distribusi, memeriksa hasil dan selisih |
| **Pencipta (mis. Tomo Widayat)** | Melihat total dan rincian royalti miliknya per lagu, negara, dan periode |
| **Publisher (LOKA Publishing)** | Sama seperti pencipta, untuk bagian publisher |

## 4. Alur Proses

1. **Impor laporan**: admin mengunggah laporan DSP. Sistem membaca kolom `Custom ID / Song ID` sebagai primary key.
2. **Pencocokan 3 tahap**: setiap baris laporan melewati tiga tahap berurutan, yaitu (a) DSP + Asset ID, (b) IPBASE NO pencipta, (c) Submitter Work ID / Song ID dari publisher. Baris yang gagal di salah satu tahap tidak didistribusikan dan masuk daftar pengecualian dengan alasan tahap yang gagal.
3. **Distribusi**: pendapatan baris dikalikan komposisi pemegang hak untuk lagu tersebut. Satu baris laporan menjadi N baris hasil (satu per pemegang hak).
4. **Grouping**: hasil dijumlahkan per `IPBASE NO`.
5. **Tampil**: total dan rincian muncul di dashboard tiap member.

## 5. Aturan Bisnis

**BR-1. Pencocokan 3 tahap.** Setiap baris laporan DSP harus lolos tiga tahap berurutan sebelum didistribusikan:

| Tahap | Kunci | Sumber di laporan | Dicocokkan dengan | Contoh (Turah Wani) |
| --- | --- | --- | --- | --- |
| 1 | **DSP + Asset ID** | `Asset ID` | Pemetaan Asset ID per DSP yang terdaftar untuk lagu | YouTube + `A167377446199103` |
| 2 | **IPBASE NO pencipta** | `Writers` (nama pencipta) | IPBASE NO pencipta pada komposisi hak lagu | Tomo Widayat → `I-005719967-2` |
| 3 | **Submitter Work ID / Song ID** | `Custom ID / Song ID` | Submitter Work ID / song id dari publisher pada data lagu | `L000678` |

Ketentuan:

- Setiap DSP memiliki Asset ID yang berbeda untuk lagu yang sama, sehingga Asset ID selalu dibaca berpasangan dengan kode DSP.
- Ketiga tahap harus mengarah ke **lagu yang sama**. Jika hasilnya berbeda (mis. Asset ID mengarah ke lagu A tetapi Song ID ke lagu B), baris berstatus **Konflik**.
- Baris yang gagal di suatu tahap berstatus **Unmatched** dan mencatat tahap yang gagal (tahap 1, 2, atau 3).
- Baris **Matched** hanya jika ketiga tahap lolos dan mengarah ke lagu yang sama.
- Baris Unmatched dan Konflik tidak didistribusikan sampai admin memperbaiki data (mendaftarkan Asset ID, melengkapi IPBASE NO, atau mengoreksi Song ID), lalu batch dapat diproses ulang.

### Format Asset ID per DSP

Berdasarkan dokumentasi dan karakteristik teknis masing-masing platform streaming:

| DSP | Format Asset ID | Tipe Aset / Karakteristik | Identifikasi Berdampingan | Sumber Referensi |
| --- | --- | --- | --- | --- |
| **YouTube** | Alfanumerik (contoh: `A167377446199103`) | Dibagi menjadi beberapa tipe: *Composition* (karya/pencipta, ISWC), *Sound Recording* (rekaman audio, ISRC), dan *Music Video*. Satu lagu dapat memiliki beberapa Asset ID sekaligus (satu per tipe aset). | GRid (18 karakter alfanumerik), kode HFA (6 karakter) | [YouTube Reporting API, System-Managed Reports Fields](https://developers.google.com/youtube/reporting/v1/reports/system_managed/fields) |
| **Spotify** | Base-62, 22 karakter (contoh: `6rqhFgbbKwnb9MLmUQDhG6` dari `spotify:track:6rqhFgbbKwnb9MLmUQDhG6`) | Melekat di ujung Spotify URI untuk track/lagu | Spotify URI | [Spotify Web API, URIs and IDs](https://developer.spotify.com/documentation/web-api/concepts/spotify-uris-ids) |
| **Apple Music** | ID berbasis storefront/wilayah (berbeda antar-region) | Bergantung pada storefront yang diminta. Satu album/lagu dapat memiliki ID berbeda di storefront AS dan Jepang, memerlukan API lookup padanan wilayah. | Storefront ID | [Apple Developer Forums](https://developer.apple.com/forums/thread/703331) & [WWDC21 sesi 10293](https://nonstrict.eu/wwdcindex/wwdc2021/10293/) |
| **DSP Lain** *(Joox, Deezer, TikTok, Resso, dll.)* | Spesifik per agregator / laporan sumber | Format menyesuaikan skema metadata laporan rekanan | - | Perlu eksplorasi teknis lanjutan |

**Implikasi Desain Sistem terhadap PRD:**
1. **Perekaman Asset ID Otomatis dari Laporan DSP**: Asset ID harus diambil dari laporan DSP. Lagu pertama dari tiap DSP dicatat ke tabel `song_dsp_asset`, lalu dipakai sebagai acuan validasi untuk laporan periode-periode berikutnya.
2. **ISRC sebagai Kunci Silang Antar-DSP**: Karena Asset ID berbeda di setiap DSP, `ISRC` (contoh pada data lagu: `QT5M52553923`) berfungsi sebagai kunci silang universal untuk membantu mendaftarkan Asset ID baru secara otomatis. *Catatan operasional*: ISRC secara teknis melekat pada aset tipe *Sound Recording*, sedangkan royalti hak cipta di laporan bertipe *Composition*, sehingga ketersediaan ISRC perlu diverifikasi pada baris laporan sumber.

**BR-2. Rumus distribusi.** `DIST_MR = Income Rev × persentase hak`

Contoh dari simulasi (Indonesia, Income Rev 2.876,20):

- Tomo Widayat (70%) = 2.013,34
- LOKA Publishing (30%) = 862,86

**BR-3. Jenis hak menentukan kolom persentase.** Laporan memiliki `Right Type` (contoh: Mechanical). Data lagu memiliki tiga persentase: `PER Own`, `MEC Own`, `SYN Own`. Persentase yang dipakai harus sesuai right type: Mechanical memakai `MEC Own`, Performance memakai `PER Own`, Synchronization memakai `SYN Own`. Pada lagu contoh ketiganya sama (70/30), sehingga simulasi belum menguji hal ini.

**BR-4. Rekonsiliasi.** Untuk setiap batch, jumlah `DIST_MR` seluruh pemegang hak harus sama dengan jumlah `Income Rev` laporan sumber (toleransi pembulatan yang ditetapkan, lihat bagian 9).

**BR-5. Komposisi per lagu harus valid.** Total persentase per jenis hak untuk satu lagu harus 100%. Lagu yang tidak valid tidak diproses dan masuk daftar pengecualian.

**BR-6. Idempoten.** Mengunggah laporan yang sama (DSP + periode + file identik) dua kali tidak boleh menggandakan hasil distribusi.

## 6. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-1 | Unggah file laporan DSP (xlsx/csv) dan simpan sebagai batch dengan status | Must |
| FR-2 | Validasi format kolom wajib (Custom ID, Day, Country, Income Rev, Right Type, dll) dan tampilkan error per baris | Must |
| FR-3 | Pencocokan 3 tahap (DSP + Asset ID, IPBASE NO pencipta, Submitter Work ID / Song ID) sesuai BR-1; baris gagal masuk daftar **Unmatched** dengan keterangan tahap yang gagal, baris bertentangan masuk daftar **Konflik** | Must |
| FR-3a | Kelola pemetaan Asset ID per DSP untuk setiap lagu (tambah, ubah, nonaktifkan) dan pemetaan nama pencipta di laporan ke IPBASE NO | Must |
| FR-4 | Kelola komposisi hak per lagu (IP Name, IPI, IPBASE NO, Role, PER/MEC/SYN Own) | Must |
| FR-5 | Jalankan distribusi per batch dan simpan hasil per baris (detail) | Must |
| FR-6 | Grouping hasil per DSP dan IPBASE NO | Must |
| FR-7 | Halaman rekonsiliasi: total sumber vs total distribusi, selisih, jumlah baris unmatched | Must |
| FR-8 | Dashboard member: total royalti, rincian per lagu, per negara, per periode | Must |
| FR-9 | Ekspor hasil distribusi ke Excel | Should |
| FR-10 | Hitung ulang batch (re-run) dengan riwayat versi | Should |
| FR-11 | Penanganan `Adjustment Type` selain "None" (koreksi/penyesuaian) | Should |
| FR-12 | Dukungan DSP lain (Spotify, dll) melalui pemetaan kolom per DSP | Could |

## 7. Model Data (usulan)

**`royalty_batch`**: batch_id, dsp_code, periode, nama_file, checksum, status (uploaded / validated / distributed / failed), total_source, total_distributed, created_at

**`royalty_source_row`**: row_id, batch_id, song_id, day, country, asset_id, right_type, adjustment_type, income_rev, idr_rev, match_status (matched / unmatched / conflict), failed_stage (1 / 2 / 3, kosong jika matched), data_mentah (JSON)

**`song_dsp_asset`** (baru): id, song_id, dsp_code, asset_id, status (aktif / nonaktif), created_at. Unik pada kombinasi (dsp_code, asset_id).

**`song_rights`**: song_id, ip_name, ipi_number, ipbase_no, chain_id, ip_role, per_own, mec_own, syn_own

**`royalty_distribution`**: dist_id, batch_id, row_id, song_id, asset_id, ipbase_no, ip_name, right_type, persentase, dist_mr, dsp_code

**`royalty_member_summary`**: dsp_code, periode, ipbase_no, total (hasil grouping untuk dashboard)

Catatan: `song_rights.ipbase_no` perlu terhubung dengan `users` di sistem yang sudah ada agar dashboard bisa menampilkan data sesuai member yang login.

## 8. Dashboard Member

- **Ringkasan**: total royalti periode berjalan, per DSP.
- **Rincian**: tabel per lagu dengan filter periode dan negara.
- **Contoh tampilan hasil simulasi**:

| DSP | IPBASE NO | IP Name | Total |
| --- | --- | --- | --- |
| YouTube | I-005719967-2 | Tomo Widayat | 3.103,14 |
| YouTube | I-007560847-6 | LOKA Publishing | 1.329,92 |

- Member hanya boleh melihat data miliknya sendiri.

## 9. Pertanyaan Terbuka (dari temuan di file simulasi)

1. **Kolom dasar perhitungan.** `DIST_MR` dihitung dari `Income Rev` (2.876,20 untuk Indonesia), bukan `IDR Rev` (1.358,98). Perlu konfirmasi apakah `Income Rev` memang dasar yang benar dan apa bedanya dengan `IDR Rev`.
2. **Kode DSP.** Kolom DSP tertulis `YOITUBE`. Perlu dipastikan kode resmi (kemungkinan `YOUTUBE`) dan daftar kode untuk DSP lain.
3. **Pemilihan PER/MEC/SYN** (BR-3): apakah aturan pemetaan right type ke kolom persentase sudah benar?
4. **Pembulatan.** Berapa digit desimal untuk `DIST_MR` dan bagaimana menangani sisa pembulatan agar rekonsiliasi tetap cocok?
5. **Baris tanpa pendapatan.** Baris KH dan SA punya revenue split 0 tetapi `Income Rev` 147,30. Apakah tetap didistribusikan?
6. **Lagu tidak ditemukan.** Ke mana pendapatan baris unmatched dicatat sampai data lagu dilengkapi?
7. **Adjustment.** Bagaimana aturan untuk baris dengan `Adjustment Type` bukan "None" (koreksi bulan sebelumnya)?
8. **Perubahan komposisi.** Jika komposisi hak berubah setelah batch didistribusikan, apakah batch lama dihitung ulang atau tetap memakai komposisi saat itu?
9. **Sumber Asset ID.** Dari mana Asset ID tiap DSP didaftarkan ke lagu: input manual admin, impor massal, atau sumber lain?
10. **IPBASE NO di laporan.** Laporan DSP hanya memuat nama pencipta (`Writers`), bukan IPBASE NO. Bagaimana nama itu dipetakan ke IPBASE NO pada tahap 2: lewat master data pencipta, atau ada kolom lain di laporan? Bagaimana jika ada lebih dari satu pencipta atau penulisan nama berbeda?
11. **Urutan dan kegagalan tahap.** Apakah urutan tahap (Asset ID, IPBASE NO, Song ID) sudah final, dan apakah baris yang gagal di satu tahap harus ditahan seluruhnya atau boleh diproses sebagian?
12. **Lebih dari satu Asset ID.** Apakah satu lagu boleh punya beberapa Asset ID di DSP yang sama (mis. versi berbeda), dan apakah satu Asset ID boleh dipakai bersama oleh beberapa lagu?

## 10. Kriteria Penerimaan

- Mengunggah laporan contoh (8 baris, lagu L000678) menghasilkan **16 baris** distribusi.
- Total grouping: Tomo Widayat **3.103,14**, LOKA Publishing **1.329,92**, grand total **4.433,06**.
- Total distribusi sama dengan total sumber di halaman rekonsiliasi.
- Mengunggah file yang sama dua kali tidak mengubah total.
- Baris dengan DSP YouTube, Asset ID `A167377446199103`, pencipta Tomo Widayat (`I-005719967-2`), dan Song ID `L000678` lolos ketiga tahap dan berstatus Matched.
- Baris dengan Asset ID yang belum terdaftar berstatus Unmatched dengan `failed_stage` = 1 dan tidak terdistribusi.
- Baris dengan pencipta yang tidak cocok dengan komposisi lagu berstatus Unmatched dengan `failed_stage` = 2.
- Baris dengan Song ID yang tidak ada di data lagu berstatus Unmatched dengan `failed_stage` = 3.
- Baris dengan Asset ID milik lagu A tetapi Song ID lagu B berstatus Konflik dan tidak terdistribusi.
- Asset ID yang sama pada DSP berbeda diperlakukan sebagai data terpisah.
- Setelah admin memperbaiki data, batch dapat diproses ulang dan baris yang sebelumnya gagal ikut terdistribusi tanpa menggandakan baris yang sudah berhasil.
- Member yang login hanya melihat data miliknya.

## 11. Non-Fungsional

- **Audit**: setiap batch menyimpan file asli, siapa yang menjalankan, waktu, dan versi komposisi hak yang dipakai.
- **Performa**: laporan sampai ratusan ribu baris diproses sebagai job di latar belakang dengan indikator progres.
- **Akurasi**: gunakan tipe desimal (bukan floating point) untuk semua nilai uang.
- **Keamanan**: akses dashboard berbasis peran; data royalti antar member tidak boleh saling terlihat.

## 12. Rencana Rilis (usulan)

| Fase | Cakupan |
| --- | --- |
| **1** | Impor YouTube, pencocokan Song ID, distribusi, grouping, rekonsiliasi (FR-1 sampai FR-7) |
| **2** | Dashboard member dan ekspor (FR-8, FR-9) |
| **3** | Re-run, adjustment, dan DSP tambahan (FR-10 sampai FR-12) |