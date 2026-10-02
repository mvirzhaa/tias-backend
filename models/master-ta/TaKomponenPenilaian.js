const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const TaTahapan = require("./TaTahapan");

class TaKomponenPenilaian extends Model {}
TaKomponenPenilaian.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tahapan_id: {
      type: DataTypes.INTEGER,
    },
    nama_komponen: {
      type: DataTypes.STRING,
    },
    bobot: {
      type: DataTypes.DECIMAL(5, 2),
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
    tableName: "ta_komponen_penilaian",
    modelName: "TaKomponenPenilaian",
    sequelize: db,
  }
);

TaKomponenPenilaian.hasOne(TaTahapan, {
  foreignKey: "id",
  sourceKey: "tahapan_id",
  as: "tahapan",
});

module.exports = TaKomponenPenilaian;
