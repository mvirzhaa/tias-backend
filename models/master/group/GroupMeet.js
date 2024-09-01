const { DataTypes, Model } = require("sequelize");
const db = require("../../../config");

class GroupMeet extends Model {}
GroupMeet.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_group: {
      type: DataTypes.INTEGER,
    },
    id_meet: {
      type: DataTypes.INTEGER,
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
    tableName: "trx_meet_group",
    modelName: "GroupMeet",
    sequelize: db,
  }
);

module.exports = GroupMeet;
