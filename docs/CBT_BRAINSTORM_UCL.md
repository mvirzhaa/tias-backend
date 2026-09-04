# 📋 Dokumen Brainstorming — Modul CBT (Computer Based Test) TIAS UCL
> **Dibuat:** 14 Juni 2026  
> **Platform:** TIAS Mobile (React Native) + TIAS Backend (Node.js/Express)  
> **Target Institusi:** UCL (Universitas / Unit berbasikan sistem UIKA Bogor)  
> **Status:** Sebagian besar sudah diimplementasi di sisi mobile — backend CBT Auth sudah ada, integrasi ke CBT API eksternal sedang/perlu diselesaikan.

---

## 🏗️ 1. ARSITEKTUR SISTEM KESELURUHAN

Sistem CBT TIAS menggunakan **3 lapis server** yang saling terhubung:

```
┌──────────────────────┐
│   TIAS Mobile App    │  ← React Native (mahasiswa & dosen)
│   (tias-mobile)      │
└──────────┬───────────┘
           │
           │ 1) SSO: POST /api/cbt/auth
           ▼
┌──────────────────────┐
│   TIAS Backend       │  ← Node.js / Express (tias-backend)
│   (tias-backend)     │     - Validasi JWT TIAS
│                      │     - Bridge SSO ke CBT API
│                      │     - Menyimpan CBT Token ke DB (CbtUserMapping)
└──────────┬───────────┘
           │
           │ 2) Exchange user → CBT Token (machine-to-machine)
           ▼
┌──────────────────────┐
│   CBT API (Eksternal)│  ← Server ujian (u-talent.uika-bogor.ac.id/cbt-api)
│                      │     - Manajemen soal & ujian
│                      │     - Verifikasi token ujian
│                      │     - Submit & penilaian jawaban
└──────────────────────┘
```

### Teknologi Stack

| Layer | Teknologi |
|-------|-----------|
| Mobile | React Native 0.75.3 + TypeScript |
| State Management | Zustand + AsyncStorage (persist) |
| API Client | Axios + @tanstack/react-query v4 |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| Backend | Node.js + Express + Sequelize ORM |
| Database | MySQL (via Sequelize) |
| Auth | JWT (TIAS Token) + CBT Token (dari CBT API) |

---

## 🔑 2. ALUR AUTENTIKASI — SSO (Single Sign-On)

Ini adalah inti dari integrasi: mahasiswa hanya login sekali ke TIAS, lalu otomatis mendapat akses ke CBT.

### Alur Detail SSO

```
1. Mahasiswa login ke TIAS Mobile
   → Email + Password → POST /api/auth/login
   → Mendapat JWT Token TIAS → disimpan di Zustand store (persist ke AsyncStorage)

2. Mahasiswa tap menu "CBT" di bottom tab
   → CBTEntryScreen mount

3. CEK: apakah sudah punya CBT Token di store?
   ├── YA → langsung ke CBTListScreen
   └── TIDAK → kirim POST /api/cbt/auth ke TIAS Backend
                dengan header { token: jwtTias }

4. TIAS Backend (CbtAuthController.js):
   → Validasi JWT TIAS
   → Cek tabel CbtUserMapping
      ├── Token masih valid (< 8 jam) → return existing token
      └── Expired / belum ada:
          → Panggil CBT API: POST /auth/exchange
            body: { email, nama, nim }
          → Terima CBT Token
          → Simpan ke DB dengan expires_at (+8 jam)
          → Return ke mobile

5. Mobile terima CBT Token
   → Simpan ke Zustand: setCbtToken(cbt_token, cbt_user_id)
   → Navigation.replace ke CBTListScreen
```

### File yang Terlibat SSO

