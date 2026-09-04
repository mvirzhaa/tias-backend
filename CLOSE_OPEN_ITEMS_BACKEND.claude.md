# Task: Tutup Item Terbuka — tias-backend

## ATURAN KETAT
- **Investigasi dulu, laporkan, baru tanya konfirmasi sebelum mengubah apa pun
  yang menyentuh: file `.env` mana pun, migration database, atau file yang
  di-deploy ke production.** Perubahan kode di repo git yang jelas salah eja/
  bug ketik boleh langsung diperbaiki dengan mencatatnya di laporan akhir.
- **JANGAN jalankan migration apa pun** (`sequelize db:migrate`, atau
  `scratch/*.js` manual), baik di database lokal, staging, maupun prod.
- **JANGAN commit langsung ke `main`.** Kerja di branch baru
  `chore/close-open-items-<tanggal>`, commit di situ, JANGAN push tanpa
  instruksi eksplisit dari saya di akhir sesi ini.
- Untuk setiap temuan, sertakan **file:baris**. Pisahkan tegas: FAKTA
  TERKONFIRMASI vs PERLU KEPUTUSAN MANUSIA vs TIDAK BISA DIVERIFIKASI DARI SINI.

## Konteks
Repo ini dipakai untuk backend UCL/TIAS, deploy di server dengan dua instance
(prod port 5000, staging port 5001, masing-masing folder terpisah dengan
`.env` sendiri). Sesi debugging sebelumnya (3-5 Juli 2026) menemukan beberapa
item yang sengaja ditunda. Task ini membereskan yang berisiko rendah dan
melaporkan sisanya dengan jelas.

## Item 1 — Konsistensi `scratch/run-lms-migrations.js`
File ini mereferensikan nama migration yang TIDAK cocok dengan file aktual:
```
cat scratch/run-lms-migrations.js | grep -A6 "const MIGRATIONS"
find migrations -iname "*siak-v2-classes*" -o -iname "*lms-sections*" -o -iname "*lms-content-items*" -o -iname "*siak-v2-participants*"
```
Bandingkan nama di array `MIGRATIONS` dengan nama file yang benar-benar ada.
Kalau tidak cocok: **perbaiki array di script ini** supaya menunjuk ke nama
file yang benar. JANGAN jalankan scriptnya. Cek juga apakah script ini masih
"Fase 1" saja — kalau ada migration LMS lain yang lebih baru
(`20260614*`, `20260615*`, `20260621*`) yang belum dicakup script serupa,
laporkan sebagai temuan terpisah, JANGAN tambahkan sendiri ke script tanpa
instruksi.

## Item 2 — `GOOGLE_CALLBACK_URL` — status implementasi
```
grep -n "GOOGLE_CALLBACK_URL\|callbackURL" utils/passport.js
grep -rn "GOOGLE_CALLBACK_URL" --include="*.js" . | grep -v node_modules
```
Laporkan: apakah `passport.js` sudah baca `process.env.GOOGLE_CALLBACK_URL`,
atau masih `process.env.API_URL` (yang diketahui identik antara staging-prod,
sumber bug redirect-ke-prod saat login Google). **JANGAN ubah kode ini** —
perubahan ini butuh redirect URI baru didaftarkan di Google Cloud Console
DULU oleh manusia, sebelum kode diubah, atau login Google akan gagal total.
Cukup laporkan status saat ini dan siapkan (tapi jangan commit) contoh
perubahan kode yang akan dibutuhkan.

## Item 3 — `controllers/Users/usersController.js` (`required: false`)
```
git log --all --oneline -- controllers/Users/usersController.js | head -10
git log -p --all -- controllers/Users/usersController.js | grep -B5 -A5 "required:" | head -60
```
Cari commit yang mengubah `required: true` → `false` pada asosiasi
`DataPribadi` di fungsi `getUsers`. Laporkan commit message, author, dan
tanggalnya — ini konteks yang dibutuhkan manusia untuk memutuskan apakah ini
sengaja atau perlu direvert. **JANGAN putuskan sendiri, JANGAN ubah kode ini.**

## Item 4 — Konsistensi env var lintas file
```
grep -rln "FRONTEND_URL\|FRONTEND_REDIRECT_URL" --include="*.js" . | grep -v node_modules
```
Untuk setiap file yang memakai `FRONTEND_URL` untuk keperluan REDIRECT/LINK
(bukan CORS `origin`) — pastikan semuanya sudah konsisten pakai
`FRONTEND_REDIRECT_URL` (bagian dari fix sesi sebelumnya). Laporkan kalau ada
yang masih tertinggal pakai `FRONTEND_URL` untuk redirect/link. **Kalau ada
yang tertinggal, boleh langsung diperbaiki** (pola perubahan ini sudah
established, risiko rendah) — tapi catat di laporan file mana yang diubah.

## Item 5 — Duplikasi/dead code di vhost & config (kalau ada akses filesystem server)
Kalau task ini dijalankan dengan akses ke `/etc/apache2/sites-enabled/` di
server (BUKAN cuma repo git), cek:
```
cat /etc/apache2/sites-enabled/api-tias.ti.ft.uika-bogor.ac.id-le-ssl.conf
```
Laporkan kalau ada blok konfigurasi yang duplikat/mengambang di luar
`<VirtualHost>` — JANGAN edit file ini, laporkan saja.

Kalau task ini TIDAK punya akses ke luar repo git (cuma clone lokal),
laporkan eksplisit: "Item 5 tidak bisa diverifikasi — tidak ada akses
filesystem server."

## Format laporan akhir
```markdown
## FAKTA TERKONFIRMASI
- [Item #] ...

## SUDAH DIPERBAIKI (di branch chore/close-open-items-<tanggal>)
- [Item #] file:baris — sebelum → sesudah

## PERLU KEPUTUSAN MANUSIA (jangan dieksekusi tanpa konfirmasi)
- [Item #] ...

## TIDAK BISA DIVERIFIKASI DARI SINI
- [Item #] alasan (mis. butuh akses server, butuh akses Google Console)
```

Setelah laporan ini saya baca, saya akan beri instruksi eksplisit apakah
branch ini di-push atau ada perubahan tambahan.
