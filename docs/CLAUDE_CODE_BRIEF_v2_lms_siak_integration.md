# Claude Code Brief v2 — Integrasi LMS UCL ↔ SIAKAD (Sync + Identity Mapping + Otorisasi)

> **MENGGANTIKAN v1** (`CLAUDE_CODE_BRIEF_siak_user_mapping_authz.md`). v2 ditulis setelah
> verifikasi **payload nyata** dari API SIAKAD (`be-siakad`) lewat DevTools. Perubahan inti:
> sumber data sekarang konkret (bukan asumsi "bulk endpoint"), **dosen & mahasiswa keduanya
> ber-UUID**, dan otorisasi memakai UUID untuk dua peran.
>
> **Cara pakai:** tunjuk file ini ke Claude Code di repo backend UCL/TIAS. Kerjakan
> **berurutan** (Pre-flight → Task 6). Sebelum menulis kode, kerjakan **Pre-flight**.
>
> **Catatan kepercayaan data:** field di bawah berasal dari capture DevTools yang
> terverifikasi, tetapi repo SIAKAD mungkin belum sepenuhnya ter-update. Claude Code **wajib
> tetap memvalidasi** bentuk respons ke API yang berjalan sebelum menyandarkan logika padanya.

---

## 0. Konteks & realitas API (TERVERIFIKASI)

**Stack backend UCL:** Node + Express + Sequelize + PostgreSQL.
**Identitas user UCL:** `tb_users.user_id` (UUID, PK). Kolom: `role`, `nidn` (ADA di tb_users),
`npm` (ADA di tb_users), sedangkan `nip` ada di `tb_data_pribadi`. Soft delete (`deleted_at`)
dipakai luas.

**Arah arsitektur:** Full-sync SIAKAD → tabel lokal UCL (BUKAN live proxy). Otorisasi LMS
membaca tabel lokal, bukan menembak SIAKAD per request.

### 0.1 Kunci identitas (sudah final)
- **Dosen** dikenali UUID `siak_dosen_id`, dilink ke UCL via **NIDN** (`tb_users.nidn`).
- **Mahasiswa** dikenali UUID `siak_mahasiswa_id`, dilink ke UCL via **NPM** (`tb_users.npm`).
- Otorisasi runtime kedua peran memakai **UUID** (`LMS_AUTHZ_KEY=uuid`).

### 0.2 Endpoint SIAKAD yang dipakai sync (terverifikasi)
| Tujuan | Endpoint |
|---|---|
| Periode aktif | `GET /periode-akademik/active-status` |
| List kelas (per periode, paginated) | `GET /akademik/kelas-kuliah?periodeAkademik=<id>&page&size` |
| Roster mahasiswa per kelas | `GET /akademik/kelas-kuliah/{id}/peserta-kelas` |
| (Opsional) master dosen | `GET /akademik/dosen` |
| (Opsional) master mahasiswa | `GET /akademik/mahasiswa` |
| (Opsional) master MK | `GET /akademik/mata-kuliah/all` |

> **Penting:** payload list kelas SUDAH meng-embed dosen pengampu (lewat `jadwalKuliah[].dosen`),
> jadi **sync TIDAK perlu fan-out** ke endpoint jadwal/dosen terpisah. Satu-satunya fan-out
> per-kelas adalah `peserta-kelas`.

### 0.3 Contoh payload nyata (REFERENSI — pakai nama field ini, bukan tipe TS FE)

