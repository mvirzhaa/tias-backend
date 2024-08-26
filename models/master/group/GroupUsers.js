const { DataTypes, Model } = require("sequelize");
const db = require("../../../config");
const User = require("../../User");
const DataPribadi = require("../../DataPribadi");

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
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
  },
  {
    timestamps: false,
    tableName: "tb_group_user",
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

module.exports = GroupUsers;
