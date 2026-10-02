'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ta_pengajuan', 'legacy_pengajuan_sk_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('ta_pengajuan', 'lokasi_kegiatan', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('ta_pengajuan', 'semester', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ta_pengajuan', 'legacy_pengajuan_sk_id');
    await queryInterface.removeColumn('ta_pengajuan', 'lokasi_kegiatan');
    await queryInterface.removeColumn('ta_pengajuan', 'semester');
  },
};
