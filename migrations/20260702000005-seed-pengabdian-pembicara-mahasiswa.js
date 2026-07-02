'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Seed 5 data pengabdian + 5 data pembicara per mahasiswa
 *
 * NPM yang di-seed (12 valid NPMs):
 *   221106042843, 221106042931, 221106042963, 221106042881, 221106043019,
 *   221106042851, 221106042991, 221106042855, 221106042869, 221106042895,
 *   221106042947, 221106042937
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

const PENGABDIAN_TEMPLATES = [
  {
    judul_kegiatan: 'Pemberdayaan UMKM melalui Digitalisasi Pemasaran',
    kelompok_bidang: 'Teknologi Informasi',
    lokasi_kegiatan: 'Desa Ciherang, Bogor',
    lama_kegiatan: '3 Bulan',
    kategori_kode: 'BK-N',
  },
  {
    judul_kegiatan: 'Pelatihan Coding Dasar untuk Anak Panti Asuhan',
    kelompok_bidang: 'Pendidikan Software',
    lokasi_kegiatan: 'Panti Asuhan Kasih Ibu, Bogor',
    lama_kegiatan: '1 Bulan',
    kategori_kode: 'BK-N',
  },
  {
    judul_kegiatan: 'Sosialisasi Internet Sehat dan Aman di Madrasah Aliyah',
    kelompok_bidang: 'Cyber Security',
    lokasi_kegiatan: 'MA Negeri 1 Bogor',
    lama_kegiatan: '2 Minggu',
    kategori_kode: 'BK-N',
  },
  {
    judul_kegiatan: 'Penerapan Sistem IoT Penyiraman Tanaman Otomatis di Kebun Warga',
    kelompok_bidang: 'Internet of Things',
    lokasi_kegiatan: 'Kelurahan Margajaya, Bogor',
    lama_kegiatan: '2 Bulan',
    kategori_kode: 'BK-N',
  },
  {
    judul_kegiatan: 'Edukasi Keamanan Siber bagi Ibu-Ibu PKK',
    kelompok_bidang: 'Keamanan Informasi',
    lokasi_kegiatan: 'Balai RW 05 Tanah Sareal, Bogor',
    lama_kegiatan: '1 Minggu',
    kategori_kode: 'BK-N',
  },
];

