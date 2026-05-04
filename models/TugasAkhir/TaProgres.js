const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

class TAProgres extends Model {}
TAProgres.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    mhs_id: {
      type: DataTypes.UUIDV4,
      allowNull: false,
    },
    pengajuan_sk_id: {
      type: DataTypes.INTEGER,
    },
    count: {
      type: DataTypes.INTEGER,
    },
    last_tgl: {
      type: DataTypes.DATE,
    },
    pembahasan: {
      type: DataTypes.TEXT,
    },
    bab: {
      type: DataTypes.INTEGER,
    },
    deskripsi: {
      type: DataTypes.TEXT,
    },
    created_at: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: false,
    tableName: "ta_progres",
    modelName: "TAProgres",
    sequelize: db,
  }
);

module.exports = TAProgres;
