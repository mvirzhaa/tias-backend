'use strict';

/**
 * Migration: Seed absensi mahasiswa berdasarkan jadwal SIAK
 *
 * NPM yang punya KRS Disetujui (5 MK, Reguler A, Periode 2025 Ganjil):
 *   221106042843, 221106042931, 221106042963, 221106042881, 221106043019,
 *   221106042851, 221106042991, 221106042855, 221106042869, 221106042895,
 *   221106042947, 221106042937
 *
 * 5 Mata kuliah dari API SIAK:
 *   IHK110 - Pancasila          (id=1)
 *   PAI111 - Studi Islam I      (id=2)
 *   PBI106X - Bahasa Indonesia  (id=3)
 *   TIF101 - Pengantar TI       (id=4)
 *   TIF103 - Matematika Diskrit (id=5)
 *
 * Jadwal: 5 hari (Senin-Jumat), masing-masing 1 sesi/hari, 1 MK per slot waktu
 * Simulasi 16 pertemuan per mata kuliah (1 semester)
 */

// NPM mahasiswa yang memiliki KRS Disetujui dengan 5 MK tersebut
const VALID_NPMS = [
  '221106042843',
  '221106042931',
  '221106042963',
  '221106042881',
  '221106043019',
  '221106042851',
  '221106042991',
  '221106042855',
  '221106042869',
  '221106042895',
  '221106042947',
  '221106042937',
];

// Mapping kode MK → id di m_matakuliah (sesuai hasil insert migration sebelumnya)
const MATAKULIAH_MAP = [
  { kode: 'IHK110',  nama: 'Pancasila',                    id_matkul_key: 'IHK110' },
  { kode: 'PAI111',  nama: 'Studi Islam I',                id_matkul_key: 'PAI111' },
  { kode: 'PBI106X', nama: 'Bahasa Indonesia',             id_matkul_key: 'PBI106X' },
  { kode: 'TIF101',  nama: 'Pengantar Teknik Informatika', id_matkul_key: 'TIF101' },
  { kode: 'TIF103',  nama: 'Matematika Diskrit',           id_matkul_key: 'TIF103' },
];

