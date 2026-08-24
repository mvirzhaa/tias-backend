"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Cari nama ENUM yang ada di DB untuk kolom status di tb_surat
    const [results] = await queryInterface.sequelize.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON c.oid = a.attrelid
      WHERE c.relname = 'tb_surat'
        AND a.attname = 'status'
        AND t.typtype = 'e'
      LIMIT 1;
    `);

    if (!results || results.length === 0) {
      console.warn("[Migration] Tidak ditemukan ENUM untuk kolom status di tb_surat. Melewati.");
      return;
    }

    const enumName = results[0].typname;
    console.log(`[Migration] Ditemukan ENUM: ${enumName}`);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS 'Ditolak';
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Nilai Ditolak sudah ada atau terjadi error: %', SQLERRM;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // PostgreSQL tidak mendukung penghapusan nilai ENUM secara langsung.
    console.warn("Rollback ENUM value 'Ditolak' tidak didukung secara otomatis oleh PostgreSQL.");
  },
};