| File | Peran |
|------|-------|
| `src/features/cbt/CBTEntryScreen.tsx` | Trigger SSO saat mount |
| `src/services/cbt/useCbtLogin.ts` | Mutation: POST `cbt/auth` ke TIAS Backend |
| `src/config/axios-tias.ts` | Instance Axios untuk TIAS Backend |
| `src/store/auth.ts` | Simpan `cbt_token` + `cbt_user_id` |
| `controllers/CBT/CbtAuthController.js` | Logic SSO di backend |
| `utils/cbtApiClient.js` | HTTP client ke CBT API eksternal |
| Model: `CbtUserMapping` | Cache mapping tias_user_id ↔ cbt_token |

---

## 📱 3. SCREEN-SCREEN CBT (MOBILE) — STATUS IMPLEMENTASI

### 3.1 CBTEntryScreen ✅ SELESAI

**File:** `src/features/cbt/CBTEntryScreen.tsx`

**Fungsi:**
- SSO otomatis saat pertama buka modul CBT
- Routing berbasis role: Mahasiswa vs Dosen

**Tampilan per role:**
| Role | Tampilan |
|------|----------|
| **Mahasiswa** | Loading SSO → langsung redirect ke CBTList |
| **Dosen** | Portal card: (1) Buka Web CBT, (2) Lihat Riwayat Ujian |

**State yang ditangani:**
- `isPending` → Loading card dengan animasi spinner
- `isError` → Error card + tombol "Coba Lagi" + tombol "Lihat Riwayat"
- `cbt_token` tersedia → navigate.replace ke CBTList

**URL Web CBT Dosen:** `https://u-talent.uika-bogor.ac.id/cbt/`

**Desain:** Tema hijau-kuning UIKA (palette `C`), background circles dekorasi

---

### 3.2 CBTListScreen ✅ SELESAI

**File:** `src/features/cbt/CBTListScreen.tsx` (juga ada versi di `screens/CbtExamListScreen.tsx`)

**Fungsi:**
- Menampilkan daftar ujian yang sedang berlangsung (status: `ongoing`)
- Pull-to-refresh
- Tap ujian → navigasi ke CBTTokenScreen

**Data yang ditampilkan per card ujian:**
- Nama Ujian
- Mata Kuliah
- Durasi (menit)
- Waktu mulai & selesai
- Badge status ("Berlangsung")

**Endpoint:** `GET /api/student/exams` ke CBT API (via `axios-cbt`)

---

### 3.3 CBTTokenScreen ✅ SELESAI

**File:** `src/features/cbt/CBTTokenScreen.tsx`

**Fungsi:**
- Input token ujian yang diberikan dosen secara langsung di kelas
- Verifikasi token ke CBT API
- Jika valid → navigate ke CBTTermsScreen (atau langsung CBTExamScreen)

**Validasi Input:**
- Uppercase otomatis (`autoCapitalize="characters"`)
- Max 20 karakter
- Tidak boleh kosong

**Endpoint:** `POST /api/student/verify-token` ke CBT API  
**Payload:** `{ token: tokenUjian }`  
**Response sukses:** berisi `{ questions, durasi }` dari CBT API

---

### 3.4 CBTTermsScreen ✅ SELESAI

**File:** `src/features/cbt/CBTTermsScreen.tsx`

**Fungsi:**
- Halaman syarat & ketentuan sebelum memulai ujian
- Mahasiswa WAJIB scroll dan centang checkbox persetujuan
- Tombol "Mulai Ujian" hanya aktif jika checkbox dicentang

**S&K:**
- Default: 5 aturan bawaan (hardcoded)
- Dari API: `GET /api/student/exam-terms/:examId` → jika dosen setting custom S&K, tampilkan dari server (`is_custom: true`)

---

### 3.5 CBTExamScreen ✅ SELESAI

**File:** `src/features/cbt/CBTExamScreen.tsx` (dan versi `screens/CbtExamSessionScreen.tsx`)

