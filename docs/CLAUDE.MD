# CLAUDE.md — tias-backend (Modul Pembelajaran LMS)

## Konteks proyek

Menambahkan **Modul Pembelajaran (LMS SPADA-style)** ke sistem TIAS UCL UIKA.
Spesifikasi lengkap ada di: `SPEC_Modul_Pembelajaran_UCL_v8.md` (root). **Baca file itu sebelum bekerja.**

## Aturan kerja (WAJIB dipatuhi)

1. **Ikuti fase secara berurutan.** Mulai dari FASE 0 (Decision Gate). JANGAN melompat fase.
2. **FASE 0 adalah gerbang keputusan, bukan koding.** Selesaikan investigasi, LAPORKAN temuan, lalu BERHENTI dan tunggu keputusan manusia soal cabang desain (§3.1 di spec). Jangan tulis migrasi/model/controller sebelum cabang dipilih.
3. **Berhenti & tanya bila ragu.** Jika nama tabel/kolom di spec tidak cocok dengan kode/DB nyata, JANGAN menebak atau diam-diam menyesuaikan. Lapor ke manusia.
4. **Jangan rusak alur eksisting.** Backend ini banyak proxy ke API Laravel (`fts-absen`). Tambahkan lapisan otorisasi lokal di dalam `asyncHandler` SEBELUM `axios.get/post`. Jangan ubah perilaku endpoint presensi yang sudah jalan.
5. **Presensi adalah sistem eksisting (Laravel).** Modul LMS hanya MENAUTKAN/menampilkan, tidak membuat ulang logika presensi/QR/token.
6. **Default DENY** pada semua cek otorisasi. Jangan fail-open.
7. **Ujian (CBT) ditunda ke fase paling akhir.** Jangan kerjakan sekarang.

## Konvensi kode (ikuti yang sudah ada di repo)

- Pola MVC: `routes/` → `controllers/` → `models/` (Sequelize).
- Reuse `authMiddleware`, `dosenOnly`, `mhsOnly`, `errorHandler`, `response-parser` yang sudah ada.
- Respons JSON konsisten dengan helper eksisting.

## Sebelum menulis kode apa pun

- Konfirmasi: `pembelajaran_dosen_ext` HIDUP atau MATI? (cek `information_schema.tables` + cari pemakaiannya).
- Konfirmasi: identitas dosen ke SIAK pakai kolom apa (`nik_dosen`/`id_lecture` berasal dari mana)?
- Cetak satu sample respons SIAK untuk verifikasi struktur.

## Yang TIDAK boleh dilakukan

- Membuat tabel enrollment palsu seolah ada di lokal (tidak ada KRS lokal — pakai cache + fallback SIAK sesuai spec §2.2).
- Menulis engine ujian/bank soal (didelegasikan ke CBT).
- Mengubah skema `tb_users` atau tabel presensi eksisting.
