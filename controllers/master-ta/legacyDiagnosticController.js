const DB = require("../../database");
const { response } = require("../../lib/response");

// Daftar tabel sistem TA LAMA (kolokium/sidang) yang mau diperiksa skemanya.
// Read-only murni - cuma SELECT ke information_schema + count(*), tidak pernah
// menulis apa pun. Tujuannya: lihat skema ASLI production sebelum mendesain
// penyatuan dengan sistem Pengajuan/Pelaksanaan TA yang baru, karena ada ±25
// kolom yang dipakai kode produksi tapi tidak tercatat di migration manapun.
const LEGACY_TABLES = [
  "ta_pengajuan_sk",
  "ta_pendaftaran_kolokium",
  "ta_nilai_akhir_kolo",
  "ta_penilaian_kolokium",
  "ta_pendaftaran_sidang",
  "ta_nilai_akhir_sidang",
  "ta_penilaian_sidang",
  "ta_dokumen_final_skripsi",
  "ta_progres",
];

class LegacyDiagnosticController {
  static legacySchema = async (req, res) => {
    try {
      const result = {};

      for (const table of LEGACY_TABLES) {
        const columns = await DB.query(
          `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1
           ORDER BY ordinal_position`,
          [table]
        );

        if (columns.rows.length === 0) {
          result[table] = { exists: false };
          continue;
        }

        const count = await DB.query(`SELECT count(*) FROM "${table}"`);

        result[table] = {
          exists: true,
          row_count: parseInt(count.rows[0].count, 10),
          columns: columns.rows.map((c) => ({
            name: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable === "YES",
            default: c.column_default,
          })),
        };
      }

      // Sebaran status ta_pengajuan_sk - penting buat tahu apakah ada mahasiswa
      // yang BETULAN sedang aktif di pipeline lama (menuju-kolokium/sidang/dst)
      // sebelum memutuskan cara penyatuan.
      if (result.ta_pengajuan_sk?.exists) {
        try {
          const statusBreakdown = await DB.query(
            `SELECT status, count(*) FROM ta_pengajuan_sk GROUP BY status ORDER BY count(*) DESC`
          );
          result.ta_pengajuan_sk.status_breakdown = statusBreakdown.rows.map((r) => ({
            status: r.status,
            count: parseInt(r.count, 10),
          }));
        } catch (e) {
          result.ta_pengajuan_sk.status_breakdown_error = e.message;
        }
      }

      return response(res, true, "success", result);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = LegacyDiagnosticController;
