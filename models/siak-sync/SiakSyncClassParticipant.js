const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class SiakSyncClassParticipant extends Model {}
SiakSyncClassParticipant.init(
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
    npm: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nama_mahasiswa: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    status: {
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
    tableName: "siak_sync_class_participants",
    modelName: "SiakSyncClassParticipant",
    sequelize: db,
  }
);

module.exports = SiakSyncClassParticipant;
