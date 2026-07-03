'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Seed 5 data sertifikasi + 5 data tes per mahasiswa
 *
 * NPM yang di-seed sama dengan data absensi (12 mahasiswa KRS Disetujui)
 *
 * Tabel target:
 *   - tb_sertifikasi: sertifikat_id (uuid), user_id, kategori_id (uuid), jenis_serti, dll.
 *   - tb_tes: tes_id (uuid), user_id, kategori_id (uuid), nama_tes, dll.
 */

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

// 5 template sertifikasi realistis
const SERTIFIKASI_TEMPLATES = [
  {
    jenis_serti: 'Kompetensi',
    nama_serti: 'AWS Certified Cloud Practitioner',
    bidang_studi: 'Cloud Computing',
    penyelenggara: 'Amazon Web Services',
    kategori_kode: 'IL',   // Internasional Bereputasi
  },
  {
    jenis_serti: 'Kompetensi',
    nama_serti: 'Oracle Database SQL Certified Associate',
    bidang_studi: 'Database',
    penyelenggara: 'Oracle Corporation',
    kategori_kode: 'IL',
  },
  {
    jenis_serti: 'Pelatihan',
    nama_serti: 'Full Stack Web Development Bootcamp',
    bidang_studi: 'Web Development',
    penyelenggara: 'Dicoding Indonesia',
    kategori_kode: 'NL',   // Nasional Bereputasi
  },
  {
    jenis_serti: 'Kompetensi',
    nama_serti: 'CCNA: Introduction to Networks',
    bidang_studi: 'Jaringan Komputer',
    penyelenggara: 'Cisco Systems',
    kategori_kode: 'IL',
  },
  {
    jenis_serti: 'Pelatihan',
    nama_serti: 'Machine Learning with Python',
    bidang_studi: 'Kecerdasan Buatan',
    penyelenggara: 'IBM Training',
    kategori_kode: 'IL',
  },
];

