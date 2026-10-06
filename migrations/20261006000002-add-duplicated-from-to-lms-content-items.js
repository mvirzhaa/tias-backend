'use strict';

/**
 * lms_content_items.duplicated_from_item_id — jejak provenance saat item dibuat lewat
 * fitur duplikasi topik antar kelas (lihat lib/lms/contentDuplication.js). NULL = item
 * dibuat manual. Item bertipe 'attendance' TIDAK PERNAH punya nilai di kolom ini karena
 * tipe itu selalu dikecualikan dari duplikasi.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lms_content_items', 'duplicated_from_item_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'lms_content_items', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('lms_content_items', 'duplicated_from_item_id');
  },
};
