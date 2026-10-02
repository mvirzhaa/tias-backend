const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const TaTahapan = require("./TaTahapan");

class TaKelengkapan extends Model {}
TaKelengkapan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tahapan_id: {
      type: DataTypes.INTEGER,
    },
    nama_kelengkapan: {
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
    tableName: "ta_kelengkapan",
    modelName: "TaKelengkapan",
    sequelize: db,
  }
);

TaKelengkapan.hasOne(TaTahapan, {
  foreignKey: "id",
  sourceKey: "tahapan_id",
  as: "tahapan",
});

module.exports = TaKelengkapan;
