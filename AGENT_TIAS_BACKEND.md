# Agent Guide — TIAS Backend
# Integrasi dengan CBT API & TIAS Mobile

## Konteks Sistem Ini

Kamu adalah agent yang bekerja pada sistem **TIAS Backend** — backend sistem akademik kampus UIKA Bogor yang dibangun dengan:
- **Node.js + Express.js**
- **Sequelize ORM + PostgreSQL**
- **Passport.js + JWT untuk autentikasi**
- Arsitektur MVC modular (routes → controllers → models)

Sistem ini akan berfungsi sebagai **jembatan autentikasi (SSO Bridge)** antara identitas mahasiswa di TIAS dan sistem CBT API yang memiliki database user terpisah.

---

## Peranmu dalam Integrasi Ini

TIAS Backend adalah **satu-satunya penghubung** antara identitas TIAS (email/password mahasiswa) dan CBT API. Tugasmu:
1. Menerima request dari TIAS Mobile yang membawa JWT TIAS
2. Memverifikasi JWT tersebut
3. Mengekstrak identitas user (email, nim, nama)
4. Menghubungi CBT API untuk mendapatkan CBT Token atas nama user tersebut
5. Menyimpan CBT Token di database agar tidak perlu SSO ulang setiap saat
6. Mengembalikan CBT Token ke TIAS Mobile

**Yang TIDAK perlu diubah:** seluruh sistem existing TIAS (perkuliahan, bimbingan, skpi, absensi, dll).

---

## Alur Komunikasi

```
TIAS Mobile
  │
  └─► POST /api/cbt/auth  (bawa JWT TIAS di header)   ← endpoint BARU
        │
        ▼
  TIAS Backend (sistem ini)
        │  1. verifikasi JWT TIAS via authMiddleware yang sudah ada
        │  2. cek apakah CBT Token masih tersimpan & valid di DB
        │     → jika masih valid: kembalikan langsung (tanpa SSO ulang)
        │     → jika expired/tidak ada: lanjut ke langkah 3
        │  3. panggil CBT API: POST /api/auth/external-login
        │     dengan { email, nama, nim, shared_secret }
        │  4. simpan CBT Token baru di tabel cbt_user_mappings
        └─► kembalikan CBT Token ke TIAS Mobile
```

---

## Perubahan yang Harus Dilakukan

### PERUBAHAN 1 — Tambah Variabel Environment

File: `.env`

```env
# Sudah ada — JANGAN DIUBAH
# ... semua konfigurasi existing TIAS ...

# TAMBAHKAN INI
CBT_API_BASE_URL="http://localhost:3001"
# Nilai ini HARUS IDENTIK dengan TIAS_SHARED_SECRET di .env CBT API
TIAS_CBT_SHARED_SECRET="string_random_minimal_64_karakter_sama_dengan_cbt_api"
```

> ⚠️ `TIAS_CBT_SHARED_SECRET` harus **persis sama** dengan `TIAS_SHARED_SECRET` di `.env` CBT API. Koordinasikan nilainya.

---

### PERUBAHAN 2 — Buat Migration Tabel Baru

```bash
cd tias-backend
npx sequelize-cli migration:generate --name create-cbt-user-mappings
```

Edit file migration yang terbuat di folder `migrations/`:

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cbt_user_mappings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      tias_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        // Sesuaikan 'users' dengan nama tabel user di database TIAS kamu
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nim: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      cbt_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      // Simpan token agar tidak SSO ulang setiap saat
      cbt_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cbt_token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('cbt_user_mappings', ['tias_user_id']);
    await queryInterface.addIndex('cbt_user_mappings', ['email']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cbt_user_mappings');
  },
};
```

Jalankan migrasi:

```bash
npx sequelize-cli db:migrate

# Verifikasi di PostgreSQL:
# \d cbt_user_mappings
```

---

### PERUBAHAN 3 — Buat Model Sequelize

Buat file baru: `models/CbtUserMapping.js`

```javascript
'use strict';

