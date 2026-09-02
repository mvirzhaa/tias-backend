'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Mengubah tipe data user_id dari UUID ke TEXT di tabel token, supaya bisa
    // menampung ID dari tabel non-UUID juga (mis. tb_parents.id yang INTEGER -
    // lihat controllers/parents/parentsController.js). Kolom ini jadi
    // polimorfik/lintas-tabel, jadi FK ke satu tabel saja (mis. "fk_user" ke
    // tb_users, ditemukan di production tapi tidak ada di staging) sudah tidak
    // valid dan harus di-drop dulu sebelum ALTER TYPE bisa jalan.
    await queryInterface.sequelize.query(
      'ALTER TABLE token DROP CONSTRAINT IF EXISTS fk_user'
    );
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
