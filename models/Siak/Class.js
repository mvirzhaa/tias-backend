const { DataTypes, Model } = require("sequelize");
const db = require("../../config/siak_connection");

class SiakClass extends Model {}

SiakClass.init(
  {
    name: {
      type: DataTypes.CHAR(10),
      allowNull: false,
      primaryKey: true,
    },
    faculty_code: {
      type: DataTypes.CHAR(10),
      allowNull: false,
      primaryKey: true,
      defaultValue: "",
    },
    feeder_class_name: {
      type: DataTypes.CHAR(5),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize: db,
    modelName: "SiakClass",
    tableName: "siak_class",
    timestamps: false,
  }
);

module.exports = SiakClass;
