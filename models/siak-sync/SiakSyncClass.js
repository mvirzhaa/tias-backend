const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class SiakSyncClass extends Model {}
SiakSyncClass.init(
  {
    kelas_kuliah_id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    mata_kuliah_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prodi_id: {
      type: DataTypes.STRING,
    },
    semester: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nama_kelas: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    kapasitas: {
      type: DataTypes.INTEGER,
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
    tableName: "siak_sync_classes",
    modelName: "SiakSyncClass",
    sequelize: db,
  }
);

module.exports = SiakSyncClass;