module.exports = (sequelize, DataTypes) => {
  const CbtUserMapping = sequelize.define(
    'CbtUserMapping',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tias_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nim: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cbt_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      cbt_token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      cbt_token_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'cbt_user_mappings',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  CbtUserMapping.associate = (models) => {
    // Sesuaikan 'User' dengan nama model user TIAS yang sudah ada
    CbtUserMapping.belongsTo(models.User, {
      foreignKey: 'tias_user_id',
      as: 'user',
    });
  };

  return CbtUserMapping;
};
```

---

### PERUBAHAN 4 — Buat Helper Axios ke CBT API

Buat file baru: `utils/cbtApiClient.js`

```javascript
'use strict';

const axios = require('axios');

const CBT_API_BASE_URL = process.env.CBT_API_BASE_URL;
const TIAS_CBT_SHARED_SECRET = process.env.TIAS_CBT_SHARED_SECRET;

if (!CBT_API_BASE_URL || !TIAS_CBT_SHARED_SECRET) {
  throw new Error('[cbtApiClient] CBT_API_BASE_URL dan TIAS_CBT_SHARED_SECRET wajib ada di .env');
}

const cbtApiClient = axios.create({
  baseURL: CBT_API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Tukar identitas TIAS user ke CBT Token
 * @param {{ email: string, nama: string, nim: string|null }} userInfo
 * @returns {{ cbt_token: string, cbt_user_id: number }}
 */
const exchangeToCbtToken = async ({ email, nama, nim }) => {
  const response = await cbtApiClient.post('/api/auth/external-login', {
    email,
    nama,
    nim,
    shared_secret: TIAS_CBT_SHARED_SECRET,
  });

  if (!response.data?.success) {
    throw new Error('CBT API menolak request external login.');
  }

  return {
    cbt_token: response.data.data.token,
    cbt_user_id: response.data.data.user.id,
  };
};

module.exports = { cbtApiClient, exchangeToCbtToken };
```

---

### PERUBAHAN 5 — Buat Controller CBT Auth

Buat file baru: `controllers/CBT/CbtAuthController.js`

```javascript
'use strict';

const { CbtUserMapping } = require('../../models');
const { exchangeToCbtToken } = require('../../utils/cbtApiClient');

/**
 * POST /api/cbt/auth
 * SSO: tukar sesi TIAS dengan CBT Token.
 * req.user tersedia karena sudah melewati authMiddleware TIAS.
 */
const getCbtToken = async (req, res) => {
  try {
    const tiasUser = req.user;

    if (!tiasUser) {
      return res.status(401).json({
        success: false,
        message: 'Sesi tidak valid. Silakan login ulang.'
      });
    }

    // Cek apakah CBT Token masih tersimpan & belum expired
    let mapping = await CbtUserMapping.findOne({
      where: { tias_user_id: tiasUser.id }
    });

    const now = new Date();
    const tokenMasihValid =
      mapping &&
      mapping.cbt_token &&
      mapping.cbt_token_expires_at &&
      new Date(mapping.cbt_token_expires_at) > now;

    if (tokenMasihValid) {
      // Kembalikan token yang tersimpan tanpa SSO ulang ke CBT API
      return res.status(200).json({
        success: true,
        data: {
          cbt_token: mapping.cbt_token,
          cbt_user_id: mapping.cbt_user_id,
        }
      });
    }

    // Token tidak ada atau expired → SSO ke CBT API
    const { cbt_token, cbt_user_id } = await exchangeToCbtToken({
      email: tiasUser.email,
      // Sesuaikan field nama dengan struktur user model TIAS kamu
      nama: tiasUser.nama || tiasUser.name || tiasUser.full_name || tiasUser.email,
      nim: tiasUser.nim || tiasUser.npm || null,
    });

    // Expired 8 jam dari sekarang (sinkron dengan expiry CBT Token)
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    if (mapping) {
      await mapping.update({ cbt_token, cbt_user_id, cbt_token_expires_at: expiresAt });
    } else {
      await CbtUserMapping.create({
        tias_user_id: tiasUser.id,
        email: tiasUser.email,
        nim: tiasUser.nim || tiasUser.npm || null,
        cbt_user_id,
        cbt_token,
        cbt_token_expires_at: expiresAt,
      });
    }

    return res.status(200).json({
      success: true,
      data: { cbt_token, cbt_user_id }
    });

  } catch (error) {
    console.error('[CbtAuthController.getCbtToken]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan akses CBT. Coba lagi.'
    });
  }
};

module.exports = { getCbtToken };
```

---

### PERUBAHAN 6 — Buat Route File

Buat file baru: `routes/Authentication/cbtRoutes.js`

```javascript
'use strict';

const express = require('express');
const router = express.Router();

// Gunakan authMiddleware TIAS yang sudah ada
// Sesuaikan path import dengan lokasi authMiddleware di proyek kamu
const { verifyToken } = require('../../middleware/authMiddleware');

const { getCbtToken } = require('../../controllers/CBT/CbtAuthController');

// POST /api/cbt/auth
router.post('/auth', verifyToken, getCbtToken);

module.exports = router;
```

---

### PERUBAHAN 7 — Daftarkan Route di routes.js

Buka `routes/routes.js` (file router utama TIAS), tambahkan:

```javascript
// Di bagian import — tambahkan bersama import route lainnya
const cbtRoutes = require('./Authentication/cbtRoutes');

// Di bagian router.use — tambahkan bersama route lainnya
router.use('/cbt', cbtRoutes);
// Hasil akhir endpoint: POST /api/cbt/auth
```

---

## Cara Test

```bash
cd tias-backend
npm run dev

# 1. Login TIAS untuk dapat JWT TIAS
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mahasiswa@uika.ac.id","password":"password123"}'
# Salin nilai "token" dari response

# 2. Test endpoint SSO CBT dengan JWT TIAS
curl -X POST http://localhost:5000/api/cbt/auth \
  -H "Authorization: Bearer PASTE_JWT_TIAS_DI_SINI"

# Response yang diharapkan:
# { "success": true, "data": { "cbt_token": "eyJ...", "cbt_user_id": 1 } }

# 3. Panggil lagi (seharusnya lebih cepat karena ambil dari cache)
curl -X POST http://localhost:5000/api/cbt/auth \
  -H "Authorization: Bearer PASTE_JWT_TIAS_DI_SINI"
```

---

## Catatan Penting untuk Agent

1. **Nama field user TIAS** — saat membangun payload untuk CBT API, sesuaikan field `nama`, `nim`, `email` dengan nama kolom aktual di model User TIAS. Cek model User di `models/` untuk memastikan.

2. **authMiddleware** — file ini sudah ada di TIAS. Pastikan kamu menggunakan fungsi yang tepat (`verifyToken` atau sesuai nama yang dipakai di route lain). Cek file `middleware/authMiddleware.js`.

3. **Nama model User** — di `CbtUserMapping.associate`, sesuaikan `models.User` dengan nama model user yang terdaftar di Sequelize TIAS.

4. **Port** — default TIAS Backend adalah 5000 dan CBT API adalah 3001. Sesuaikan jika berbeda.

5. **CBT API harus berjalan** saat TIAS Backend ditest karena `exchangeToCbtToken` melakukan HTTP request ke CBT API.

---

## Checklist Sebelum Selesai

- [ ] `CBT_API_BASE_URL` dan `TIAS_CBT_SHARED_SECRET` ditambahkan di `.env`
- [ ] Migration `create-cbt-user-mappings` berhasil dijalankan
- [ ] Tabel `cbt_user_mappings` terbuat di PostgreSQL
- [ ] Model `CbtUserMapping.js` dibuat di `models/`
- [ ] Helper `utils/cbtApiClient.js` dibuat
- [ ] Controller `controllers/CBT/CbtAuthController.js` dibuat
- [ ] Route `routes/Authentication/cbtRoutes.js` dibuat
- [ ] Route CBT didaftarkan di `routes/routes.js`
- [ ] Test login TIAS → test `/api/cbt/auth` → dapat CBT Token
- [ ] Panggil `/api/cbt/auth` dua kali → panggilan kedua lebih cepat (dari cache)
- [ ] `.env` tidak di-commit ke Git
