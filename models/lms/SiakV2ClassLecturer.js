const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const SiakV2Class = require("./SiakV2Class");

/**
 * siak_v2_class_lecturers — BRIEF v2 §Task 2.
 * Dosen pengampu per kelas (join table). Sumber: jadwalKuliah[].dosen distinct.
 * Otorisasi lecturerOwnsClass membaca siak_dosen_id dari sini.
 */
class SiakV2ClassLecturer extends Model {}
SiakV2ClassLecturer.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    kelasKuliahId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    siak_dosen_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    nidn: {
      type: DataTypes.STRING(64),
    },
    nama: {
      // nama dosen dari SIAK (jadwalKuliah[].dosen.nama) — dipakai saran match Task 6.
      type: DataTypes.STRING,
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
    tableName: "siak_v2_class_lecturers",
    modelName: "SiakV2ClassLecturer",
    sequelize: db,
  }
);

SiakV2Class.hasMany(SiakV2ClassLecturer, {
  foreignKey: "kelasKuliahId",
  sourceKey: "kelasKuliahId",
  as: "lecturers",
});
SiakV2ClassLecturer.belongsTo(SiakV2Class, {
  foreignKey: "kelasKuliahId",
  targetKey: "kelasKuliahId",
  as: "class",
});

module.exports = SiakV2ClassLecturer;
