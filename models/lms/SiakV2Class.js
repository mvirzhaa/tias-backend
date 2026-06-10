const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

/**
 * siak_v2_classes — SPEC v8 §2.1 (FULL SYNC). Salinan lokal kelas/jadwal SIAK v2.
 * Sumber kebenaran otorisasi LMS. PK = kelasKuliahId (UUID dari SIAK v2).
 */
class SiakV2Class extends Model {}
SiakV2Class.init(
  {
    kelasKuliahId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    kode_matakuliah: {
      type: DataTypes.STRING,
    },
    nama_matakuliah: {
      type: DataTypes.STRING,
    },
    nama_kelas: {
      type: DataTypes.STRING,
    },
    dosen_pengampu_nip: {
      // Array string NIP dosen pengampu.
      type: DataTypes.JSONB,
    },
    semester: {
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
    tableName: "siak_v2_classes",
    modelName: "SiakV2Class",
    sequelize: db,
  }
);

module.exports = SiakV2Class;
