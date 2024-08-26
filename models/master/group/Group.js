const { DataTypes, Model } = require("sequelize");
const db = require("../../../config");

class Group extends Model {}
Group.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nama_group: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: false,
    tableName: "tb_group",
    modelName: "Group",
    sequelize: db,
  }
);

module.exports = Group;
