const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");

/**
 * lms_content_duplication_logs — jejak PERISTIWA (bukan state konten) tiap aksi
 * "Duplikat dari Kelas Lain" (lib/lms/contentDuplication.js). Immutable / write-once:
 * tidak ada updated_at/deleted_at.
 */
class LmsContentDuplicationLog extends Model {}
LmsContentDuplicationLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    source_kelas_kuliah_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    target_kelas_kuliah_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sections_created: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    items_created: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    skipped_attendance_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    detail: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: false,
    tableName: "lms_content_duplication_logs",
    modelName: "LmsContentDuplicationLog",
    sequelize: db,
  }
);

module.exports = LmsContentDuplicationLog;
