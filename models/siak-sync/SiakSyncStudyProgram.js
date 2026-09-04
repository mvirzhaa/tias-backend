const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class SiakSyncStudyProgram extends Model {}
SiakSyncStudyProgram.init(
  {
    prodi_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    fakultas_id: {
      type: DataTypes.STRING,
    },
    kode_prodi: {
      type: DataTypes.STRING,
    },
    nama_prodi: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    jenjang: {
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
    tableName: "siak_sync_study_programs",
    modelName: "SiakSyncStudyProgram",
    sequelize: db,
  }
);

module.exports = SiakSyncStudyProgram;
