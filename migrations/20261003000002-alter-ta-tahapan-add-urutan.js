'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ta_tahapan', 'urutan', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Backfill: urutan awal = urutan id ASC yang sudah berlaku selama ini
    // (satu-satunya urutan yang ada sebelum kolom ini), per grup (prodi,skema).
    await queryInterface.sequelize.query(`
      WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY prodi_id, skema_id ORDER BY id ASC
        ) AS rn
        FROM ta_tahapan
      )
      UPDATE ta_tahapan
      SET urutan = numbered.rn
      FROM numbered
      WHERE ta_tahapan.id = numbered.id
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ta_tahapan', 'urutan');
  },
};
