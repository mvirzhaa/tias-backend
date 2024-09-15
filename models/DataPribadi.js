const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../config");

class DataPribadi extends Model {}
DataPribadi.init(
  {
    dp_id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUIDV4,
      allowNull: false,
    },
    nama_lengkap: {
      type: DataTypes.STRING,
    },
    jenkel: {
      type: DataTypes.STRING,
    },
    tanggal_lahir: {
      type: DataTypes.DATE,
    },
    tempat_lahir: {
      type: DataTypes.STRING,
    },
    ibu_kandung: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
    },
    nik: {
      type: DataTypes.STRING,
    },
    agama: {
      type: DataTypes.STRING,
    },
    warga_negara: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    alamat: {
      type: DataTypes.STRING,
    },
    rt: {
      type: DataTypes.INTEGER,
    },
    rw: {
      type: DataTypes.INTEGER,
    },
    desa_kelurahan: {
      type: DataTypes.STRING,
    },
    kota_kabupaten: {
      type: DataTypes.STRING,
    },
    provinsi: {
      type: DataTypes.STRING,
    },
    kode_pos: {
      type: DataTypes.STRING,
    },
    no_hp: {
      type: DataTypes.STRING,
    },
    status_kawin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nama_pasangan: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nip_pasangan: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pekerjaan_pasangan: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tanggal_pns_pasangan: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    point_kompetensi: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    point_pengabdian: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    point_pendidikan: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    point_penelitian: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    point_penunjang: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    point_rekomendasi: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_point: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    kode_mhs: {
      type: DataTypes.STRING,
    },
    singkat_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rank: {
      type: DataTypes.STRING,
    },
    ipk: {
      type: DataTypes.STRING,
    },
    ttd: {
      type: DataTypes.STRING,
    },
    wali: {
      type: DataTypes.STRING,
    },
    alamat_wali: {
      type: DataTypes.STRING,
    },
    telp_wali: {
      type: DataTypes.STRING,
    },
    pekerjaan: {
      type: DataTypes.STRING,
    },
    alamat_pekerjaan: {
      type: DataTypes.STRING,
    },
    instansi_ext: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    foto_narsum: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: false,
    tableName: "tb_data_pribadi",
    modelName: "DataPribadi",
    sequelize: db,
  }
);

module.exports = DataPribadi;
