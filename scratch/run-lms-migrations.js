/**
 * Runner terkontrol Fase 1 (throwaway).
 *
 * Kenapa tidak `sequelize-cli db:migrate`? Di DB pengembangan ini (m_tias_database)
 * masih ada 11 migrasi lain berstatus "down" (parents, data-pribadi, seed-*, kategori,
 * dll). `db:migrate` polos akan menjalankan SEMUANYA (di luar scope Fase 1 & berisiko
 * gagal/konflik pada seed). Script ini HANYA menerapkan dua migrasi LMS + mencatatnya
 * di SequelizeMeta, idempotent.
 *
 * Pakai: `node scratch/run-lms-migrations.js`
 */
require("dotenv").config();
const path = require("path");
const { Sequelize } = require("sequelize");

const MIGRATIONS = [
  "20260608000001-create-siak-v2-classes.js",
  "20260608000002-create-siak-v2-participants.js",
  "20260608000003-create-lms-sections.js",
  "20260608000004-create-lms-content-items.js",
];

(async () => {
  const sequelize = new Sequelize(
    process.env.DBNAME,
    process.env.USERDB,
    process.env.PASSWORDDB,
    {
      host: process.env.HOSTDB,
      port: process.env.PORTDB || 5432,
      dialect: "postgres",
      logging: false,
    }
  );

  try {
    await sequelize.authenticate();
    console.log(`Connected to "${process.env.DBNAME}".`);
    const qi = sequelize.getQueryInterface();

    // Pastikan SequelizeMeta ada (normalnya sudah).
    await sequelize.query(
      'CREATE TABLE IF NOT EXISTS "SequelizeMeta" ("name" VARCHAR(255) NOT NULL PRIMARY KEY);'
    );

    const [done] = await sequelize.query('SELECT name FROM "SequelizeMeta";');
    const already = new Set(done.map((r) => r.name));

    for (const file of MIGRATIONS) {
      if (already.has(file)) {
        console.log(`SKIP (already applied): ${file}`);
        continue;
      }
      const migration = require(path.resolve("migrations", file));
      console.log(`Applying: ${file} ...`);
      await migration.up(qi, Sequelize);
      await sequelize.query('INSERT INTO "SequelizeMeta" ("name") VALUES (:name);', {
        replacements: { name: file },
      });
      console.log(`  recorded in SequelizeMeta.`);
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("Migration runner failed:", err);
    process.exit(1);
  }
})();
