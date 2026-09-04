const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class SiakSyncCurriculum extends Model {}
SiakSyncCurriculum.init(
  {
    kurikulum_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    prodi_id: {
      type: DataTypes.STRING,
    },
    nama_kurikulum: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tahun: {
      type: DataTypes.INTEGER,
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
    tableName: "siak_sync_curriculums",
    modelName: "SiakSyncCurriculum",
    sequelize: db,
  }
);

module.exports = SiakSyncCurriculum;