**`GET /akademik/kelas-kuliah?...`** — satu elemen `data[]`:
```jsonc
{
  "id": "0197fcc2-fba3-7f93-9245-602d533ffa7a",   // kelasKuliahId (anchor)
  "nama": "Reguler A",
  "kapasitas": 40,
  "jumlah_peminat": null,
  "sistem_kuliah": "Reguler",
  "status_kelas": "Aktif",                          // sinyal aktif/non-aktif
  "siakMataKuliahId": "0197fcaf-228c-7da7-9169-7d94def6f4de",
  "siakPeriodeAkademikId": "0197fce6-e176-7479-a917-64e7d8063a9b",
  "siakProgramStudiId": "0197ea6f-2c4f-7afb-a06e-2f13f589c195",
  "mataKuliah": { "id": "...", "kode": "UIK352", "nama": "Kuliah Kerja Nyata (KKN)", "totalSks": 6 },
  "periodeAkademik": { "id": "...", "nama": "2025 Ganjil" },
  "jadwalKuliah": [
    {
      "id": "0197fccb-2a37-76cb-8acb-91af170769f0",
      "hari": "Rabu", "jamMulai": "11:00:00", "jamSelesai": "12:00:00",
      "jenisPertemuan": "Kuliah", "metodePembelajaran": "Offline",
      "dosen": {
        "id": "0197eeae-e195-7730-b147-1009f7f12ec7",   // siak_dosen_id
        "nama": "Ina Novianty, S.ST., M.M.S.I",
        "nidn": "9140382798012"                           // kunci link ke tb_users.nidn
      },
      "ruangan": { "id": "...", "nama": "Ruang 205", "ruangan": "205" }
    }
  ]
}
```
> `jadwalKuliah` adalah **array** → satu kelas bisa punya >1 dosen (co-teaching). Kumpulkan
> `dosen.id` **distinct** dari semua elemen.

**`GET /akademik/kelas-kuliah/{id}/peserta-kelas`** — satu elemen `data[]`:
```jsonc
{
  "id": "0197f3f6-19e2-74d8-95f0-44ff2738c101",   // siak_mahasiswa_id (master mahasiswa)
  "npm": "221106043033",                            // kunci link ke tb_users.npm
  "nama": "syaifulmhs",
  "angkatan": "2022",
  "programStudi": { "id": "...", "nama": "Teknik Informatika", "jenjang": { "jenjang": "S1" } },
  "status": null,
  "rincianKrsId": "019e8d5a-cb02-7428-b400-015d1f686250"   // referensi baris KRS
}
```

**`GET /periode-akademik/active-status`** — bentuk periode:
```jsonc
{ "id": "...", "kode": "20251", "nama": "2025 Ganjil",
  "siak_tahun_ajaran_id": "...", "status": "Aktif",   // "Aktif" | "Inaktif" (BUKAN ACTIVE/INACTIVE)
  "tanggal_mulai": "2025-09-01", "tanggal_selesai": "2025-12-30" }
```

### 0.4 GUARDRAIL KERAS (langgar = tolak tugas)
1. JANGAN mengubah/menghapus `m_matakuliah`, `m_kurikulum`, `absensi_mhs`, `pembelajaran_dosen_ext`.
2. Semua tulis hasil sync/projection **upsert-only** (`INSERT ... ON CONFLICT DO UPDATE`).
   Dilarang "delete-all lalu insert".
3. Record yang hilang dari SIAKAD (atau `status_kelas != "Aktif"`, atau `deleted_at`) →
   **soft-deactivate** (`is_active=false`), JANGAN hard delete. Konten LMS (`lms_sections`,
   `lms_content_items`) tidak boleh pernah ikut terhapus oleh sync.
4. Status mapping `verified` (keputusan admin) tidak boleh diturunkan ke `auto` oleh sync.
5. Admin global / LMS admin lewat role + scope, BUKAN lewat `siak_user_mappings`. Jangan
   sampai admin tanpa identitas SIAK terkunci 403.
6. JANGAN authz dosen/mahasiswa berdasarkan **nama** dalam keadaan apa pun (gunakan UUID).

---

