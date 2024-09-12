const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class MhsBk extends Model {}
MhsBk.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    bk_id: {
      type: DataTypes.INTEGER,
    },
    mhs_id: {
      type: DataTypes.UUID,
    },
  },
  {
    timestamps: false,
    tableName: "mhs_bk",
    modelName: "MhsBk",
    sequelize: db,
  }
);

module.exports = MhsBk;
