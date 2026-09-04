const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");

/**
 * lms_sections — SPEC v8 §2.3 (FULL SYNC). Kunci kelas = `kelasKuliahId` (UUID),
 * FK ke tabel lokal `siak_v2_classes`. Semester tidak disimpan di sini (ada di kelas).
 */
class LmsSection extends Model {}
LmsSection.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    kelasKuliahId: {
      // Kunci tunggal SIAK v2 (UUID). Dipakai otorisasi (lecturerOwnsClass/studentEnrolled).
      type: DataTypes.UUID,
      allowNull: false,
    },
    pertemuan: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_lecture: {
      // = tb_users.user_id dosen pembuat (kepemilikan konten). Diisi server-side dari JWT.
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    available_from: {
      type: DataTypes.DATE,
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
    timestamps: false,
    tableName: "lms_sections",
    modelName: "LmsSection",
    sequelize: db,
  }
);

module.exports = LmsSection;
