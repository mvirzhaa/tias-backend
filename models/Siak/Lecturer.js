const { DataTypes, Model } = require("sequelize");
const db = require("../../config/siak_connection");

class SiakLecturer extends Model {}

SiakLecturer.init(
  {
    code: {
      type: DataTypes.CHAR(20),
      primaryKey: true,
      allowNull: false,
    },
    faculty_code: {
      type: DataTypes.CHAR(10),
      allowNull: false,
    },
    nik: {
      type: DataTypes.CHAR(20),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("DOSEN TETAP", "DOSEN TIDAK TETAP"),
      allowNull: false,
      defaultValue: "DOSEN TETAP",
    },
    functional_title: {
      type: DataTypes.ENUM(
        "-",
        "ASISTEN AHLI",
        "LEKTOR",
        "LEKTOR KEPALA",
        "GURU BESAR"
      ),
      allowNull: false,
      defaultValue: "-",
    },
    sex: {
      type: DataTypes.CHAR(10),
      allowNull: false,
    },
    birthplace: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    birthdate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    religion: {
      type: DataTypes.CHAR(10),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    mobile_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    photo: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    active: {
      type: DataTypes.ENUM("Y", "N"),
      allowNull: false,
      defaultValue: "Y",
    },
  },
  {
    sequelize: db,
    modelName: "SiakLecturer",
    tableName: "siak_lecturer",
    timestamps: false,
  }
);

module.exports = SiakLecturer;
