"use strict";

// Tambah value 'attendance' ke ENUM native Postgres untuk lms_content_items.type.
// Pola identik migrations/20260824000001-add-ditolak-to-surat-status-enum.js: lookup nama
// ENUM sebenarnya via pg_type/pg_attribute/pg_class (Sequelize auto-generate nama enum,
// jangan diasumsikan), lalu ALTER TYPE ADD VALUE dibungkus DO $$ ... EXCEPTION supaya
// idempoten (aman dijalankan ulang / value sudah ada).
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [results] = await queryInterface.sequelize.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON c.oid = a.attrelid
      WHERE c.relname = 'lms_content_items'
        AND a.attname = 'type'
        AND t.typtype = 'e'
      LIMIT 1;
    `);

    if (!results || results.length === 0) {
      console.warn("[Migration] Tidak ditemukan ENUM untuk kolom type di lms_content_items. Melewati.");
      return;
    }

    const enumName = results[0].typname;
    console.log(`[Migration] Ditemukan ENUM: ${enumName}`);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS 'attendance';
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Nilai attendance sudah ada atau terjadi error: %', SQLERRM;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    console.warn("Rollback ENUM value 'attendance' tidak didukung secara otomatis oleh PostgreSQL.");
  },
};
