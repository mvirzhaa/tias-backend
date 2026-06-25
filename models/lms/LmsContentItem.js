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
