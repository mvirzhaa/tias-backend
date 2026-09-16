'use strict';

const { assertNotProduction } = require('./_guards/devOnlySeedGuard');

/**
 * Migration: Seed Tugas Akhir (Skripsi) data for 12 students with varied statuses
 *
 * NPM yang di-seed (12 valid NPMs):
 *   221106042843, 221106042931, 221106042963, 221106042881, 221106043019,
 *   221106042851, 221106042991, 221106042855, 221106042869, 221106042895,
 *   221106042947, 221106042937
 *
 * Statuses used:
 *   - 'pengajuan-sk' (Draft/Pending Approval)
 *   - 'menuju-kolokium' (SK approved, not yet registered, or Kolokium registered but pending)
 *   - 'menuju-sidang' (Kolokium completed, or Sidang registered but pending)
 *   - 'menyelesaikan-revisi' (Sidang completed but needs revision)
 *   - 'selesai' (Graduated/Completed)
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

const SKRIPSI_TITLES = [
  'Analisis Sentimen Opini Publik menggunakan IndoBERT',
  'Rancang Bangun E-Commerce Berbasis Microservices',
  'Penerapan Algoritma A* pada Pathfinding Game 2D',
  'Deteksi Objek Real-time dengan YOLOv8 pada Lampu Lalu Lintas',
  'Implementasi IoT untuk Smart Greenhouse berbasis Arduino',
  'Sistem Rekomendasi Film menggunakan Collaborative Filtering',
  'Analisis Keamanan Jaringan WPA3 terhadap Serangan Deauthentication',
  'Klasifikasi Penyakit Daun Tomat menggunakan CNN',
  'Pengembangan Aplikasi Mobile Kesehatan Mental berbasis Flutter',
  'Sistem E-Voting Terdesentralisasi berbasis Blockchain Ethereum',
  'Prediksi Harga Saham dengan LSTM (Long Short-Term Memory)',
  'Desain UI/UX Landing Page Layanan Akademik dengan Metode Design Thinking',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    assertNotProduction(__filename);
    const now = new Date();
    
    // Sync sequences first, start from 1000 to avoid any collision with manually inserted seed data
    await queryInterface.sequelize.query(`SELECT setval('ta_pengajuan_sk_id_seq', (SELECT COALESCE(GREATEST(MAX(id), 1000), 1000) FROM ta_pengajuan_sk))`);
    await queryInterface.sequelize.query(`SELECT setval('ta_pendaftaran_kolokium_id_seq', (SELECT COALESCE(GREATEST(MAX(id), 1000), 1000) FROM ta_pendaftaran_kolokium))`);
    await queryInterface.sequelize.query(`SELECT setval('ta_pendaftaran_sidang_id_seq', (SELECT COALESCE(GREATEST(MAX(id), 1000), 1000) FROM ta_pendaftaran_sidang))`);
    await queryInterface.sequelize.query(`SELECT setval('ta_penilaian_kolokium_id_seq', (SELECT COALESCE(GREATEST(MAX(id), 1000), 1000) FROM ta_penilaian_kolokium))`);
    await queryInterface.sequelize.query(`SELECT setval('ta_penilaian_sidang_id_seq', (SELECT COALESCE(GREATEST(MAX(id), 1000), 1000) FROM ta_penilaian_sidang))`);

    // 1. Ambil user_id mahasiswa dari tb_users
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

    // 2. Ambil user_id dosen dari tb_users
    const dosenRows = await queryInterface.sequelize.query(
      `SELECT user_id FROM tb_users WHERE role = 'Dosen' LIMIT 4`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (dosenRows.length < 4) {
      console.error('[Migration] Butuh minimal 4 dosen di tb_users!');
      return;
    }

    const d1 = dosenRows[0].user_id;
    const d2 = dosenRows[1].user_id;
    const d3 = dosenRows[2].user_id;
    const d4 = dosenRows[3].user_id;

    // 3. (Aman) Tidak ada hapus data sepihak di up() agar tidak merusak data riil di staging
    console.log('[Migration] Memulai pengecekan data Tugas Akhir...');

    // 4. Seed data dengan status bervariasi
    console.log('[Migration] Menanam data Tugas Akhir...');

    // Mapping NPM ke konfigurasi status
    // Status enum: 'pengajuan-sk', 'menuju-kolokium', 'menuju-sidang', 'menyelesaikan-revisi', 'selesai'
    const configurations = [
      { npm: '221106042843', status: 'pengajuan-sk', approved: false }, // Stage 1: Draft/Pending
      { npm: '221106042931', status: 'menuju-kolokium', approved: true, step: 'sk-approved' }, // Stage 2: SK Approved
      { npm: '221106042963', status: 'menuju-kolokium', approved: true, step: 'kolo-registered' }, // Stage 3: Kolokium Registered
      { npm: '221106042881', status: 'menuju-sidang', approved: true, step: 'kolo-completed' }, // Stage 4: Kolokium Completed
      { npm: '221106043019', status: 'menuju-sidang', approved: true, step: 'sidang-registered' }, // Stage 5: Sidang Registered
      { npm: '221106042851', status: 'menyelesaikan-revisi', approved: true, step: 'sidang-revisi' }, // Stage 6: Sidang Selesai (Revisi)
      { npm: '221106042991', status: 'selesai', approved: true, step: 'lulus' }, // Stage 7: Selesai/Lulus
      { npm: '221106042855', status: 'pengajuan-sk', approved: false }, // Stage 1: Draft/Pending
      { npm: '221106042869', status: 'menuju-kolokium', approved: true, step: 'sk-approved' }, // Stage 2: SK Approved
      { npm: '221106042895', status: 'menuju-kolokium', approved: true, step: 'kolo-registered' }, // Stage 3: Kolokium Registered
      { npm: '221106042947', status: 'menuju-sidang', approved: true, step: 'sidang-registered' }, // Stage 5: Sidang Registered
      { npm: '221106042937', status: 'selesai', approved: true, step: 'lulus' }, // Stage 7: Selesai/Lulus
    ];

    for (let idx = 0; idx < configurations.length; idx++) {
      const config = configurations[idx];
      const mhsId = mahasiswaMap[config.npm];
      if (!mhsId) continue;

      // Pengecekan aman: Jika mahasiswa sudah memiliki Tugas Akhir, jangan timpa/hapus data riil mereka
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM ta_pengajuan_sk WHERE mhs_id = '${mhsId}' LIMIT 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length > 0) {
        console.log(`[Migration] Mahasiswa NPM ${config.npm} sudah memiliki data Tugas Akhir. Skip seed.`);
        continue;
      }

      const judul = SKRIPSI_TITLES[idx];
      const isApproved = config.approved;
      const status = config.status;
      const step = config.step || '';

      // Tentukan status kelulusan (0 = belum lulus, 1 = lulus)
      const statusKelulusan = step === 'lulus' ? 1 : 0;

      // ── A. Insert ta_pengajuan_sk ──
      const [skResult] = await queryInterface.sequelize.query(
        `INSERT INTO ta_pengajuan_sk (
           mhs_id, judul_skripsi, lokasi_kegiatan, semester, 
           sk_pembimbing_1, sk_pembimbing_2, kepala_lab, status, 
           created_at
         ) VALUES (
           '${mhsId}', '${judul}', 'Lab Rekayasa Perangkat Lunak', '8',
           '${d1}', '${d2}', '${d3}', '${status}', 
           NOW()
         ) RETURNING id`
      );
      const skId = skResult[0].id;

      // Jika draft atau baru pengajuan SK, skip sisa langkah
      if (step === '') continue;

      // ── B. Insert ta_pendaftaran_kolokium (jika sudah daftar/selesai kolokium) ──
      if (step !== 'sk-approved') {
        const isKoloCompleted = step !== 'kolo-registered';
        const [koloResult] = await queryInterface.sequelize.query(
          `INSERT INTO ta_pendaftaran_kolokium (
             mhs_id, pengajuan_sk_id, status_kp, status_sks_ipk, 
             jumlah_sks, ipk, kolo_pembimbing_1, kolo_pembimbing_2, 
             evaluator_1, evaluator_2, kolo_status_pem_1, kolo_status_pem_2, 
             judul, created_at
           ) VALUES (
             '${mhsId}', ${skId}, true, true, 
             '138', '3.62', '${d1}', '${d2}', 
             '${d3}', '${d4}', true, true,
             '${judul}', NOW()
           ) RETURNING id`
        );
        const koloId = koloResult[0].id;

        // Jika kolokium sudah selesai, masukkan penilaian kolokium
        if (isKoloCompleted) {
          await queryInterface.bulkInsert('ta_penilaian_kolokium', [
            {
              kolo_id: koloId,
              dosen_id: d3
            },
            {
              kolo_id: koloId,
              dosen_id: d4
            }
          ]);
        }

        // ── C. Insert ta_pendaftaran_sidang (jika sudah daftar/selesai sidang) ──
        if (step === 'sidang-registered' || step === 'sidang-revisi' || step === 'lulus') {
          const isSidangCompleted = step === 'sidang-revisi' || step === 'lulus';
          const [sidangResult] = await queryInterface.sequelize.query(
            `INSERT INTO ta_pendaftaran_sidang (
               mhs_id, pengajuan_sk_id, status_kp, jumlah_sks, 
               status_min_ipk, ipk, sidang_pembimbing_1, sidang_pembimbing_2, 
               penguji_1, penguji_2, sidang_status_pem_1, sidang_status_pem_2, 
               judul, created_at, jadwal_pelaksanaan
             ) VALUES (
               '${mhsId}', ${skId}, true, '144', 
               true, '3.65', '${d1}', '${d2}', 
               '${d3}', '${d4}', true, true, 
               '${judul}', NOW(), NOW()
             ) RETURNING id`
          );
          const sidangId = sidangResult[0].id;

          // Jika sidang sudah selesai, masukkan penilaian sidang
          if (isSidangCompleted) {
            await queryInterface.bulkInsert('ta_penilaian_sidang', [
              {
                sidang_id: sidangId,
                dosen_id: d3
              },
              {
                sidang_id: sidangId,
                dosen_id: d4
              }
            ]);
          }
        }
      }
    }

    console.log('[Migration] ✅ Sinkronisasi sequence ID tugas akhir...');
    await queryInterface.sequelize.query(
      `SELECT setval('ta_pengajuan_sk_id_seq', COALESCE((SELECT MAX(id) FROM ta_pengajuan_sk), 0) + 1, false)`
    );

    console.log('[Migration] ✅ Pengisian data Tugas Akhir selesai dengan sukses!');
  },

  async down(queryInterface) {
    const titlesStr = SKRIPSI_TITLES.map(t => `'${t}'`).join(',');

    console.log('[Migration] Rollback data Tugas Akhir yang di-seed...');
    // Hanya menghapus data yang judul skripsinya persis sama dengan template dummy seed kita
    await queryInterface.sequelize.query(
      `DELETE FROM ta_penilaian_sidang WHERE sidang_id IN (
         SELECT id FROM ta_pendaftaran_sidang WHERE judul IN (${titlesStr})
       )`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM ta_penilaian_kolokium WHERE kolo_id IN (
         SELECT id FROM ta_pendaftaran_kolokium WHERE judul IN (${titlesStr})
       )`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM ta_pendaftaran_sidang WHERE judul IN (${titlesStr})`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM ta_pendaftaran_kolokium WHERE judul IN (${titlesStr})`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM ta_pengajuan_sk WHERE judul_skripsi IN (${titlesStr})`
    );
    console.log('[Migration] Rollback Tugas Akhir selesai.');
  },
};
