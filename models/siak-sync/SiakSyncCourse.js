const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class SiakSyncCourse extends Model {}
SiakSyncCourse.init(
  {
    mata_kuliah_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    kurikulum_id: {
      type: DataTypes.STRING,
    },
    prodi_id: {
      type: DataTypes.STRING,
    },
    kode_matakuliah: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nama_matakuliah: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sks: {
      type: DataTypes.INTEGER,
    },
    semester_kurikulum: {
      type: DataTypes.INTEGER,
    },
    jenis: {
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
    tableName: "siak_sync_courses",
    modelName: "SiakSyncCourse",
    sequelize: db,
  }
);

module.exports = SiakSyncCourse;
