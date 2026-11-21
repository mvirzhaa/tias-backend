const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class JenisDokumen extends Model {}
JenisDokumen.init(
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
    tableName: "jenis_dokumen",
    modelName: "JenisDokumen",
    sequelize: db,
  }
);

module.exports = JenisDokumen;
