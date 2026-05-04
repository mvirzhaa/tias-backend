const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const DataPribadi = require("../DataPribadi");

class BimbinganAkademik extends Model {}
BimbinganAkademik.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    dosen_id: {
      type: DataTypes.UUID,
    },
    tahun_angkatan: {
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

    tableName: "tb_bk",
    modelName: "BimbinganAkademik",
    sequelize: db,
  }
);

BimbinganAkademik.hasOne(DataPribadi, {
  foreignKey: "user_id",
  sourceKey: "dosen_id",
  as: "personal_data",
});

module.exports = BimbinganAkademik;
