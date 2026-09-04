const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");
const LmsContentItem = require("./LmsContentItem");

/**
 * lms_forum_threads — topik diskusi di dalam content item bertipe `forum` (SPEC v6 §3.3).
 * is_pinned/is_locked dikontrol dosen pengampu/admin (otorisasi di forumAccess).
 */
class LmsForumThread extends Model {}
LmsForumThread.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    content_item_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    author_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_locked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_pinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: "lms_forum_threads",
    modelName: "LmsForumThread",
    sequelize: db,
  }
);

LmsContentItem.hasMany(LmsForumThread, {
  foreignKey: "content_item_id",
  sourceKey: "id",
  as: "threads",
});
LmsForumThread.belongsTo(LmsContentItem, {
  foreignKey: "content_item_id",
  targetKey: "id",
  as: "forum",
});

module.exports = LmsForumThread;
