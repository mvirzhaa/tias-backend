const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class SkimKegiatan extends Model {}
SkimKegiatan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nama: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: false,
    tableName: "skim_kegiatan",
    modelName: "SkimKegiatan",
    sequelize: db,
  }
);

module.exports = SkimKegiatan;
