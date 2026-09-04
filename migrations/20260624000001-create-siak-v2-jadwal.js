'use strict';

/**
 * CREATE siak_v2_jadwal — jadwal kuliah per kelas dari /api/public jadwalKuliah[].
 * Ruangan & dosen di-flatten ke kolom skalar (TANPA payload mentah/PII).
 * PK = id UUID jadwal dari SIAK. FK kelasKuliahId → siak_v2_classes (CASCADE).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('siak_v2_jadwal', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      kelasKuliahId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'siak_v2_classes', key: 'kelasKuliahId' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      hari: {
        type: Sequelize.STRING(16),
        allowNull: true,
      },
      jam_mulai: {
        type: Sequelize.STRING(8),
        allowNull: true,
      },
      jam_selesai: {
        type: Sequelize.STRING(8),
        allowNull: true,
      },
      jenis_pertemuan: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      metode_pembelajaran: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      siak_dosen_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      siak_ruangan_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      ruangan_nama: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ruangan_kode: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      lantai: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      ruangan_kapasitas: {
        type: Sequelize.INTEGER,
        allowNull: true,
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

    await queryInterface.addIndex('siak_v2_jadwal', ['kelasKuliahId'], {
      name: 'idx_svj_kelas',
    });
    await queryInterface.addIndex('siak_v2_jadwal', ['siak_dosen_id'], {
      name: 'idx_svj_dosen',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('siak_v2_jadwal');
  },
};
