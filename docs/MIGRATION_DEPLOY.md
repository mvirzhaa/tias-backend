# Migrasi & Deploy — Modul Pembelajaran (LMS)

Dokumen ini mencatat **risiko nyata** dan **prosedur aman** untuk menjalankan migrasi
database modul LMS (`siak_v2_*`, `lms_*`). Ditulis apa adanya — baca sampai habis sebelum
menyentuh DB staging/produksi.

Konfigurasi koneksi sequelize-cli: `.sequelizerc` → `config/config.js` → variabel `.env`
(`USERDB`, `PASSWORDDB`, `DBNAME`, `HOSTDB`, `PORTDB`). Tidak ada kredensial hardcoded.

---

## 1. Catatan renumber migrasi LMS (penting untuk masa depan)

Migrasi LMS telah **di-renumber** agar urutan timestamp = urutan dependensi Foreign Key:

| Urutan | File | Bergantung pada |
| --- | --- | --- |
| 0001 | `...0001-create-siak-v2-classes.js` | — |
| 0002 | `...0002-create-siak-v2-participants.js` | siak_v2_classes |
| 0003 | `...0003-create-lms-sections.js` | siak_v2_classes |
| 0004 | `...0004-create-lms-content-items.js` | lms_sections |
| 0005 | `...0005-create-lms-forum-threads.js` | lms_content_items |
| 0006 | `...0006-create-lms-forum-posts.js` | lms_forum_threads (+ self) |

Sebelumnya `lms_sections` (FK → `siak_v2_classes`) bernomor lebih awal daripada
`siak_v2_classes`, sehingga `db:migrate` di DB baru **gagal**:
`relation "siak_v2_classes" does not exist`.

**Renumber ini AMAN** karena migrasi LMS belum pernah dijalankan di DB permanen mana pun —
hanya di dev lokal yang bisa di-reset (dan `SequelizeMeta` dev sudah disesuaikan).

> ### ⛔ ATURAN KE DEPAN
> Setelah sebuah migrasi **pernah dijalankan di DB permanen** (staging/produksi),
> **JANGAN** renumber, rename, atau mengubah isi migrasi yang sudah ada.
> Hanya **tambahkan migrasi baru di belakang** (timestamp lebih besar).
> Mengubah migrasi yang sudah ter-deploy = **bentrok `SequelizeMeta`** (file tak cocok
> dengan nama tercatat → migrasi dianggap "pending" lalu mencoba membuat tabel yang sudah
> ada → error/korup).

---

## 2. ⚠️ BAHAYA: `db:migrate` polos di repo ini

Folder `migrations/` **bukan hanya** migrasi LMS. Ada **15 migrasi non-LMS** (tb-users,
cbt, parents, data-pribadi, kategori, kompetensi, penunjang, pengabdian, skripsi, seed, dll).

Beberapa di antaranya **rusak**. Diuji pada DB kosong:

```
npx sequelize-cli db:migrate
# ...
# == 20260516000007-seed-all-data: migrating =======
# ERROR: relation "kategori_ip" does not exist
```

`db:migrate` menjalankan **semua** migrasi pending urut timestamp. Karena migrasi LMS
(`20260608…`) bertimestamp **paling akhir**, dan rantai **mati di `seed-all-data`
(`20260516000007`)** lebih dulu, maka **migrasi LMS TIDAK PERNAH tercapai**.

- `db:migrate` polos → **gagal sebelum LMS**.
- `db:migrate --to <migrasi-LMS-terakhir>` → **sama saja**, karena semua migrasi non-LMS
  yang rusak bertimestamp lebih awal sehingga ikut dijalankan lebih dulu.

### ✅ Cara aman menjalankan HANYA migrasi LMS (teruji)

Mekanisme: **baseline** — tandai 15 migrasi non-LMS sebagai "sudah diterapkan" di
`SequelizeMeta` **tanpa menjalankannya**, lalu `db:migrate` hanya menyisakan 6 migrasi LMS.

> Asumsi: skema non-LMS pada DB target dikelola **di luar** rantai migrasi ini (atau memang
> tidak diperlukan untuk layanan LMS). Modul LMS hanya ber-FK antar tabelnya sendiri, jadi
> tidak butuh tabel non-LMS. Bug `seed-all-data` adalah urusan tim non-LMS yang terpisah.

**Langkah 1 — baseline (jalankan SEKALI di DB target, sebelum migrate):**

