const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class KategoriKegiatan extends Model {}
KategoriKegiatan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nama_kegiatan: {
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

    tableName: "kategori_kegiatan",
    modelName: "KategoriKegiatan",
    sequelize: db,
  }
);

module.exports = KategoriKegiatan;
