# DOKUMENTASI PENGUJIAN SISTEM (TEST_CASES.md)
## Sistem Informasi UKS & Rekam Medis Siswa (E-UKS)

Dokumen ini berisi 5 Skenario Pengujian Utama (Standar UKK / Industri) beserta langkah verifikasi dan bukti hasil pengujian sistem.

---

### 🔑 AKUN DEMO PERAN PENGGUNA (RBAC 3 LEVEL)

| Level Role | Username | Password | Nama Lengkap | Nisn / Jabatan |
| :--- | :--- | :--- | :--- | :--- |
| **Admin UKS** | `adminuks` | `password123` | Drs. H. Ahmad Pembina, M.Pd | Pembina UKS / Manajemen Sekolah |
| **Petugas UKS** | `petugasuks` | `password123` | Siti Nurhaliza, A.Md.Kep | Tenaga Kesehatan / Pengurus PMR |
| **Siswa** | `siswa` | `password123` | Budi Santoso | NISN: 0051234567 |

---

### 🧪 SKENARIO PENGUJIAN WAJIB & HASIL VERIFIKASI

#### 1. Skenario 1: Admin UKS Menambah Stok Obat Paracetamol 500mg (100 Tablet) + Tanggal Kadaluarsa
- **Aktor:** Admin UKS
- **Rute/Halaman:** `/admin/medicines/create` & `/admin/medicines`
- **Langkah Pengujian:**
  1. Login sebagai Admin UKS (`adminuks` / `password123`).
  2. Buka menu **Master Obat & P3K** -> Klik tombol **+ Tambah Obat / Alat Baru**.
  3. Input Data:
     - Nama Obat: `Paracetamol 500mg`
     - Kategori: `TABLET`
     - Satuan: `Tablet`
     - Jumlah Stok: `100`
     - Tanggal Kadaluarsa: `2027-12-31`
     - Aturan Pakai: `3x1 tablet sesudah makan bila demam/pusing`
  4. Klik **Simpan Obat**.
- **Hasil yang Diharapkan:**
  Data obat Paracetamol 500mg tersimpan di database, stok 100 tablet tercatat, dan tampil di tabel master obat admin.
- **Status Verifikasi:** `[LULUS / PASSED]`

---

#### 2. Skenario 2: Petugas UKS Mencatat Siswa Masuk UKS Karena Demam (Suhu 38.5°C) & Pusing
- **Aktor:** Petugas UKS
- **Rute/Halaman:** `/petugas/visits/create`
- **Langkah Pengujian:**
  1. Login sebagai Petugas UKS (`petugasuks` / `password123`).
  2. Masuk ke menu **Registrasi Kunjungan** -> Klik **Catat Kunjungan Baru**.
  3. Pilih Pasien: `Budi Santoso (NISN: 0051234567)`.
  4. Input Vital Signs:
     - Suhu Tubuh: `38.5`°C
     - Tensi: `110/70` mmHg
     - Jam Masuk: `08:15` WIB
  5. Input Keluhan Utama: `Demam tinggi, pusing berat, dan lemas setelah olahraga`.
  6. Input Tindakan: `Kompres hangat, istirahat di bed UKS`.
- **Hasil yang Diharapkan:**
  Sistem menampilkan peringatan riwayat kesehatan siswa (Alergi Penisilin) dan mencatat data kunjungan ke database.
- **Status Verifikasi:** `[LULUS / PASSED]`

---

#### 3. Skenario 3: Petugas Memberikan 1 Tablet Paracetamol (Stok Otomatis Terpotong 100 -> 99 Tablet)
- **Aktor:** Petugas UKS
- **Rute/Halaman:** `/petugas/visits/create` atau `/petugas/visits/:id/examine`
- **Langkah Pengujian:**
  1. Pada formulir registrasi/pemeriksaan siswa Budi Santoso, navigasi ke bagian **Pemberian Obat / Alat P3K**.
  2. Pilih Obat: `Paracetamol 500mg` (Sisa Stok Awal: 100 Tablet).
  3. Input Jumlah: `1` Tablet.
  4. Input Dosis: `1 tablet diminum di UKS sesudah makan`.
  5. Klik tombol **Simpan Rekam Medis & Kurangi Stok**.
- **Hasil yang Diharapkan:**
  Transaksi resep tersimpan melalui Prisma Transaction. Stok Paracetamol 500mg di database otomatis terpotong dari 100 menjadi 99 tablet.
- **Status Verifikasi:** `[LULUS / PASSED]`

---

#### 4. Skenario 4: Petugas Menerbitkan Surat Izin Pulang Digital Karena Kondisi Siswa Tidak Memungkinkan Belajar
- **Aktor:** Petugas UKS
- **Rute/Halaman:** `/petugas/visits/create` & `/petugas/permit/:id/print`
- **Langkah Pengujian:**
  1. Pilih Status Penanganan Siswa: `PULANG (Izin Pulang ke Rumah)`.
  2. Input Catatan Surat: `Siswa mengalami demam tinggi (38.5°C). Disarankan beristirahat di rumah dan dirujuk ke faskes jika demam berlanjut > 2 hari.`
  3. Klik Simpan.
  4. Pada tabel daftar kunjungan, klik tombol **Cetak Surat** / **Surat Izin Digital**.
