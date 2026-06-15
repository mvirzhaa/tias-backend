'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dummyUserId = '20260515-0000-0000-0000-000000000001';

    await queryInterface.dropTable('tb_anggota_prof', { cascade: true }).catch(() => { });
    await queryInterface.dropTable('tb_penghargaan', { cascade: true }).catch(() => { });

    // tb_penghargaan
    await queryInterface.createTable('tb_penghargaan', {
      penghargaan_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.UUID },
      kategori_id: { type: Sequelize.INTEGER },
      tingkat_peng: { type: Sequelize.STRING },
      jenis_peng: { type: Sequelize.STRING },
      nama_peng: { type: Sequelize.STRING },
      tahun_peng: { type: Sequelize.STRING },
      instansi_pemberi: { type: Sequelize.STRING },
      file: { type: Sequelize.STRING },
      status: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.bulkInsert('tb_penghargaan', [
      { user_id: dummyUserId, kategori_id: 1, tingkat_peng: 'Nasional', jenis_peng: 'Prestasi Akademik', nama_peng: 'Mahasiswa Berprestasi', tahun_peng: '2024', instansi_pemberi: 'Kemendikbud', status: 1, created_at: new Date(), updated_at: new Date() },
      { user_id: dummyUserId, kategori_id: 2, tingkat_peng: 'Internasional', jenis_peng: 'Lomba Coding', nama_peng: 'Winner Hackathon 2024', tahun_peng: '2024', instansi_pemberi: 'Google Cloud', status: 1, created_at: new Date(), updated_at: new Date() }
    ]);

    // tb_anggota_prof
    await queryInterface.createTable('tb_anggota_prof', {
      prof_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.UUID },
      nama_organisasi: { type: Sequelize.STRING },
      peran: { type: Sequelize.STRING },
      mulai_tahun: { type: Sequelize.STRING },
      mulai_bulan: { type: Sequelize.STRING },
      selesai_tahun: { type: Sequelize.STRING },
      selesai_bulan: { type: Sequelize.STRING },
      file: { type: Sequelize.STRING },
      kategori_id: { type: Sequelize.INTEGER },
      status: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
      deleted_at: { type: Sequelize.DATE, allowNull: true }
    });

    await queryInterface.bulkInsert('tb_anggota_prof', [
      { user_id: dummyUserId, nama_organisasi: 'Himpunan Mahasiswa', peran: 'Ketua', mulai_tahun: '2023', mulai_bulan: '01', selesai_tahun: '2024', selesai_bulan: '01', kategori_id: 1, status: 1, created_at: new Date(), updated_at: new Date() },
      { user_id: dummyUserId, nama_organisasi: 'Indonesian IT Society', peran: 'Member', mulai_tahun: '2024', mulai_bulan: '05', selesai_tahun: '2025', selesai_bulan: '05', kategori_id: 1, status: 1, created_at: new Date(), updated_at: new Date() }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tb_anggota_prof');
    await queryInterface.dropTable('tb_penghargaan');
  }
};
