const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const Matakuliah = require("../master/Matakuliah");
const SiakSyncCourse = require("./SiakSyncCourse");

class MatakuliahSiakMapping extends Model {}
MatakuliahSiakMapping.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    matakuliah_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    kode_matakuliah_lokal: {
      type: DataTypes.STRING,
    },
    mata_kuliah_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    kode_matakuliah_siak: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    mapping_method: {
      type: DataTypes.STRING,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    verified_at: {
      type: DataTypes.DATE,
    },
    verified_by: {
      type: DataTypes.UUID,
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
    tableName: "matakuliah_siak_mapping",
    modelName: "MatakuliahSiakMapping",
    sequelize: db,
  }
);

MatakuliahSiakMapping.belongsTo(Matakuliah, {
  foreignKey: "matakuliah_id",
  targetKey: "id",
  as: "matakuliah",
});

MatakuliahSiakMapping.belongsTo(SiakSyncCourse, {
  foreignKey: "mata_kuliah_id",
  targetKey: "mata_kuliah_id",
  as: "siak_course",
});

module.exports = MatakuliahSiakMapping;
