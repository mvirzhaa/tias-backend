'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ta_pelaksanaan_tahapan_meta', 'status_kp', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('ta_pelaksanaan_tahapan_meta', 'status_sks_ipk', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('ta_pelaksanaan_tahapan_meta', 'jumlah_sks', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('ta_pelaksanaan_tahapan_meta', 'ipk', {
      type: Sequelize.DECIMAL(4, 2),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ta_pelaksanaan_tahapan_meta', 'status_kp');
    await queryInterface.removeColumn('ta_pelaksanaan_tahapan_meta', 'status_sks_ipk');
    await queryInterface.removeColumn('ta_pelaksanaan_tahapan_meta', 'jumlah_sks');
    await queryInterface.removeColumn('ta_pelaksanaan_tahapan_meta', 'ipk');
  },
};
