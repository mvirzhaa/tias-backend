const { DataTypes, Model } = require("sequelize");
const db = require("../../../config");

class GroupVoting extends Model {}
GroupVoting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_voting: {
      type: DataTypes.NUMBER,
    },
    id_group: {
      type: DataTypes.NUMBER,
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
    tableName: "trx_voting_group",
    modelName: "GroupVoting",
    sequelize: db,
  }
);

module.exports = GroupVoting;
