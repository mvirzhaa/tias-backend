const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");

class SiakSyncRun extends Model {}
SiakSyncRun.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    resource: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "running",
    },
    semester: {
      type: DataTypes.STRING,
    },
    started_at: {
      type: DataTypes.DATE,
    },
    finished_at: {
      type: DataTypes.DATE,
    },
    page_count: {
      type: DataTypes.INTEGER,
    },
    total_rows: {
      type: DataTypes.INTEGER,
    },
    error_message: {
      type: DataTypes.TEXT,
    },
    meta: {
      type: DataTypes.JSONB,
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
    tableName: "siak_sync_runs",
    modelName: "SiakSyncRun",
    sequelize: db,
  }
);

module.exports = SiakSyncRun;
