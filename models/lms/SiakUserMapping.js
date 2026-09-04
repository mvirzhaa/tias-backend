const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");

/**
 * siak_user_mappings — BRIEF v2 §Task 1.
 * Jembatan tias_user_id (UCL) ↔ siak_user_uuid (SIAKAD).
 * Satu akun UCL = satu identitas SIAK (UNIQUE di kedua sisi).
 * status: 'auto' | 'verified' | 'rejected'
 * Baris berstatus 'verified' tidak boleh diturunkan ke 'auto' oleh sync otomatis.
 */
class SiakUserMapping extends Model {}
SiakUserMapping.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tias_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    siak_user_uuid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    identifier: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    identifier_type: {
      // 'nidn' | 'npm'
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    matched_via: {
      // 'nidn' | 'npm' | 'manual'
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    status: {
      // 'auto' | 'verified' | 'rejected'
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "auto",
    },
    matched_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
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
    tableName: "siak_user_mappings",
    modelName: "SiakUserMapping",
    sequelize: db,
  }
);

module.exports = SiakUserMapping;
