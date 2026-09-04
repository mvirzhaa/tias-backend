/**
 * Runner sync SIAK v2 (BRIEF v2 Task 3) — memanggil fungsi yang SAMA dengan endpoint
 * POST /lms/sync-siak, tanpa perlu server + JWT admin. Mencetak reconciliation report.
 *
 *   node scratch/run_siak_v2_sync.js
 */
require("dotenv").config();
const sequelize = require("../config");
sequelize.options.logging = false; // bungkam log "Nms" per-query agar report terbaca
const { syncSiakV2 } = require("../lib/lms/siakV2/syncService");

(async () => {
  console.log("SIAK_V2_API_URL =", process.env.SIAK_V2_API_URL);
  console.log("X-API-Key       =", process.env.SIAK_V2_API_KEY ? "dikirim" : "TIDAK dikirim (read-only)");
  console.log("");

  try {
    const report = await syncSiakV2({});
    require("fs").writeFileSync(
      __dirname + "/last_sync_report.json",
      JSON.stringify(report, null, 2)
    );
    console.log("=== RECONCILIATION REPORT (ringkas) ===");
    console.log(JSON.stringify({ ...report, linking: {
      dosen: { matched: report.linking.dosen.matched, unmatched: report.linking.dosen.unmatched.length, conflict: report.linking.dosen.conflict.length },
      mahasiswa: { matched: report.linking.mahasiswa.matched, unmatched: report.linking.mahasiswa.unmatched.length, conflict: report.linking.mahasiswa.conflict.length },
    }, participants: { rows: report.participants.rows, class_failures: report.participants.class_failures.length } }, null, 2));
    console.log("\n(report penuh → scratch/last_sync_report.json)");
  } catch (err) {
    console.error("SYNC FAILED:", err.message);
    if (err.response) console.error("HTTP status:", err.response.status);
    if (err.code) console.error("Error code:", err.code);
    process.exitCode = 1;
  } finally {
    try { await sequelize.close(); } catch (_) {}
  }
})();
