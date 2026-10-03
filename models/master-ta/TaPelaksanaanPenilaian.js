const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const TaKomponenPenilaian = require("./TaKomponenPenilaian");
const User = require("../User");

class TaPelaksanaanPenilaian extends Model {}
TaPelaksanaanPenilaian.init(
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
    komponen_id: {
      type: DataTypes.INTEGER,
    },
    dosen_id: {
      type: DataTypes.UUID,
    },
    nilai: {
      type: DataTypes.DECIMAL(5, 2),
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
    tableName: "ta_pelaksanaan_penilaian",
    modelName: "TaPelaksanaanPenilaian",
    sequelize: db,
  }
);

TaPelaksanaanPenilaian.hasOne(TaKomponenPenilaian, {
  foreignKey: "id",
  sourceKey: "komponen_id",
  as: "komponen",
});

TaPelaksanaanPenilaian.hasOne(User, {
  foreignKey: "user_id",
  sourceKey: "dosen_id",
  as: "dosen",
});

module.exports = TaPelaksanaanPenilaian;
