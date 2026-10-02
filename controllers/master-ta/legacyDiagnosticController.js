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

// Status lama (SK sudah disetujui) -> nama tahapan baru yang akan jadi tujuan
// backfill. "pengajuan-sk" sengaja TIDAK ada di sini - mahasiswa yang SK-nya
// belum disetujui tidak dibackfill (sama seperti aturan sistem baru: Pelaksanaan
// baru dibuat setelah disetujui).
const STATUS_TO_TAHAPAN = {
  "menuju-kolokium": "Kolokium",
  "menuju-sidang": "Sidang",
  "menyelesaikan-revisi": "Pengumpulan Revisi",
  selesai: "Pengumpulan Revisi",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

        try {
          const enumInfo = await DB.query(`
            SELECT t.typname, e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            JOIN pg_attribute a ON a.atttypid = t.oid
            JOIN pg_class c ON c.oid = a.attrelid
            WHERE c.relname = 'ta_pengajuan_sk' AND a.attname = 'status'
            ORDER BY e.enumsortorder
          `);
          if (enumInfo.rows.length) {
            result.ta_pengajuan_sk.status_enum_type = enumInfo.rows[0].typname;
            result.ta_pengajuan_sk.status_enum_all_values = enumInfo.rows.map(
              (r) => r.enumlabel
            );
          }
        } catch (e) {
          result.ta_pengajuan_sk.status_enum_error = e.message;
        }
      }

      return response(res, true, "success", result);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // SIMULASI backfill 335 mahasiswa lama ke struktur Skema/Tahapan TA baru.
  // MURNI BACA - tidak INSERT/UPDATE/DELETE apa pun, cuma menghitung & melaporkan
  // apa yang AKAN terjadi kalau backfill sungguhan dijalankan, supaya bisa dicek
  // dulu sebelum ada satu baris pun ditulis.
  static legacyBackfillSimulation = async (req, res) => {
    try {
      const report = { prodi: {}, kandidat: {}, masalah_data: [] };

      // 1. Cari prodi Teknik Informatika (dikonfirmasi user: semua 335 mhs dari sini)
      const prodiRows = await DB.query(
        `SELECT "siakProgramStudiId", nama_prodi, kode_prodi FROM siak_v2_program_studi WHERE nama_prodi ILIKE '%teknik informatika%'`
      );
      report.prodi.ditemukan = prodiRows.rows;
      if (prodiRows.rows.length !== 1) {
        report.prodi.peringatan = `Ditemukan ${prodiRows.rows.length} baris prodi yang cocok dgn "teknik informatika" (idealnya persis 1) - perlu dipastikan manual yang mana dipakai.`;
      }

      // 2. Ambil semua ta_pengajuan_sk yang SK-nya sudah disetujui (status != pengajuan-sk)
      const candidates = await DB.query(`
        SELECT id, mhs_id, judul_skripsi, status, sk_pembimbing_1, sk_pembimbing_2, sk_pembimbing_3, kepala_lab
        FROM ta_pengajuan_sk
        WHERE status != 'pengajuan-sk' AND deleted_at IS NULL
        ORDER BY id
      `);

      report.kandidat.total_akan_dibackfill = candidates.rows.length;

      const perTahapan = {};
      const dataIssues = [];
      for (const row of candidates.rows) {
        const tahapanTarget = STATUS_TO_TAHAPAN[row.status] || `(status tak dikenal: ${row.status})`;
        const statusPelaksanaan = row.status === "selesai" ? "selesai" : "berjalan";
        const key = `${tahapanTarget} (${statusPelaksanaan})`;
        perTahapan[key] = (perTahapan[key] || 0) + 1;

        const issues = [];
        if (!row.sk_pembimbing_1 || !UUID_RE.test(row.sk_pembimbing_1)) {
          issues.push("sk_pembimbing_1 kosong/bukan format UUID valid");
        }
        if (!row.kepala_lab || !UUID_RE.test(row.kepala_lab)) {
          issues.push("kepala_lab kosong/bukan format UUID valid");
        }
        if (!row.judul_skripsi) {
          issues.push("judul_skripsi kosong");
        }
        if (issues.length) {
          dataIssues.push({ id: row.id, mhs_id: row.mhs_id, status: row.status, issues });
        }
      }

      report.kandidat.per_tahapan_tujuan = perTahapan;
      report.masalah_data = {
        jumlah_baris_bermasalah: dataIssues.length,
        contoh: dataIssues.slice(0, 15),
      };

      // 3. Tidak dibackfill sama sekali (SK belum disetujui)
      const skipped = await DB.query(
        `SELECT count(*) FROM ta_pengajuan_sk WHERE status = 'pengajuan-sk' AND deleted_at IS NULL`
      );
      report.kandidat.tidak_dibackfill_belum_acc_sk = parseInt(skipped.rows[0].count, 10);

      return response(res, true, "success (simulasi, tidak ada yang ditulis)", report);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = LegacyDiagnosticController;