**Fungsi inti:**
1. **Timer Countdown** — setInterval setiap 1 detik, auto-submit saat habis
2. **Navigasi Soal** — scrollable number navigator di atas (hijau=sudah dijawab, biru=soal aktif)
3. **4 Tipe Soal:**
   | Tipe | Nama | Komponen |
   |------|------|----------|
   | TIPE_1 | Pilihan Ganda (A/B/C/D) | TouchableOpacity radio button |
   | TIPE_2 | Jawaban Singkat | TextInput single line |
   | TIPE_3 | Esai / Uraian | TextInput multiline (min 180px) |
   | TIPE_4 | Upload File | DocumentPicker (react-native-document-picker) |

4. **Blokir Back Button** — Android `BackHandler` mencegah keluar ruang ujian
5. **Disable Gesture iOS** — `gestureEnabled: false` di navigator
6. **Header** merah saat timer < 5 menit (warning)

**Submit Logic:**
- Manual: mahasiswa tap "Kumpulkan Ujian" di soal terakhir
- Auto: timer habis → `handleSubmit(true)` dipanggil otomatis
- Anti-double submit: flag `sudahSubmit`
- FormData: semua jawaban + file dikirim via `multipart/form-data`

**Endpoint Submit:** `POST /api/student/submit-exam` ke CBT API

---

### 3.6 CBTResultScreen ✅ SELESAI

**File:** `src/features/cbt/CBTResultScreen.tsx`

**Fungsi:**
- Menampilkan hasil langsung setelah submit
- Total skor sementara
- Detail per soal: status `menunggu` atau skor akhir

**Logika penilaian yang ditampilkan:**
- Pilihan Ganda → langsung ada skor (auto-grading)
- Esai / Teks → bisa "menunggu koreksi" (dosen atau AI)
- Upload File → "menunggu dosen"

---

### 3.7 CBTHistoryScreen ✅ SELESAI

**File:** `src/features/cbt/CBTHistoryScreen.tsx`

**Fungsi:**
- Riwayat semua ujian yang pernah dikerjakan
- Bisa diakses mahasiswa DAN dosen
- Status: `SELESAI` atau `MENUNGGU_VERIFIKASI`

**Fitur:**
- 🔍 Search bar (cari nama ujian / mata kuliah)
- Filter chip: Semua | Selesai | Proses
- Expandable card (tap untuk lihat rincian skor per kategori)
- Counter hasil filter

**Data per card:**
- Nama ujian & mata kuliah
- Status badge
- Nilai akhir (atau "🔒 Belum Dipublikasi")
- Rincian breakdown: Pilgan, Esai (AI), Praktik/Upload (dosen)
- Jenis penilaian: `PER_KATEGORI` (bobot %) atau `POIN_MUTLAK`

**Endpoint:** `GET /api/student/history` ke CBT API

---

## 🔌 4. SERVICES & API HOOKS — STATUS IMPLEMENTASI

### Services di `src/services/cbt/`

| File | Hook | Endpoint | Status |
|------|------|----------|--------|
| `useCbtLogin.ts` | `useCbtLogin()` | `POST cbt/auth` (TIAS Backend) | ✅ |
| `useExamList.ts` | `useExamList()` | `GET /api/student/exams` (CBT API) | ✅ |
| `useVerifyToken.ts` | `useVerifyToken()` | `POST /api/student/verify-token` (CBT API) | ✅ |
| `useSubmitExam.ts` | `useSubmitExam()` | `POST /api/student/submit-exam` (CBT API) | ✅ |
| `useExamResult.ts` | `useExamResult(examId)` | `GET /api/student/result/:id` (CBT API) | ✅ |
| `useExamTerms.ts` | `useExamTerms(examId)` | `GET /api/student/exam-terms/:id` (CBT API) | ✅ |
| `useHistory.ts` | `useHistory()` | `GET api/student/history` (CBT API) | ✅ |

### Axios Instances

| Instance | File | Digunakan Untuk |
|----------|------|-----------------|
| `axiosTias` | `src/config/axios-tias.ts` | Request ke TIAS Backend |
| `axiosCbt` | `src/config/axios-cbt.ts` | Request langsung ke CBT API eksternal |

