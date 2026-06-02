"use strict";
const { faker } = require("@faker-js/faker");
const bcrypt = require("bcryptjs");

module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync("password123", salt);
    
    // UUID for user
    const userId = faker.string.uuid();

    // 1. Insert ke tb_users
    await queryInterface.bulkInsert("tb_users", [
      {
        user_id: userId,
        role: "Mahasiswa",
        email: "mahasiswa@gmail.com",
        npm: "221106043033",
        password: hashedPassword,
        isverified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // 2. Insert ke tb_data_pribadi
    await queryInterface.bulkInsert("tb_data_pribadi", [
      {
        dp_id: faker.string.uuid(),
        user_id: userId,
        nama_lengkap: "Mahasiswa Demo",
        jenkel: "Laki-laki",
        tanggal_lahir: "2000-01-01",
        tempat_lahir: "Jakarta",
        ibu_kandung: "Ibu Demo",
        agama: "Islam",
        email: "mahasiswa@gmail.com",
        alamat: "Jl. Demo No. 1",
        kota_kabupaten: "Jakarta",
        no_hp: "081234567890",
        nik: "3271123456789012",
        kode_mhs: "221106043033",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("tb_data_pribadi", { email: "mahasiswa@gmail.com" });
    await queryInterface.bulkDelete("tb_users", { email: "mahasiswa@gmail.com" });
  },
};
