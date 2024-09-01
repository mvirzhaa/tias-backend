const { DataTypes, Model } = require("sequelize");
const db = require("../../../config");
const User = require("../../User");
const DataPribadi = require("../../DataPribadi");
const Group = require("./Group");

class GroupUsers extends Model {}
GroupUsers.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
    },
    code: {
      type: DataTypes.STRING,
    },
    id_group: {
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
    tableName: "trx_user_group",
    modelName: "GroupUsers",
    sequelize: db,
  }
);

GroupUsers.hasOne(User, {
  foreignKey: "user_id",
  sourceKey: "user_id",
  as: "user",
});

GroupUsers.hasOne(DataPribadi, {
  foreignKey: "user_id",
  sourceKey: "user_id",
  as: "personal_data",
});

GroupUsers.hasOne(Group, {
  foreignKey: "id_group",
  sourceKey: "id",
  as: "group",
});

module.exports = GroupUsers;
