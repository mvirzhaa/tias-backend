"use strict";

/**
 * Migration: Improve Persuratan Schema
 * Branch: feat/persuratan-improvement
 *
 * Perubahan:
 *   1. Kolom `status` di tb_surat:
 *      - Dari: ENUM ('Sent','Read','Replied','Selesai','Archived')
 *      - Ke  : VARCHAR — validasi dipindah ke level aplikasi (Sequelize model)
 *      - Alasan: Fleksibel untuk tambah status baru tanpa alter table lagi
 *      - Backward compatible: nilai lama ('Selesai', dll) tetap valid di DB
 *
 *   2. Tambah kolom `root_surat_id` di tb_surat:
 *      - UUID nullable, self-referencing FK ke tb_surat.id
 *      - NULL = surat ini ADALAH surat asal (dari mahasiswa)
 *      - Berisi ID = surat ini adalah hasil disposisi, ID menunjuk ke surat asal
 *      - Tujuan: bisa query seluruh rantai disposisi dari satu surat asal
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. Ubah kolom `status` dari ENUM ke VARCHAR ───────────────────────────
    // Langkah: hapus default → ubah tipe → set ulang default
    // Ini backward compatible — data lama ('Sent', 'Read', 'Selesai', dll) tetap valid

    await queryInterface.sequelize.query(`
      ALTER TABLE tb_surat
        ALTER COLUMN status DROP DEFAULT;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE tb_surat
        ALTER COLUMN status TYPE VARCHAR(50)
        USING status::VARCHAR;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE tb_surat
        ALTER COLUMN status SET DEFAULT 'Sent';
    `);

    // Hapus ENUM type lama dari PostgreSQL (sudah tidak dipakai)
    // Dibungkus try-catch agar tidak error jika ENUM tidak ditemukan
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_tb_surat_status";
    `).catch(() => {});

    // ── 2. Tambah kolom `root_surat_id` ──────────────────────────────────────
    // NULL  = surat asal (dari mahasiswa, tidak punya parent chain)
    // UUID  = surat hasil disposisi, menunjuk ke surat pertama dalam chain
    await queryInterface.addColumn("tb_surat", "root_surat_id", {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
      after: "parent_id", // hanya berlaku di MySQL; di PostgreSQL kolom ditambah di akhir
    });

    // FK self-referencing: root_surat_id → tb_surat.id
    await queryInterface.addConstraint("tb_surat", {
      fields: ["root_surat_id"],
      type: "foreign key",
      name: "fk_tb_surat_root_surat_id",
      references: { table: "tb_surat", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Index untuk performa query "ambil semua surat dalam satu chain"
    await queryInterface.addIndex("tb_surat", ["root_surat_id"], {
      name: "idx_tb_surat_root_surat_id",
    });
  },

  async down(queryInterface, Sequelize) {
    // ── Rollback: Hapus root_surat_id ─────────────────────────────────────────
    await queryInterface.removeConstraint("tb_surat", "fk_tb_surat_root_surat_id").catch(() => {});
    await queryInterface.removeIndex("tb_surat", "idx_tb_surat_root_surat_id").catch(() => {});
    await queryInterface.removeColumn("tb_surat", "root_surat_id");

    // ── Rollback: Kembalikan status ke ENUM ───────────────────────────────────
    // PERHATIAN: rollback ini hanya aman jika tidak ada data dengan status baru
    // (Disposisi, Disetujui, Ditolak) di database
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_tb_surat_status"
          AS ENUM ('Sent', 'Read', 'Replied', 'Selesai', 'Archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE tb_surat
        ALTER COLUMN status DROP DEFAULT;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE tb_surat
        ALTER COLUMN status TYPE "enum_tb_surat_status"
        USING status::"enum_tb_surat_status";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE tb_surat
        ALTER COLUMN status SET DEFAULT 'Sent';
    `);
  },
};
