'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dummyMhsId = '20260515-0000-0000-0000-000000000001';
    const dummyNpm = '20260515001';
    
    // Drop existing to recreate with full columns
    await queryInterface.dropTable('absensi_mhs', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('pembelajaran_dosen_ext', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('m_matakuliah', { cascade: true }).catch(() => {});

    // 1. m_matakuliah
    await queryInterface.createTable('m_matakuliah', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kode_matakuliah: { type: Sequelize.STRING },
      nama_matakuliah: { type: Sequelize.STRING },
      sks: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE }
    });

    // 2. pembelajaran_dosen_ext (Sesuai dengan filter di absensiController)
    await queryInterface.createTable('pembelajaran_dosen_ext', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_matkul: { type: Sequelize.INTEGER },
      pertemuan: { type: Sequelize.INTEGER },
      kelas: { type: Sequelize.STRING },           // Tambahan
      semester: { type: Sequelize.STRING },        // Tambahan (gasal/genap)
      tahun_akademik: { type: Sequelize.STRING },  // Tambahan
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE }
    });

    // 3. absensi_mhs
    await queryInterface.createTable('absensi_mhs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      id_mhs: { type: Sequelize.UUID },
      npm: { type: Sequelize.STRING },             // Tambahan agar identik dengan controller storeAbsensi
      id_pembelajaran: { type: Sequelize.INTEGER },
      status_absen: { type: Sequelize.STRING },
      upload_dok: { type: Sequelize.STRING },      // Untuk lampiran surat sakit/izin
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE }
    });

    // --- SEED DATA ---
    await queryInterface.bulkInsert('m_matakuliah', [
      { id: 999, kode_matakuliah: 'IF123', nama_matakuliah: 'Pemrograman Web Dasar', sks: 3, created_at: new Date(), updated_at: new Date() }
    ]);

    await queryInterface.bulkInsert('pembelajaran_dosen_ext', [
      { id: 901, id_matkul: 999, pertemuan: 1, kelas: 'A', semester: 'gasal', tahun_akademik: '2024/2025', created_at: new Date(), updated_at: new Date() },
      { id: 902, id_matkul: 999, pertemuan: 2, kelas: 'A', semester: 'gasal', tahun_akademik: '2024/2025', created_at: new Date(), updated_at: new Date() },
      { id: 903, id_matkul: 999, pertemuan: 3, kelas: 'A', semester: 'gasal', tahun_akademik: '2024/2025', created_at: new Date(), updated_at: new Date() }
    ]);

    await queryInterface.bulkInsert('absensi_mhs', [
      { id_mhs: dummyMhsId, npm: dummyNpm, id_pembelajaran: 901, status_absen: '1', created_at: new Date(), updated_at: new Date() },
      { id_mhs: dummyMhsId, npm: dummyNpm, id_pembelajaran: 902, status_absen: '1', created_at: new Date(), updated_at: new Date() },
      { id_mhs: dummyMhsId, npm: dummyNpm, id_pembelajaran: 903, status_absen: '2', upload_dok: 'surat_izin.pdf', created_at: new Date(), updated_at: new Date() }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('absensi_mhs');
    await queryInterface.dropTable('pembelajaran_dosen_ext');
    await queryInterface.dropTable('m_matakuliah');
  }
};
