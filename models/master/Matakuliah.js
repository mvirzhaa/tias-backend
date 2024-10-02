const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const Kurikulum = require("./Kurikulum");

class Matakuliah extends Model {}
Matakuliah.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    kode_matakuliah: {
      type: DataTypes.STRING,
    },
    nama_matakuliah: {
      type: DataTypes.STRING,
    },
    kurikulum: {
      type: DataTypes.INTEGER,
    },
    sks: {
      type: DataTypes.INTEGER,
    },
    materi: {
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
    tableName: "m_matakuliah",
    modelName: "Matakuliah",
    sequelize: db,
  }
);

Matakuliah.belongsTo(Kurikulum, {
  foreignKey: "kurikulum", // foreignKey haruslah 'kurikulum' di Matakuliah
  targetKey: "id", // targetKey merujuk ke 'id' di Kurikulum
  as: "data_kurikulum", // alias untuk mempermudah akses
});

module.exports = Matakuliah;
