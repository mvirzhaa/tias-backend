const { DataTypes, Model } = require("sequelize");
const db = require("../config");
const DataPribadi = require("./DataPribadi");

class ValidationDocument extends Model {}
ValidationDocument.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    dosen_id: {
      type: DataTypes.UUID,
    },
    mhs_id: {
      type: DataTypes.UUID,
    },
    nama_kegiatan: {
      type: DataTypes.STRING,
    },
    link_kegiatan: {
      type: DataTypes.STRING,
    },
    link_validasi: {
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
    tableName: "validasi_dokumen",
    modelName: "ValidationDocument",
    sequelize: db,
  }
);

ValidationDocument.hasOne(DataPribadi, {
  foreignKey: "user_id",
  sourceKey: "dosen_id",
  as: "dosen",
});

ValidationDocument.hasOne(DataPribadi, {
  foreignKey: "user_id",
  sourceKey: "mhs_id",
  as: "mahasiswa",
});

module.exports = ValidationDocument;
