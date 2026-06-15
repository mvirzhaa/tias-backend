const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class SiakSyncClassSchedule extends Model {}
SiakSyncClassSchedule.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    kelas_kuliah_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    hari: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    jam_mulai: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    jam_selesai: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    ruang_id: {
      type: DataTypes.STRING,
    },
    nama_ruang: {
      type: DataTypes.STRING,
    },
    metode: {
      type: DataTypes.STRING,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
    },
    siak_updated_at: {
      type: DataTypes.DATE,
    },
    raw_payload: {
      type: DataTypes.JSONB,
    },
    last_sync_run_id: {
      type: DataTypes.UUID,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: false,
    tableName: "siak_sync_class_schedules",
    modelName: "SiakSyncClassSchedule",
    sequelize: db,
  }
);

module.exports = SiakSyncClassSchedule;
