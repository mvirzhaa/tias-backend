const { DataTypes, Model } = require("sequelize");
const db = require("../../config/siak_connection");

class SiakCourse extends Model {}

SiakCourse.init(
  {
    code: {
      type: DataTypes.CHAR(10),
      primaryKey: true,
      allowNull: false,
    },
    faculty_code: {
      type: DataTypes.CHAR(10),
      allowNull: false,
      defaultValue: "",
    },
    department_code: {
      type: DataTypes.CHAR(10),
      allowNull: true,
    },
    curr_code: {
      type: DataTypes.CHAR(7),
      allowNull: false,
    },
    group_code: {
      type: DataTypes.CHAR(10),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    credit: {
      type: DataTypes.TINYINT,
      allowNull: false,
    },
    semester: {
      type: DataTypes.TINYINT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("THEORY", "PRACTICE", "SPECIAL", "THESIS"),
      allowNull: false,
      defaultValue: "THEORY",
    },
    liability: {
      type: DataTypes.ENUM("COMPULSORY", "ELECTIVE"),
      allowNull: true,
      defaultValue: "COMPULSORY",
    },
    prerequisite_1: {
      type: DataTypes.CHAR(10),
      allowNull: true,
    },
    prerequisite_2: {
      type: DataTypes.CHAR(10),
      allowNull: true,
    },
    prerequisite_3: {
      type: DataTypes.CHAR(10),
      allowNull: true,
    },
    fee_item: {
      type: DataTypes.CHAR(4),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    active: {
      type: DataTypes.ENUM("Y", "N"),
      allowNull: false,
      defaultValue: "Y",
    },
  },
  {
    sequelize: db,
    modelName: "SiakCourse",
    tableName: "siak_course",
    timestamps: false,
  }
);

module.exports = SiakCourse;
