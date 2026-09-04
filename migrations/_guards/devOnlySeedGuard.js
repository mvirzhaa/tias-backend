/**
 * Jaring pengaman: migration seed/dummy data untuk staging & dev, TIDAK BOLEH
 * pernah dijalankan ke production (menyuntik/menghapus data akademik nyata -
 * lihat rencana-penggabungan-ucl Tahap 4b untuk detail audit & bukti kasus
 * konkret: migration seperti ini pernah nyaris menimpa status kelulusan
 * mahasiswa nyata dengan data palsu).
 *
 * Panggil di baris pertama up() migration yang bersangkutan:
 *   const { assertNotProduction } = require('./_guards/devOnlySeedGuard');
 *   async up(queryInterface, Sequelize) {
 *     assertNotProduction(__filename);
 *     ...
 */
function assertNotProduction(migrationFile) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Migration ${migrationFile} berisi seed/dummy data atau operasi destruktif ` +
      `untuk staging & dev - DILARANG dijalankan di production (NODE_ENV=production). ` +
      `Lihat rencana-penggabungan-ucl.md Tahap 4b untuk daftar migration yang aman ` +
      `dijalankan ke production.`
    );
  }
}

module.exports = { assertNotProduction };
