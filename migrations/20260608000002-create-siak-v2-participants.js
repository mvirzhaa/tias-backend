'use strict';

/**
 * SPEC v8 §2.2 — `siak_v2_participants` (FULL SYNC).
 *
 * Daftar peserta per kelas, disalin lokal lewat sync. Dipakai studentEnrolled (§3.2):
 * cek kombinasi (kelasKuliahId, npm). FK → siak_v2_classes.kelasKuliahId.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('siak_v2_participants', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      kelasKuliahId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'siak_v2_classes', key: 'kelasKuliahId' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      npm: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Lookup cepat untuk studentEnrolled.
    await queryInterface.addIndex('siak_v2_participants', ['kelasKuliahId', 'npm'], {
      name: 'idx_siak_v2_participants_kelas_npm',
    });

    console.log('Table siak_v2_participants created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('siak_v2_participants');
  },
};
