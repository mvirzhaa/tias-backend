const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");
const LmsForumThread = require("./LmsForumThread");

/**
 * lms_forum_posts — balasan dalam sebuah thread (SPEC v6 §3.3). MVP reply 1-level:
 * parent_post_id menunjuk post utama (atau null). `edited` ditandai true saat body diubah.
 */
class LmsForumPost extends Model {}
LmsForumPost.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    thread_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    parent_post_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    author_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    edited: {
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
    tableName: "lms_forum_posts",
    modelName: "LmsForumPost",
    sequelize: db,
  }
);

LmsForumThread.hasMany(LmsForumPost, {
  foreignKey: "thread_id",
  sourceKey: "id",
  as: "posts",
});
LmsForumPost.belongsTo(LmsForumThread, {
  foreignKey: "thread_id",
  targetKey: "id",
  as: "thread",
});
// Self-reference 1-level (balasan ke post induk).
LmsForumPost.belongsTo(LmsForumPost, {
  foreignKey: "parent_post_id",
  targetKey: "id",
  as: "parent",
});

module.exports = LmsForumPost;
