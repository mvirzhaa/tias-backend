'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // ==================== GENERATE UUID UNTUK MAHASISWA ====================
    const mahasiswaUUID = [
      '20260515-0000-0000-0000-000000000001',
      '20260515-0000-0000-0000-000000000002',
      '20260515-0000-0000-0000-000000000003',
      '20260515-0000-0000-0000-000000000004',
      '20260515-0000-0000-0000-000000000005',
      '20260515-0000-0000-0000-000000000006',
      '20260515-0000-0000-0000-000000000007',
      '20260515-0000-0000-0000-000000000008',
      '20260515-0000-0000-0000-000000000009',
      '20260515-0000-0000-0000-000000000010'
    ];

    // ==================== GENERATE UUID UNTUK DOSEN ====================
    const dosenUUID = [
      '20260515-2222-2222-2222-222222222221',
      '20260515-2222-2222-2222-222222222222',
      '20260515-2222-2222-2222-222222222223',
      '20260515-2222-2222-2222-222222222224',
      '20260515-2222-2222-2222-222222222225'
    ];

    // ==================== GENERATE UUID UNTUK DATA PRIBADI ====================
    const dataPribadiUUID = [
      '20260515-1111-1111-1111-111111111111',
      '20260515-1111-1111-1111-111111111112',
      '20260515-1111-1111-1111-111111111113',
      '20260515-1111-1111-1111-111111111114',
      '20260515-1111-1111-1111-111111111115',
      '20260515-1111-1111-1111-111111111116',
      '20260515-1111-1111-1111-111111111117',
      '20260515-1111-1111-1111-111111111118',
      '20260515-1111-1111-1111-111111111119',
      '20260515-1111-1111-1111-111111111120',
      '20260515-4444-4444-4444-444444444441',
      '20260515-4444-4444-4444-444444444442',
      '20260515-4444-4444-4444-444444444443',
      '20260515-4444-4444-4444-444444444444',
      '20260515-4444-4444-4444-444444444445'
    ];

    // Data Mahasiswa (10)
    const mahasiswaData = [
      { id: mahasiswaUUID[0], npm: '221106043033', nama: 'Muhammad Syaifullah', nik: '1234567890123456', no_hp: '081234567890', email: 'syaifullah@example.com', dpId: dataPribadiUUID[0], angkatan: 2021, prodi: 'Informatika' },
      { id: mahasiswaUUID[1], npm: '221106043023', nama: 'Ikhsan', nik: '1234567890123457', no_hp: '081234567891', email: 'ikhsan@example.com', dpId: dataPribadiUUID[1], angkatan: 2021, prodi: 'Informatika' },
      { id: mahasiswaUUID[2], npm: '221106043022', nama: 'Firman', nik: '1234567890123458', no_hp: '081234567892', email: 'firman@example.com', dpId: dataPribadiUUID[2], angkatan: 2021, prodi: 'Informatika' },
      { id: mahasiswaUUID[3], npm: '202410001452', nama: 'Budi Santoso', nik: '1234567890123459', no_hp: '081234567893', email: 'budi@example.com', dpId: dataPribadiUUID[3], angkatan: 2020, prodi: 'Sistem Informasi' },
      { id: mahasiswaUUID[4], npm: '20260515005', nama: 'Dewi Lestari', nik: '1234567890123460', no_hp: '081234567894', email: 'dewi@example.com', dpId: dataPribadiUUID[4], angkatan: 2022, prodi: 'Informatika' },
      { id: mahasiswaUUID[5], npm: '20260515006', nama: 'Rizki Ramadhan', nik: '1234567890123461', no_hp: '081234567895', email: 'rizki@example.com', dpId: dataPribadiUUID[5], angkatan: 2022, prodi: 'Teknik Komputer' },
      { id: mahasiswaUUID[6], npm: '20260515007', nama: 'Putri Amelia', nik: '1234567890123462', no_hp: '081234567896', email: 'putri@example.com', dpId: dataPribadiUUID[6], angkatan: 2022, prodi: 'Sistem Informasi' },
      { id: mahasiswaUUID[7], npm: '20260515008', nama: 'Andi Wijaya', nik: '1234567890123463', no_hp: '081234567897', email: 'andi@example.com', dpId: dataPribadiUUID[7], angkatan: 2021, prodi: 'Informatika' },
      { id: mahasiswaUUID[8], npm: '20260515009', nama: 'Ratna Sari', nik: '1234567890123464', no_hp: '081234567898', email: 'ratna@example.com', dpId: dataPribadiUUID[8], angkatan: 2022, prodi: 'Teknik Komputer' },
      { id: mahasiswaUUID[9], npm: '20260515010', nama: 'Dimas Prasetyo', nik: '1234567890123465', no_hp: '081234567899', email: 'dimas@example.com', dpId: dataPribadiUUID[9], angkatan: 2020, prodi: 'Informatika' }
    ];

    // Data Dosen (5)
    const dosenData = [
      { id: dosenUUID[0], npm: 'DOSEN001', nama: 'Fitrah Satrya F.K, M.Kom', nik: '2234567890123456', no_hp: '082345678901', email: 'fitrah@example.com', dpId: dataPribadiUUID[10], bidang: 'Database' },
      { id: dosenUUID[1], npm: 'DOSEN002', nama: 'Berlina Wulandari, S.T., M.Kom', nik: '2234567890123457', no_hp: '082345678902', email: 'berlina@example.com', dpId: dataPribadiUUID[11], bidang: 'Jaringan' },
      { id: dosenUUID[2], npm: 'DOSEN003', nama: 'Dr. Hendra Gunawan, M.T', nik: '2234567890123458', no_hp: '082345678903', email: 'hendra@example.com', dpId: dataPribadiUUID[12], bidang: 'AI' },
      { id: dosenUUID[3], npm: 'DOSEN004', nama: 'Rina Marlina, S.Si., M.Sc', nik: '2234567890123459', no_hp: '082345678904', email: 'rina@example.com', dpId: dataPribadiUUID[13], bidang: 'Multimedia' },
      { id: dosenUUID[4], npm: 'DOSEN005', nama: 'Ir. Bambang Supriyadi, M.T', nik: '2234567890123460', no_hp: '082345678905', email: 'bambang@example.com', dpId: dataPribadiUUID[14], bidang: 'Sistem Operasi' }
    ];

    // Data Orang Tua (10) - terhubung dengan mahasiswa via mhs_id
    const parentData = [
      { id: 1001, email: 'parent_syaifullah@gmail.com', nama: 'Ayah Syaifullah', npm: '221106043033', no_hp: '089123456701', mhs_id: mahasiswaUUID[0] },
      { id: 1002, email: 'parent_ikhsan@gmail.com', nama: 'Ayah Ikhsan', npm: '221106043023', no_hp: '089123456702', mhs_id: mahasiswaUUID[1] },
      { id: 1003, email: 'parent_firman@gmail.com', nama: 'Ayah Firman', npm: '221106043022', no_hp: '089123456703', mhs_id: mahasiswaUUID[2] },
      { id: 1004, email: 'parent_budi@gmail.com', nama: 'Ayah Budi', npm: '202410001452', no_hp: '089123456704', mhs_id: mahasiswaUUID[3] },
      { id: 1005, email: 'parent_dewi@gmail.com', nama: 'Ayah Dewi', npm: '20260515005', no_hp: '089123456705', mhs_id: mahasiswaUUID[4] },
      { id: 1006, email: 'parent_rizki@gmail.com', nama: 'Ayah Rizki', npm: '20260515006', no_hp: '089123456706', mhs_id: mahasiswaUUID[5] },
      { id: 1007, email: 'parent_putri@gmail.com', nama: 'Ayah Putri', npm: '20260515007', no_hp: '089123456707', mhs_id: mahasiswaUUID[6] },
      { id: 1008, email: 'parent_andi@gmail.com', nama: 'Ayah Andi', npm: '20260515008', no_hp: '089123456708', mhs_id: mahasiswaUUID[7] },
      { id: 1009, email: 'parent_ratna@gmail.com', nama: 'Ayah Ratna', npm: '20260515009', no_hp: '089123456709', mhs_id: mahasiswaUUID[8] },
      { id: 1010, email: 'parent_dimas@gmail.com', nama: 'Ayah Dimas', npm: '20260515010', no_hp: '089123456710', mhs_id: mahasiswaUUID[9] }
    ];

    // ==================== CEK APAKAH TABEL SUDAH ADA ====================
    const tables = await queryInterface.showAllTables();

    // Clean up all tables in reverse dependency order
    const deleteOrder = [
      'ta_penilaian_sidang', 'ta_penilaian_kolokium', 'ta_pendaftaran_sidang', 'ta_pendaftaran_kolokium',
      'ta_pengajuan_sk', 'absensi_mhs', 'pembelajaran_dosen_ext', 'm_matakuliah', 'tb_pengabdian',
      'tb_pembicara', 'tb_anggota_prof', 'tb_penghargaan', 'tb_tes', 'tb_sertifikasi',
      'trx_parent_mhs', 'tb_parents', 'tb_data_pribadi', 'tb_users'
    ];

    for (const table of deleteOrder) {
      if (tables.includes(table)) await queryInterface.bulkDelete(table, {}, {});
    }

    // Buat tabel-tabel jika belum ada (sama seperti kode Anda)
    if (!tables.includes('tb_users')) {
      await queryInterface.createTable('tb_users', {
        user_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        npm: { type: Sequelize.STRING(20) },
        email: { type: Sequelize.STRING(100) },
        password: { type: Sequelize.STRING(255) },
        role: { type: Sequelize.ENUM('Mahasiswa', 'Dosen', 'Admin', 'Parent') },
        isverified: { type: Sequelize.BOOLEAN, defaultValue: false },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
      });
    }

    if (!tables.includes('tb_data_pribadi')) {
      await queryInterface.createTable('tb_data_pribadi', {
        dp_id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
        user_id: { type: Sequelize.UUID },
        nama_lengkap: { type: Sequelize.STRING(100) },
        nik: { type: Sequelize.STRING(20) },
        no_hp: { type: Sequelize.STRING(15) },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
      });
    }

    if (!tables.includes('tb_parents')) {
      await queryInterface.createTable('tb_parents', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        email: { type: Sequelize.STRING(100) },
        password: { type: Sequelize.STRING(255) },
        nama_lengkap: { type: Sequelize.STRING(100) },
        npm: { type: Sequelize.STRING(20) },
        no_hp: { type: Sequelize.STRING(15) },
        role: { type: Sequelize.STRING(20), defaultValue: 'Parent' },
        is_verified: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
      });
    }

    if (!tables.includes('trx_parent_mhs')) {
      await queryInterface.createTable('trx_parent_mhs', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        parent_id: { type: Sequelize.INTEGER },
        mhs_id: { type: Sequelize.UUID },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
      });
    }

    // ==================== INSERT DATA USER ====================
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

    for (const record of userRecords) {
      await queryInterface.sequelize.query(
        `INSERT INTO tb_users (user_id, npm, email, password, role, isverified, created_at, updated_at) 
         VALUES (:user_id, :npm, :email, :password, :role, :isverified, :created_at, :updated_at)
         ON CONFLICT (user_id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
        { replacements: record }
      ).catch(() => { });
    }

    // Insert tb_data_pribadi (terhubung ke user_id)
    const dataPribadiRecords = [
      ...mahasiswaData.map(m => ({ dp_id: m.dpId, user_id: m.id, nama_lengkap: m.nama, nik: m.nik, no_hp: m.no_hp, created_at: new Date(), updated_at: new Date() })),
      ...dosenData.map(d => ({ dp_id: d.dpId, user_id: d.id, nama_lengkap: d.nama, nik: d.nik, no_hp: d.no_hp, created_at: new Date(), updated_at: new Date() }))
    ];

    for (const record of dataPribadiRecords) {
      await queryInterface.sequelize.query(
        `INSERT INTO tb_data_pribadi (dp_id, user_id, nama_lengkap, nik, no_hp, created_at, updated_at) 
         VALUES (:dp_id, :user_id, :nama_lengkap, :nik, :no_hp, :created_at, :updated_at)
         ON CONFLICT (dp_id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
        { replacements: record }
      ).catch(() => { });
    }

    // Insert tb_parents
    for (const parent of parentData) {
      await queryInterface.sequelize.query(
        `INSERT INTO tb_parents (id, email, password, nama_lengkap, npm, no_hp, role, is_verified, created_at, updated_at) 
         VALUES (:id, :email, :password, :nama_lengkap, :npm, :no_hp, 'Parent', true, :created_at, :updated_at)
         ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
        {
          replacements: {
            id: parent.id,
            email: parent.email,
            password: hashedPassword,
            nama_lengkap: parent.nama,
            npm: parent.npm,
            no_hp: parent.no_hp,
            created_at: new Date(),
            updated_at: new Date()
          }
        }
      ).catch(() => { });
    }

    // Insert trx_parent_mhs (relasi parent ke mahasiswa)
    for (const parent of parentData) {
      await queryInterface.sequelize.query(
        `INSERT INTO trx_parent_mhs (parent_id, mhs_id, created_at, updated_at) 
         VALUES (:parent_id, :mhs_id, :created_at, :updated_at)
         ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
        {
          replacements: {
            parent_id: parent.id,
            mhs_id: parent.mhs_id,
            created_at: new Date(),
            updated_at: new Date()
          }
        }
      ).catch(() => { });
    }

    // ==================== 1. SERTIFIKASI (terhubung ke user_id mahasiswa) ====================
    const sertifikasiItems = [
      { jenis_serti: 'Kompetensi', kategori_id: 1, nama_serti: 'Oracle Certified Professional', bidang_studi: 'Database', penyelenggara: 'Oracle' },
      { jenis_serti: 'Kompetensi', kategori_id: 1, nama_serti: 'AWS Certified Solutions Architect', bidang_studi: 'Cloud Computing', penyelenggara: 'AWS' },
      { jenis_serti: 'Pelatihan', kategori_id: 3, nama_serti: 'Fullstack Web Development', bidang_studi: 'Web Dev', penyelenggara: 'Dicoding' },
      { jenis_serti: 'Kompetensi', kategori_id: 2, nama_serti: 'Cisco CCNA', bidang_studi: 'Networking', penyelenggara: 'Cisco' },
      { jenis_serti: 'Pelatihan', kategori_id: 3, nama_serti: 'Data Science', bidang_studi: 'Data', penyelenggara: 'IBM' },
      { jenis_serti: 'Kompetensi', kategori_id: 1, nama_serti: 'Microsoft Azure', bidang_studi: 'Cloud', penyelenggara: 'Microsoft' },
      { jenis_serti: 'Pelatihan', kategori_id: 3, nama_serti: 'UI/UX Design', bidang_studi: 'Design', penyelenggara: 'Google' },
      { jenis_serti: 'Kompetensi', kategori_id: 2, nama_serti: 'Certified Ethical Hacker', bidang_studi: 'Security', penyelenggara: 'EC-Council' },
      { jenis_serti: 'Pelatihan', kategori_id: 3, nama_serti: 'Project Management', bidang_studi: 'Management', penyelenggara: 'PMI' },
      { jenis_serti: 'Kompetensi', kategori_id: 1, nama_serti: 'Red Hat Certified', bidang_studi: 'Linux', penyelenggara: 'Red Hat' }
    ];

    let sertifikatId = 1;
    const sertifikasiData = [];
    for (const mhs of mahasiswaData) {
      for (let i = 0; i < sertifikasiItems.length; i++) {
        const item = sertifikasiItems[i];
        const tglSerti = new Date(2024, i % 12, (i % 28) + 1);
        sertifikasiData.push({
          sertifikat_id: sertifikatId++,
          user_id: mhs.id,
          jenis_serti: item.jenis_serti,
          kategori_id: item.kategori_id,
          nama_serti: item.nama_serti,
          bidang_studi: item.bidang_studi,
          tgl_serti: tglSerti,
          penyelenggara: item.penyelenggara,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    if (tables.includes('tb_sertifikasi')) {
      await queryInterface.bulkInsert('tb_sertifikasi', sertifikasiData);
    }

    // ==================== 2. TES (terhubung ke user_id mahasiswa) ====================
    const tesItems = [
      { nama_tes: 'TOEFL ITP', jenis_tes: 'English', penyelenggara: 'ETS', kategori_id: 1, skor: '550' },
      { nama_tes: 'IELTS', jenis_tes: 'English', penyelenggara: 'British Council', kategori_id: 2, skor: '6.5' },
      { nama_tes: 'JLPT N4', jenis_tes: 'Japanese', penyelenggara: 'Japan Foundation', kategori_id: 2, skor: 'N4' },
      { nama_tes: 'TOEIC', jenis_tes: 'English', penyelenggara: 'ETS', kategori_id: 1, skor: '800' },
      { nama_tes: 'GRE', jenis_tes: 'Academic', penyelenggara: 'ETS', kategori_id: 2, skor: '310' },
      { nama_tes: 'GMAT', jenis_tes: 'Business', penyelenggara: 'GMAC', kategori_id: 2, skor: '650' },
      { nama_tes: 'HSK 4', jenis_tes: 'Chinese', penyelenggara: 'Hanban', kategori_id: 2, skor: '4' },
      { nama_tes: 'DELF B1', jenis_tes: 'French', penyelenggara: 'France Education', kategori_id: 2, skor: 'B1' },
      { nama_tes: 'TOEFL iBT', jenis_tes: 'English', penyelenggara: 'ETS', kategori_id: 2, skor: '90' },
      { nama_tes: 'Cambridge English CAE', jenis_tes: 'English', penyelenggara: 'Cambridge', kategori_id: 2, skor: 'CAE' }
    ];

    let tesId = 1;
    const tesData = [];
    for (const mhs of mahasiswaData) {
      for (let i = 0; i < tesItems.length; i++) {
        const item = tesItems[i];
        const tglTes = new Date(2024, i % 12, (i % 28) + 1);
        tesData.push({
          tes_id: tesId++,
          user_id: mhs.id,
          nama_tes: item.nama_tes,
          jenis_tes: item.jenis_tes,
          penyelenggara: item.penyelenggara,
          tgl_tes: tglTes,
          kategori_id: item.kategori_id,
          skor_tes: item.skor,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    if (tables.includes('tb_tes')) {
      await queryInterface.bulkInsert('tb_tes', tesData);
    }

    // ==================== 3. PENGHARGAAN (terhubung ke user_id mahasiswa) ====================
    const penghargaanItems = [
      { kategori_id: 1, tingkat_peng: 'Nasional', jenis_peng: 'Akademik', nama_peng: 'Mahasiswa Berprestasi', instansi_pemberi: 'Kemendikbud' },
      { kategori_id: 2, tingkat_peng: 'Internasional', jenis_peng: 'Lomba Coding', nama_peng: 'Hackathon Winner', instansi_pemberi: 'Google' },
      { kategori_id: 1, tingkat_peng: 'Regional', jenis_peng: 'Olahraga', nama_peng: 'Juara Bulutangkis', instansi_pemberi: 'KONI' },
      { kategori_id: 2, tingkat_peng: 'Nasional', jenis_peng: 'Penelitian', nama_peng: 'Best Paper', instansi_pemberi: 'DIKTI' },
      { kategori_id: 1, tingkat_peng: 'Lokal', jenis_peng: 'Seni', nama_peng: 'Juara Paduan Suara', instansi_pemberi: 'Universitas' },
      { kategori_id: 2, tingkat_peng: 'Internasional', jenis_peng: 'Debat', nama_peng: 'Debate Champion', instansi_pemberi: 'WUDC' },
      { kategori_id: 1, tingkat_peng: 'Nasional', jenis_peng: 'Kewirausahaan', nama_peng: 'Young Entrepreneur', instansi_pemberi: 'Kemenkop' },
      { kategori_id: 2, tingkat_peng: 'Internasional', jenis_peng: 'Inovasi', nama_peng: 'Innovation Award', instansi_pemberi: 'UNESCO' },
      { kategori_id: 1, tingkat_peng: 'Nasional', jenis_peng: 'Kompetisi Sains', nama_peng: 'Olimpiade Sains', instansi_pemberi: 'Puspresnas' },
      { kategori_id: 2, tingkat_peng: 'Internasional', jenis_peng: 'Robotika', nama_peng: 'Robot Competition', instansi_pemberi: 'FIRST' }
    ];

    let penghargaanId = 1;
    const penghargaanData = [];
    for (const mhs of mahasiswaData) {
      for (let i = 0; i < penghargaanItems.length; i++) {
        const item = penghargaanItems[i];
        penghargaanData.push({
          penghargaan_id: penghargaanId++,
          user_id: mhs.id,
          kategori_id: item.kategori_id,
          tingkat_peng: item.tingkat_peng,
          jenis_peng: item.jenis_peng,
          nama_peng: `${item.nama_peng} ${2020 + i}`,
          tahun_peng: `${2020 + i}`,
          instansi_pemberi: item.instansi_pemberi,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    if (tables.includes('tb_penghargaan')) {
      await queryInterface.bulkInsert('tb_penghargaan', penghargaanData);
    }

    // ==================== 4. ANGGOTA PROFESI (terhubung ke user_id mahasiswa) ====================
    const organisasiItems = [
      { nama_organisasi: 'Himpunan Mahasiswa Informatika', peran: 'Ketua', kategori_id: 1 },
      { nama_organisasi: 'BEM Fasilkom', peran: 'Sekretaris', kategori_id: 1 },
      { nama_organisasi: 'IEEE Student Branch', peran: 'Member', kategori_id: 1 },
      { nama_organisasi: 'GDSC', peran: 'Lead', kategori_id: 1 },
      { nama_organisasi: 'Asosiasi IT Indonesia', peran: 'Anggota', kategori_id: 1 },
      { nama_organisasi: 'Relawan Teknologi', peran: 'Koordinator', kategori_id: 1 },
      { nama_organisasi: 'Komunitas Open Source', peran: 'Contributor', kategori_id: 1 },
      { nama_organisasi: 'AI Research Group', peran: 'Researcher', kategori_id: 1 },
      { nama_organisasi: 'Cyber Security Community', peran: 'Member', kategori_id: 1 },
      { nama_organisasi: 'Startup Campus', peran: 'Founder', kategori_id: 1 }
    ];

    let profId = 1;
    const anggotaProfData = [];
    for (const mhs of mahasiswaData) {
      for (let i = 0; i < organisasiItems.length; i++) {
        const item = organisasiItems[i];
        anggotaProfData.push({
          prof_id: profId++,
          user_id: mhs.id,
          nama_organisasi: item.nama_organisasi,
          peran: item.peran,
          mulai_tahun: `${2021 + (i % 3)}`,
          mulai_bulan: `${String((i % 12) + 1).padStart(2, '0')}`,
          selesai_tahun: i % 2 === 0 ? `${2023 + (i % 3)}` : null,
          selesai_bulan: i % 2 === 0 ? `${String(((i + 6) % 12) + 1).padStart(2, '0')}` : null,
          kategori_id: item.kategori_id,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    if (tables.includes('tb_anggota_prof')) {
      await queryInterface.bulkInsert('tb_anggota_prof', anggotaProfData);
    }

    // ==================== 5. PEMBICARA (terhubung ke user_id mahasiswa) ====================
    const pembicaraItems = [
      { kategori_id: 2, kategori_pembicara: 'Pembicara Tamu', judul_makalah: 'AI Masa Depan', nama_pertemuan: 'Seminar AI 2024', tingkat_pertemuan: 'Nasional', penyelenggara: 'Lab Komputer', bahasa: 'Indonesia' },
      { kategori_id: 2, kategori_pembicara: 'Keynote', judul_makalah: 'Cyber Security', nama_pertemuan: 'Webinar Security', tingkat_pertemuan: 'Regional', penyelenggara: 'Univ XYZ', bahasa: 'Inggris' },
      { kategori_id: 2, kategori_pembicara: 'Presenter', judul_makalah: 'Big Data Analytics', nama_pertemuan: 'Data Science Conf', tingkat_pertemuan: 'Internasional', penyelenggara: 'IEEE', bahasa: 'Inggris' },
      { kategori_id: 2, kategori_pembicara: 'Moderator', judul_makalah: 'Digital Transformation', nama_pertemuan: 'Seminar Digital 2024', tingkat_pertemuan: 'Nasional', penyelenggara: 'Kominfo', bahasa: 'Indonesia' },
      { kategori_id: 2, kategori_pembicara: 'Narasumber', judul_makalah: 'Karir IT', nama_pertemuan: 'Career Workshop', tingkat_pertemuan: 'Lokal', penyelenggara: 'Career Center', bahasa: 'Indonesia' },
      { kategori_id: 2, kategori_pembicara: 'Pembicara', judul_makalah: 'Machine Learning', nama_pertemuan: 'Tech Sharing', tingkat_pertemuan: 'Regional', penyelenggara: 'GDSC', bahasa: 'Inggris' },
      { kategori_id: 2, kategori_pembicara: 'Panelis', judul_makalah: 'Blockchain Technology', nama_pertemuan: 'Blockchain Summit', tingkat_pertemuan: 'Internasional', penyelenggara: 'Blockchain ID', bahasa: 'Inggris' },
      { kategori_id: 2, kategori_pembicara: 'Workshop Leader', judul_makalah: 'Cloud Computing', nama_pertemuan: 'Cloud Workshop', tingkat_pertemuan: 'Nasional', penyelenggara: 'AWS', bahasa: 'Indonesia' },
      { kategori_id: 2, kategori_pembicara: 'Pembicara', judul_makalah: 'UI/UX Design', nama_pertemuan: 'Design Conference', tingkat_pertemuan: 'Regional', penyelenggara: 'Google', bahasa: 'Inggris' },
      { kategori_id: 2, kategori_pembicara: 'Keynote', judul_makalah: 'Entrepreneurship', nama_pertemuan: 'Startup Summit', tingkat_pertemuan: 'Nasional', penyelenggara: 'Startup Hub', bahasa: 'Indonesia' }
    ];

    let pembicaraId = 1;
    const pembicaraData = [];
    for (const mhs of mahasiswaData) {
      for (let i = 0; i < pembicaraItems.length; i++) {
        const item = pembicaraItems[i];
        const tglPelaksanaan = new Date(2024, (i % 6) + 1, (i % 28) + 1);
        pembicaraData.push({
          pembicara_id: pembicaraId++,
          user_id: mhs.id,
          kategori_id: item.kategori_id,
          kategori_pembicara: item.kategori_pembicara,
          judul_makalah: item.judul_makalah,
          nama_pertemuan: item.nama_pertemuan,
          tingkat_pertemuan: item.tingkat_pertemuan,
          penyelenggara: item.penyelenggara,
          tgl_pelaksanaan: tglPelaksanaan,
          bahasa: item.bahasa,
          no_sk_penugasan: `SK/2024/PEM/${String(pembicaraId).padStart(3, '0')}`,
          tgl_sk_penugasan: tglPelaksanaan,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    if (tables.includes('tb_pembicara')) {
      await queryInterface.bulkInsert('tb_pembicara', pembicaraData);
    }

    // ==================== 6. PENGABDIAN (terhubung ke user_id mahasiswa) ====================
    const pengabdianItems = [
      { kategori_id: 1, judul_kegiatan: 'Literasi Digital untuk Desa', kelompok_bidang: 'Pendidikan', lokasi_kegiatan: 'Desa Binaan', lama_kegiatan: '3 Bulan' },
      { kategori_id: 1, judul_kegiatan: 'Pelatihan Microsoft Office', kelompok_bidang: 'Pendidikan', lokasi_kegiatan: 'SD Negeri', lama_kegiatan: '1 Bulan' },
      { kategori_id: 1, judul_kegiatan: 'Sistem Informasi Desa', kelompok_bidang: 'Teknologi', lokasi_kegiatan: 'Desa Cibiru', lama_kegiatan: '6 Bulan' },
      { kategori_id: 1, judul_kegiatan: 'Workshop Keamanan Siber', kelompok_bidang: 'Teknologi', lokasi_kegiatan: 'SMKN 2', lama_kegiatan: '2 Minggu' },
      { kategori_id: 1, judul_kegiatan: 'Pendampingan UMKM Digital', kelompok_bidang: 'Ekonomi', lokasi_kegiatan: 'Koperasi Desa', lama_kegiatan: '4 Bulan' },
      { kategori_id: 1, judul_kegiatan: 'Pengajaran Coding untuk Anak', kelompok_bidang: 'Pendidikan', lokasi_kegiatan: 'Rumah Singgah', lama_kegiatan: '2 Bulan' },
      { kategori_id: 1, judul_kegiatan: 'Donasi Buku dan Alat Tulis', kelompok_bidang: 'Sosial', lokasi_kegiatan: 'Panti Asuhan', lama_kegiatan: '1 Bulan' },
      { kategori_id: 1, judul_kegiatan: 'Pengolahan Sampah Digital', kelompok_bidang: 'Lingkungan', lokasi_kegiatan: 'Desa Wisata', lama_kegiatan: '3 Bulan' },
      { kategori_id: 1, judul_kegiatan: 'Pelatihan Bahasa Inggris', kelompok_bidang: 'Pendidikan', lokasi_kegiatan: 'Ponpes', lama_kegiatan: '2 Bulan' },
      { kategori_id: 1, judul_kegiatan: 'Sosialisasi Kesehatan Digital', kelompok_bidang: 'Kesehatan', lokasi_kegiatan: 'Puskesmas', lama_kegiatan: '1 Bulan' }
    ];

    let pengabdianId = 1;
    const pengabdianData = [];
    for (const mhs of mahasiswaData) {
      for (let i = 0; i < pengabdianItems.length; i++) {
        const item = pengabdianItems[i];
        const tglSk = new Date(2024, i % 12, (i % 28) + 1);
        pengabdianData.push({
          pengabdian_id: pengabdianId++,
          user_id: mhs.id,
          kategori_id: item.kategori_id,
          judul_kegiatan: item.judul_kegiatan,
          kelompok_bidang: item.kelompok_bidang,
          lokasi_kegiatan: item.lokasi_kegiatan,
          lama_kegiatan: item.lama_kegiatan,
          no_sk_penugasan: `SK/2024/PENG/${String(pengabdianId).padStart(3, '0')}`,
          tgl_sk_penugasan: tglSk,
          status: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    if (tables.includes('tb_pengabdian')) {
      await queryInterface.bulkInsert('tb_pengabdian', pengabdianData);
    }

    // ==================== 7. MATA KULIAH (TIDAK DIUBAH) ====================
    const matakuliahData = [
      { id: 1, kode_matakuliah: 'PBI106X', nama_matakuliah: 'Bahasa Indonesia', sks: 2 },
      { id: 2, kode_matakuliah: 'TIF401', nama_matakuliah: 'Etika Profesi', sks: 2 },
      { id: 3, kode_matakuliah: 'TIF105', nama_matakuliah: 'Kecakapan Interpersonal', sks: 2 },
      { id: 4, kode_matakuliah: 'TIF106', nama_matakuliah: 'Struktur Data dan Algoritma + Praktikum', sks: 3 },
      { id: 5, kode_matakuliah: 'TIF112', nama_matakuliah: 'Organisasi Komputer dan Sistem Operasi + Prak', sks: 2 }
    ];
    if (tables.includes('m_matakuliah')) {
      await queryInterface.bulkInsert('m_matakuliah', matakuliahData.map(m => ({ ...m, created_at: new Date(), updated_at: new Date() })));
    }

    // ==================== 8. PEMBELAJARAN (terhubung ke mata kuliah via id_matkul) ====================
    let pembelajaranId = 1;
    const pembelajaranData = [];
    for (const matkul of matakuliahData) {
      for (let pertemuan = 1; pertemuan <= 14; pertemuan++) {
        pembelajaranData.push({
          id: pembelajaranId++,
          id_matkul: matkul.id,
          pertemuan: pertemuan,
          kelas: 'A',
          semester: 'gasal',
          tahun_akademik: '2024/2025',
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    if (tables.includes('pembelajaran_dosen_ext')) {
      await queryInterface.bulkInsert('pembelajaran_dosen_ext', pembelajaranData);
    }

    // ==================== 9. ABSENSI (terhubung ke mahasiswa via id_mhs dan ke pembelajaran via id_pembelajaran) ====================
    let absensiId = 1;
    const absensiData = [];
    const statusAbsen = [1, 2, 3]; // 1=Hadir, 2=Izin, 3=Sakit

    for (const mhs of mahasiswaData) {
      for (const pembelajaran of pembelajaranData) {
        const status = statusAbsen[Math.floor(Math.random() * statusAbsen.length)];
        const uploadDok = status !== 1 ? `surat_${mhs.npm}_pertemuan_${pembelajaran.pertemuan}.pdf` : null;
        absensiData.push({
          id: absensiId++,
          id_mhs: mhs.id,
          npm: mhs.npm,
          id_pembelajaran: pembelajaran.id,
          status_absen: status,
          upload_dok: uploadDok,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    if (tables.includes('absensi_mhs')) {
      await queryInterface.bulkInsert('absensi_mhs', absensiData);
    }

    // ==================== 10. SKRIPSI (terhubung ke mahasiswa via mhs_id dan ke dosen via sk_pembimbing_1,2) ====================
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
      'Sistem Pakar Diagnosis Hama Tanaman'
    ];

    const pengajuanData = [];
    for (let i = 0; i < mahasiswaData.length; i++) {
      pengajuanData.push({
        id: i + 1,
        mhs_id: mahasiswaData[i].id,
        judul_skripsi: judulSkripsi[i],
        lokasi_kegiatan: 'Kampus',
        semester: '7',
        sk_pembimbing_1: dosenData[0].id,
        sk_pembimbing_2: dosenData[1].id,
        status: 'Approved',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    if (tables.includes('ta_pengajuan_sk')) {
      await queryInterface.bulkInsert('ta_pengajuan_sk', pengajuanData);
    }

    // Kolokium terhubung ke mahasiswa, pengajuan_sk, dan dosen
    const kolokiumData = [];
    for (let i = 0; i < mahasiswaData.length; i++) {
      kolokiumData.push({
        id: i + 1,
        mhs_id: mahasiswaData[i].id,
        pengajuan_sk_id: i + 1,
        status_kp: true,
        status_sks_ipk: true,
        jumlah_sks: 144,
        ipk: parseFloat((3.2 + (i * 0.05)).toFixed(2)),
        kolo_pembimbing_1: dosenData[0].id,
        kolo_pembimbing_2: dosenData[1].id,
        judul: judulSkripsi[i],
        evaluator_1: dosenData[2].id,
        evaluator_2: dosenData[3].id,
        kolo_status_pem_1: true,
        kolo_status_pem_2: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    if (tables.includes('ta_pendaftaran_kolokium')) {
      await queryInterface.bulkInsert('ta_pendaftaran_kolokium', kolokiumData);
    }

    // Sidang terhubung ke mahasiswa, pengajuan_sk, dan dosen
    const sidangData = [];
    for (let i = 0; i < mahasiswaData.length; i++) {
      const jadwal = new Date(2025, 6, 15 + i);
      sidangData.push({
        id: i + 1,
        mhs_id: mahasiswaData[i].id,
        pengajuan_sk_id: i + 1,
        status_kp: true,
        jumlah_sks: 144,
        status_min_ipk: true,
        ipk: parseFloat((3.2 + (i * 0.05)).toFixed(2)),
        sidang_pembimbing_1: dosenData[0].id,
        sidang_pembimbing_2: dosenData[1].id,
        judul: judulSkripsi[i],
        penguji_1: dosenData[2].id,
        penguji_2: dosenData[3].id,
        jadwal_pelaksanaan: jadwal,
        sidang_status_pem_1: true,
        sidang_status_pem_2: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    if (tables.includes('ta_pendaftaran_sidang')) {
      await queryInterface.bulkInsert('ta_pendaftaran_sidang', sidangData);
    }

    // Penilaian terhubung ke kolokium/sidang dan dosen
    const penilaianKolokiumData = [];
    const penilaianSidangData = [];
    for (let i = 0; i < mahasiswaData.length; i++) {
      penilaianKolokiumData.push({ kolo_id: i + 1, dosen_id: dosenData[2].id });
      penilaianKolokiumData.push({ kolo_id: i + 1, dosen_id: dosenData[3].id });
      penilaianSidangData.push({ sidang_id: i + 1, dosen_id: dosenData[2].id });
      penilaianSidangData.push({ sidang_id: i + 1, dosen_id: dosenData[3].id });
    }
    if (tables.includes('ta_penilaian_kolokium')) {
      await queryInterface.bulkInsert('ta_penilaian_kolokium', penilaianKolokiumData);
    }
    if (tables.includes('ta_penilaian_sidang')) {
      await queryInterface.bulkInsert('ta_penilaian_sidang', penilaianSidangData);
    }

    console.log('✅ Seed data berhasil diinsert dengan relasi yang terhubung!');
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const deleteOrder = [
      'ta_penilaian_sidang', 'ta_penilaian_kolokium', 'ta_pendaftaran_sidang', 'ta_pendaftaran_kolokium',
      'ta_pengajuan_sk', 'absensi_mhs', 'pembelajaran_dosen_ext', 'm_matakuliah', 'tb_pengabdian',
      'tb_pembicara', 'tb_anggota_prof', 'tb_penghargaan', 'tb_tes', 'tb_sertifikasi',
      'trx_parent_mhs', 'tb_parents', 'tb_data_pribadi', 'tb_users'
    ];

    for (const table of deleteOrder) {
      if (tables.includes(table)) await queryInterface.bulkDelete(table, {}, {});
    }

    console.log('✅ Data berhasil dihapus!');
  }
};