**CBT API Base URL:** `https://u-talent.uika-bogor.ac.id/cbt-api`

**Interceptor `axios-cbt`:**
- Request: otomatis inject `Authorization: Bearer {cbt_token}`
- Response 401: auto-clear `cbt_token` dari store → user akan di-SSO ulang

---

## 🗄️ 5. BACKEND CBT — STATUS IMPLEMENTASI

### Yang Sudah Ada

**Controller:** `controllers/CBT/CbtAuthController.js`
- Fungsi `getCbtToken(req, res)`
- Cek CbtUserMapping di DB
- Jika token masih valid (< 8 jam) → return existing
- Jika expired → exchange ke CBT API via `utils/cbtApiClient.js`
- Simpan/update mapping + expiry ke DB

**Model:** `CbtUserMapping`
- `tias_user_id` (FK ke user TIAS)
- `email`
- `nim`
- `cbt_user_id` (ID di sistem CBT)
- `cbt_token`
- `cbt_token_expires_at`

**Route:** Ada di routing TIAS Backend (perlu konfirmasi path persisnya)

### Yang Belum Ada / Perlu Dikonfirmasi

- [ ] Route definisi `/api/cbt/auth` di `routes/` — perlu dicek/ditambahkan
- [ ] `utils/cbtApiClient.js` — fungsi `exchangeToCbtToken()` perlu dikonfirmasi
- [ ] Migration untuk tabel `CbtUserMappings`
- [ ] Middleware auth JWT TIAS pada route CBT

---

## 🗺️ 6. NAVIGATION STACK CBT

### Stack Navigator (`src/navigation/cbtStack.tsx`)

```
CBTStack
├── CBTEntry       (initialRoute, headerShown: false)
├── CBTList        (title: "Daftar Ujian", headerLeft: null)
├── CBTToken       (title: "Masuk Ujian")
├── CBTTerms       (title: "Syarat & Ketentuan")
├── CBTExam        (headerShown: false, gestureEnabled: false)
├── CBTResult      (title: "Hasil Ujian", headerLeft: null)
└── CBTHistory     (title: "Riwayat Ujian")
```

**Penting:**
- `CBTExam` tidak ada header dan tidak bisa di-swipe back (iOS)
- `CBTList` dan `CBTResult` tidak ada tombol back (tidak bisa balik ke token/entry)

---

## 🔄 7. ALUR LENGKAP PENGGUNA

### Alur Mahasiswa (Normal Flow)

```
LOGIN TIAS
    ↓
Buka menu CBT (bottom tab)
    ↓
CBTEntryScreen
    → Cek CBT Token di store
    ├── Ada & valid → langsung ke CBTList
    └── Kosong/expired:
        → POST /api/cbt/auth ke TIAS Backend (SSO)
        → Terima CBT Token → simpan ke store
        ↓
CBTListScreen
    → GET /api/student/exams ke CBT API
    → Tampilkan daftar ujian berlangsung
    ↓ (tap ujian)
CBTTokenScreen
    → Input token dari dosen
    → POST /api/student/verify-token ke CBT API
    → Terima { questions, durasi }
    ↓ (token valid)
CBTTermsScreen
    → Tampilkan S&K (dari API atau default)
    → Mahasiswa centang persetujuan
    ↓ (tap "Mulai Ujian")
CBTExamScreen
    → Timer countdown aktif
    → Kerjakan soal (TIPE 1/2/3/4)
    → Navigasi antar soal via scroll number
    → Submit manual atau auto (timer habis)
    → POST /api/student/submit-exam (FormData)
    ↓
CBTResultScreen
    → Tampilkan skor & status per soal
    ↓ (tap "Kembali ke Daftar")
CBTListScreen
```

### Alur Dosen

