'use strict';

/**
 * lms_sections.duplicated_from_section_id — jejak provenance saat topik dibuat lewat
 * fitur "Duplikat dari Kelas Lain" (permintaan Pak Fitrah: materi antar kelas paralel
 * mata kuliah yang sama bisa ditarik tanpa menyalin ulang dari nol, lihat
 * lib/lms/contentDuplication.js). NULL = topik dibuat manual seperti biasa.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lms_sections', 'duplicated_from_section_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'lms_sections', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lms_sections', 'duplicated_from_section_id');
  },
};