const TOTAL_PERTEMUAN = 16; // 1 semester = 16 pertemuan
const SEMESTER = '2025 Ganjil';
const TAHUN_AKADEMIK = '2025/2026';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const tables = await queryInterface.showAllTables();

    // ──────────────────────────────────────────────────────────────────
    // 1. Buat tabel pembelajaran_dosen_ext jika belum ada
    // ──────────────────────────────────────────────────────────────────
    if (!tables.includes('pembelajaran_dosen_ext')) {
      await queryInterface.createTable('pembelajaran_dosen_ext', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_dosen: { type: Sequelize.UUID, allowNull: true },
        nik_dosen: { type: Sequelize.STRING, allowNull: true },
        id_matkul: { type: Sequelize.INTEGER, allowNull: true },
        pertemuan: { type: Sequelize.INTEGER, allowNull: true },
        kelas: { type: Sequelize.INTEGER, allowNull: true },
        semester: { type: Sequelize.STRING, allowNull: true },
        tahun_akademik: { type: Sequelize.STRING, allowNull: true },
        rps_dasar: { type: Sequelize.TEXT, allowNull: true },
        rps_pelaksanaan: { type: Sequelize.TEXT, allowNull: true },
        npm_komti: { type: Sequelize.INTEGER, allowNull: true },
        learning_done: { type: Sequelize.DATE, allowNull: true },
        token: { type: Sequelize.INTEGER, allowNull: true },
        status_kelas: { type: Sequelize.INTEGER, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: true },
        updated_at: { type: Sequelize.DATE, allowNull: true },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      });
      console.log('[Migration] Tabel pembelajaran_dosen_ext dibuat.');
    } else {
      console.log('[Migration] Tabel pembelajaran_dosen_ext sudah ada, skip create.');
    }

    // Tabel lama (migration 20260602000001) belum punya kolom semester &
    // tahun_akademik. Pastikan ada agar seeding di bawah tidak gagal.
    const pembColumns = await queryInterface.describeTable('pembelajaran_dosen_ext');
    if (!pembColumns.semester) {
      await queryInterface.addColumn('pembelajaran_dosen_ext', 'semester', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log('[Migration] Kolom semester ditambahkan ke pembelajaran_dosen_ext.');
    }
    if (!pembColumns.tahun_akademik) {
      await queryInterface.addColumn('pembelajaran_dosen_ext', 'tahun_akademik', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log('[Migration] Kolom tahun_akademik ditambahkan ke pembelajaran_dosen_ext.');
    }

    // ──────────────────────────────────────────────────────────────────
    // 2. Buat tabel absensi_mhs jika belum ada
    // ──────────────────────────────────────────────────────────────────
    if (!tables.includes('absensi_mhs')) {
      await queryInterface.createTable('absensi_mhs', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_pembelajaran: { type: Sequelize.INTEGER, allowNull: true },
        id_mhs: { type: Sequelize.UUID, allowNull: true },
        npm: { type: Sequelize.STRING, allowNull: true },
        upload_dok: { type: Sequelize.STRING, allowNull: true },
        nilai: { type: Sequelize.STRING, allowNull: true },
        status_absen: { type: Sequelize.INTEGER, allowNull: true },
        coordinate_absen: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: true },
        updated_at: { type: Sequelize.DATE, allowNull: true },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      });
      console.log('[Migration] Tabel absensi_mhs dibuat.');
    } else {
      console.log('[Migration] Tabel absensi_mhs sudah ada, skip create.');
    }

    // ──────────────────────────────────────────────────────────────────
    // 3. Ambil id m_matakuliah berdasarkan kode
    // ──────────────────────────────────────────────────────────────────
    const mkRows = await queryInterface.sequelize.query(
      `SELECT id, kode_matakuliah FROM m_matakuliah WHERE kode_matakuliah IN ('IHK110','PAI111','PBI106X','TIF101','TIF103')`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (mkRows.length === 0) {
      console.error('[Migration] m_matakuliah kosong! Jalankan migration 20260702000001 terlebih dahulu.');
      return;
    }

    // Buat lookup: kode → id
    const mkIdMap = {};
    for (const row of mkRows) {
      mkIdMap[row.kode_matakuliah] = row.id;
    }
    console.log('[Migration] ID Mata Kuliah:', mkIdMap);

    // ──────────────────────────────────────────────────────────────────
    // 4. Ambil user_id mahasiswa berdasarkan NPM
    // ──────────────────────────────────────────────────────────────────
    const npmList = VALID_NPMS.map(n => `'${n}'`).join(',');
    const mahasiswaRows = await queryInterface.sequelize.query(
      `SELECT user_id, npm FROM tb_users WHERE npm IN (${npmList})`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (mahasiswaRows.length === 0) {
      console.error('[Migration] Tidak ada mahasiswa ditemukan di tb_users!');
      return;
    }

    const mahasiswaMap = {};
    for (const row of mahasiswaRows) {
      mahasiswaMap[row.npm] = row.user_id;
    }
    console.log(`[Migration] Ditemukan ${mahasiswaRows.length} mahasiswa.`);

    // ──────────────────────────────────────────────────────────────────
    // 5. Cek pembelajaran_dosen_ext yang sudah ada untuk 5 MK ini
    //    agar tidak duplikat jika migration dijalankan ulang
    // ──────────────────────────────────────────────────────────────────
    const idMatkuls = Object.values(mkIdMap).join(',');
    const existingPemb = await queryInterface.sequelize.query(
      `SELECT id, id_matkul, pertemuan FROM pembelajaran_dosen_ext WHERE id_matkul IN (${idMatkuls}) AND semester = '${SEMESTER}'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    let pembelajaranInserts = [];
    let pembIdLookup = {}; // key: "id_matkul-pertemuan" → id

    if (existingPemb.length === 0) {
      // Belum ada → insert baru
      for (const mk of MATAKULIAH_MAP) {
        const matkulId = mkIdMap[mk.kode];
        if (!matkulId) continue;
        for (let pert = 1; pert <= TOTAL_PERTEMUAN; pert++) {
          pembelajaranInserts.push({
            id_matkul: matkulId,
            pertemuan: pert,
            kelas: 1,
            semester: SEMESTER,
            tahun_akademik: TAHUN_AKADEMIK,
            status_kelas: 1, // 1 = sudah selesai
            created_at: now,
            updated_at: now,
          });
        }
      }

      await queryInterface.bulkInsert('pembelajaran_dosen_ext', pembelajaranInserts);
      console.log(`[Migration] ${pembelajaranInserts.length} record pembelajaran_dosen_ext di-insert.`);

      // Ambil ulang untuk dapatkan ID yang di-generate
      const insertedPemb = await queryInterface.sequelize.query(
        `SELECT id, id_matkul, pertemuan FROM pembelajaran_dosen_ext WHERE id_matkul IN (${idMatkuls}) AND semester = '${SEMESTER}' ORDER BY id`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      for (const p of insertedPemb) {
        pembIdLookup[`${p.id_matkul}-${p.pertemuan}`] = p.id;
      }
    } else {
      // Sudah ada → pakai yang lama
      for (const p of existingPemb) {
        pembIdLookup[`${p.id_matkul}-${p.pertemuan}`] = p.id;
      }
      console.log(`[Migration] Ditemukan ${existingPemb.length} record pembelajaran_dosen_ext yang sudah ada.`);
    }

    // ──────────────────────────────────────────────────────────────────
    // 6. Cek apakah absensi untuk mahasiswa ini sudah ada
    // ──────────────────────────────────────────────────────────────────
    const npmListStr = VALID_NPMS.map(n => `'${n}'`).join(',');
    const existingAbsensi = await queryInterface.sequelize.query(
      `SELECT COUNT(*) as cnt FROM absensi_mhs WHERE npm IN (${npmListStr})`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingCount = parseInt(existingAbsensi[0].cnt || '0', 10);

    if (existingCount > 0) {
      console.log(`[Migration] Absensi sudah ada (${existingCount} records). Skip insert.`);
      return;
    }

    // ──────────────────────────────────────────────────────────────────
    // 7. Generate data absensi
    //    Status: 1=Hadir, 2=Izin, 3=Sakit, 4=Alpha
    //    Distribusi realistis: 85% Hadir, 8% Izin, 5% Sakit, 2% Alpha
    // ──────────────────────────────────────────────────────────────────
    const absensiData = [];

    // Seed random deterministic per npm+matkul+pertemuan agar reproducible
    const pseudoRand = (npm, matkulId, pertemuan) => {
      const hash = (npm.charCodeAt(0) + npm.charCodeAt(5) + matkulId * 7 + pertemuan * 13) % 100;
      return hash;
    };

    const getStatus = (hash) => {
      if (hash < 85) return 1;       // Hadir
      if (hash < 93) return 2;       // Izin
      if (hash < 98) return 3;       // Sakit
      return 4;                      // Alpha
    };

    for (const npm of VALID_NPMS) {
      const userId = mahasiswaMap[npm];
      if (!userId) {
        console.warn(`[Migration] NPM ${npm} tidak ditemukan di tb_users, skip.`);
        continue;
      }

      for (const mk of MATAKULIAH_MAP) {
        const matkulId = mkIdMap[mk.kode];
        if (!matkulId) continue;

        for (let pert = 1; pert <= TOTAL_PERTEMUAN; pert++) {
          const pembId = pembIdLookup[`${matkulId}-${pert}`];
          if (!pembId) {
            console.warn(`[Migration] pembelajaran_id tidak ditemukan untuk matkul=${matkulId}, pertemuan=${pert}`);
            continue;
          }

          const hash = pseudoRand(npm, matkulId, pert);
          const status = getStatus(hash);

          absensiData.push({
            id_pembelajaran: pembId,
            id_mhs: userId,
            npm: npm,
            status_absen: status,
            upload_dok: status !== 1 ? `surat_${status === 2 ? 'izin' : status === 3 ? 'sakit' : 'alpha'}_${npm}_mk${matkulId}_p${pert}.pdf` : null,
            nilai: null,
            coordinate_absen: status === 1 ? JSON.stringify({ lat: -6.595972, lng: 106.816667 }) : null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          });
        }
      }
    }

    // Insert in batches of 500 to avoid memory issues
    const BATCH_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < absensiData.length; i += BATCH_SIZE) {
      const batch = absensiData.slice(i, i + BATCH_SIZE);
      await queryInterface.bulkInsert('absensi_mhs', batch);
      inserted += batch.length;
    }

    console.log(`[Migration] ✅ ${inserted} record absensi_mhs berhasil di-insert.`);
    console.log(`[Migration]    ${VALID_NPMS.length} mahasiswa × ${MATAKULIAH_MAP.length} MK × ${TOTAL_PERTEMUAN} pertemuan = ${VALID_NPMS.length * MATAKULIAH_MAP.length * TOTAL_PERTEMUAN} total.`);
  },

  async down(queryInterface) {
    const npmListStr = VALID_NPMS.map(n => `'${n}'`).join(',');

    // Hapus absensi untuk npm yang di-seed
    await queryInterface.sequelize.query(
      `DELETE FROM absensi_mhs WHERE npm IN (${npmListStr})`
    );

    // Hapus pembelajaran yang di-seed untuk 5 MK ini pada semester tersebut
    await queryInterface.sequelize.query(
      `DELETE FROM pembelajaran_dosen_ext
       WHERE id_matkul IN (
         SELECT id FROM m_matakuliah WHERE kode_matakuliah IN ('IHK110','PAI111','PBI106X','TIF101','TIF103')
       ) AND semester = '${SEMESTER}'`
    );

    console.log('[Migration] Rollback selesai: absensi dan pembelajaran dihapus.');
  },
};