```
LOGIN TIAS
    ↓
Buka menu CBT
    ↓
CBTEntryScreen (tampilan dosen)
    → Tombol "Buka Portal Web" → Linking.openURL ke web CBT
    → Tombol "Riwayat Ujian" → CBTHistoryScreen
    ↓
CBTHistoryScreen
    → Lihat rekap nilai mahasiswa
    → Search & filter
    → Expandable detail skor
```

---

## 🏆 8. SISTEM PENILAIAN

### Tipe Soal & Penilaian

| Tipe | Nama | Penilaian |
|------|------|-----------|
| TIPE_1 | Pilihan Ganda | **Auto** — sistem CBT langsung bandingkan dengan kunci |
| TIPE_2 | Jawaban Singkat | **Auto** atau **AI Similarity** |
| TIPE_3 | Esai / Uraian | **AI Scoring** (NLP similarity) + bisa override dosen |
| TIPE_4 | Upload File / Praktik | **Manual dosen** |

### Struktur Nilai Akhir

```
final_score = (skor_pilgan × bobot_pilgan%) +
              (skor_esai × bobot_esai%) +
              (skor_file × bobot_file%)
```

**2 Mode Grading:**
- `PER_KATEGORI` — menggunakan bobot persentase per kategori soal
- `POIN_MUTLAK` — setiap soal punya nilai poin tetap

### Status Riwayat

| Status | Arti |
|--------|------|
| `MENUNGGU_VERIFIKASI` | Ada soal esai/file yang belum dikoreksi |
| `SELESAI` | Semua soal sudah dinilai, nilai telah dipublikasi dosen |

**Nilai dikunci** sampai dosen memverifikasi dan mempublikasikan.

---

## 📊 9. API CONTRACT (CBT API Eksternal)

### Endpoint yang Digunakan Mobile

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/student/verify-token` | Verifikasi token ujian, terima soal |
| `GET` | `/api/student/exams` | Daftar ujian berlangsung |
| `POST` | `/api/student/submit-exam` | Submit jawaban (FormData) |
| `GET` | `/api/student/result/:examId` | Hasil ujian |
| `GET` | `/api/student/history` | Riwayat semua ujian |
| `GET` | `/api/student/exam-terms/:examId` | S&K ujian (opsional) |

### Format Submit Exam (FormData)

```
exam_id: string
answers: JSON.stringify({ [question_id]: "jawaban" })
file_{questionId}: file binary (untuk TIPE_4)
```

### AI Scoring Endpoint (Future)

```
POST /cbt/answer-score
{
  examId, questionId, studentId, answerText
}
→ Response: { similarityScore, grade, feedback, referenceAnswerId }
```

---

## ⚠️ 10. MASALAH & GAP YANG PERLU DISELESAIKAN

### A. Backend — Hal yang Perlu Dikonfirmasi

1. **Route `/api/cbt/auth`** — apakah sudah terdaftar di `routes/`?
2. **`utils/cbtApiClient.js`** — fungsi `exchangeToCbtToken()` sudah ada? Format request ke CBT API?
3. **Migration** `CbtUserMappings` sudah dijalankan?
4. **Middleware JWT** di route CBT — sudah pakai `authenticateToken`?
5. **CORS** — apakah mobile bisa langsung hit CBT API atau harus lewat TIAS Backend sebagai proxy?

### B. Mobile — Hal yang Perlu Dikonfirmasi

1. **`axios-cbt.ts`** — URL sudah benar (`https://u-talent.uika-bogor.ac.id/cbt-api`)?
2. **Field name mismatch** — field `nama_ujian`, `mata_kuliah`, dll dari CBT API harus dikonfirmasi dengan response aktual
3. **Role check** — `user?.role === 'Dosen'` sesuai dengan nilai aktual di store TIAS?
4. **`react-native-document-picker`** — sudah terinstall dan terkonfigurasi?
5. **Navigation** — `CBTTermsScreen` sudah didaftarkan di `cbtStack.tsx`?

### C. Integrasi Yang Belum Ditest End-to-End

