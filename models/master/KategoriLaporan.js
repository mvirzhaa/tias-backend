const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class KategoriLaporan extends Model {}
KategoriLaporan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nama_kategori: {
      type: DataTypes.STRING,
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

    tableName: "kategori_laporan",
    modelName: "KategoriLaporan",
    sequelize: db,
  }
);

module.exports = KategoriLaporan;