- **Hasil yang Diharapkan:**
  Sistem menampilkan halaman cetak resmi (Kop Sekolah, Nomor Surat, Identitas Siswa, Vital Signs, Tindakan, Obat, Catatan Izin, dan Tanda Tangan Pembina UKS / Petugas).
- **Status Verifikasi:** `[LULUS / PASSED]`

---

#### 5. Skenario 5: Siswa Login dan Melihat Riwayat Pemeriksaan Tersimpan Rapi Pada Rekam Medis Pribadi
- **Aktor:** Siswa (Budi Santoso)
- **Rute/Halaman:** `/siswa/dashboard`, `/siswa/medical-records`, & `/siswa/permits`
- **Langkah Pengujian:**
  1. Logout dari Petugas UKS.
  2. Login sebagai Siswa (`siswa` / `password123`).
  3. Buka menu **Rekam Medis Saya** (`/siswa/medical-records`).
  4. Buka menu **Status Izin Istirahat Digital** (`/siswa/permits`).
- **Hasil yang Diharapkan:**
  Siswa dapat melihat riwayat kunjungan medisnya (Demam 38.5°C, pemberian 1 Paracetamol 500mg, status PULANG) secara rapi dan transparan.
- **Status Verifikasi:** `[LULUS / PASSED]`

---

#### 6. Skenario 6: Admin UKS Melihat & Menambahkan Akun Petugas UKS Baru
- **Aktor:** Admin UKS
- **Rute/Halaman:** `/admin/petugas` & `/admin/petugas/create`
- **Langkah Pengujian:**
  1. Login sebagai Admin UKS (`adminuks` / `password123`).
  2. Buka menu **Akun Petugas UKS** di sidebar.
  3. Klik tombol **+ Tambah Petugas Baru**.
  4. Isi data: Nama Lengkap, Username, Password, dan Kontak No. HP.
  5. Klik **Simpan Akun Petugas**.
- **Hasil yang Diharapkan:**
  Akun petugas baru terdaftar dengan role `PETUGAS_UKS`, password ter-hash secara aman, dan langsung dapat digunakan login.
- **Status Verifikasi:** `[LULUS / PASSED]`

---

#### 7. Skenario 7: Admin UKS Mengelola Akun Siswa & Profil Alergi
- **Aktor:** Admin UKS
- **Rute/Halaman:** `/admin/siswa` & `/admin/siswa/create`
- **Langkah Pengujian:**
  1. Buka menu **Akun Siswa** di sidebar Admin UKS.
  2. Klik tombol **+ Tambah Siswa Baru**.
  3. Input Nama, NISN, Golongan Darah, Telepon Orang Tua, serta Profil Kesehatan (Alergi Obat, Penyakit Bawaan, Alergi Makanan, Kontak Darurat).
  4. Klik **Simpan Data Siswa**.
- **Hasil yang Diharapkan:**
  Data siswa tersimpan bersama entitas relasi `HealthProfile`, dan tampil di daftar akun siswa.
- **Status Verifikasi:** `[LULUS / PASSED]`

---

#### 8. Skenario 8: Petugas UKS Menambahkan Siswa & Memantau Grafik Siswa Sakit Bulan Ini
- **Aktor:** Petugas UKS
- **Rute/Halaman:** `/petugas/dashboard`, `/petugas/siswa`, & `/petugas/siswa/create`
- **Langkah Pengujian:**
  1. Login sebagai Petugas UKS (`petugasuks` / `password123`).
  2. Di **Dashboard Petugas**, periksa card visual: **Grafik Tren Siswa Sakit Bulan Ini** (Chart.js interaktif) beserta ringkasan status penanganan.
  3. Buka menu **Data & Tambah Siswa** (`/petugas/siswa`) -> klik **Tambah Siswa Baru**.
  4. Daftarkan siswa baru yang datang berobat, centang opsi *Langsung daftarkan kunjungan UKS*.
- **Hasil yang Diharapkan:**
  Grafik menampilkan tren kunjungan siswa sakit harian pada bulan berjalan secara akurat, dan siswa baru langsung terhubung ke modul pemeriksaan UKS.
- **Status Verifikasi:** `[LULUS / PASSED]`

---

### 🛡 MATRIKS OTORISASI KEAMANAN RBAC (HTTP 403 FORBIDDEN TEST)

- Jika `SISWA` mencoba membuka rute `/admin/medicines`, `/admin/petugas`, atau `/admin/siswa` -> Terjadi blokir otomatis HTTP **403 Forbidden**.
- Jika `PETUGAS_UKS` mencoba membuka rute `/admin/petugas` atau `/admin/siswa` -> Terjadi blokir otomatis HTTP **403 Forbidden**.
- Jika `SISWA` mencoba membuka rute `/petugas/visits` atau `/petugas/siswa` -> Terjadi blokir otomatis HTTP **403 Forbidden**.