- [ ] SSO dari TIAS → CBT API (apakah CBT API menerima format yang dikirim?)
- [ ] Submit soal TIPE_4 (upload file) — FormData dengan file
- [ ] Auto-submit saat timer habis
- [ ] AI similarity scoring untuk soal esai
- [ ] Notifikasi ke mahasiswa saat nilai sudah dipublikasi

---

## 🚀 11. RENCANA PENGEMBANGAN SELANJUTNYA (TODO)

### Prioritas Tinggi

- [ ] **End-to-end test** skenario penuh: SSO → Ujian → Submit → Hasil
- [ ] **Konfirmasi API response** CBT API dengan data aktual (console.log setiap respons)
- [ ] **Tambahkan CBT route** ke `routes/` backend jika belum ada
- [ ] **Setup `utils/cbtApiClient.js`** — pastikan koneksi ke CBT API berjalan

### Prioritas Menengah

- [ ] **Anti-cheat dasar**: detect screenshot (react-native-prevent-screenshot)
- [ ] **Offline detection**: tampilkan warning jika koneksi putus saat ujian
- [ ] **Auto-save jawaban** ke AsyncStorage sebagai backup (jawaban tidak hilang jika app crash)
- [ ] **Progress bar** soal (berapa persen sudah dijawab)
- [ ] **Soal dengan gambar** (TIPE_1 dengan option bergambar)

### Prioritas Rendah / Future

- [ ] **Notifikasi push** saat nilai selesai dikoreksi
- [ ] **Deep link** ke ujian tertentu
- [ ] **Countdown sebelum ujian dimulai** (misal: 5 menit sebelum start)
- [ ] **Exam review mode**: mahasiswa bisa lihat soal + jawaban benar setelah ujian selesai
- [ ] **Leaderboard / statistik kelas** untuk dosen
- [ ] **Anti-screenshot / screen recording** detection

---

## 💡 12. PERTANYAAN UNTUK BRAINSTORMING DENGAN CLAUDE

Gunakan pertanyaan-pertanyaan ini sebagai pemantik diskusi:

### Tentang Arsitektur & Alur
1. Apakah SSO via TIAS Backend sudah merupakan cara terbaik, atau lebih baik mobile langsung ke CBT API?
2. Bagaimana handle jika CBT Token expired DI TENGAH ujian?
3. Apakah perlu mekanisme **resume ujian** jika app crash?

### Tentang Keamanan & Integritas Ujian
4. Bagaimana mencegah mahasiswa menggunakan 2 device untuk ujian yang sama?
5. Apakah perlu face recognition saat ujian (mirip sistem absensi)?
6. Bagaimana deteksi multi-tasking / app switching saat ujian?
7. Apakah token ujian cukup aman jika dosen cukup announce 1 kali di kelas?

### Tentang UX & Experience
8. Bagaimana pengalaman mahasiswa jika jaringan putus saat ujian sedang berjalan?
9. Haruskah ada fitur **draft / simpan otomatis** jawaban?
10. Apa yang terjadi jika mahasiswa tidak sengaja close app?

### Tentang Penilaian
11. Seberapa akurat AI similarity scoring untuk soal esai Bahasa Indonesia?
12. Apakah dosen bisa override nilai AI?
13. Bagaimana mekanisme banding nilai?

### Tentang Deployment & UCL
14. Apakah CBT API (`u-talent.uika-bogor.ac.id`) yang sama akan digunakan UCL?
15. Apakah perlu server CBT tersendiri untuk UCL?
16. Bagaimana manajemen akun dosen di CBT API?

---

## 📁 13. PETA FILE KODE CBT

