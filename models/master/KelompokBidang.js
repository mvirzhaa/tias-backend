const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class KelompokBidang extends Model {}
KelompokBidang.init(
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
    is_iptek: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    tableName: "kelompok_bidang",
    modelName: "KelompokBidang",
    sequelize: db,
  }
);

module.exports = KelompokBidang;