// 5 template tes bahasa & akademik
const TES_TEMPLATES = [
  {
    nama_tes: 'TOEFL ITP',
    jenis_tes: 'English Proficiency',
    penyelenggara: 'ETS (Educational Testing Service)',
    kategori_kode: 'IL',
    skor_base: 545,
  },
  {
    nama_tes: 'IELTS Academic',
    jenis_tes: 'English Proficiency',
    penyelenggara: 'British Council / IDP',
    kategori_kode: 'IL',
    skor_base: 6.5,
  },
  {
    nama_tes: 'TOEIC Listening & Reading',
    jenis_tes: 'English Proficiency',
    penyelenggara: 'ETS (Educational Testing Service)',
    kategori_kode: 'IL',
    skor_base: 820,
  },
  {
    nama_tes: 'JLPT N4',
    jenis_tes: 'Japanese Language Proficiency',
    penyelenggara: 'Japan Foundation',
    kategori_kode: 'IL',
    skor_base: 105,
  },
  {
    nama_tes: 'Test Kemampuan Akademik (TKA)',
    jenis_tes: 'Academic Aptitude',
    penyelenggara: 'LTMPT',
    kategori_kode: 'NL',
    skor_base: 680,
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // ──────────────────────────────────────────────────────────────
    // 1. Ambil user_id mahasiswa dari tb_users
    // ──────────────────────────────────────────────────────────────
    const npmListStr = VALID_NPMS.map(n => `'${n}'`).join(',');
    const mahasiswaRows = await queryInterface.sequelize.query(
      `SELECT user_id, npm FROM tb_users WHERE npm IN (${npmListStr})`,
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

    // ──────────────────────────────────────────────────────────────
    // 2. Ambil kategori_id dari kategori_sertifikasi berdasarkan kode
    // ──────────────────────────────────────────────────────────────
    const kategoriRows = await queryInterface.sequelize.query(
      `SELECT id, kode, nama_kategori, point FROM kategori_sertifikasi`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const kategoriMap = {};
    for (const row of kategoriRows) {
      kategoriMap[row.kode] = row.id;
    }
    console.log('[Migration] Kategori tersedia:', Object.keys(kategoriMap));

    // ──────────────────────────────────────────────────────────────
    // 3. Cek existing data agar tidak duplikat
    // ──────────────────────────────────────────────────────────────
    const existingSerti = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM tb_sertifikasi WHERE user_id IN (
         SELECT user_id FROM tb_users WHERE npm IN (${npmListStr})
       ) AND nama_serti IN (${SERTIFIKASI_TEMPLATES.map(t => `'${t.nama_serti}'`).join(',')})`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const sertCount = parseInt(existingSerti[0].cnt || '0', 10);

    const existingTes = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM tb_tes WHERE user_id IN (
         SELECT user_id FROM tb_users WHERE npm IN (${npmListStr})
       ) AND nama_tes IN (${TES_TEMPLATES.map(t => `'${t.nama_tes}'`).join(',')})`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const tesCount = parseInt(existingTes[0].cnt || '0', 10);

    // ──────────────────────────────────────────────────────────────
    // 4. Build & insert tb_sertifikasi
    // ──────────────────────────────────────────────────────────────
    let sertInserted = 0;
    if (sertCount === 0) {
      const sertifikasiData = [];
      for (const npm of VALID_NPMS) {
        const userId = mahasiswaMap[npm];
        if (!userId) continue;

        SERTIFIKASI_TEMPLATES.forEach((tpl, i) => {
          const katId = kategoriMap[tpl.kategori_kode] || kategoriMap['NL'];
          // Beri tanggal yang berbeda per template (spread dalam 1 tahun)
          const tglSerti = new Date(2024, i * 2, 10 + (parseInt(npm.slice(-2), 10) % 15));

          sertifikasiData.push({
            sertifikat_id: uuidv4(),
            user_id: userId,
            kategori_id: katId,
            jenis_serti: tpl.jenis_serti,
            nama_serti: tpl.nama_serti,
            bidang_studi: tpl.bidang_studi,
            penyelenggara: tpl.penyelenggara,
            nomor_sk: `SK/SERTI/${npm}/${2024}/${i + 1}`,
            nomor_peserta: `${npm}-${String(i + 1).padStart(3, '0')}`,
            nomor_regist: `REG-${npm.slice(-4)}-${2024}-${i + 1}`,
            tgl_serti: tglSerti,
            file: '',
            status: 1,
            is_deleted: false,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          });
        });
      }

      await queryInterface.bulkInsert('tb_sertifikasi', sertifikasiData);
      sertInserted = sertifikasiData.length;
      console.log(`[Migration] ✅ ${sertInserted} record tb_sertifikasi di-insert.`);
    } else {
      console.log(`[Migration] tb_sertifikasi sudah ada (${sertCount} records). Skip.`);
    }

    // ──────────────────────────────────────────────────────────────
    // 5. Build & insert tb_tes
    // ──────────────────────────────────────────────────────────────
    let tesInserted = 0;
    if (tesCount === 0) {
      const tesData = [];
      for (const npm of VALID_NPMS) {
        const userId = mahasiswaMap[npm];
        if (!userId) continue;

        TES_TEMPLATES.forEach((tpl, i) => {
          const katId = kategoriMap[tpl.kategori_kode] || kategoriMap['NL'];
          const tglTes = new Date(2024, i * 2 + 1, 5 + (parseInt(npm.slice(-2), 10) % 10));
          // Variasi skor sedikit per mahasiswa agar data terasa nyata
          const skrVariasi = tpl.skor_base + (parseInt(npm.slice(-3), 10) % 20) - 10;

          tesData.push({
            tes_id: uuidv4(),
            user_id: userId,
            kategori_id: katId,
            nama_tes: tpl.nama_tes,
            jenis_tes: tpl.jenis_tes,
            penyelenggara: tpl.penyelenggara,
            tgl_tes: tglTes,
            skor_tes: parseFloat(skrVariasi.toFixed(1)),
            file: '',
            status: 1,
            is_deleted: false,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          });
        });
      }

      await queryInterface.bulkInsert('tb_tes', tesData);
      tesInserted = tesData.length;
      console.log(`[Migration] ✅ ${tesInserted} record tb_tes di-insert.`);
    } else {
      console.log(`[Migration] tb_tes sudah ada (${tesCount} records). Skip.`);
    }

    console.log(`[Migration] Summary:`);
    console.log(`   Sertifikasi: ${sertInserted} (${VALID_NPMS.length} mhs × 5 template)`);
    console.log(`   Tes        : ${tesInserted} (${VALID_NPMS.length} mhs × 5 template)`);
  },

  async down(queryInterface) {
    const npmListStr = VALID_NPMS.map(n => `'${n}'`).join(',');
    const userSubquery = `(SELECT user_id FROM tb_users WHERE npm IN (${npmListStr}))`;
    const namaSertiList = SERTIFIKASI_TEMPLATES.map(t => `'${t.nama_serti}'`).join(',');
    const namaTesiList  = TES_TEMPLATES.map(t => `'${t.nama_tes}'`).join(',');

    await queryInterface.sequelize.query(
      `DELETE FROM tb_sertifikasi WHERE user_id IN ${userSubquery} AND nama_serti IN (${namaSertiList})`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM tb_tes WHERE user_id IN ${userSubquery} AND nama_tes IN (${namaTesiList})`
    );
    console.log('[Migration] Rollback: sertifikasi & tes dihapus.');
  },
};
