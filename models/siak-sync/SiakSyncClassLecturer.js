const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class SiakSyncClassLecturer extends Model {}
SiakSyncClassLecturer.init(
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
    nip: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nama_dosen: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    is_koordinator: {
      type: DataTypes.BOOLEAN,
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
    tableName: "siak_sync_class_lecturers",
    modelName: "SiakSyncClassLecturer",
    sequelize: db,
  }
);

module.exports = SiakSyncClassLecturer;
