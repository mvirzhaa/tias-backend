const { DataTypes, Model } = require("sequelize");
const db = require("../../config");

/**
 * siak_v2_program_studi — BRIEF v2 Task 3.
 * Dimensi prodi untuk scope fakultas LMS. Diisi dari programStudi nested di payload
 * kelas-kuliah; siakFakultasId nullable (hanya terisi bila master prodi tersedia).
 */
class SiakV2ProgramStudi extends Model {}
SiakV2ProgramStudi.init(
  {
    siakProgramStudiId: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    siakFakultasId: {
      type: DataTypes.UUID,
    },
    kode_prodi: {
      type: DataTypes.STRING,
    },
    nama_prodi: {
      type: DataTypes.STRING,
    },
    jenjang: {
      type: DataTypes.STRING,
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
    tableName: "siak_v2_program_studi",
    modelName: "SiakV2ProgramStudi",
    sequelize: db,
  }
);

module.exports = SiakV2ProgramStudi;
