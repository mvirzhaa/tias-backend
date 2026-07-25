# Kontrak API SIAK Baru untuk UCL

Dokumen ini mendefinisikan kebutuhan response minimum dari SIAK baru untuk proses sync ke
UCL. Fokusnya adalah data akademik yang dipakai lintas modul, bukan hanya LMS.

Status: draft persiapan integrasi. Endpoint final menunggu Tim SIAK.

## 1. Prinsip

- UCL akan mengambil data SIAK baru secara paginated/batch.
- UCL menyimpan hasil sync ke database lokal terlebih dahulu.
- Field tampilan boleh dikurangi, tetapi field relasi wajib tetap ada.
- Data lama seperti `m_matakuliah` tidak langsung diganti karena masih dipakai absensi.
- Semua endpoint disarankan punya `isActive` dan `updatedAt` agar UCL bisa mendeteksi data
  aktif/nonaktif dan perubahan.

## 2. Format Pagination

Format page-based yang disarankan:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "perPage": 500,
    "total": 1200,
    "lastPage": 3,
    "hasNext": true
  }
}
```

Aturan sync:

- UCL request page pertama.
- Jika `meta.hasNext = true`, UCL lanjut ke page berikutnya.
- Sync resource dianggap selesai saat `hasNext = false` atau `page >= lastPage`.
- Jika `total` belum bisa disediakan, minimal sediakan `hasNext`.

## 3. Endpoint yang Disarankan

```text
GET /api/ucl/faculties?page=1&perPage=500
GET /api/ucl/study-programs?page=1&perPage=500
GET /api/ucl/curriculums?page=1&perPage=500
GET /api/ucl/courses?page=1&perPage=500
GET /api/ucl/classes?semester=20241&page=1&perPage=500
GET /api/ucl/class-lecturers?semester=20241&page=1&perPage=500
GET /api/ucl/class-schedules?semester=20241&page=1&perPage=500
GET /api/ucl/class-participants?semester=20241&page=1&perPage=500
```

Jika Tim SIAK ingin satu endpoint, tetap disarankan resource-nya dipisah di path atau query:

```text
GET /api/ucl/sync?resource=courses&page=1&perPage=500
GET /api/ucl/sync?resource=classes&semester=20241&page=1&perPage=500
```

## 4. Resource dan Field Minimum

### 4.1 Fakultas

Endpoint: `GET /api/ucl/faculties`

Field wajib:

| Field | Keterangan |
| --- | --- |
| `fakultasId` | ID unik fakultas dari SIAK |
| `kodeFakultas` | Kode fakultas |
| `namaFakultas` | Nama fakultas |
| `isActive` | Status aktif |
| `updatedAt` | Waktu perubahan terakhir |

### 4.2 Prodi

Endpoint: `GET /api/ucl/study-programs`

Field wajib:

| Field | Keterangan |
| --- | --- |
| `prodiId` | ID unik prodi dari SIAK |
| `fakultasId` | Relasi ke fakultas |
| `kodeProdi` | Kode prodi |
| `namaProdi` | Nama prodi |
| `jenjang` | S1/S2/D3/dll |
| `isActive` | Status aktif |
| `updatedAt` | Waktu perubahan terakhir |

### 4.3 Kurikulum

Endpoint: `GET /api/ucl/curriculums`

Field wajib:

| Field | Keterangan |
| --- | --- |
| `kurikulumId` | ID unik kurikulum dari SIAK |
| `prodiId` | Relasi ke prodi |
| `namaKurikulum` | Nama kurikulum |
| `tahun` | Tahun kurikulum |
| `isActive` | Status aktif |
| `updatedAt` | Waktu perubahan terakhir |

### 4.4 Mata Kuliah

Endpoint: `GET /api/ucl/courses`

Field wajib:

| Field | Keterangan |
| --- | --- |
| `mataKuliahId` | ID unik mata kuliah dari SIAK baru |
| `kurikulumId` | Relasi ke kurikulum |
| `prodiId` | Relasi ke prodi, penting untuk admin prodi |
| `kodeMatakuliah` | Kode mata kuliah |
| `namaMatakuliah` | Nama mata kuliah |
| `sks` | Jumlah SKS |
| `isActive` | Status aktif |
| `updatedAt` | Waktu perubahan terakhir |

Field opsional:

| Field | Keterangan |
| --- | --- |
| `semesterKurikulum` | Semester pada kurikulum |
| `jenis` | Wajib/pilihan/praktikum/dll |

### 4.5 Kelas Kuliah

Endpoint: `GET /api/ucl/classes?semester=20241`

Field wajib:

| Field | Keterangan |
| --- | --- |
| `kelasKuliahId` | ID unik kelas kuliah. Ini anchor utama LMS dan integrasi baru |
| `mataKuliahId` | Relasi ke mata kuliah |
| `prodiId` | Relasi ke prodi |
| `semester` | Periode akademik, misalnya `20241` |
| `namaKelas` | Nama kelas, misalnya `TI-3A` |
| `isActive` | Status aktif |
| `updatedAt` | Waktu perubahan terakhir |

Field opsional:

| Field | Keterangan |
| --- | --- |
| `kapasitas` | Kapasitas kelas |
| `metode` | Offline/online/hybrid |

### 4.6 Dosen Pengampu

Endpoint: `GET /api/ucl/class-lecturers?semester=20241`

Field wajib:

| Field | Keterangan |
| --- | --- |
| `kelasKuliahId` | Relasi ke kelas kuliah |
| `nip` | NIP dosen, dipakai untuk cocokkan `tb_data_pribadi.nip` |
| `isActive` | Status aktif |
| `updatedAt` | Waktu perubahan terakhir |

Field opsional:

| Field | Keterangan |
| --- | --- |
| `namaDosen` | Nama dosen |
| `email` | Email dosen |
| `isKoordinator` | Penanda koordinator kelas |

### 4.7 Jadwal Kelas

Endpoint: `GET /api/ucl/class-schedules?semester=20241`

Field wajib:

| Field | Keterangan |
| --- | --- |
| `kelasKuliahId` | Relasi ke kelas kuliah |
| `hari` | Hari perkuliahan |
| `jamMulai` | Jam mulai |
| `jamSelesai` | Jam selesai |
| `isActive` | Status aktif |
| `updatedAt` | Waktu perubahan terakhir |

Field opsional:

| Field | Keterangan |
| --- | --- |
| `ruangId` | ID ruang |
| `namaRuang` | Nama ruang |
| `metode` | Offline/online/hybrid |

### 4.8 Peserta Kelas

Endpoint: `GET /api/ucl/class-participants?semester=20241`

Field wajib:

| Field | Keterangan |
| --- | --- |
| `kelasKuliahId` | Relasi ke kelas kuliah |
| `npm` | NPM mahasiswa, dipakai untuk cocokkan `tb_users.npm` |
| `status` | Aktif/batal/drop/dll |
| `isActive` | Status aktif |
| `updatedAt` | Waktu perubahan terakhir |

Field opsional:

| Field | Keterangan |
| --- | --- |
| `namaMahasiswa` | Nama mahasiswa |
| `email` | Email mahasiswa |

## 5. Urutan Sync di UCL

Urutan ini penting agar relasi tidak yatim:

```text
1. faculties
2. study-programs
3. curriculums
4. courses
5. classes
6. class-lecturers
7. class-schedules
8. class-participants
```

## 6. Mapping ke Sistem Berjalan

Data SIAK baru tidak langsung mengganti `m_matakuliah`.

```text
SIAK baru courses
  -> tabel sync/staging UCL
  -> mapping ke m_matakuliah
  -> absensi lama tetap aman
