const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

/**
 * siak_v2_mata_kuliah — master mata kuliah dari SIAK v2 (pull-direct). Gantiin tabel
 * lokal lama `m_matakuliah` yang sudah orphan sejak sync v1 dimatikan (lihat migrasi
 * pembuatan tabel ini utk detail).
 */
class SiakV2MataKuliah extends Model {}
SiakV2MataKuliah.init(
  {
    siakMataKuliahId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    siakProgramStudiId: {
      type: DataTypes.UUID,
    },
    kode_matakuliah: {
      type: DataTypes.STRING,
    },
    nama_matakuliah: {
      type: DataTypes.STRING,
    },
    sks: {
      type: DataTypes.INTEGER,
    },
    kurikulum: {
      type: DataTypes.STRING,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: false,
    tableName: "siak_v2_mata_kuliah",
    modelName: "SiakV2MataKuliah",
    sequelize: db,
  }
);

module.exports = SiakV2MataKuliah;
