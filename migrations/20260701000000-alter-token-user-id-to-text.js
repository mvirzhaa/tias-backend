'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Mengubah tipe data user_id dari UUID ke TEXT di tabel token.
    // Menggunakan raw query agar aman dengan casting USING user_id::text di PostgreSQL
    await queryInterface.sequelize.query(
      'ALTER TABLE token ALTER COLUMN user_id TYPE TEXT USING user_id::text'
    );
  },

  async down(queryInterface, Sequelize) {
    // Mengembalikan ke UUID jika diperlukan (pastikan data non-UUID sudah dihapus/disesuaikan jika roll-back)
    await queryInterface.sequelize.query(
      'ALTER TABLE token ALTER COLUMN user_id TYPE UUID USING user_id::uuid'
    );
  }
};
