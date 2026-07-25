const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

/**
 * siak_v2_classes — BRIEF v2 §Task 2. Salinan lokal kelas SIAK v2.
 * Sumber kebenaran otorisasi LMS. PK = kelasKuliahId (UUID dari SIAK v2).
 * Otorisasi dosen kini via siak_v2_class_lecturers (UUID), bukan dosen_pengampu_nip.
 */
class SiakV2Class extends Model {}
SiakV2Class.init(
  {
    kelasKuliahId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    siakProgramStudiId: {
      type: DataTypes.UUID,
    },
    siakPeriodeAkademikId: {
      type: DataTypes.UUID,
    },
    siakMataKuliahId: {
      type: DataTypes.UUID,
    },
    nama: {
      type: DataTypes.STRING,
    },
    kode_matakuliah: {
      type: DataTypes.STRING,
    },
    nama_matakuliah: {
      type: DataTypes.STRING,
    },
    status_kelas: {
      type: DataTypes.STRING(32),
    },
    kapasitas: {
      type: DataTypes.INTEGER,
    },
    is_active: {
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
    tableName: "siak_v2_classes",
    modelName: "SiakV2Class",
    sequelize: db,
  }
);

module.exports = SiakV2Class;
