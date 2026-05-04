# Dokumentasi Arsitektur & Struktur Folder TIAS Backend

Dokumen ini menjelaskan arsitektur, struktur folder, alur (flow), dan detail komponen dari source code `tias-backend`.

## 1. Arsitektur Umum

`tias-backend` adalah aplikasi backend berbasis **Node.js** dan **Express.js** yang dirancang sebagai RESTful API. Aplikasi ini menggunakan arsitektur tradisional berbasis Model-View-Controller (MVC) yang diadaptasi untuk API, di mana:

*   **Model**: Diatur menggunakan Sequelize (ORM untuk Node.js) yang berinteraksi dengan database PostgreSQL. File-file model terletak di folder `models`.
*   **Controller**: Menangani logika bisnis untuk setiap endpoint API. File-file controller tersebar dalam folder `controllers` yang dikelompokkan berdasarkan modul/fitur.
*   **Route/View**: Menentukan path URL (endpoint) dan menghubungkannya dengan controller yang sesuai. Terletak di folder `routes`.

Aplikasi ini juga menggunakan autentikasi berbasis session dan JWT (melalui Passport.js), serta memiliki fitur integrasi dengan layanan eksternal (seperti Siak melalui koneksi khusus) dan database yang dipisahkan untuk beberapa kebutuhan (validasi digital, bimbingan akademik).

### Stack Teknologi Utama:
*   **Backend Framework**: Express.js
*   **Database**: PostgreSQL
*   **ORM**: Sequelize
*   **Authentication**: Passport.js, JWT, bcryptjs, express-session
*   **Penyimpanan Media**: Multer (untuk upload file)
*   **Utilitas Tambahan**: moment-timezone, nodemailer (email), exceljs (export/import data), dll.

---

## 2. Struktur Folder & Detail

Berikut adalah penjelasan mendetail dari setiap folder dan file kunci yang ada di root direktori proyek.

### File Root Penting

*   **`App.js`**: Titik masuk (entry point) utama dari aplikasi Express.
    *   **Fungsi**: File ini menginisialisasi server Express, mengatur *middleware* global (CORS, body-parser, cookie-parser, static files), menginisialisasi sesi dan Passport.js untuk autentikasi, serta mendaftarkan semua routing utama (`app.use(router)`).
    *   **Efek**: Jika terjadi kesalahan di sini (misal, middleware tidak di-load dengan benar), seluruh aplikasi bisa gagal berjalan atau kehilangan fitur penting (seperti CORS error atau autentikasi tidak jalan).
*   **`package.json` & `package-lock.json`**:
    *   **Fungsi**: Berisi metadata proyek (nama, versi) dan daftar *dependencies* (library) yang dibutuhkan aplikasi untuk berjalan (seperti express, sequelize, pg, multer, dll), beserta script untuk menjalankan aplikasi (misal `npm run dev` untuk development, `npm start` untuk production).
    *   **Efek**: Jika dependency hilang atau versinya tidak cocok, akan terjadi error saat `npm install` atau saat aplikasi di-*run*.
*   **`.env` & `.env.local`**:
    *   **Fungsi**: Menyimpan variabel lingkungan (Environment Variables) yang sensitif, seperti kredensial database, PORT server, Secret Key untuk JWT/Sesi, dan kredensial API eksternal. (Catatan: file ini biasanya di-ignore oleh `.gitignore` dan tidak di-commit ke repository publik demi keamanan).
*   **`.sequelizerc`**:
    *   **Fungsi**: File konfigurasi untuk Sequelize CLI. Menentukan direktori untuk file config database, models, seeders, dan migrations agar perintah CLI Sequelize (seperti `npx sequelize-cli db:migrate`) tahu di mana harus mencari atau membuat file tersebut.

### Direktori Utama

#### 1. `config/`
*   **Isi**: File-file konfigurasi aplikasi, umumnya untuk koneksi database.
*   **Detail**: Terdapat file `config.json` / `config.js` yang menyimpan kredensial koneksi database untuk berbagai *environment* (development, test, production). Juga terdapat `siak_connection.js` yang tampaknya digunakan untuk melakukan koneksi ke database SIAK eksternal.
*   **Efek**: Perubahan di sini akan memengaruhi ke database mana ORM Sequelize akan terhubung. Konfigurasi yang salah akan menyebabkan aplikasi gagal terhubung ke database.

#### 2. `models/`
*   **Isi**: File definisi *Model* Sequelize.
*   **Detail**: Setiap file merepresentasikan satu tabel di dalam database PostgreSQL. Di sini struktur tabel, tipe data kolom, dan relasi antar tabel (seperti `hasMany`, `belongsTo`) didefinisikan. Ada juga file `index.js` yang secara otomatis mengumpulkan semua model, menginisialisasi koneksi database menggunakan Sequelize, dan menjalankan asosiasi (relasi) antar model.
*   **Efek**: Menentukan skema database dari sisi aplikasi. Jika definisi model tidak sesuai dengan skema database aktual (hasil migrasi), maka query ORM akan gagal/error.