## Pre-flight (kerjakan & laporkan SEBELUM Task 1)
1. **Konvensi migration & model** di `migrations/` dan `models/` — ikuti gaya yang ada.
2. **Bentuk `req.user`** — temukan tempat JWT/sesi dibentuk; di sinilah Task 4 menyuntik UUID.
3. **Service sync** — temukan/siapkan tempat endpoint sync (mis. `POST /api/lms/sync-siak`).
4. **Format `tb_users.nidn` & `tb_users.npm`** — periksa contoh nilainya; bandingkan dengan
   contoh SIAKAD (`nidn: "9140382798012"`, `npm: "221106043033"`). Tentukan aturan normalisasi
   (trim, leading-zero, dll). Laporkan jika formatnya jelas berbeda.
5. **Auth ke SIAKAD** — konfirmasi mekanisme yang dipakai (lihat Open Dependency #1).

---

## Task 1 — Tabel + model `siak_user_mappings`
Jembatan UCL user ↔ identitas SIAK. Menyimpan UUID **dan** identifier (NIDN/NPM).

```sql
CREATE TABLE siak_user_mappings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tias_user_id    UUID NOT NULL REFERENCES tb_users(user_id),
  siak_user_uuid  UUID NOT NULL,              -- siak_dosen_id ATAU siak_mahasiswa_id
  identifier      VARCHAR(64) NOT NULL,       -- NIDN/NPM versi SIAK, dinormalisasi
  identifier_type VARCHAR(10) NOT NULL,       -- 'nidn' | 'npm'
  matched_via     VARCHAR(10) NOT NULL,       -- 'nidn' | 'npm' | 'manual'
  status          VARCHAR(10) NOT NULL DEFAULT 'auto', -- 'auto' | 'verified' | 'rejected'
  matched_at      TIMESTAMPTZ DEFAULT now(),
  verified_by     UUID REFERENCES tb_users(user_id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_sum_tias_user UNIQUE (tias_user_id),
  CONSTRAINT uq_sum_siak_user UNIQUE (siak_user_uuid)
);
CREATE INDEX idx_sum_identifier ON siak_user_mappings (identifier);
CREATE INDEX idx_sum_status     ON siak_user_mappings (status);
```
Asumsi 1 akun UCL = 1 peran = 1 identitas SIAK (karena dua `UNIQUE`). Longgarkan hanya jika
ditemukan kasus dual-role.

---

## Task 2 — Skema projection (tabel baca LMS)

```sql
-- Kelas (sumber kebenaran LMS untuk daftar kelas & scope)
CREATE TABLE siak_v2_classes (
  "kelasKuliahId"          UUID PRIMARY KEY,            -- = kelas.id
  "siakProgramStudiId"     UUID NOT NULL,               -- untuk scope admin prodi/fakultas
  "siakPeriodeAkademikId"  UUID NOT NULL,
  "siakMataKuliahId"       UUID NOT NULL,
  nama                     VARCHAR(128),                -- "Reguler A"
  kode_matakuliah          VARCHAR(32),                 -- dari mataKuliah.kode (display)
  nama_matakuliah          VARCHAR(256),                -- dari mataKuliah.nama (display)
  status_kelas             VARCHAR(32),                 -- "Aktif"/...
  kapasitas                INTEGER,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_svc_prodi    ON siak_v2_classes ("siakProgramStudiId");
CREATE INDEX idx_svc_periode  ON siak_v2_classes ("siakPeriodeAkademikId");

-- Dosen pengampu per kelas (join table; dari jadwalKuliah[].dosen, distinct)
CREATE TABLE siak_v2_class_lecturers (
  id              SERIAL PRIMARY KEY,
  "kelasKuliahId" UUID NOT NULL REFERENCES siak_v2_classes("kelasKuliahId"),
  siak_dosen_id   UUID NOT NULL,
  nidn            VARCHAR(64),
  CONSTRAINT uq_svcl UNIQUE ("kelasKuliahId", siak_dosen_id)
);
CREATE INDEX idx_svcl_dosen ON siak_v2_class_lecturers (siak_dosen_id);

-- Peserta per kelas (dari /peserta-kelas)
CREATE TABLE siak_v2_participants (
  id                SERIAL PRIMARY KEY,
  "kelasKuliahId"   UUID NOT NULL REFERENCES siak_v2_classes("kelasKuliahId"),
  siak_mahasiswa_id UUID NOT NULL,
  npm               VARCHAR(64),
  CONSTRAINT uq_svp UNIQUE ("kelasKuliahId", siak_mahasiswa_id)
);
CREATE INDEX idx_svp_mhs ON siak_v2_participants (siak_mahasiswa_id);
```
> `lms_sections` (dari rancangan LMS) FK ke `siak_v2_classes("kelasKuliahId")`. Jumlah pertemuan
> untuk `lms_sections` **tidak ada** di payload list (lihat Open Dependency #2) — derive/atur default.

---

## Task 3 — Sync ETL (`POST /api/lms/sync-siak`)

Idempoten, upsert-only. Urutan:

1. **Periode aktif:** `GET /periode-akademik/active-status` → ambil `id` periode `status="Aktif"`.
2. **Kelas (paginated):** loop `GET /akademik/kelas-kuliah?periodeAkademik=<id>&page=N&size=M`
   sampai habis. Untuk tiap kelas:
   - Upsert `siak_v2_classes` (map `id`, `siakProgramStudiId`, `siakPeriodeAkademikId`,
     `siakMataKuliahId`, `nama`, `mataKuliah.kode/nama`, `status_kelas`, `kapasitas`).
   - Dari `jadwalKuliah[]`, kumpulkan `dosen` **distinct by `dosen.id`** → upsert
     `siak_v2_class_lecturers` (`kelasKuliahId`, `siak_dosen_id=dosen.id`, `nidn=dosen.nidn`).
   - **Tidak ada call jadwal/dosen terpisah** — sudah ter-embed.
3. **Peserta (fan-out per kelas):** untuk tiap kelas, `GET /akademik/kelas-kuliah/{id}/peserta-kelas`
   → upsert `siak_v2_participants` (`siak_mahasiswa_id=peserta.id`, `npm=peserta.npm`).
   Tangani rate-limit, retry, dan partial-failure (jangan biarkan satu kelas gagal menggagalkan
   seluruh sync).
4. **Soft-deactivate:** kelas/peserta/dosen yang tidak lagi muncul → `is_active=false` /
   hapus baris relasi join secara aman (jangan sentuh `lms_*`).
5. **Linking `siak_user_mappings`** (idempoten):
   - **Dosen:** dari `siak_v2_class_lecturers`, untuk tiap `(siak_dosen_id, nidn)` →
     cocokkan `nidn` (dinormalisasi) ke `tb_users.nidn`. Tepat satu → upsert mapping
     (`siak_user_uuid=siak_dosen_id`, `identifier_type='nidn'`, `status='auto'`).
   - **Mahasiswa:** dari `siak_v2_participants`, untuk tiap `(siak_mahasiswa_id, npm)` →
     cocokkan `npm` ke `tb_users.npm`. Tepat satu → upsert mapping
     (`siak_user_uuid=siak_mahasiswa_id`, `identifier_type='npm'`, `status='auto'`).
   - Nol cocok → **report unmatched**. >1 cocok → **report conflict**. Jangan auto-link.
   - Jangan turunkan baris `verified`.

**Auth:** gunakan kredensial service (lihat Open Dependency #1), BUKAN token user yang login.

---

## Task 4 — Resolusi mapping saat login (enrich `req.user`)
Di titik pembentukan JWT/sesi, resolve mapping sekali:
```js
const m = await SiakUserMapping.findOne({
  where: { tias_user_id: user.user_id, status: ['auto','verified'] },
});
req.user.siakUserUuid = m?.siak_user_uuid ?? null;  // dosen→siak_dosen_id, mhs→siak_mahasiswa_id
```
Admin (role) tetap berfungsi walau `siakUserUuid` null.

---

## Task 5 — Middleware otorisasi (UUID, dua peran)

```js
async function studentEnrolled(req, res, next) {
  if (!req.user.siakUserUuid) return res.sendStatus(403);
  const ok = await SiakV2Participant.findOne({
    where: { kelasKuliahId: req.params.kelasKuliahId, siak_mahasiswa_id: req.user.siakUserUuid },
    attributes: ['id'],
  });
  return ok ? next() : res.sendStatus(403);
}

async function lecturerOwnsClass(req, res, next) {
  if (!req.user.siakUserUuid) return res.sendStatus(403);
  const ok = await SiakV2ClassLecturer.findOne({
    where: { kelasKuliahId: req.params.kelasKuliahId, siak_dosen_id: req.user.siakUserUuid },
    attributes: ['id'],
  });
  return ok ? next() : res.sendStatus(403);
}
```
Catatan:
- Co-teaching otomatis didukung (tabel join boleh punya banyak dosen per kelas).
- Otorisasi edit berbasis **kepemilikan kelas**, BUKAN `lms_sections.id_lecture` (itu cuma audit).
- **Forum/Assignment (jalur tulis):** turunkan `kelasKuliahId` di server lewat rantai
  `content_item.id → lms_sections.section_id → kelasKuliahId`, lalu jalankan middleware di atas.
  Jangan percaya `kelasKuliahId` dari body request.

---

## Task 6 — Endpoint admin: review mapping + unmatched (disarankan)
```
GET   /siak-sync/user-mappings            # filter status; search identifier
GET   /siak-sync/user-mappings/unmatched  # SIAK user di roster tanpa akun UCL + conflict
PATCH /siak-sync/user-mappings/:id        # status → verified | rejected (set verified_by)
POST  /siak-sync/user-mappings            # link manual (matched_via='manual')
```
Hanya Admin global (role). `verified` mengunci baris dari penurunan otomatis sync.

---

## Konfigurasi `.env`
```
LMS_AUTHZ_KEY=uuid                 # dosen & mahasiswa sama-sama UUID (terkonfirmasi)
SIAK_API_BASE_URL=...              # base URL SIAKAD
SIAK_SYNC_AUTH=...                 # kredensial service (lihat Open Dependency #1)
```

---

## Acceptance Criteria (gate)
1. Migration up/down bersih & reversibel; tidak ada perubahan pada `m_matakuliah`/`absensi_*`/`pembelajaran_dosen_ext`.
2. Sync dijalankan 2× → state idempoten; tidak ada baris `verified` berubah; tidak ada hard delete;
   record hilang → `is_active=false`.
3. **Reconciliation report = gate pra-cut-over:** jumlah unmatched + conflict (dosen & mhs)
   tampil & bisa ditangani admin.
4. Otorisasi: dosen pengampu (termasuk co-teaching) bisa kelola; bukan pengampu → 403;
   mahasiswa peserta bisa akses; bukan peserta → 403; admin tidak terkunci.
5. File LMS (`GET /lms/files/:id`) hanya bisa diakses user berhak atas kelas pemilik file —
   uji sebagai test case IDOR prioritas tinggi.
6. `GET /lms/classes` memfilter scope admin prodi/fakultas via `siakProgramStudiId`.

---

## Open Dependencies (di luar kendali Claude Code — koordinasi tim SIAK)
1. **Auth service-to-service.** Auth SIAKAD saat ini berbasis **user Bearer token**. Sync UCL
   tidak boleh bertumpu pada token user. Sepakati mekanisme: service account (login →
   Bearer), API key, atau OAuth client credentials. Bangun klien sync agar mengirim auth sejak
   awal walau endpoint belum mewajibkannya.
2. **`jumlahPertemuan` & tanggal kelas** tidak ada di payload list. Untuk mengisi jumlah
   `lms_sections`, derive (default 14/16, atau dari endpoint detail jika tersedia) — bukan blocker.
3. **Konfirmasi `peserta.id`** = master mahasiswa (bukan id baris enrollment). Verifikasi cepat
   saat integrasi; jika ternyata id baris, pakai kolom NPM sebagai kunci link (mapping sudah
   menyimpan keduanya).
