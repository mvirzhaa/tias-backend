'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Tambah kolom nik dengan default sementara agar baris lama tidak error NOT NULL
    await queryInterface.addColumn('tb_parents', 'nik', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'role',
    });

    // Isi baris lama (seeder/existing) dengan placeholder agar bisa di-NOT NULL-kan
    await queryInterface.sequelize.query(
      `UPDATE tb_parents SET nik = CONCAT('NIK-BELUM-DIISI-', id) WHERE nik IS NULL`
    );

    // Jadikan NOT NULL setelah semua baris terisi
    await queryInterface.changeColumn('tb_parents', 'nik', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tb_parents', 'nik');
  },
};
