const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class RiwayatSurat extends Model {}

RiwayatSurat.init(
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
    status: {
      type: DataTypes.STRING,
    },
    catatan: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize: db,
    modelName: "RiwayatSurat",
    tableName: "tb_riwayat_surat",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

module.exports = RiwayatSurat;
