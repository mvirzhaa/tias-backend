const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");
const LmsAttendanceSession = require("./LmsAttendanceSession");

/**
 * lms_attendance_records — satu baris = satu presensi BERHASIL. Tidak ada baris untuk
 * percobaan gagal (lihat LmsAttendanceAttempt). siak_mahasiswa_id TANPA FK, konsisten dgn
 * LmsSubmission.siak_mahasiswa_id.
 *
 * UNIQUE(session_id, siak_mahasiswa_id) WHERE deleted_at IS NULL (partial, di migration) →
 * satu presensi AKTIF per mahasiswa per sesi.
 */
class LmsAttendanceRecord extends Model {}
LmsAttendanceRecord.init(
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
    kelasKuliahId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    siak_mahasiswa_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    metode: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "face",
    },
    status: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "hadir",
    },
    gps_lat: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    gps_lng: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    gps_accuracy_m: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    gps_distance_m: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    face_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    face_threshold: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    face_match: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    face_photo_storage_key: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: "lms_attendance_records",
    modelName: "LmsAttendanceRecord",
    sequelize: db,
  }
);

LmsAttendanceSession.hasMany(LmsAttendanceRecord, {
  foreignKey: "session_id",
  sourceKey: "id",
  as: "records",
});
LmsAttendanceRecord.belongsTo(LmsAttendanceSession, {
  foreignKey: "session_id",
  targetKey: "id",
  as: "session",
});

module.exports = LmsAttendanceRecord;
