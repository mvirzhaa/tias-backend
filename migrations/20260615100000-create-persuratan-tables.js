"use strict";

/**
 * Migration: Create Persuratan Tables
 * Membuat tabel:
 *   1. tb_surat           — entitas surat utama (inbox/outbox/disposisi)
 *   2. tb_riwayat_surat   — log/tracking status perubahan surat
 *   3. tb_dokumen_lampiran — file lampiran per surat
 *
 * ENUM "enum_tb_surat_status" dibuat manual karena Sequelize paranoid + ENUM
 * memerlukan tipe terpisah di PostgreSQL.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. ENUM untuk kolom status di tb_surat ──────────────────────────────
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_tb_surat_status"
          AS ENUM ('Sent', 'Read', 'Replied', 'Selesai', 'Archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // ── 2. tb_surat ──────────────────────────────────────────────────────────
    await queryInterface.createTable("tb_surat", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "tb_users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      penerima_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "tb_users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        // Self-referencing FK ditambahkan SETELAH tabel dibuat (lihat bawah)
      },
      jenis_surat: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      form_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      nomor_surat: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          "Sent",
          "Read",
          "Replied",
          "Selesai",
          "Archived"
        ),
        defaultValue: "Sent",
        allowNull: false,
      },
      catatan_pejabat: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // FK self-referencing (parent_id → tb_surat.id) ditambah setelah tabel dibuat
    await queryInterface.addConstraint("tb_surat", {
      fields: ["parent_id"],
      type: "foreign key",
      name: "fk_tb_surat_parent_id",
      references: { table: "tb_surat", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Index untuk performa query inbox/outbox
    await queryInterface.addIndex("tb_surat", ["user_id"], {
      name: "idx_tb_surat_user_id",
    });
    await queryInterface.addIndex("tb_surat", ["penerima_id"], {
      name: "idx_tb_surat_penerima_id",
    });
    await queryInterface.addIndex("tb_surat", ["parent_id"], {
      name: "idx_tb_surat_parent_id",
    });
    await queryInterface.addIndex("tb_surat", ["deleted_at"], {
      name: "idx_tb_surat_deleted_at",
    });

    // ── 3. tb_riwayat_surat ───────────────────────────────────────────────────
    await queryInterface.createTable("tb_riwayat_surat", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
        primaryKey: true,
        allowNull: false,
      },
      surat_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "tb_surat", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      catatan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await queryInterface.addIndex("tb_riwayat_surat", ["surat_id"], {
      name: "idx_tb_riwayat_surat_surat_id",
    });

    // ── 4. tb_dokumen_lampiran ────────────────────────────────────────────────
    await queryInterface.createTable("tb_dokumen_lampiran", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
        primaryKey: true,
        allowNull: false,
      },
      surat_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "tb_surat", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      nama_file: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      file_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
    });

    await queryInterface.addIndex("tb_dokumen_lampiran", ["surat_id"], {
      name: "idx_tb_dokumen_lampiran_surat_id",
    });
  },

  async down(queryInterface, Sequelize) {
    // Hapus dalam urutan terbalik (anak dulu, baru induk)
    await queryInterface.dropTable("tb_dokumen_lampiran");
    await queryInterface.dropTable("tb_riwayat_surat");

    // Hapus constraint FK self-ref sebelum drop tabel
    await queryInterface.removeConstraint("tb_surat", "fk_tb_surat_parent_id").catch(() => {});
    await queryInterface.dropTable("tb_surat");

    // Hapus ENUM
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_tb_surat_status";`
    );
  },
};
