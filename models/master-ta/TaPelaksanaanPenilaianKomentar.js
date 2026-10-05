const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class TaPelaksanaanPenilaianKomentar extends Model {}
TaPelaksanaanPenilaianKomentar.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    pelaksanaan_id: {
      type: DataTypes.INTEGER,
    },
    tahapan_id: {
      type: DataTypes.INTEGER,
    },
    dosen_id: {
      type: DataTypes.UUID,
    },
    komentar_singkat: {
      type: DataTypes.TEXT,
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
    tableName: "ta_pelaksanaan_penilaian_komentar",
    modelName: "TaPelaksanaanPenilaianKomentar",
    sequelize: db,
  }
);

module.exports = TaPelaksanaanPenilaianKomentar;
