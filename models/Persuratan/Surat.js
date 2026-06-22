const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

// Daftar status yang valid — validasi di level aplikasi, bukan ENUM DB
// Sehingga mudah tambah status baru tanpa perlu alter table
const VALID_STATUS = ["Sent", "Read", "Replied", "Disposisi", "Disetujui", "Ditolak", "Selesai", "Archived"];

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
    // parent_id: menunjuk ke surat sebelumnya dalam satu rantai disposisi
    // NULL = surat asal dari mahasiswa (tidak punya parent)
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // root_surat_id: selalu menunjuk ke surat pertama/asal dari mahasiswa
    // NULL = surat ini ADALAH surat asal
    // UUID = surat ini adalah hasil disposisi
    root_surat_id: {
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
      type: DataTypes.STRING(50),
      defaultValue: "Sent",
      validate: {
        isIn: {
          args: [VALID_STATUS],
          msg: `Status tidak valid. Harus salah satu dari: ${VALID_STATUS.join(", ")}`,
        },
      },
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
module.exports.VALID_STATUS = VALID_STATUS;
