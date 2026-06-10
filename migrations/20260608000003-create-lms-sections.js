'use strict';

/**
 * Modul Pembelajaran (LMS) — `lms_sections` (SPEC v8 §2.3, FULL SYNC).
 *
 * Kunci kelas = `kelasKuliahId` (UUID), kini FK ke tabel lokal `siak_v2_classes`
 * (sumber kebenaran hasil sync). Semester TIDAK disimpan di sini lagi (redundan —
 * tersedia di siak_v2_classes via kelasKuliahId).
 *
 * onDelete RESTRICT: kelas yang punya materi LMS tidak boleh terhapus → karena itu
 * sync kelas memakai UPSERT (bukan delete+reinsert), lihat syncController.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lms_sections', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      kelasKuliahId: {
        // Kunci tunggal SIAK v2; FK ke salinan lokal siak_v2_classes.
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'siak_v2_classes', key: 'kelasKuliahId' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      pertemuan: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      id_lecture: {
        // = tb_users.user_id (UUID) dosen pembuat. KEPEMILIKAN konten LMS, dari JWT.
        type: Sequelize.UUID,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      available_from: {
        type: Sequelize.DATE,
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
      // Soft-delete mengikuti konvensi repo.
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex(
      'lms_sections',
      ['kelasKuliahId', 'pertemuan'],
      { name: 'idx_lms_sections_kelaskuliah_pertemuan' }
    );

    console.log('Table lms_sections created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lms_sections');
  },
};
