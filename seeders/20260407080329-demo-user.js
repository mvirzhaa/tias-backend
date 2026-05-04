"use strict";
const { faker } = require("@faker-js/faker");

module.exports = {
  async up(queryInterface, Sequelize) {
    const users = [];

    // Looping untuk membuat 10 data user
    for (let i = 0; i < 10; i++) {
      users.push({
        user_id: faker.string.uuid(), // Generate UUID otomatis
        role: "student",
        email: faker.internet.email(), // Email random (misal: ridwan@gmail.com)
        npm: faker.string.numeric(10), // NPM 10 digit random
        isverified: true,
        password: "password123", // Kamu bisa pakai bcrypt di sini nanti
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Masukkan semua data sekaligus ke tabel tb_users
    return queryInterface.bulkInsert("tb_users", users, {});
  },

  async down(queryInterface, Sequelize) {
    // Menghapus semua data di tb_users jika di-undo
    return queryInterface.bulkDelete("tb_users", null, {});
  },
};
