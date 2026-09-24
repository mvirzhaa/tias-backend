const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");

/**
 * lms_attendance_sessions — instance pertemuan presensi (token aktif, anchor geofence bila
 * offline). Lihat migration untuk rasional lengkap. kelasKuliahId/jadwal_id/opened_by TANPA
 * FK (siak_v2_* & tb_users read-only dari sudut LMS, pola sama dgn LmsSubmission).
 */
class LmsAttendanceSession extends Model {}
LmsAttendanceSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    kelasKuliahId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    jadwal_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    opened_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    pertemuan_ke: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    session_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    metode_pembelajaran_snapshot: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    is_offline: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    ruangan_nama_snapshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    geofence_lat: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    geofence_lng: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    geofence_accuracy_m: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    geofence_radius_m: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "open",
    },
    opened_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Jembatan presensi LMS -> Laravel fts-absen (permintaan Pak Fitrah), lihat
    // lib/lms/legacyAttendanceBridge.js. legacy_token null = jembatan gagal/tak tersedia,
    // sesi LMS tetap jalan pakai token/alur native sebagai fallback (best-effort).
    legacy_token: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    legacy_sync_status: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    legacy_error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Disamakan dgn form presensi lama (ucl.uika-bogor.ac.id/dosen/absen/daftar-hadir/generate) —
    // ditangkap sejak generate supaya siap dipakai saat bridge ke Laravel fts-absen dibangun.
    rps_dasar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rps_pelaksanaan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dosen_pengganti_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    dosen_tamu: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    komti_siak_mahasiswa_id: {
      type: DataTypes.UUID,
      allowNull: true,
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
    tableName: "lms_attendance_sessions",
    modelName: "LmsAttendanceSession",
    sequelize: db,
  }
);

module.exports = LmsAttendanceSession;