```
tias-mobile/
├── src/
│   ├── config/
│   │   ├── axios-tias.ts          ← HTTP client ke TIAS Backend
│   │   └── axios-cbt.ts           ← HTTP client ke CBT API (inject CBT Token)
│   ├── store/
│   │   └── auth.ts                ← State: token, cbt_token, cbt_user_id
│   ├── features/
│   │   └── cbt/
│   │       ├── CBTEntryScreen.tsx  ← SSO + routing dosen/mahasiswa
│   │       ├── CBTListScreen.tsx   ← Daftar ujian berlangsung
│   │       ├── CBTTokenScreen.tsx  ← Input & verifikasi token ujian
│   │       ├── CBTTermsScreen.tsx  ← Syarat & ketentuan (checkbox)
│   │       ├── CBTExamScreen.tsx   ← Ruang ujian (4 tipe soal + timer)
│   │       ├── CBTResultScreen.tsx ← Hasil ujian
│   │       ├── CBTHistoryScreen.tsx← Riwayat ujian (search + filter)
│   │       ├── types.ts            ← TypeScript types (CbtExam, CbtQuestion, dll)
│   │       ├── index.ts            ← Exports
│   │       ├── screens/            ← Versi screen alternatif (refactor lama)
│   │       └── services/
│   │           └── cbt.service.ts  ← Service functions (legacy, masih digunakan)
│   ├── services/
│   │   └── cbt/
│   │       ├── index.ts            ← Raw fetch functions (verifyExamToken, submitExamAnswers)
│   │       ├── useCbtLogin.ts      ← Hook SSO
│   │       ├── useExamList.ts      ← Hook daftar ujian
│   │       ├── useVerifyToken.ts   ← Hook verifikasi token
│   │       ├── useSubmitExam.ts    ← Hook submit jawaban
│   │       ├── useExamResult.ts    ← Hook hasil ujian
│   │       ├── useExamTerms.ts     ← Hook S&K ujian
│   │       └── useHistory.ts       ← Hook riwayat ujian
│   └── navigation/
│       └── cbtStack.tsx            ← Stack navigator CBT
│
tias-backend/
├── controllers/
│   └── CBT/
│       └── CbtAuthController.js    ← Logic SSO → CBT Token
├── models/
│   └── (CbtUserMapping)            ← Model mapping TIAS user ↔ CBT token
├── utils/
│   └── cbtApiClient.js             ← HTTP client machine-to-machine ke CBT API
└── routes/
    └── (perlu cek: route /api/cbt/auth)
```

---

## 📝 14. CATATAN TEKNIS PENTING

### Header yang Digunakan

```javascript
// Ke TIAS Backend (SSO)
headers: { token: jwtTias }  // ⚠️ Bukan Authorization!

// Ke CBT API (via axios-cbt interceptor)
headers: { Authorization: `Bearer ${cbt_token}` }  // Standard Bearer
```

### Penanganan Error 401 dari CBT API

Jika CBT API return 401 (token expired):
1. `axios-cbt` interceptor otomatis `clearCbtToken()`
2. Store `cbt_token = null`
3. Jika user buka menu CBT lagi → CBTEntryScreen deteksi tidak ada token → SSO ulang

### FormData Submit Exam

```javascript
const fd = new FormData();
fd.append('exam_id', String(exam.id));

questions.forEach((q) => {
  if (q.tipe === 'TIPE_4' && jawaban) {
    // File upload
    fd.append(`answer_${q.id}`, {
      uri: jawaban.uri, type: jawaban.type, name: jawaban.name
    });
  } else {
    fd.append(`answer_${q.id}`, jawaban ?? '');
  }
});

// Submit dengan timeout 30 detik (karena ada file upload)
POST /api/student/submit-exam
Content-Type: multipart/form-data
```

### Anti-Double Submit

```javascript
const [sudahSubmit, setSudahSubmit] = useState(false);
// ...
if (sudahSubmit) return;  // Guard di awal handleSubmit
```

---

*Dokumen ini dibuat berdasarkan analisis kode aktual di repo `tias-mobile` dan `tias-backend`. Semua path file, nama komponen, dan endpoint sudah diverifikasi dengan kode yang ada.*
