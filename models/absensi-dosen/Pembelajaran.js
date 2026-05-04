const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const Matakuliah = require("../master/Matakuliah");

class Pembelajaran extends Model {}
Pembelajaran.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_dosen: {
      type: DataTypes.UUID,
    },
    nik_dosen: {
      type: DataTypes.STRING,
    },
    id_matkul: {
      type: DataTypes.INTEGER,
    },
    pertemuan: {
      type: DataTypes.INTEGER,
    },
    kelas: {
      type: DataTypes.INTEGER,
    },
    rps_dasar: {
      type: DataTypes.TEXT,
    },
    rps_pelaksanaan: {
      type: DataTypes.TEXT,
    },
    npm_komti: {
      type: DataTypes.INTEGER,
    },
    learning_done: {
      type: DataTypes.DATE,
    },
    token: {
      type: DataTypes.INTEGER,
    },
    status_kelas: {
      type: DataTypes.INTEGER,
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
    tableName: "pembelajaran_dosen_ext",
    modelName: "Pembelajaran",
    sequelize: db,
  }
);

Pembelajaran.hasOne(Matakuliah, {
  foreignKey: "id",
  sourceKey: "id_matkul",
  as: "matakuliah",
});

module.exports = Pembelajaran;
