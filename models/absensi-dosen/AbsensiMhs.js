const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const DataPribadi = require("../DataPribadi");
const User = require("../User");

class AbsensiMhs extends Model {}
AbsensiMhs.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_pembelajaran: {
      type: DataTypes.INTEGER,
    },
    id_mhs: {
      type: DataTypes.UUID,
    },
    upload_dok: {
      type: DataTypes.STRING,
    },
    nilai: {
      type: DataTypes.STRING,
    },
    status_absen: {
      type: DataTypes.INTEGER,
    },
    coordinate_absen: {
      type: DataTypes.TEXT,
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
    tableName: "absensi_mhs",
    modelName: "AbsensiMhs",
    sequelize: db,
  }
);

AbsensiMhs.hasOne(User, {
  foreignKey: "user_id",
  sourceKey: "id_mhs",
  as: "user",
});

module.exports = AbsensiMhs;
