const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const User = require("../User");
const TaSkema = require("../master-ta/TaSkema");

class TaPengajuan extends Model {}
TaPengajuan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    mhs_id: {
      type: DataTypes.UUID,
    },
    nama: {
      type: DataTypes.STRING,
    },
    npm: {
      type: DataTypes.STRING,
    },
    skema_id: {
      type: DataTypes.INTEGER,
    },
    judul: {
      type: DataTypes.STRING,
    },
    pembimbing_1: {
      type: DataTypes.UUID,
    },
    pembimbing_2: {
      type: DataTypes.UUID,
    },
    pembimbing_luar: {
      type: DataTypes.STRING,
    },
    kepala_lab: {
      type: DataTypes.UUID,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "diajukan",
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
    tableName: "ta_pengajuan",
    modelName: "TaPengajuan",
    sequelize: db,
  }
);

TaPengajuan.hasOne(TaSkema, {
  foreignKey: "id",
  sourceKey: "skema_id",
  as: "skema",
});

TaPengajuan.hasOne(User, {
  foreignKey: "user_id",
  sourceKey: "pembimbing_1",
  as: "dosen_pembimbing_1",
});

TaPengajuan.hasOne(User, {
  foreignKey: "user_id",
  sourceKey: "pembimbing_2",
  as: "dosen_pembimbing_2",
});

TaPengajuan.hasOne(User, {
  foreignKey: "user_id",
  sourceKey: "kepala_lab",
  as: "dosen_kepala_lab",
});

module.exports = TaPengajuan;
