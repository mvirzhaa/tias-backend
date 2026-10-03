const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const TaTahapan = require("./TaTahapan");
const TaPengajuan = require("../TugasAkhir/TaPengajuan");
const User = require("../User");

class TaPelaksanaan extends Model {}
TaPelaksanaan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    pengajuan_id: {
      type: DataTypes.INTEGER,
    },
    mhs_id: {
      type: DataTypes.UUID,
    },
    tahapan_id: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "berjalan",
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
    deleted_at: {
      type: DataTypes.DATE,
    },
  },
  {
    defaultScope: {
      where: {
        deleted_at: null,
      },
    },
    timestamps: false,
    tableName: "ta_pelaksanaan",
    modelName: "TaPelaksanaan",
    sequelize: db,
  }
);

TaPelaksanaan.hasOne(TaTahapan, {
  foreignKey: "id",
  sourceKey: "tahapan_id",
  as: "tahapan",
});

TaPelaksanaan.hasOne(TaPengajuan, {
  foreignKey: "id",
  sourceKey: "pengajuan_id",
  as: "pengajuan",
});

TaPelaksanaan.hasOne(User, {
  foreignKey: "user_id",
  sourceKey: "mhs_id",
  as: "mahasiswa",
});

module.exports = TaPelaksanaan;
