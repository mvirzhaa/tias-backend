const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class DokumenLampiran extends Model {}

DokumenLampiran.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    surat_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    nama_file: {
      type: DataTypes.STRING,
    },
    file_url: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize: db,
    modelName: "DokumenLampiran",
    tableName: "tb_dokumen_lampiran",
    timestamps: false,
  },
);

module.exports = DokumenLampiran;
