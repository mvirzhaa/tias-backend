'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pembelajaran_dosen_ext', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      id_dosen: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      nik_dosen: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      id_matkul: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      pertemuan: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      kelas: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      rps_dasar: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rps_pelaksanaan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      npm_komti: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      learning_done: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      token: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status_kelas: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    console.log('Table pembelajaran_dosen_ext created successfully.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pembelajaran_dosen_ext');
  },
};