#### 3. `controllers/`
*   **Isi**: Mengandung logika bisnis inti.
*   **Detail**: Sangat terstruktur dengan mengelompokkan berdasarkan modul (misal: `Admin`, `Authentication`, `bimbingan`, `skpi`, `laporan`, dll). Setiap controller memiliki fungsi-fungsi (biasanya asinkron) yang dipanggil oleh routes. Fungsi ini bertanggung jawab untuk:
    1. Menerima request dari client.
    2. Memvalidasi input.
    3. Memanggil model untuk berinteraksi dengan database (CRUD).
    4. Memformat respons dan mengirimkannya kembali ke client (biasanya dalam format JSON).
*   **Efek**: Ini adalah "otak" dari setiap endpoint. Bug di controller akan langsung berdampak pada fitur spesifik yang tidak berjalan semestinya (misal, gagal login, data tidak tersimpan, perhitungan IPK salah).

#### 4. `routes/`
*   **Isi**: File-file definisi endpoint (URL API).
*   **Detail**: Terstruktur mengikuti pembagian controller (ada folder `Admin`, `Authentication`, dll). File utama adalah `routes.js` (di root `routes/`) yang meng-*import* semua sub-router dan menggabungkannya ke dalam satu router besar yang kemudian dipanggil di `App.js`. Di setiap file route, URL dihubungkan dengan *controller* yang spesifik dan *middleware* (seperti untuk mengecek apakah user sudah login atau mengecek *role* tertentu).
*   **Alur (Flow)**: Request -> `App.js` -> `routes.js` -> `Sub-Route` (misal `authRoutes.js`) -> `Controller` -> `Model` -> Database.

#### 5. `middleware/`
*   **Isi**: Fungsi-fungsi perantara yang dieksekusi sebelum *request* mencapai *controller*.
*   **Detail**: 
    *   `authMiddleware.js`: Untuk memeriksa apakah request memiliki token yang valid dan memiliki akses ke route yang dituju.
    *   File berakhiran `Upload.js` (misal `beritaUpload.js`, `profileUpload.js`): Menggunakan pustaka **Multer** untuk menangani *file upload*. File ini menentukan folder tujuan penyimpanan, batas ukuran, dan filter ekstensi file yang diizinkan sebelum diteruskan ke controller.
*   **Efek**: Bertindak sebagai satpam aplikasi. Middleware yang longgar dapat menyebabkan celah keamanan (akses tanpa izin), sedangkan middleware yang terlalu ketat bisa memblokir akses yang sah.

#### 6. `utils/`
*   **Isi**: Kumpulan fungsi pembantu (helper) atau utilitas independen.
*   **Detail**:
    *   `passport.js`: Konfigurasi strategi autentikasi untuk library Passport.js.
    *   `skpi.js`, `validasiDigital.js`, `gamify.js`: Logika perhitungan kompleks atau layanan spesifik yang diekstrak dari controller agar kode lebih bersih dan *reusable*.
    *   `cronjobs.js`: Fungsi-fungsi yang mungkin dijalankan secara berkala di latar belakang.
    *   `whatsapp.js`: Modul untuk integrasi pengiriman pesan via WhatsApp (library whatsapp-web.js).
*   **Efek**: Jika ada error pada utilitas, fitur yang menggunakan utilitas tersebut (seperti notifikasi WA atau autentikasi login) akan gagal, namun tidak selalu menghentikan seluruh aplikasi.

#### 7. `helper/`
*   **Isi**: Fungsi utilitas yang lebih umum, umumnya untuk *formatting* atau penanganan *error*.
*   **Detail**:
    *   `errorHandler.js`: Middleware global untuk menangkap *exception/error* di seluruh aplikasi dan mengembalikan respons error dengan format yang seragam ke klien.
    *   `response-parser.js` / `pagination-parser.js`: Fungsi untuk menstandarisasi format JSON yang dikembalikan oleh API (agar respons selalu konsisten, misal `{"status": true, "data": {...}, "message": "Sukses"}`).
*   **Efek**: Membantu menjaga konsistensi kode dan memudahkan *debugging*.

#### 8. `validation/`
*   **Isi**: Skema validasi untuk data *input* dari client.
*   **Detail**: Berisi file seperti `formValidation.js` yang tampaknya menggunakan pustaka seperti **Joi** untuk memvalidasi *request body* (misal: memastikan email formatnya valid, password cukup kuat, dan *field* yang wajib tidak kosong) sebelum data diproses oleh controller.
*   **Efek**: Mencegah data "kotor" atau berbahaya masuk ke dalam sistem, meningkatkan stabilitas dan keamanan aplikasi.

