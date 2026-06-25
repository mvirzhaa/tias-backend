/**
 * Kontrol POSITIF linking NIDN — membuktikan kode linking benar TANPA menyentuh tb_users
 * (guardrail). Menyuntik baris siak_v2_class_lecturers sementara ber-NIDN = nidn dosen
 * lokal yang sudah ada, jalankan linkDosen nyata, konfirmasi MATCH, lalu cleanup.
 *
 *   node scratch/test_nidn_link.js
 */
require("dotenv").config();
const sequelize = require("../config");
sequelize.options.logging = false;
const { linkDosen } = require("../lib/lms/siakV2/syncService");

const SYNTH_UUID = "aaaaaaaa-0000-4000-8000-000000000001";

(async () => {
  const q = async (sql, replacements) => (await sequelize.query(sql, { replacements }))[0];

  // Dosen lokal dengan nidn non-kosong, dan TEPAT 1 user memilikinya (hindari conflict).
  const dosen = (await q(
    `SELECT user_id, btrim(nidn) AS nidn FROM tb_users
     WHERE role IN ('Dosen','Dosen_Ext') AND NULLIF(btrim(nidn),'') IS NOT NULL
     ORDER BY length(btrim(nidn)) DESC LIMIT 1`
  ))[0];
  if (!dosen) throw new Error("Tidak ada dosen lokal ber-nidn.");
  const dup = (await q(`SELECT count(*)::int n FROM tb_users WHERE btrim(nidn)=btrim(:x)`, { x: dosen.nidn }))[0].n;
  console.log("Dosen lokal         :", dosen.user_id, "| nidn:", dosen.nidn, "| pemilik nidn ini:", dup);
  if (dup !== 1) throw new Error("nidn dosen tidak unik di tb_users (uji butuh tepat 1).");

  const kelas = (await q(`SELECT "kelasKuliahId" FROM siak_v2_classes LIMIT 1`))[0];

  try {
    // Suntik lecturer sementara dengan nidn = nidn dosen lokal.
    await q(
      `INSERT INTO siak_v2_class_lecturers ("kelasKuliahId", siak_dosen_id, nidn, created_at, updated_at)
       VALUES (:k, :u, :n, NOW(), NOW())`,
      { k: kelas.kelasKuliahId, u: SYNTH_UUID, n: dosen.nidn }
    );
    console.log("→ inject lecturer    : siak_dosen_id", SYNTH_UUID, "nidn", dosen.nidn);

    const result = await linkDosen();
    console.log("linkDosen           : matched", result.matched, "| unmatched", result.unmatched.length, "| conflict", result.conflict.length);

    const maps = await q(
      `SELECT siak_user_uuid, identifier, identifier_type, matched_via, status
       FROM siak_user_mappings WHERE tias_user_id = :id`, { id: dosen.user_id });
    console.log("MAPPING user        :", JSON.stringify(maps));

    const ok = maps.length === 1 && maps[0].siak_user_uuid === SYNTH_UUID &&
               maps[0].identifier_type === "nidn" && maps[0].status === "auto";
    console.log(ok
      ? "RESULT: ✅ MATCH benar — kode linking & normalisasi OK"
      : "RESULT: ❌ TIDAK match — ada bug di kode linking");
  } finally {
    await q(`DELETE FROM siak_user_mappings WHERE siak_user_uuid = :u`, { u: SYNTH_UUID });
    await q(`DELETE FROM siak_v2_class_lecturers WHERE siak_dosen_id = :u`, { u: SYNTH_UUID });
    console.log("Cleanup             : baris uji & mapping dihapus.");
    await sequelize.close();
  }
})().catch(async (e) => {
  console.error("ERR:", e.message);
  try { await sequelize.close(); } catch (_) {}
  process.exitCode = 1;
});
