const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class Surat extends Model {}

Surat.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    penerima_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    jenis_surat: {
      type: DataTypes.STRING,
    },
    form_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    nomor_surat: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("Sent", "Read", "Replied", "Selesai", "Archived"),
      defaultValue: "Sent",
    },
    catatan_pejabat: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    modelName: "Surat",
    tableName: "tb_surat",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  },
);

module.exports = Surat;
