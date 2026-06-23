const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const SiakV2Class = require("./SiakV2Class");

/**
 * siak_v2_jadwal — jadwal kuliah per kelas dari /api/public jadwalKuliah[].
 * PK = id (UUID jadwal dari SIAK). Ruangan & dosen di-flatten ke kolom skalar.
 * TIDAK menyimpan payload mentah/PII.
 */
class SiakV2Jadwal extends Model {}
SiakV2Jadwal.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    kelasKuliahId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    hari: {
      type: DataTypes.STRING(16),
    },
    jam_mulai: {
      type: DataTypes.STRING(8),
    },
    jam_selesai: {
      type: DataTypes.STRING(8),
    },
    jenis_pertemuan: {
      type: DataTypes.STRING(32),
    },
    metode_pembelajaran: {
      type: DataTypes.STRING(32),
    },
    siak_dosen_id: {
      type: DataTypes.UUID,
    },
    siak_ruangan_id: {
      type: DataTypes.UUID,
    },
    ruangan_nama: {
      type: DataTypes.STRING,
    },
    ruangan_kode: {
      type: DataTypes.STRING(32),
    },
    lantai: {
      type: DataTypes.INTEGER,
    },
    ruangan_kapasitas: {
      type: DataTypes.INTEGER,
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
    tableName: "siak_v2_jadwal",
    modelName: "SiakV2Jadwal",
    sequelize: db,
  }
);

SiakV2Class.hasMany(SiakV2Jadwal, {
  foreignKey: "kelasKuliahId",
  sourceKey: "kelasKuliahId",
  as: "jadwal",
});
SiakV2Jadwal.belongsTo(SiakV2Class, {
  foreignKey: "kelasKuliahId",
  targetKey: "kelasKuliahId",
  as: "class",
});

module.exports = SiakV2Jadwal;
