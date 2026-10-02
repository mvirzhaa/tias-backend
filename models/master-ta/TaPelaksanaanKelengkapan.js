const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const TaKelengkapan = require("./TaKelengkapan");

class TaPelaksanaanKelengkapan extends Model {}
TaPelaksanaanKelengkapan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    pelaksanaan_id: {
      type: DataTypes.INTEGER,
    },
    kelengkapan_id: {
      type: DataTypes.INTEGER,
    },
    isian: {
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
    tableName: "ta_pelaksanaan_kelengkapan",
    modelName: "TaPelaksanaanKelengkapan",
    sequelize: db,
  }
);

TaPelaksanaanKelengkapan.hasOne(TaKelengkapan, {
  foreignKey: "id",
  sourceKey: "kelengkapan_id",
  as: "kelengkapan",
});

module.exports = TaPelaksanaanKelengkapan;
