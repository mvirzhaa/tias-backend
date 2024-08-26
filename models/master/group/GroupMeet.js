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
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    id_meet: {
      type: DataTypes.UUID,
    },
  },
  {
    timestamps: false,
    tableName: "tb_group_meet",
    modelName: "GroupMeet",
    sequelize: db,
  }
);

module.exports = GroupMeet;
