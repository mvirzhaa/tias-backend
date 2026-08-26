'use strict';

/**
 * Menambahkan ke sistem migrasi resmi tabel/kolom yang ditemukan SUDAH ADA di
 * staging/production (dipakai oleh authController, achievementsController,
 * authMiddleware) tapi sebelumnya dibuat manual di luar `sequelize-cli` — sehingga
 * DB baru (lokal/staging/production lain) gagal replikasi tanpa tambal manual.
 *
 * Idempoten by design (CREATE TABLE/EXTENSION IF NOT EXISTS, ADD COLUMN IF NOT
 * EXISTS): di staging/production yang sudah punya objek ini, migrasi jadi no-op
 * aman; di DB baru, objek ini benar-benar dibuat.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      ALTER TABLE tb_users ADD COLUMN IF NOT EXISTS user_agent text[] DEFAULT ARRAY[]::text[];

      ALTER TABLE token ALTER COLUMN token_id SET DEFAULT uuid_generate_v4();

      CREATE TABLE IF NOT EXISTS m_jabatan (
        id SERIAL PRIMARY KEY,
        nama_jabatan VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS m_unit (
        id SERIAL PRIMARY KEY,
        code VARCHAR(255),
        nama_unit VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS trx_user_jabatan_unit (
        id SERIAL PRIMARY KEY,
        user_id UUID,
        jabatan_id INTEGER,
        unit_id INTEGER,
        keterangan TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        deleted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        gamify VARCHAR(255),
        start_point INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0,
        image VARCHAR(255),
        kode VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id UUID,
        achievement_id INTEGER,
        status INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS user_achievements;
      DROP TABLE IF EXISTS achievements;
      DROP TABLE IF EXISTS trx_user_jabatan_unit;
      DROP TABLE IF EXISTS m_unit;
      DROP TABLE IF EXISTS m_jabatan;
      ALTER TABLE tb_users DROP COLUMN IF EXISTS user_agent;
    `);
  },
};
