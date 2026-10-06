const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");
const LmsSection = require("./LmsSection");

/**
 * lms_content_items — aktivitas/sumber di dalam sebuah section (SPEC v6 §3.2).
 */
const CONTENT_TYPES = [
  "page",
  "ppt",
  "pdf",
  "video",
  "url",
  "forum",
  "exam",
  "assignment",
  "attendance",
];

class LmsContentItem extends Model {}
LmsContentItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    section_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...CONTENT_TYPES),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      // Penjelasan singkat aktivitas (teks bebas, opsional) — diisi dosen di form item.
      type: DataTypes.TEXT,
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    payload: {
      type: DataTypes.JSONB,
    },
    duplicated_from_item_id: {
      // Jejak provenance bila item ini dibuat lewat "Duplikat dari Kelas Lain"
      // (lib/lms/contentDuplication.js). NULL = dibuat manual. Tipe 'attendance' tidak
      // pernah punya nilai di sini karena selalu dikecualikan dari duplikasi.
      type: DataTypes.UUID,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
    deleted_at: {
      type: DataTypes.DATE,
    },
  },
  {
    defaultScope: {
      where: {
        deleted_at: null,
      },
    },
    timestamps: false,
    tableName: "lms_content_items",
    modelName: "LmsContentItem",
    sequelize: db,
  }
);

LmsSection.hasMany(LmsContentItem, {
  foreignKey: "section_id",
  sourceKey: "id",
  as: "content_items",
});
LmsContentItem.belongsTo(LmsSection, {
  foreignKey: "section_id",
  targetKey: "id",
  as: "section",
});

LmsContentItem.CONTENT_TYPES = CONTENT_TYPES;

module.exports = LmsContentItem;
