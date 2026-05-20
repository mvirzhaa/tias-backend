'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dummyUserId = '20260515-0000-0000-0000-000000000001';

    await queryInterface.dropTable('tb_tes', { cascade: true }).catch(() => { });
    await queryInterface.dropTable('tb_sertifikasi', { cascade: true }).catch(() => { });

    // tb_sertifikasi
    await queryInterface.createTable('tb_sertifikasi', {
      sertifikat_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.UUID },
      jenis_serti: { type: Sequelize.STRING },
      kategori_id: { type: Sequelize.INTEGER },
      nama_serti: { type: Sequelize.STRING },
      bidang_studi: { type: Sequelize.STRING },
      tgl_serti: { type: Sequelize.DATE },
      penyelenggara: { type: Sequelize.STRING },
      file: { type: Sequelize.STRING },
      status: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.bulkInsert('tb_sertifikasi', [
      { user_id: dummyUserId, jenis_serti: 'Kompetensi', kategori_id: 1, nama_serti: 'Oracle Certified Professional', bidang_studi: 'IT', tgl_serti: '2025-01-10', penyelenggara: 'Oracle', status: 1, created_at: new Date(), updated_at: new Date() },
      { user_id: dummyUserId, jenis_serti: 'Pelatihan', kategori_id: 3, nama_serti: 'Fullstack Web Development', bidang_studi: 'IT', tgl_serti: '2024-12-20', penyelenggara: 'Dicoding', status: 1, created_at: new Date(), updated_at: new Date() }
    ]);

    // tb_tes
    await queryInterface.createTable('tb_tes', {
      tes_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.UUID },
      nama_tes: { type: Sequelize.STRING },
      jenis_tes: { type: Sequelize.STRING },
      penyelenggara: { type: Sequelize.STRING },
      tgl_tes: { type: Sequelize.DATE },
      kategori_id: { type: Sequelize.INTEGER },
      skor_tes: { type: Sequelize.STRING },
      file: { type: Sequelize.STRING },
      status: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.bulkInsert('tb_tes', [
      { user_id: dummyUserId, nama_tes: 'TOEFL ITP', jenis_tes: 'English Proficiency', penyelenggara: 'ETS', tgl_tes: '2025-02-15', kategori_id: 1, skor_tes: '550', status: 1, created_at: new Date(), updated_at: new Date() },
      { user_id: dummyUserId, nama_tes: 'JLPT N4', jenis_tes: 'Japanese Proficiency', penyelenggara: 'Japan Foundation', tgl_tes: '2024-11-05', kategori_id: 2, skor_tes: 'Pass', status: 1, created_at: new Date(), updated_at: new Date() }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tb_tes');
    await queryInterface.dropTable('tb_sertifikasi');
  }
};