```

Mapping krusial:

| Sistem berjalan | SIAK baru |
| --- | --- |
| `m_matakuliah.id` | `mataKuliahId` lewat tabel mapping |
| `m_matakuliah.kode_matakuliah` | `kodeMatakuliah` |
| `pembelajaran_dosen_ext.id_matkul` | Tetap menunjuk `m_matakuliah.id` selama transisi |
| LMS baru | Pakai `kelasKuliahId` |

## 7. Hal yang Perlu Dikonfirmasi ke Tim SIAK

1. Apakah `mataKuliahId` stabil lintas semester dan kurikulum?
2. Apakah `kelasKuliahId` unik per kelas per semester?
3. Apakah data nonaktif/dihapus dikirim dengan `isActive = false`?
4. Apakah `updatedAt` tersedia di semua resource?
5. Apakah `nip` dosen sama formatnya dengan `tb_data_pribadi.nip` di UCL?
6. Apakah `npm` mahasiswa sama formatnya dengan `tb_users.npm` di UCL?
7. Apakah pagination menyediakan `hasNext`, `lastPage`, atau `nextCursor`?

## 8. Mode Sync UCL yang Disiapkan

Env yang disarankan:

```env
SIAK_SYNC_MODE=mock
SIAK_V2_BASE_URL=
SIAK_V2_TOKEN=
SIAK_SYNC_PER_PAGE=500
SIAK_SYNC_SEMESTER=20241
```

Mode:

| Mode | Fungsi |
| --- | --- |
| `mock` | Baca contoh JSON lokal untuk development |
| `api` | Hit endpoint SIAK baru |

