const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const TaSkema = require("./TaSkema");
const SiakV2ProgramStudi = require("../lms/SiakV2ProgramStudi");

class TaTahapan extends Model {}
TaTahapan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    prodi_id: {
      type: DataTypes.UUID,
    },
    skema_id: {
      type: DataTypes.INTEGER,
    },
    nama_tahapan: {
      type: DataTypes.STRING,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
    deleted_at: {
      type: DataTypes.DATE,
    },
  },
  {
    defaultScope: {
      where: {
        deleted_at: null,
      },
    },
    scopes: {
      deleted: {
        where: {
          deleted_at: null,
        },
      },
    },
    timestamps: false,
    tableName: "ta_tahapan",
    modelName: "TaTahapan",
    sequelize: db,
  }
);

TaTahapan.hasOne(TaSkema, {
  foreignKey: "id",
  sourceKey: "skema_id",
  as: "skema",
});

TaTahapan.hasOne(SiakV2ProgramStudi, {
  foreignKey: "siakProgramStudiId",
  sourceKey: "prodi_id",
  as: "prodi",
});

module.exports = TaTahapan;
