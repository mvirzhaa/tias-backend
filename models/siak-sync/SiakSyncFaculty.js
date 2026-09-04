const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class SiakSyncFaculty extends Model {}
SiakSyncFaculty.init(
  {
    fakultas_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    kode_fakultas: {
      type: DataTypes.STRING,
    },
    nama_fakultas: {
      type: DataTypes.STRING,
      allowNull: false,
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
    tableName: "siak_sync_faculties",
    modelName: "SiakSyncFaculty",
    sequelize: db,
  }
);

module.exports = SiakSyncFaculty;
