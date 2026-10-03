const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class TaPelaksanaanTahapanMeta extends Model {}
TaPelaksanaanTahapanMeta.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    pelaksanaan_id: {
      type: DataTypes.INTEGER,
    },
    tahapan_id: {
      type: DataTypes.INTEGER,
    },
    jadwal_pelaksanaan: {
      type: DataTypes.DATEONLY,
    },
    evaluator_1: {
      type: DataTypes.UUID,
    },
    evaluator_2: {
      type: DataTypes.UUID,
    },
    acc_pembimbing_1: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    acc_pembimbing_2: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    acc_kepala_lab: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    tableName: "ta_pelaksanaan_tahapan_meta",
    modelName: "TaPelaksanaanTahapanMeta",
    sequelize: db,
  }
);

module.exports = TaPelaksanaanTahapanMeta;
