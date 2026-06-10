const { DataTypes, Model } = require("sequelize");
const db = require("../../config");
const SiakV2Class = require("./SiakV2Class");

/**
 * siak_v2_participants — SPEC v8 §2.2 (FULL SYNC). Salinan lokal daftar peserta kelas.
 * Dipakai studentEnrolled: cek (kelasKuliahId, npm).
 */
class SiakV2Participant extends Model {}
SiakV2Participant.init(
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
    npm: {
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
    tableName: "siak_v2_participants",
    modelName: "SiakV2Participant",
    sequelize: db,
  }
);

SiakV2Class.hasMany(SiakV2Participant, {
  foreignKey: "kelasKuliahId",
  sourceKey: "kelasKuliahId",
  as: "participants",
});
SiakV2Participant.belongsTo(SiakV2Class, {
  foreignKey: "kelasKuliahId",
  targetKey: "kelasKuliahId",
  as: "class",
});

module.exports = SiakV2Participant;
