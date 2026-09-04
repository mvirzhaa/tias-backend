const { DataTypes, Model, Sequelize } = require("sequelize");
const db = require("../../config");
const LmsContentItem = require("./LmsContentItem");

/**
 * lms_submissions (A5) — satu baris = pengumpulan tugas seorang mahasiswa pada satu
 * assignment (content item type=assignment). Config assignment ada di item.payload.
 *
 * Kepemilikan: siak_mahasiswa_id = req.user.siakUserUuid (UUID, tanpa FK — konsisten dgn
 * id_lecture/author_id; sumber kebenaran siak_v2_* read-only). Otorisasi tingkat-baris:
 * mahasiswa hanya boleh akses submission DENGAN siak_mahasiswa_id miliknya.
 *
 * is_late TIDAK dijadikan snapshot mati: dihitung ulang saat baca/menilai (submitted_at vs
 * due_at terkini) dan di-recompute saat due_at item diedit. Kolom ini cache untuk query.
 *
 * UNIQUE(content_item_id, siak_mahasiswa_id) WHERE deleted_at IS NULL (partial) →
 * satu submission AKTIF per mahasiswa per assignment; resubmit = overwrite baris yang sama.
 */
class LmsSubmission extends Model {}
LmsSubmission.init(
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
    siak_mahasiswa_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    storage_key: {
      // Nama file acak server-side (UUID) di storage non-publik. TIDAK pernah dari JSON klien.
      type: DataTypes.STRING,
      allowNull: true,
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_late: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    graded_by: {
      // = tb_users.user_id dosen penilai (UUID, dari JWT). Penanda submission sudah dinilai.
      type: DataTypes.UUID,
      allowNull: true,
    },
    graded_at: {
      type: DataTypes.DATE,
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
    tableName: "lms_submissions",
    modelName: "LmsSubmission",
    sequelize: db,
  }
);

LmsContentItem.hasMany(LmsSubmission, {
  foreignKey: "content_item_id",
  sourceKey: "id",
  as: "submissions",
});
LmsSubmission.belongsTo(LmsContentItem, {
  foreignKey: "content_item_id",
  targetKey: "id",
  as: "assignment",
});

module.exports = LmsSubmission;