const PEMBICARA_TEMPLATES = [
  {
    kategori_pembicara: 'Pemakalah Tamu',
    judul_makalah: 'Penerapan Model Machine Learning pada E-Government',
    nama_pertemuan: 'Seminar Nasional Teknologi Informasi FTS UIKA',
    tingkat_pertemuan: 'Nasional',
    penyelenggara: 'Fakultas Teknik dan Sains UIKA',
    bahasa: 'Indonesia',
    kategori_kode: 'JL-NS',
  },
  {
    kategori_pembicara: 'Speaker Utama',
    judul_makalah: 'Mengatasi Kerentanan XSS pada Aplikasi Web Modern',
    nama_pertemuan: 'Webinar CyberSecurity Youth Indonesia',
    tingkat_pertemuan: 'Nasional',
    penyelenggara: 'Komunitas CyberSecurity ID',
    bahasa: 'Indonesia',
    kategori_kode: 'JL-NS',
  },
  {
    kategori_pembicara: 'Keynote Speaker',
    judul_makalah: 'Pengembangan Smart City berbasis Node-RED',
    nama_pertemuan: 'International Conference on Smart Cities (ICSC)',
    tingkat_pertemuan: 'Internasional',
    penyelenggara: 'IEEE Indonesia Section',
    bahasa: 'Inggris',
    kategori_kode: 'PG-RP',
  },
  {
    kategori_pembicara: 'Speaker Tamu',
    judul_makalah: 'Inovasi Blockchain dalam Supply Chain Pertanian',
    nama_pertemuan: 'Forum Ilmiah Teknologi Pertanian Modern',
    tingkat_pertemuan: 'Regional',
    penyelenggara: 'Dinas Pertanian Jawa Barat',
    bahasa: 'Indonesia',
    kategori_kode: 'JL-NS',
  },
  {
    kategori_pembicara: 'Workshop Presenter',
    judul_makalah: 'Optimalisasi Database PostgreSQL untuk Big Data',
    nama_pertemuan: 'PostgreSQL User Group Meetup',
    tingkat_pertemuan: 'Nasional',
    penyelenggara: 'PostgreSQL Indonesia',
    bahasa: 'Indonesia',
    kategori_kode: 'JL-NS',
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

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

    // 2. Ambil kategori_id dari kategori_publikasi berdasarkan kode
    const kategoriPubRows = await queryInterface.sequelize.query(
      `SELECT id, kode FROM kategori_publikasi`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const kategoriMap = {};
    for (const row of kategoriPubRows) {
      kategoriMap[row.kode] = row.id;
    }

    // 3. (Aman) Tidak ada hapus data sepihak di up() agar tidak merusak data riil di staging
    console.log('[Migration] Memulai pengecekan data Pengabdian & Pembicara...');

    // 4. Build data untuk tb_pengabdian
    const pengabdianData = [];
    for (const npm of VALID_NPMS) {
      const userId = mahasiswaMap[npm];
      if (!userId) continue;

      // Pengecekan aman per template agar tidak terjadi duplikasi data
      for (let i = 0; i < PENGABDIAN_TEMPLATES.length; i++) {
        const tpl = PENGABDIAN_TEMPLATES[i];
        const existing = await queryInterface.sequelize.query(
          `SELECT pengabdian_id FROM tb_pengabdian WHERE user_id = '${userId}' AND judul_kegiatan = :judul LIMIT 1`,
          {
            replacements: { judul: tpl.judul_kegiatan },
            type: queryInterface.sequelize.QueryTypes.SELECT
          }
        );

        if (existing.length > 0) {
          console.log(`[Migration] Pengabdian '${tpl.judul_kegiatan}' sudah ada untuk NPM ${npm}. Skip.`);
          continue;
        }

        const katId = kategoriMap[tpl.kategori_kode] || kategoriMap['JL-NS'];
        const tglSk = new Date(2024, i * 2, 12);

        pengabdianData.push({
          pengabdian_id: uuidv4(),
          user_id: userId,
          kategori_id: katId,
          judul_kegiatan: tpl.judul_kegiatan,
          kelompok_bidang: tpl.kelompok_bidang,
          lokasi_kegiatan: tpl.lokasi_kegiatan,
          lama_kegiatan: tpl.lama_kegiatan,
          no_sk_penugasan: `SK/PENGABD/FTS/${npm}/2024/${i + 1}`,
          tgl_sk_penugasan: tglSk,
          status: 1,
          is_deleted: false,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
      }
    }

    await queryInterface.bulkInsert('tb_pengabdian', pengabdianData);
    console.log(`[Migration] ✅ ${pengabdianData.length} record tb_pengabdian di-insert.`);

    // 5. Build data untuk tb_pembicara
    const pembicaraData = [];
    for (const npm of VALID_NPMS) {
      const userId = mahasiswaMap[npm];
      if (!userId) continue;

      for (let i = 0; i < PEMBICARA_TEMPLATES.length; i++) {
        const tpl = PEMBICARA_TEMPLATES[i];
        const existing = await queryInterface.sequelize.query(
          `SELECT pembicara_id FROM tb_pembicara WHERE user_id = '${userId}' AND judul_makalah = :judul LIMIT 1`,
          {
            replacements: { judul: tpl.judul_makalah },
            type: queryInterface.sequelize.QueryTypes.SELECT
          }
        );

        if (existing.length > 0) {
          console.log(`[Migration] Pembicara '${tpl.judul_makalah}' sudah ada untuk NPM ${npm}. Skip.`);
          continue;
        }

        const katId = kategoriMap[tpl.kategori_kode] || kategoriMap['JL-NS'];
        const tglPelaksanaan = new Date(2024, i * 2 + 1, 18);

        pembicaraData.push({
          pembicara_id: uuidv4(),
          user_id: userId,
          kategori_id: katId,
          kategori_pembicara: tpl.kategori_pembicara,
          judul_makalah: tpl.judul_makalah,
          nama_pertemuan: tpl.nama_pertemuan,
          tingkat_pertemuan: tpl.tingkat_pertemuan,
          penyelenggara: tpl.penyelenggara,
          tgl_pelaksanaan: tglPelaksanaan,
          bahasa: tpl.bahasa,
          no_sk_penugasan: `SK/PEMBICARA/FTS/${npm}/2024/${i + 1}`,
          tgl_sk_penugasan: `2024-0${i * 2 + 1}-10`,
          status: 1,
          is_deleted: false,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
      }
    }

    if (pembicaraData.length > 0) {
      await queryInterface.bulkInsert('tb_pembicara', pembicaraData);
      console.log(`[Migration] ✅ ${pembicaraData.length} record tb_pembicara di-insert.`);
    } else {
      console.log(`[Migration] Semua data pembicara sudah ada, skip insert.`);
    }
  },

  async down(queryInterface) {
    const pengabdianTitlesStr = PENGABDIAN_TEMPLATES.map(t => `'${t.judul_kegiatan}'`).join(',');
    const pembicaraTitlesStr = PEMBICARA_TEMPLATES.map(t => `'${t.judul_makalah}'`).join(',');

    console.log('[Migration] Rollback data pengabdian & pembicara yang di-seed...');
    await queryInterface.sequelize.query(
      `DELETE FROM tb_pengabdian WHERE judul_kegiatan IN (${pengabdianTitlesStr})`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM tb_pembicara WHERE judul_makalah IN (${pembicaraTitlesStr})`
    );
    console.log('[Migration] Rollback selesai.');
  },
};
