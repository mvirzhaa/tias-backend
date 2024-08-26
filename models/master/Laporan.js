const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const KategoriLaporan = require("./KategoriLaporan");
const User = require("../User");

class Laporan extends Model {}
Laporan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    kategori_id: {
      type: DataTypes.INTEGER,
    },
    user_id: {
      type: DataTypes.UUID,
    },
    code: {
      type: DataTypes.STRING,
    },
    nama: {
      type: DataTypes.STRING,
    },
    foto: {
      type: DataTypes.STRING,
    },
    deskripsi: {
      type: DataTypes.TEXT,
    },
    lat: {
      type: DataTypes.STRING,
    },
    long: {
      type: DataTypes.STRING,
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
    status: {
      type: DataTypes.INTEGER,
    },
  },
  {
    defaultScope: {
      where: {
        deleted_at: null,
      },
    },
    scopes: {
      deleted: {
        where: {
          deleted_at: null,
        },
      },
    },
    timestamps: false,
    tableName: "laporan",
    modelName: "Laporan",
    sequelize: db,
  }
);

Laporan.belongsTo(KategoriLaporan, {
  foreignKey: "kategori_id",
  as: "kategori_laporan",
});

Laporan.hasOne(User, {
  foreignKey: "user_id",
  sourceKey: "user_id",
  as: "user",
});

module.exports = Laporan;
