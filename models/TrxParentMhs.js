const { DataTypes, Model } = require("sequelize");
const db = require("../config");
const User = require("./User");
const Parents = require("./Parents");

class TrxParentMhs extends Model {}
TrxParentMhs.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    parent_id: {
      type: DataTypes.INTEGER,
    },
    mhs_id: {
      type: DataTypes.INTEGER,
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
    tableName: "trx_parent_mhs",
    modelName: "TrxParentMhs",
    sequelize: db,
  }
);
TrxParentMhs.hasOne(User, {
  foreignKey: "user_id",
  sourceKey: "mhs_id",
  as: "mhs",
});

TrxParentMhs.hasOne(Parents, {
  foreignKey: "id",
  sourceKey: "parent_id",
  as: "parent",
});

module.exports = TrxParentMhs;
