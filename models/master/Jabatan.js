const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class Jabatan extends Model {}
Jabatan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nama_jabatan: {
      type: DataTypes.STRING,
    },
    created_at: {
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
    tableName: "m_jabatan",
    modelName: "Jabatan",
    sequelize: db,
  }
);

module.exports = Jabatan;
