const { DataTypes, Model } = require("sequelize");
const db = require("../config");
const DataPribadi = require("./DataPribadi");
const User = require("./User");
const Jabatan = require("./master/Jabatan");
const Unit = require("./master/Unit");

class TrxUserJabatanUnit extends Model {}
TrxUserJabatanUnit.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
    },
    jabatan_id: {
      type: DataTypes.INTEGER,
    },
    unit_id: {
      type: DataTypes.INTEGER,
    },
    keterangan: {
      type: DataTypes.TEXT,
    },
    created_at: {
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
    tableName: "trx_user_jabatan_unit",
    modelName: "TrxUserJabatanUnit",
    sequelize: db,
  }
);
TrxUserJabatanUnit.hasOne(User, {
  foreignKey: "user_id",
  sourceKey: "user_id",
  as: "user",
});

TrxUserJabatanUnit.hasOne(DataPribadi, {
  foreignKey: "user_id",
  sourceKey: "user_id",
  as: "personal_data",
});

TrxUserJabatanUnit.hasOne(Jabatan, {
  foreignKey: "id",
  sourceKey: "jabatan_id",
  as: "jabatan",
});

TrxUserJabatanUnit.hasOne(Unit, {
  foreignKey: "id",
  sourceKey: "unit_id",
  as: "unit",
});

module.exports = TrxUserJabatanUnit;
