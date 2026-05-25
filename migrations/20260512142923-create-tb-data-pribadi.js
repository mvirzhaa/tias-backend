'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tb_data_pribadi', {
      dp_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      nama_lengkap: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      jenkel: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tanggal_lahir: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      tempat_lahir: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ibu_kandung: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nik: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      agama: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      warga_negara: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      alamat: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rt: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      rw: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      desa_kelurahan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      kota_kabupaten: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      provinsi: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      kode_pos: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      no_hp: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status_kawin: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_pasangan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nip_pasangan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pekerjaan_pasangan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tanggal_pns_pasangan: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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
      point_kompetensi: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      point_pengabdian: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      point_pendidikan: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      point_penelitian: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      point_penunjang: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      point_rekomendasi: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      total_point: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      kode_mhs: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      singkat_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nip: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rank: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ipk: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ttd: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      wali: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      alamat_wali: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      telp_wali: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pekerjaan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      alamat_pekerjaan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      instansi_ext: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      foto_narsum: {
        type: Sequelize.STRING,
        allowNull: true,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tb_data_pribadi');
  },
};