```sql
CREATE TABLE IF NOT EXISTS "SequelizeMeta" ("name" VARCHAR(255) NOT NULL PRIMARY KEY);

INSERT INTO "SequelizeMeta" ("name") VALUES
  ('20260407074730-create-tb-users.js'),
  ('20260504021619-create-cbt-user-mappings.js'),
  ('20260506011539-create-cbt-user-mappings.js'),
  ('20260507140116-create-cbt-user-mappings.js'),
  ('20260512142858-create-tb-parents.js'),
  ('20260512142911-create-trx-parent-mhs.js'),
  ('20260512142923-create-tb-data-pribadi.js'),
  ('20260516000000-seed-users-and-parents.js'),
  ('20260516000001-create-kategori-tables.js'),
  ('20260516000002-create-kompetensi-tables.js'),
  ('20260516000003-create-penunjang-tables.js'),
  ('20260516000004-create-pengabdian-tables.js'),
  ('20260516000005-create-skripsi-tables.js'),
  ('20260516000007-seed-all-data.js'),
  ('20260602000001-create-pembelajaran-dosen-ext.js')
ON CONFLICT DO NOTHING;
```

**Langkah 2 — jalankan migrasi (membaca DB dari `.env`):**

```bash
npx sequelize-cli db:migrate
```

**Hasil yang diharapkan (sudah diuji di DB throwaway):** hanya 6 migrasi LMS jalan, urut
`siak_v2_classes → siak_v2_participants → lms_sections → lms_content_items →
lms_forum_threads → lms_forum_posts`, tanpa error FK.

**Idempotency (diuji):** menjalankan `db:migrate` lagi →
`No migrations were executed, database schema was already up to date.`

> Catatan pengujian: verifikasi di atas dilakukan pada DB sementara dengan menimpa nama DB,
> mis. `DBNAME=lms_deploy_doctest npx sequelize-cli db:migrate` (dotenv tidak menimpa env
> yang sudah diset). Untuk deploy nyata, set `.env` ke DB target lalu cukup
> `npx sequelize-cli db:migrate`.

### Rollback (bila perlu)

```bash
npx sequelize-cli db:migrate:undo            # batalkan 1 migrasi terakhir
npx sequelize-cli db:migrate:undo:all --to 20260608000001-create-siak-v2-classes.js
```

Karena FK `RESTRICT`/`CASCADE`, urutan undo otomatis kebalikan dari urutan migrate. Jika ada
data LMS, pertimbangkan dampak `CASCADE` sebelum undo.

---

## 3. Prosedur deploy ke staging/produksi

> 🔴 **Migrasi produksi dijalankan MANUAL oleh manusia.** JANGAN otomatiskan lewat
> agent/CI tanpa review eksplisit. Migrasi mengubah skema dan bisa merusak data.

Urutan langkah:

1. **Backup DB target lebih dulu** (`pg_dump`). Pastikan backup berhasil & bisa di-restore.
2. **Staging dulu, bukan produksi.** Terapkan prosedur §2 (baseline + `db:migrate`) di
   **staging**.
3. **Verifikasi di staging:**
   - `npx sequelize-cli db:migrate:status` → 6 LMS `up`, urutan benar.
   - Cek skema: 6 tabel ada, FK & index benar (lihat `siak_v2_classes`, `siak_v2_participants`,
     `lms_sections`, `lms_content_items`, `lms_forum_threads`, `lms_forum_posts`).
   - Uji fungsional endpoint LMS (sync mock → section → item → upload → forum).
4. **Baru produksi**, ulangi langkah 1–3 di DB produksi pada window maintenance.
5. **Setelah deploy:** jangan pernah mengubah migrasi LMS yang sudah jalan (lihat §1).

Checklist singkat sebelum `db:migrate` produksi:
- [ ] Backup terverifikasi
- [ ] Sudah sukses & terverifikasi di staging
- [ ] `.env` produksi menunjuk DB yang benar
- [ ] Baseline non-LMS sudah dijalankan (bila skema non-LMS dikelola terpisah)
- [ ] Dijalankan manual oleh manusia, dengan review

---

## 4. Status file config yatim (jangan jadi acuan)

- `config/config.json` — **TIDAK dipakai** lagi. Dulu dirujuk `.sequelizerc` dan berisi
  kredensial basi (`m_ucl_database`, password salah) yang menyebabkan `db:migrate` gagal
  konek. `.sequelizerc` kini menunjuk `config/config.js` (env-based). File dibiarkan ada
  tapi **bukan acuan**.
- `config/config copy.json` — sisa konfigurasi MySQL lama, **tidak dipakai**.
- **Sumber kebenaran koneksi tunggal:** `.env` → `config/config.js` (untuk CLI & `models/index.js`)
  dan `config/index.js` (untuk instance Sequelize aplikasi).

> Skrip lama `scratch/run-lms-migrations.js` kini **usang & rusak** (merujuk nama file
> migrasi sebelum renumber). **Jangan dipakai.** Gunakan prosedur §2.
