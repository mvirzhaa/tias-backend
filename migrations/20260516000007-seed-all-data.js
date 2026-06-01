'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // ==================== GENERATE UUID UNTUK MAHASISWA ====================
    const mahasiswaUUID = Array.from({ length: 16 }, (_, i) => `20260515-0000-0000-0000-${String(i + 1).padStart(12, '0')}`);

    // ==================== GENERATE UUID UNTUK DOSEN ====================
    const dosenUUID = Array.from({ length: 5 }, (_, i) => `20260515-2222-2222-2222-${String(i + 1).padStart(12, '0')}`);

    // ==================== GENERATE UUID UNTUK DATA PRIBADI ====================
    const dataPribadiUUID = Array.from({ length: 25 }, (_, i) => `20260515-1111-1111-1111-${String(i + 1).padStart(12, '0')}`);

    // Data Mahasiswa (16)
    const mahasiswaData = [
      { id: mahasiswaUUID[0], npm: '221106042843', nama: 'MUHAMMAD IHSAN', nik: '1234567890123456', no_hp: '081234567890', email: 'muhammadihsan@gmail.com', dpId: dataPribadiUUID[0], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[1], npm: '221106043023', nama: 'Muhamad Virzha Andriansyah', nik: '1234567890123457', no_hp: '081234567891', email: 'muhamadvirzha@gmail.com', dpId: dataPribadiUUID[1], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[2], npm: '221106042963', nama: 'Satrio Teguh Hutomo', nik: '1234567890123458', no_hp: '081234567892', email: 'satrioteguh@gmail.com', dpId: dataPribadiUUID[2], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[3], npm: '221106042881', nama: 'Muhammad Irgi Fajri', nik: '1234567890123459', no_hp: '081234567893', email: 'muhammadirgi@gmail.com', dpId: dataPribadiUUID[3], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[4], npm: '221106043019', nama: 'Azka Fadilah Rahman', nik: '1234567890123460', no_hp: '081234567894', email: 'azkafadilah@gmail.com', dpId: dataPribadiUUID[4], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[5], npm: '221106042851', nama: 'Maraginda', nik: '1234567890123461', no_hp: '081234567895', email: 'maraginda@gmail.com', dpId: dataPribadiUUID[5], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[6], npm: '221106042991', nama: 'RINDU ASTUTI', nik: '1234567890123462', no_hp: '081234567896', email: 'rinduastuti@gmail.com', dpId: dataPribadiUUID[6], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[7], npm: '221106042855', nama: 'Anastia Firyal Nisrina', nik: '1234567890123463', no_hp: '081234567897', email: 'anastiafiryal@gmail.com', dpId: dataPribadiUUID[7], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[8], npm: '221106042869', nama: 'Annisa Salsabila Cahyani', nik: '1234567890123464', no_hp: '081234567898', email: 'annisasalsabila@gmail.com', dpId: dataPribadiUUID[8], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[9], npm: '221106042895', nama: 'Achmad Fauzan Hasan', nik: '1234567890123465', no_hp: '081234567899', email: 'achmadfauzan@gmail.com', dpId: dataPribadiUUID[9], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[10], npm: '221106043033', nama: 'MUHAMMAD SYAIFULLAH NURROHMAN', nik: '1234567890123999', no_hp: '081234567999', email: 'syaifullah.nurrahman@gmail.com', dpId: dataPribadiUUID[10], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[11], npm: '231106040973', nama: 'Ikhwal Awaludin', nik: '1234567890123901', no_hp: '081234567901', email: 'idnovyra@gmail.com', dpId: dataPribadiUUID[11], angkatan: 2023, prodi: 'Informatika' },
      { id: mahasiswaUUID[12], npm: '231106040904', nama: 'Riandi Siddik Harahap', nik: '1234567890123902', no_hp: '081234567902', email: 'riccikaofficial@gmail.com', dpId: dataPribadiUUID[12], angkatan: 2023, prodi: 'Informatika' },
      { id: mahasiswaUUID[13], npm: '221106042931', nama: 'Muhammad Ridwan', nik: '1234567890123903', no_hp: '081234567903', email: 'mhmdy5p0317@gmail.com', dpId: dataPribadiUUID[13], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[14], npm: '221106042947', nama: 'Mohamad Ridwan', nik: '1234567890123904', no_hp: '081234567904', email: 'muh.yusup965@gmail.com', dpId: dataPribadiUUID[14], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[15], npm: '221106042937', nama: 'Kintan Novia Azzahra', nik: '1234567890123905', no_hp: '081234567905', email: 'ahdaf0317@gmail.com', dpId: dataPribadiUUID[15], angkatan: 2022, prodi: 'Informatika' }
    ];

    // Data Dosen (5)
    const dosenData = [
      { id: dosenUUID[0], npm: 'DOSEN001', nama: 'Fitrah Satrya F.K, M.Kom', nik: '2234567890123456', no_hp: '082345678901', email: 'fitrah@gmail.com', dpId: dataPribadiUUID[16], bidang: 'Database' },
      { id: dosenUUID[1], npm: 'DOSEN002', nama: 'Berlina Wulandari, S.T., M.Kom', nik: '2234567890123457', no_hp: '082345678902', email: 'berlina@gmail.com', dpId: dataPribadiUUID[17], bidang: 'Jaringan' },
      { id: dosenUUID[2], npm: 'DOSEN003', nama: 'Dr. Hendra Gunawan, M.T', nik: '2234567890123458', no_hp: '082345678903', email: 'hendra@gmail.com', dpId: dataPribadiUUID[18], bidang: 'AI' },
      { id: dosenUUID[3], npm: 'DOSEN004', nama: 'Rina Marlina, S.Si., M.Sc', nik: '2234567890123459', no_hp: '082345678904', email: 'rina@gmail.com', dpId: dataPribadiUUID[19], bidang: 'Multimedia' },
      { id: dosenUUID[4], npm: 'DOSEN005', nama: 'Ir. Bambang Supriyadi, M.T', nik: '2234567890123460', no_hp: '082345678905', email: 'bambang@gmail.com', dpId: dataPribadiUUID[20], bidang: 'Sistem Operasi' }
    ];

    // Data Orang Tua (10) - terhubung dengan mahasiswa via mhs_id
    const parentData = [
      { id: 1001, email: 'muhammadihsanf270@gmail.com', nama: 'UCIH SUKAESIH', npm: '221106042843', no_hp: '089123456701', mhs_id: mahasiswaUUID[0] },
      { id: 1002, email: 'muhamadvirzhaa@gmail.com', nama: 'HENI NOVIANTI', npm: '221106043023', no_hp: '089123456702', mhs_id: mahasiswaUUID[1] },
      { id: 1003, email: 'satrioteguhhutomo@gmail.com', nama: 'Ortu Teguh', npm: '221106042963', no_hp: '089123456703', mhs_id: mahasiswaUUID[2] },
      { id: 1004, email: 'muhammad.irgi.fajri@gmail.com', nama: 'Ratna sari', npm: '221106042881', no_hp: '089123456704', mhs_id: mahasiswaUUID[3] },
      { id: 1005, email: 'azkanyan@gmail.com', nama: 'SITI KARIMAH', npm: '221106043019', no_hp: '089123456705', mhs_id: mahasiswaUUID[4] },
      { id: 1006, email: 'maragindapanggabean35@gmail.com', nama: 'NISLAN', npm: '221106042851', no_hp: '089123456706', mhs_id: mahasiswaUUID[5] },
      { id: 1007, email: 'rinduasst@gmail.com', nama: 'Ortu Rindu', npm: '221106042991', no_hp: '089123456707', mhs_id: mahasiswaUUID[6] },
      { id: 1008, email: 'anastianisrina06@gmail.com', nama: 'ANA KUSMIYAN', npm: '221106042855', no_hp: '089123456708', mhs_id: mahasiswaUUID[7] },
      { id: 1009, email: 'jonisa62@gmail.com', nama: 'NURHAFNI MATONDANG', npm: '221106042869', no_hp: '089123456709', mhs_id: mahasiswaUUID[8] },
      { id: 1010, email: 'zands2076@gmail.com', nama: 'Ortu Fauzan', npm: '221106042895', no_hp: '089123456710', mhs_id: mahasiswaUUID[9] }
    ];

    // ==================== CEK APAKAH TABEL SUDAH ADA ====================
    const tables = await queryInterface.showAllTables();

    // Clean up all tables in reverse dependency order
    const deleteOrder = [
      'ta_penilaian_sidang', 'ta_penilaian_kolokium', 'ta_pendaftaran_sidang', 'ta_pendaftaran_kolokium',
      'ta_pengajuan_sk', 'absensi_mhs', 'pembelajaran_dosen_ext', 'm_matakuliah',
      'anggota_pengabdian', 'dokumen_pengabdian', 'tb_pengabdian',
      'dokumen_pembicara', 'tb_pembicara',
      'anggota_penelitian', 'dokumen_penelitian', 'tb_penelitian',
      'tb_anggota_prof', 'tb_penghargaan', 'tb_tes', 'tb_sertifikasi',
      'user_achievements', 'achievements', 'point_rekomendasi', 'tb_ip_mhs', 'kategori_ip',
      'trx_parent_mhs', 'tb_parents', 'tb_data_pribadi', 'tb_users'
    ];

    for (const table of deleteOrder) {
      if (tables.includes(table)) {
        await queryInterface.bulkDelete(table, {}, {}).catch(() => { });
      }
    }

    // ==================== CREATE DYNAMIC TABLES IF MISSING ====================
    if (!tables.includes('tb_penelitian')) {
      await queryInterface.createTable('tb_penelitian', {
        penelitian_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        user_id: { type: Sequelize.UUID },
        kategori_id: { type: Sequelize.INTEGER },
        judul_kegiatan: { type: Sequelize.STRING },
        kelompok_bidang: { type: Sequelize.STRING },
        lokasi_kegiatan: { type: Sequelize.STRING },
        tahun_usulan: { type: Sequelize.STRING },
        tahun_kegiatan: { type: Sequelize.STRING },
        tahun_pelaksanaan: { type: Sequelize.STRING },
        lama_kegiatan: { type: Sequelize.STRING },
        no_sk_penugasan: { type: Sequelize.STRING },
        tgl_sk_penugasan: { type: Sequelize.DATE },
        status: { type: Sequelize.INTEGER, defaultValue: 0 },
        is_deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
        created_at: { type: Sequelize.DATE },
        updated_at: { type: Sequelize.DATE },
        deleted_at: { type: Sequelize.DATE }
      });
    }

    if (!tables.includes('anggota_penelitian')) {
      await queryInterface.createTable('anggota_penelitian', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        penelitian_id: { type: Sequelize.UUID },
        user_id: { type: Sequelize.UUID },
        peran: { type: Sequelize.STRING },
        status: { type: Sequelize.STRING }
      });
    }

    if (!tables.includes('dokumen_penelitian')) {
      await queryInterface.createTable('dokumen_penelitian', {
        dokumen_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        penelitian_id: { type: Sequelize.UUID },
        nama_dok: { type: Sequelize.STRING },
        keterangan: { type: Sequelize.STRING },
        tautan_dok: { type: Sequelize.STRING },
        file: { type: Sequelize.STRING },
        created_at: { type: Sequelize.DATE },
        updated_at: { type: Sequelize.DATE }
      });
    }

    // ==================== INSERT USER RECORDS ====================
    const userRecords = [
      ...mahasiswaData.map(m => ({
        user_id: m.id,
        npm: m.npm,
        email: m.email,
        password: hashedPassword,
        role: 'Mahasiswa',
        isverified: true,
        created_at: new Date(),
        updated_at: new Date()
      })),
      ...dosenData.map(d => ({
        user_id: d.id,
        npm: d.npm,
        email: d.email,
        password: hashedPassword,
        role: 'Dosen',
        isverified: true,
        created_at: new Date(),
        updated_at: new Date()
      }))
    ];

    await queryInterface.bulkInsert('tb_users', userRecords);

    // Insert tb_data_pribadi
    const dataPribadiRecords = [
      ...mahasiswaData.map(m => ({
        dp_id: m.dpId,
        user_id: m.id,
        nama_lengkap: m.nama,
        nik: m.nik,
        no_hp: m.no_hp,
        ipk: '3.50',
        created_at: new Date(),
        updated_at: new Date()
      })),
      ...dosenData.map(d => ({
        dp_id: d.dpId,
        user_id: d.id,
        nama_lengkap: d.nama,
        nik: d.nik,
        no_hp: d.no_hp,
        created_at: new Date(),
        updated_at: new Date()
      }))
    ];

    await queryInterface.bulkInsert('tb_data_pribadi', dataPribadiRecords);

    // Insert Parents
    const parentsToInsert = parentData.map(p => ({
      id: p.id,
      email: p.email,
      password: hashedPassword,
      nama_lengkap: p.nama,
      npm: p.npm,
      no_hp: p.no_hp,
      role: 'Parent',
      is_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    }));

    await queryInterface.bulkInsert('tb_parents', parentsToInsert);

    // Insert trx_parent_mhs
    const relationsToInsert = parentData.map(p => ({
      parent_id: p.id,
      mhs_id: p.mhs_id,
      created_at: new Date(),
      updated_at: new Date()
    }));

    await queryInterface.bulkInsert('trx_parent_mhs', relationsToInsert);

    // ==================== GAMIFIKASI MASTER SEEDING ====================
    const kategoriIpRecords = [
      { kode: 'P1', kategori: 'IP < 1.0', point: 100 },
      { kode: 'P2', kategori: 'IP 1.0 - 1.49', point: 200 },
      { kode: 'P3', kategori: 'IP 1.5 - 1.99', point: 300 },
      { kode: 'P4', kategori: 'IP 2.0 - 2.49', point: 400 },
      { kode: 'P5', kategori: 'IP 2.5 - 2.99', point: 500 },
      { kode: 'P6', kategori: 'IP 3.0 - 3.49', point: 600 },
      { kode: 'P7', kategori: 'IP 3.5 - 3.6', point: 700 },
      { kode: 'P8', kategori: 'IP 3.61 - 3.7', point: 800 },
      { kode: 'P9', kategori: 'IP 3.71 - 3.8', point: 900 },
      { kode: 'P10', kategori: 'IP 3.81 - 3.9', point: 1000 },
      { kode: 'P11', kategori: 'IP 3.91 - 4.0', point: 1200 }
    ].map(r => ({ ...r, created_at: new Date(), updated_at: new Date() }));

    await queryInterface.bulkInsert('kategori_ip', kategoriIpRecords);

    const pointRekomendasiRecords = [
      { kode: 'REK1', point: 10, status: 1 },
      { kode: 'REK2', point: 20, status: 0 }
    ].map(r => ({ ...r, created_at: new Date(), updated_at: new Date() }));

    await queryInterface.bulkInsert('point_rekomendasi', pointRekomendasiRecords);

    const achievementsRecords = [
      { id: 1, name: 'Novice', gamify: 'Novice', start_point: 0, points: 100, image: 'lencana_novice.png', lencana: 'lencana_novice.png', kode: 'GM1', sub_judul: 'Tingkat Novice', deskripsi: 'Poin gamifikasi di bawah 2300.' },
      { id: 2, name: 'Competent', gamify: 'Competent', start_point: 2301, points: 200, image: 'lencana_competent.png', lencana: 'lencana_competent.png', kode: 'GM2', sub_judul: 'Tingkat Competent', deskripsi: 'Poin gamifikasi di atas 2300.' },
      { id: 3, name: 'Proficient', gamify: 'Proficient', start_point: 3801, points: 300, image: 'lencana_proficient.png', lencana: 'lencana_proficient.png', kode: 'GM3', sub_judul: 'Tingkat Proficient', deskripsi: 'Poin gamifikasi di atas 3800.' },
      { id: 4, name: 'Expert', gamify: 'Expert', start_point: 5301, points: 400, image: 'lencana_expert.png', lencana: 'lencana_expert.png', kode: 'GM4', sub_judul: 'Tingkat Expert', deskripsi: 'Poin gamifikasi di atas 5300.' },
      { id: 5, name: 'Master', gamify: 'Master', start_point: 7401, points: 500, image: 'lencana_master.png', lencana: 'lencana_master.png', kode: 'GM5', sub_judul: 'Tingkat Master', deskripsi: 'Poin gamifikasi di atas 7400.' },
      { id: 6, name: 'Grandmaster', gamify: 'Grandmaster', start_point: 10000, points: 600, image: 'lencana_grandmaster.png', lencana: 'lencana_grandmaster.png', kode: 'GM6', sub_judul: 'Tingkat Grandmaster', deskripsi: 'Poin gamifikasi di atas 10000.' }
    ].map(r => ({ ...r, created_at: new Date(), updated_at: new Date() }));

    await queryInterface.bulkInsert('achievements', achievementsRecords);

    // user_achievements
    const userAchievements = [];
    for (const mhs of mahasiswaData) {
      for (let i = 1; i <= 6; i++) {
        userAchievements.push({
          user_id: mhs.id,
          achievement_id: i,
          status: 0,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    await queryInterface.bulkInsert('user_achievements', userAchievements);

    // tb_ip_mhs (Semester 1-6)
    const ipRecords = [];
    for (const mhs of mahasiswaData) {
      for (let sem = 1; sem <= 6; sem++) {
        const ipVal = parseFloat((3.4 + Math.random() * 0.5).toFixed(2));
        const kodeIp = ipVal >= 3.91 ? 'P11' : ipVal >= 3.81 ? 'P10' : ipVal >= 3.71 ? 'P9' : ipVal >= 3.61 ? 'P8' : 'P7';
        ipRecords.push({
          user_id: mhs.id,
          semester: String(sem),
          tahun: '2023/2024',
          ip: ipVal,
          kode_ip: kodeIp,
          status: 1,
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    await queryInterface.bulkInsert('tb_ip_mhs', ipRecords);

    // ==================== MATA KULIAH DARI SIMAKAD.SQL ====================
    const matakuliahData = [
      { id: 1, kode_matakuliah: 'PAI111', nama_matakuliah: 'Studi Islam I', sks: 2 },
      { id: 2, kode_matakuliah: 'PBI106X', nama_matakuliah: 'Bahasa Indonesia', sks: 2 },
      { id: 3, kode_matakuliah: 'TIF101', nama_matakuliah: 'Pengantar Teknik Informatika', sks: 2 },
      { id: 4, kode_matakuliah: 'TIF103', nama_matakuliah: 'Matematika Diskrit', sks: 2 },
      { id: 5, kode_matakuliah: 'TIF105', nama_matakuliah: 'Kecakapan Intrapersonal', sks: 2 },
      { id: 6, kode_matakuliah: 'TIF102', nama_matakuliah: 'Kalkulus II', sks: 2 },
      { id: 7, kode_matakuliah: 'TIF106', nama_matakuliah: 'Struktur Data dan Algoritma + Praktikum', sks: 3 },
      { id: 8, kode_matakuliah: 'TIF112', nama_matakuliah: 'Organisasi Komputer dan Sistem Operasi + Prak', sks: 2 },
      { id: 9, kode_matakuliah: 'TIF152', nama_matakuliah: 'Basis Data + Praktikum', sks: 2 },
      { id: 10, kode_matakuliah: 'TIF221', nama_matakuliah: 'Pemrograman Berorientasi Obyek + Prakt.', sks: 3 },
      { id: 11, kode_matakuliah: 'TIF225', nama_matakuliah: 'Rekayasa Perangkat Lunak + Praktikum', sks: 3 },
      { id: 12, kode_matakuliah: 'TIF222', nama_matakuliah: 'Perancangan dan Pemrograman Web + Praktikum', sks: 3 },
      { id: 13, kode_matakuliah: 'TIF383', nama_matakuliah: 'Machine Learning + Praktikum', sks: 3 },
      { id: 14, kode_matakuliah: 'TIF401', nama_matakuliah: 'Etika Profesi', sks: 2 }
    ].map(m => ({ ...m, created_at: new Date(), updated_at: new Date() }));

    await queryInterface.bulkInsert('m_matakuliah', matakuliahData);

    // ==================== PEMBELAJARAN & ABSENSI ====================
    let pembId = 1;
    const pembelajaranData = [];
    for (const mk of matakuliahData) {
      for (let pert = 1; pert <= 14; pert++) {
        pembelajaranData.push({
          id: pembId++,
          id_matkul: mk.id,
          pertemuan: pert,
          kelas: 'A',
          semester: 'gasal',
          tahun_akademik: '2024/2025',
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    await queryInterface.bulkInsert('pembelajaran_dosen_ext', pembelajaranData);

    const absensiData = [];
    let absId = 1;
    for (const mhs of mahasiswaData) {
      for (const p of pembelajaranData) {
        // 90% Hadir (1), 7% Izin (2), 3% Sakit (3)
        const rand = Math.random();
        const status = rand < 0.90 ? 1 : rand < 0.97 ? 2 : 3;
        absensiData.push({
          id: absId++,
          id_mhs: mhs.id,
          npm: mhs.npm,
          id_pembelajaran: p.id,
          status_absen: status,
          upload_dok: status !== 1 ? `surat_izin_${mhs.npm}_p${p.pertemuan}.pdf` : null,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    await queryInterface.bulkInsert('absensi_mhs', absensiData);

    // ==================== COMPREHENSIVE ACTIVITY SEEDING (MIN 5 PER USER) ====================
    const sertifikasiData = [];
    const tesData = [];
    const penghargaanData = [];
    const anggotaProfData = [];
    const pembicaraData = [];
    const pengabdianData = [];
    const penelitianData = [];

    const sertifTemplates = [
      { jenis_serti: 'Kompetensi', nama_serti: 'Oracle Database SQL Certified Associate', bidang_studi: 'Database', penyelenggara: 'Oracle', kat: 1 },
      { jenis_serti: 'Kompetensi', nama_serti: 'AWS Certified Cloud Practitioner', bidang_studi: 'Cloud', penyelenggara: 'Amazon Web Services', kat: 2 },
      { jenis_serti: 'Pelatihan', nama_serti: 'React & Node.js Developer Bootcamp', bidang_studi: 'Web Dev', penyelenggara: 'Dicoding Indonesia', kat: 3 },
      { jenis_serti: 'Kompetensi', nama_serti: 'CCNA Routing and Switching', bidang_studi: 'Networking', penyelenggara: 'Cisco Systems', kat: 2 },
      { jenis_serti: 'Pelatihan', nama_serti: 'Practical Machine Learning with Python', bidang_studi: 'AI/ML', penyelenggara: 'IBM Training', kat: 3 }
    ];

    const tesTemplates = [
      { nama_tes: 'TOEFL ITP', jenis_tes: 'English Proficiency', penyelenggara: 'ETS', kat: 1, skor: '560' },
      { nama_tes: 'IELTS Academic', jenis_tes: 'English Proficiency', penyelenggara: 'British Council', kat: 2, skor: '7.0' },
      { nama_tes: 'JLPT N4', jenis_tes: 'Japanese Proficiency', penyelenggara: 'Japan Foundation', kat: 2, skor: 'Pass' },
      { nama_tes: 'TOEIC Bridge', jenis_tes: 'English Proficiency', penyelenggara: 'ETS', kat: 1, skor: '850' },
      { nama_tes: 'GRE General', jenis_tes: 'Academic Aptitude', penyelenggara: 'ETS', kat: 2, skor: '315' }
    ];

    const pengTemplates = [
      { nama: 'Mahasiswa Berprestasi', tingkat: 'Nasional', jenis: 'Akademik', instansi: 'Kemendikbudristek', kat: 1 },
      { nama: 'Hackathon Innovation Challenge', tingkat: 'Internasional', jenis: 'Lomba Coding', instansi: 'Google Cloud', kat: 2 },
      { nama: 'Juara 1 UI/UX Design Competition', tingkat: 'Nasional', jenis: 'Desain Aplikasi', instansi: 'Telkom Indonesia', kat: 1 },
      { nama: 'Best Paper Award', tingkat: 'Nasional', jenis: 'Penelitian', instansi: 'DIKTI', kat: 2 },
      { nama: 'Indonesian Youth Leader', tingkat: 'Nasional', jenis: 'Kepemimpinan', instansi: 'Kemenpora', kat: 1 }
    ];

    const orgTemplates = [
      { nama: 'Himpunan Mahasiswa Informatika', peran: 'Ketua Umum' },
      { nama: 'IEEE Student Branch TIAS', peran: 'Sekretaris' },
      { nama: 'Google Developer Student Clubs', peran: 'Core Team Mobile Dev' },
      { nama: 'Badan Eksekutif Mahasiswa', peran: 'Kepala Divisi Hubungan Luar' },
      { nama: 'Asosiasi Programmer Indonesia', peran: 'Anggota Aktif' }
    ];

    const pembTemplates = [
      { kat_pemb: 'Pembicara Tamu', judul: 'Masa Depan AI dan Web 3.0', pertemuan: 'Seminar Nasional Teknologi', tingkat: 'Nasional', penyelenggara: 'Lab Komputer', bhs: 'Indonesia' },
      { kat_pemb: 'Keynote Speaker', judul: 'Cyber Security Essentials for Gen Z', pertemuan: 'Webinar Keamanan Digital', tingkat: 'Regional', penyelenggara: 'Univ TIAS', bhs: 'Indonesia' },
      { kat_pemb: 'Presenter', judul: 'Implementasi Machine Learning untuk IoT', pertemuan: 'International Conference on Computing', tingkat: 'Internasional', penyelenggara: 'IEEE Indonesia', bhs: 'Inggris' },
      { kat_pemb: 'Moderator', judul: 'Transformasi Digital Pasca Pandemi', pertemuan: 'Webinar Kolaboratif Pemuda', tingkat: 'Nasional', penyelenggara: 'Kominfo', bhs: 'Indonesia' },
      { kat_pemb: 'Workshop Leader', judul: 'Hands-on React Native & Expo', pertemuan: 'GDSC Developer Workshop', tingkat: 'Regional', penyelenggara: 'GDSC TIAS', bhs: 'Indonesia' }
    ];

    const abdTemplates = [
      { judul: 'Literasi Teknologi Informasi untuk Desa Wisata', bidang: 'Teknologi', lokasi: 'Desa Mandiri', lama: '3 Bulan' },
      { judul: 'Pelatihan Administrasi Digital bagi Guru SD', bidang: 'Pendidikan', lokasi: 'SDN 02', lama: '1 Bulan' },
      { judul: 'Rancang Bangun Web Profile UMKM Lokal', bidang: 'Ekonomi Digital', lokasi: 'Koperasi Cibiru', lama: '2 Bulan' },
      { judul: 'Sosialisasi Internet Sehat & Aman (INSAN)', bidang: 'Sosial', lokasi: 'Karang Taruna', lama: '2 Minggu' },
      { judul: 'Penerapan IoT untuk Pertanian Modern', bidang: 'Pertanian', lokasi: 'Kelompok Tani Jaya', lama: '4 Bulan' }
    ];

    const litTemplates = [
      { judul: 'Deteksi Dini Penyakit Jantung dengan Random Forest', bidang: 'Kecerdasan Buatan', lokasi: 'Puskesmas', lama: '6 Bulan', usulan: '2024', kegiatan: '2024', pelak: '2024' },
      { judul: 'Pengembangan E-Voting Blockchain Terdesentralisasi', bidang: 'Kriptografi', lokasi: 'Universitas', lama: '4 Bulan', usulan: '2024', kegiatan: '2024', pelak: '2024' },
      { judul: 'Sistem Informasi Akademik Berbasis Cloud Computing', bidang: 'Rekayasa Perangkat Lunak', lokasi: 'Fakultas', lama: '6 Bulan', usulan: '2024', kegiatan: '2024', pelak: '2024' },
      { judul: 'Analisis Sentimen Opini Publik terhadap Kebijakan Publik', bidang: 'Natural Language Processing', lokasi: 'Media Sosial', lama: '3 Bulan', usulan: '2024', kegiatan: '2024', pelak: '2024' },
      { judul: 'Smart Home Automation System Berbasis ESP32', bidang: 'IoT', lokasi: 'Laboratorium', lama: '5 Bulan', usulan: '2024', kegiatan: '2024', pelak: '2024' }
    ];

    let sertId = 1;
    let tId = 1;
    let pengId = 1;
    let profId = 1;
    let pembicaraId = 1;
    let pengabdianId = 1;

    for (const mhs of mahasiswaData) {
      for (let i = 0; i < 5; i++) {
        const date = new Date(2024, i, 10 + i);

        // Sertifikasi
        const sT = sertifTemplates[i];
        sertifikasiData.push({
          sertifikat_id: sertId++,
          user_id: mhs.id,
          jenis_serti: sT.jenis_serti,
          kategori_id: sT.kat,
          nama_serti: sT.nama_serti,
          bidang_studi: sT.bidang_studi,
          tgl_serti: date,
          penyelenggara: sT.penyelenggara,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Tes
        const tT = tesTemplates[i];
        tesData.push({
          tes_id: tId++,
          user_id: mhs.id,
          nama_tes: tT.nama_tes,
          jenis_tes: tT.jenis_tes,
          penyelenggara: tT.penyelenggara,
          tgl_tes: date,
          kategori_id: tT.kat,
          skor_tes: tT.skor,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Penghargaan
        const pT = pengTemplates[i];
        penghargaanData.push({
          penghargaan_id: pengId++,
          user_id: mhs.id,
          kategori_id: pT.kat,
          tingkat_peng: pT.tingkat,
          jenis_peng: pT.jenis,
          nama_peng: pT.nama,
          tahun_peng: '2024',
          instansi_pemberi: pT.instansi,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Anggota Profesi
        const oT = orgTemplates[i];
        anggotaProfData.push({
          prof_id: profId++,
          user_id: mhs.id,
          nama_organisasi: oT.nama,
          peran: oT.peran,
          mulai_tahun: '2023',
          mulai_bulan: '01',
          selesai_tahun: '2024',
          selesai_bulan: '01',
          kategori_id: 1,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Pembicara
        const bT = pembTemplates[i];
        pembicaraData.push({
          pembicara_id: pembicaraId++,
          user_id: mhs.id,
          kategori_id: 2,
          kategori_pembicara: bT.kat_pemb,
          judul_makalah: bT.judul,
          nama_pertemuan: bT.pertemuan,
          tingkat_pertemuan: bT.tingkat,
          penyelenggara: bT.penyelenggara,
          tgl_pelaksanaan: date,
          bahasa: bT.bhs,
          no_sk_penugasan: `SK/PEM/${mhs.npm}/${2024}/${i + 1}`,
          tgl_sk_penugasan: date,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Pengabdian
        const aT = abdTemplates[i];
        pengabdianData.push({
          pengabdian_id: pengabdianId++,
          user_id: mhs.id,
          kategori_id: 1,
          judul_kegiatan: aT.judul,
          kelompok_bidang: aT.bidang,
          lokasi_kegiatan: aT.lokasi,
          lama_kegiatan: aT.lama,
          no_sk_penugasan: `SK/PENG/${mhs.npm}/${2024}/${i + 1}`,
          tgl_sk_penugasan: date,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Penelitian
        const lT = litTemplates[i];
        penelitianData.push({
          penelitian_id: Sequelize.literal('gen_random_uuid()'),
          user_id: mhs.id,
          kategori_id: 1, // Kategori publikasi 1
          judul_kegiatan: lT.judul,
          kelompok_bidang: lT.bidang,
          lokasi_kegiatan: lT.lokasi,
          tahun_usulan: lT.usulan,
          tahun_kegiatan: lT.kegiatan,
          tahun_pelaksanaan: lT.pelak,
          lama_kegiatan: lT.lama,
          no_sk_penugasan: `SK/LIT/${mhs.npm}/${2024}/${i + 1}`,
          tgl_sk_penugasan: date,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    await queryInterface.bulkInsert('tb_sertifikasi', sertifikasiData);
    await queryInterface.bulkInsert('tb_tes', tesData);
    await queryInterface.bulkInsert('tb_penghargaan', penghargaanData);
    await queryInterface.bulkInsert('tb_anggota_prof', anggotaProfData);
    await queryInterface.bulkInsert('tb_pembicara', pembicaraData);
    await queryInterface.bulkInsert('tb_pengabdian', pengabdianData);
    await queryInterface.bulkInsert('tb_penelitian', penelitianData);

    // ==================== SEED SKRIPSI / TUGAS AKHIR ====================
    const judulSkripsi = [
      'Sistem Informasi Monitoring Akademik Berbasis Web',
      'Implementasi Machine Learning untuk Prediksi Kelulusan',
      'Aplikasi Mobile Pembelajaran Interaktif',
      'Analisis Sentimen Media Sosial dengan Naive Bayes',
      'Sistem Rekomendasi Pemilihan Mata Kuliah',
      'Deteksi Dini Penyakit Diabetes dengan Random Forest',
      'Pengembangan E-commerce untuk UMKM',
      'Sistem Absensi dengan Face Recognition',
      'Aplikasi Crowdfunding Sosial',
      'Sistem Pakar Diagnosis Hama Tanaman',
      'Sistem Informasi Logistik Digital',
      'Implementasi IoT untuk Smart Gardening',
      'Sistem Pendukung Keputusan Penilaian Kinerja Dosen',
      'Pemanfaatan Web Scraping untuk Pemantauan Harga',
      'Rancang Bangun E-Learning Terdistribusi',
      'Aplikasi Mobile Konsultasi Kesehatan Mental'
    ];

    const pengajuanTA = [];
    const kolokiumTA = [];
    const sidangTA = [];
    const penilaianKolo = [];
    const penilaianSidang = [];

    for (let i = 0; i < mahasiswaData.length; i++) {
      const mhsId = mahasiswaData[i].id;
      const judul = judulSkripsi[i];
      const taId = i + 1;

      pengajuanTA.push({
        id: taId,
        mhs_id: mhsId,
        judul_skripsi: judul,
        lokasi_kegiatan: 'Kampus TIAS',
        semester: '7',
        sk_pembimbing_1: dosenUUID[0],
        sk_pembimbing_2: dosenUUID[1],
        status: 'Approved',
        created_at: new Date(),
        updated_at: new Date()
      });

      kolokiumTA.push({
        id: taId,
        mhs_id: mhsId,
        pengajuan_sk_id: taId,
        status_kp: true,
        status_sks_ipk: true,
        jumlah_sks: 144,
        ipk: 3.65,
        kolo_pembimbing_1: dosenUUID[0],
        kolo_pembimbing_2: dosenUUID[1],
        judul: judul,
        evaluator_1: dosenUUID[2],
        evaluator_2: dosenUUID[3],
        kolo_status_pem_1: true,
        kolo_status_pem_2: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      sidangTA.push({
        id: taId,
        mhs_id: mhsId,
        pengajuan_sk_id: taId,
        status_kp: true,
        jumlah_sks: 144,
        status_min_ipk: true,
        ipk: 3.65,
        sidang_pembimbing_1: dosenUUID[0],
        sidang_pembimbing_2: dosenUUID[1],
        judul: judul,
        penguji_1: dosenUUID[2],
        penguji_2: dosenUUID[3],
        jadwal_pelaksanaan: new Date(2025, 6, 1 + i),
        sidang_status_pem_1: true,
        sidang_status_pem_2: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      penilaianKolo.push(
        { kolo_id: taId, dosen_id: dosenUUID[2] },
        { kolo_id: taId, dosen_id: dosenUUID[3] }
      );

      penilaianSidang.push(
        { sidang_id: taId, dosen_id: dosenUUID[2] },
        { sidang_id: taId, dosen_id: dosenUUID[3] }
      );
    }

    await queryInterface.bulkInsert('ta_pengajuan_sk', pengajuanTA);
    await queryInterface.bulkInsert('ta_pendaftaran_kolokium', kolokiumTA);
    await queryInterface.bulkInsert('ta_pendaftaran_sidang', sidangTA);
    await queryInterface.bulkInsert('ta_penilaian_kolokium', penilaianKolo);
    await queryInterface.bulkInsert('ta_penilaian_sidang', penilaianSidang);

    // ==================== DYNAMICALLY CALCULATE & UPDATE POIN & RANK ====================
    for (const mhs of mahasiswaData) {
      // 1. Pendidikan points (from tb_ip_mhs)
      const ipPointsRes = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(ki.point), 0) as total FROM tb_ip_mhs tim 
         JOIN kategori_ip ki ON tim.kode_ip = ki.kode 
         WHERE tim.user_id = :userId AND tim.status = 1 AND tim.is_deleted = false`,
        { replacements: { userId: mhs.id }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pointPendidikan = Number(ipPointsRes[0]?.total || 0);

      // 2. Kompetensi points (from tb_sertifikasi and tb_tes)
      const sertifPointsRes = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(ks.point), 0) as total FROM tb_sertifikasi ts 
         JOIN kategori_sertifikasi ks ON ts.kategori_id = ks.id 
         WHERE ts.user_id = :userId AND ts.status = 1`,
        { replacements: { userId: mhs.id }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const tesPointsRes = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(ks.point), 0) as total FROM tb_tes tt 
         JOIN kategori_sertifikasi ks ON tt.kategori_id = ks.id 
         WHERE tt.user_id = :userId AND tt.status = 1`,
        { replacements: { userId: mhs.id }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pointKompetensi = Number(sertifPointsRes[0]?.total || 0) + Number(tesPointsRes[0]?.total || 0);

      // 3. Pengabdian points (from tb_pengabdian and tb_pembicara)
      const pengabdianPointsRes = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(kp.point), 0) as total FROM tb_pengabdian tp 
         JOIN kategori_publikasi kp ON tp.kategori_id = kp.id 
         WHERE tp.user_id = :userId AND tp.status = 1`,
        { replacements: { userId: mhs.id }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pembicaraPointsRes = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(kp.point), 0) as total FROM tb_pembicara tb 
         JOIN kategori_publikasi kp ON tb.kategori_id = kp.id 
         WHERE tb.user_id = :userId AND tb.status = 1`,
        { replacements: { userId: mhs.id }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pointPengabdian = Number(pengabdianPointsRes[0]?.total || 0) + Number(pembicaraPointsRes[0]?.total || 0);

      // 4. Penelitian points (from tb_penelitian)
      const penelitianPointsRes = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(kp.point), 0) as total FROM tb_penelitian tp 
         JOIN kategori_publikasi kp ON tp.kategori_id = kp.id 
         WHERE tp.user_id = :userId AND tp.status = 1`,
        { replacements: { userId: mhs.id }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pointPenelitian = Number(penelitianPointsRes[0]?.total || 0);

      // 5. Penunjang points (from tb_anggota_prof and tb_penghargaan)
      const profPointsRes = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(kp.point), 0) as total FROM tb_anggota_prof ta 
         JOIN kategori_profesi kp ON ta.kategori_id = kp.id 
         WHERE ta.user_id = :userId AND ta.status = 1`,
        { replacements: { userId: mhs.id }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const prestasiPointsRes = await queryInterface.sequelize.query(
        `SELECT COALESCE(SUM(kp.point), 0) as total FROM tb_penghargaan tp 
         JOIN kategori_prestasi kp ON tp.kategori_id = kp.id 
         WHERE tp.user_id = :userId AND tp.status = 1`,
        { replacements: { userId: mhs.id }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      const pointPenunjang = Number(profPointsRes[0]?.total || 0) + Number(prestasiPointsRes[0]?.total || 0);

      const totalPoint = pointPendidikan + pointKompetensi + pointPengabdian + pointPenelitian + pointPenunjang;

      // Determine rank
      let rank = 'Novice';
      if (totalPoint > 7400) rank = 'Master';
      else if (totalPoint > 5300) rank = 'Expert';
      else if (totalPoint > 3800) rank = 'Proficient';
      else if (totalPoint > 2300) rank = 'Competent';

      // Update student data
      await queryInterface.sequelize.query(
        `UPDATE tb_data_pribadi SET 
         point_pendidikan = :pointPendidikan,
         point_kompetensi = :pointKompetensi,
         point_pengabdian = :pointPengabdian,
         point_penelitian = :pointPenelitian,
         point_penunjang = :pointPenunjang,
         total_point = :totalPoint,
         rank = :rank
         WHERE user_id = :userId`,
        {
          replacements: {
            pointPendidikan,
            pointKompetensi,
            pointPengabdian,
            pointPenelitian,
            pointPenunjang,
            totalPoint,
            rank,
            userId: mhs.id
          }
        }
      );
    }

    console.log('✅ Seed data successfully inserted with all required associations!');
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const deleteOrder = [
      'ta_penilaian_sidang', 'ta_penilaian_kolokium', 'ta_pendaftaran_sidang', 'ta_pendaftaran_kolokium',
      'ta_pengajuan_sk', 'absensi_mhs', 'pembelajaran_dosen_ext', 'm_matakuliah',
      'anggota_pengabdian', 'dokumen_pengabdian', 'tb_pengabdian',
      'dokumen_pembicara', 'tb_pembicara',
      'anggota_penelitian', 'dokumen_penelitian', 'tb_penelitian',
      'tb_anggota_prof', 'tb_penghargaan', 'tb_tes', 'tb_sertifikasi',
      'user_achievements', 'achievements', 'point_rekomendasi', 'tb_ip_mhs', 'kategori_ip',
      'trx_parent_mhs', 'tb_parents', 'tb_data_pribadi', 'tb_users'
    ];

    for (const table of deleteOrder) {
      if (tables.includes(table)) {
        await queryInterface.bulkDelete(table, {}, {}).catch(() => { });
      }
    }

    console.log('✅ Data cleaned up successfully!');
  }
};