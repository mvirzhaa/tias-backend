'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Migration 20260504021619 already creates cbt_user_mappings with the
    // correct UUID FK. This duplicate historical migration is kept as a no-op
    // so fresh databases can migrate without trying to recreate the table.
  },

  async down(queryInterface) {
    // No-op. The table belongs to 20260504021619-create-cbt-user-mappings.js.
  },
};
