"use strict";

/**
 * Migration: Add missing columns to tb_data_pribadi
 * Kolom instansi_ext dan foto_narsum ada di model tapi tidak ada di DB lokal
 * karena migration awal sudah dijalankan sebelum kolom ini ditambahkan.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable("tb_data_pribadi");

    if (!tableDesc.instansi_ext) {
      await queryInterface.addColumn("tb_data_pribadi", "instansi_ext", {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log("  ✅ Kolom instansi_ext berhasil ditambahkan");
    } else {
      console.log("  ⏭️  instansi_ext sudah ada, skip");
    }

    if (!tableDesc.foto_narsum) {
      await queryInterface.addColumn("tb_data_pribadi", "foto_narsum", {
        type: Sequelize.STRING,
        allowNull: true,
      });
      console.log("  ✅ Kolom foto_narsum berhasil ditambahkan");
    } else {
      console.log("  ⏭️  foto_narsum sudah ada, skip");
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable("tb_data_pribadi");

    if (tableDesc.instansi_ext) {
      await queryInterface.removeColumn("tb_data_pribadi", "instansi_ext");
    }
    if (tableDesc.foto_narsum) {
      await queryInterface.removeColumn("tb_data_pribadi", "foto_narsum");
    }
  },
};
