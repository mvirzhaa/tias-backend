const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class SemesterBk extends Model {}
SemesterBk.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    id_mhs: {
      type: DataTypes.UUID,
    },
    semester: {
      type: DataTypes.INTEGER,
    },
    dok_frs: {
      type: DataTypes.STRING,
    },
    catatan: {
      type: DataTypes.TEXT,
    },
    p1: {
      type: DataTypes.DATE,
    },
    p2: {
      type: DataTypes.DATE,
    },
    p3: {
      type: DataTypes.DATE,
    },
    p4: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: false,
    tableName: "semester_bk",
    modelName: "SemesterBk",
    sequelize: db,
  }
);

module.exports = SemesterBk;