#### 9. `database/`
*   **Isi**: Konfigurasi koneksi langsung menggunakan `pg` (node-postgres) secara manual, di luar ORM Sequelize.
*   **Detail**: Ada `index.js` untuk membuat *Pool* koneksi standar ke PostgreSQL. Juga terdapat `withSsh.js`, sebuah skrip khusus untuk melakukan *tunneling* koneksi database melalui SSH (digunakan jika database berada di server terisolasi yang hanya bisa diakses via SSH).
*   **Efek**: Berguna untuk *query* khusus atau *raw query* yang sulit dilakukan dengan ORM.

#### 10. `migrations/` & `seeders/`
*   **Isi**: Terkait dengan manajemen skema database (Sequelize).
*   **Detail**:
    *   `migrations/`: Kumpulan skrip untuk melacak perubahan struktur database secara berurutan dari waktu ke waktu (membuat tabel baru, menambah kolom, dsb). Skrip ini dieksekusi melalui CLI.
    *   `seeders/`: Skrip untuk mengisi (insert) data awal (dummy/master data) ke dalam database saat aplikasi pertama kali disiapkan (misal, memasukkan role 'admin' atau daftar fakultas secara default).

#### 11. Direktori Ekstra Terkait Database / Sub-Sistem
Aplikasi ini tampaknya menghubungkan beberapa sistem sekaligus yang dipisahkan ke dalam beberapa model atau koneksi:
*   `db-bimbingan-akademik/`
*   `db-validasi-digital/`
(Folder ini kemungkinan berisi definisi model tambahan atau skrip koneksi spesifik untuk database lain di luar core TIAS).

#### 12. `public/`
*   **Isi**: File-file publik statis.
*   **Detail**: Diatur dalam `App.js` dengan `app.use(express.static("public"))`. Semua aset yang ada di folder ini (misalnya foto profil hasil *upload*, dokumen, atau file statis lainnya) bisa diakses langsung via URL browser oleh client.
*   **Efek**: Folder ini adalah tempat transit/penyimpanan akhir bagi middleware upload (seperti Multer). Jika folder terhapus, maka file media tidak akan ditemukan (error 404 pada sisi *frontend*).

#### 13. `views/`
*   **Isi**: Template untuk *rendering* HTML (kemungkinan menggunakan *express-handlebars* berdasarkan `package.json`).
*   **Detail**: Biasanya digunakan untuk menghasilkan tampilan email berformat HTML (saat mereset password, verifikasi email, dll) melalui layanan seperti Nodemailer.

---

## 3. Alur Request Umum (Request Flow)

Mari kita ambil contoh skenario: *User meminta data riwayat bimbingan akademik*.

1.  **Client (Frontend)**: Mengirimkan HTTP GET Request ke URL (contoh: `http://localhost:5000/bimbingan-akademik/riwayat`).
2.  **`App.js`**: Menerima request. Melewati middleware global seperti CORS dan Body Parser.
3.  **`routes.js`**: `App.js` meneruskan request ke Router utama (`routes/routes.js`).
4.  **Router Modul (`bimbinganAkademikRoutes.js`)**: Router utama melihat *path* dimulai dengan `/bimbingan-akademik`, maka ia meneruskan request ke file route khusus bimbingan akademik.
5.  **Middleware Autentikasi (`authMiddleware.js`)**: Sebelum masuk ke Controller, route memanggil middleware untuk mengecek JWT token atau Sesi user di header.
    *   *Jika tidak valid/belum login*: Mengembalikan response Error 401 Unauthorized.
    *   *Jika valid*: Mengambil data User ID dari token, menambahkannya ke *request object*, lalu lanjut ke Controller (lewat pemanggilan `next()`).
6.  **Controller (`controllers/bimbingan/BimbinganAkademik/BimbinganAkademikController.js`)**: 
    *   Controller menerima request (yang kini berisi data user yang valid).
    *   Controller memanggil **Model** Sequelize (misal `Bimbingan.findAll({ where: { userId: ... } })`).
7.  **Model (`models/bimbingan.js`)**: Sequelize mengubah perintah JavaScript menjadi SQL query dan mengeksekusinya ke database PostgreSQL.
8.  **Database**: Menjalankan query dan mengembalikan sekumpulan data baris (rows) ke Model.
9.  **Controller**: Menerima data mentah dari Model. Memformat data tersebut sesuai kebutuhan (bisa dibantu fungsi di `helper/response-parser.js`).
10. **Client**: Controller mengirimkan HTTP Response dengan status 200 (OK) dan body JSON yang berisi data riwayat bimbingan ke Client.

## Kesimpulan

Arsitektur aplikasi backend ini cukup matang dengan pembagian modul yang sangat jelas antara file *routing*, *controller*, dan *model*. Penggunaan `middleware` terpisah dan utilitas *helper* menunjukkan usaha yang baik untuk membuat kode bersih (Clean Code) dan *maintainable*. Hal yang perlu diperhatikan saat melakukan pengembangan pada proyek ini adalah konsistensi saat memodifikasi salah satu komponen MVC (contoh: ketika menambah kolom baru, pastikan melakukan update pada Migration, Model, dan Controller).
