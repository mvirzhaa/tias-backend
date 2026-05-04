const { DataTypes, Model } = require("sequelize");
const db = require("../../config/siak_connection");

class SiakCurriculum extends Model {}

SiakCurriculum.init(
  {
    curr_code: {
      type: DataTypes.CHAR(7),
      allowNull: false,
      primaryKey: true,
    },
    department_code: {
      type: DataTypes.CHAR(10),
      allowNull: false,
    },
    number_of_semester: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 8,
    },
    number_of_min_credit: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 144,
    },
    number_of_mandatory_credit: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    number_of_elective_credit: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    academic_year_valid_from: {
      type: DataTypes.CHAR(9),
      allowNull: false,
    },
    semester_valid_from: {
      type: DataTypes.ENUM("GASAL", "GENAP"),
      allowNull: false,
      defaultValue: "GASAL",
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize: db,
    modelName: "SiakCurriculum",
    tableName: "siak_curriculum",
    timestamps: false,
  }
);

module.exports = SiakCurriculum;
