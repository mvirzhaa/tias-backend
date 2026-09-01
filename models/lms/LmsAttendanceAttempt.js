const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");

/**
 * lms_attendance_attempts — log append-only tiap percobaan submit presensi (sukses/gagal).
 * TIDAK soft-delete (bukti audit), karena itu tanpa defaultScope deleted_at.
 */
class LmsAttendanceAttempt extends Model {}
LmsAttendanceAttempt.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    siak_mahasiswa_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    outcome: {
      type: DataTypes.STRING(24),
      allowNull: false,
    },
    gps_distance_m: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    face_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    attempted_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: false,
    tableName: "lms_attendance_attempts",
    modelName: "LmsAttendanceAttempt",
    sequelize: db,
  }
);

module.exports = LmsAttendanceAttempt;
