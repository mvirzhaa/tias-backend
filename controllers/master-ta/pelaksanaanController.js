const { Op } = require("sequelize");
const DB = require("../../database");
const { response } = require("../../lib/response");
const { getPagination } = require("../../lib/pagination-parser");
const TaPelaksanaan = require("../../models/master-ta/TaPelaksanaan");
const TaTahapan = require("../../models/master-ta/TaTahapan");
const TaSkema = require("../../models/master-ta/TaSkema");
const TaKelengkapan = require("../../models/master-ta/TaKelengkapan");
const TaPelaksanaanKelengkapan = require("../../models/master-ta/TaPelaksanaanKelengkapan");
const TaPengajuan = require("../../models/TugasAkhir/TaPengajuan");
const User = require("../../models/User");
const DataPribadi = require("../../models/DataPribadi");

const includeRelations = [
  {
    model: TaTahapan,
    as: "tahapan",
    required: false,
    include: [{ model: TaSkema, as: "skema", required: false }],
  },
  {
    model: User,
    as: "mahasiswa",
    required: false,
    include: { model: DataPribadi, as: "personal_data", required: false },
  },
  { model: TaPengajuan, as: "pengajuan", required: false },
];

async function getKelengkapanWithIsian(tahapanId, pelaksanaanId) {
  const defs = await TaKelengkapan.findAll({
    where: { tahapan_id: tahapanId },
    order: [["id", "ASC"]],
  });

  const submitted = await TaPelaksanaanKelengkapan.findAll({
    where: { pelaksanaan_id: pelaksanaanId },
  });
  const submittedMap = new Map(submitted.map((item) => [item.kelengkapan_id, item.isian]));

  return defs.map((def) => ({
    id: def.id,
    nama_kelengkapan: def.nama_kelengkapan,
    isian: submittedMap.has(def.id) ? submittedMap.get(def.id) : null,
  }));
}

// Baca-saja, mengambil baris dari sistem LAMA (ta_pengajuan_sk) dan menyusunnya
// ke bentuk yang sama dgn baris dinamis, supaya admin/dosen bisa lihat SATU
// tabel gabungan (kolom "Skema") alih-alih 2 tab terpisah. Query & logika
// statusDospem SENGAJA diduplikasi dari controllers/bimbingan/tugasAkhirController.js
// (getForAdmin/getForDosen) - bukan memanggilnya - supaya endpoint lama itu
// sendiri nol diubah/berisiko. Pakai parameterized query (bukan interpolasi
// string spt kode lama) utk dosenId.
async function fetchLegacyRowsGabungan(dosenId = null) {
  let query = `
    SELECT
      ta_pengajuan_sk.id,
      ta_pengajuan_sk.status,
      ta_pengajuan_sk.semester,
      ta_pengajuan_sk.judul_skripsi,
      ta_pengajuan_sk.sk_status_pem_1,
      ta_pengajuan_sk.sk_status_pem_2,
      ta_pengajuan_sk.status_kepala_lab,
      ta_pengajuan_sk.status_approved,
      ta_pengajuan_sk.status_approved_kolo,
      ta_pengajuan_sk.status_approved_sidang,
      tb_data_pribadi.nama_lengkap,
      tb_users.npm,
      ta_pendaftaran_kolokium.id AS kolo_id,
      ta_pendaftaran_kolokium.kolo_status_pem_1,
      ta_pendaftaran_kolokium.kolo_status_pem_2,
      ta_pendaftaran_sidang.id AS sidang_id,
      ta_pendaftaran_sidang.sidang_status_pem_1,
      ta_pendaftaran_sidang.sidang_status_pem_2,
      ta_pengajuan_sk.sk_pembimbing_1,
      ta_pengajuan_sk.sk_pembimbing_2,
      ta_pengajuan_sk.sk_pembimbing_3,
      ta_pengajuan_sk.kepala_lab,
      ta_pendaftaran_kolokium.kolo_pembimbing_1,
      ta_pendaftaran_kolokium.kolo_pembimbing_2,
      ta_pendaftaran_kolokium.kolo_pembimbing_3,
      ta_pendaftaran_kolokium.kolo_kepala_lab,
      ta_pendaftaran_kolokium.evaluator_1,
      ta_pendaftaran_kolokium.evaluator_2,
      ta_pendaftaran_sidang.sidang_pembimbing_1,
      ta_pendaftaran_sidang.sidang_pembimbing_2,
      ta_pendaftaran_sidang.sidang_pembimbing_3,
      ta_pendaftaran_sidang.sidang_kepala_lab,
      ta_pendaftaran_sidang.penguji_1,
      ta_pendaftaran_sidang.penguji_2
    FROM ta_pengajuan_sk
    JOIN tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id
    JOIN tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id
    LEFT JOIN ta_pendaftaran_kolokium ON ta_pendaftaran_kolokium.pengajuan_sk_id = ta_pengajuan_sk.id
    LEFT JOIN ta_pendaftaran_sidang ON ta_pendaftaran_sidang.pengajuan_sk_id = ta_pengajuan_sk.id
    WHERE ta_pengajuan_sk.deleted_at IS NULL
  `;
  const params = [];

  if (dosenId) {
    params.push(dosenId);
    query += ` AND (
      ta_pengajuan_sk.sk_pembimbing_1 = $1 OR
      ta_pengajuan_sk.sk_pembimbing_2 = $1 OR
      ta_pengajuan_sk.sk_pembimbing_3 = $1 OR
      ta_pengajuan_sk.kepala_lab = $1 OR
      ta_pendaftaran_kolokium.kolo_pembimbing_1 = $1 OR
      ta_pendaftaran_kolokium.kolo_pembimbing_2 = $1 OR
      ta_pendaftaran_kolokium.kolo_pembimbing_3 = $1 OR
      ta_pendaftaran_kolokium.kolo_kepala_lab = $1 OR
      ta_pendaftaran_kolokium.evaluator_1 = $1 OR
      ta_pendaftaran_kolokium.evaluator_2 = $1 OR
      ta_pendaftaran_sidang.sidang_pembimbing_1 = $1 OR
      ta_pendaftaran_sidang.sidang_pembimbing_2 = $1 OR
      ta_pendaftaran_sidang.sidang_pembimbing_3 = $1 OR
      ta_pendaftaran_sidang.sidang_kepala_lab = $1 OR
      ta_pendaftaran_sidang.penguji_1 = $1 OR
      ta_pendaftaran_sidang.penguji_2 = $1
    )`;
  }

  const result = await DB.query(query, params);
  const rows = result.rows;

  const koloIds = rows.map((r) => r.kolo_id).filter(Boolean);
  const sidangIds = rows.map((r) => r.sidang_id).filter(Boolean);

  let penilaianMap = {};
  if (koloIds.length > 0) {
    const q = await DB.query(
      `SELECT kolo_id, COUNT(*) AS count FROM ta_penilaian_kolokium WHERE kolo_id = ANY($1::int[]) GROUP BY kolo_id`,
      [koloIds]
    );
    penilaianMap = Object.fromEntries(q.rows.map((r) => [r.kolo_id, parseInt(r.count, 10)]));
  }

  let penilaianSidangMap = {};
  if (sidangIds.length > 0) {
    const q = await DB.query(
      `SELECT sidang_id, COUNT(*) AS count FROM ta_penilaian_sidang WHERE sidang_id = ANY($1::int[]) GROUP BY sidang_id`,
      [sidangIds]
    );
    penilaianSidangMap = Object.fromEntries(q.rows.map((r) => [r.sidang_id, parseInt(r.count, 10)]));
  }

  return rows.map((row) => {
    let statusDospem = "Belum Acc";
    if (row.status === "pengajuan-sk") {
      if (row.sk_status_pem_1 && row.sk_status_pem_2 && row.status_kepala_lab) {
        statusDospem = "ACC";
      }
    } else if (row.status === "menuju-kolokium") {
      if (row.kolo_status_pem_1 && row.kolo_status_pem_2) statusDospem = "ACC";
    } else if (row.status === "menuju-sidang") {
      if (row.sidang_status_pem_1 && row.sidang_status_pem_2) statusDospem = "ACC";
    } else if (row.status === "menyelesaikan-revisi" || row.status === "selesai") {
      statusDospem = "ACC";
    }

    let peran = null;
    if (dosenId) {
      const peranList = [];
      if (row.sk_pembimbing_1 === dosenId) peranList.push("SK Pembimbing 1");
      if (row.sk_pembimbing_2 === dosenId) peranList.push("SK Pembimbing 2");
      if (row.sk_pembimbing_3 === dosenId) peranList.push("SK Pembimbing 3");
      if (row.kepala_lab === dosenId) peranList.push("Kepala Lab");
      if (row.kolo_pembimbing_1 === dosenId) peranList.push("Pembimbing Kolokium 1");
      if (row.kolo_pembimbing_2 === dosenId) peranList.push("Pembimbing Kolokium 2");
      if (row.kolo_pembimbing_3 === dosenId) peranList.push("Pembimbing Kolokium 3");
      if (row.kolo_kepala_lab === dosenId) peranList.push("Kepala Lab Kolokium");
      if (row.evaluator_1 === dosenId) peranList.push("Evaluator 1");
      if (row.evaluator_2 === dosenId) peranList.push("Evaluator 2");
      if (row.sidang_pembimbing_1 === dosenId) peranList.push("Pembimbing Sidang 1");
      if (row.sidang_pembimbing_2 === dosenId) peranList.push("Pembimbing Sidang 2");
      if (row.sidang_pembimbing_3 === dosenId) peranList.push("Pembimbing Sidang 3");
      if (row.sidang_kepala_lab === dosenId) peranList.push("Kepala Lab Sidang");
      if (row.penguji_1 === dosenId) peranList.push("Penguji 1");
      if (row.penguji_2 === dosenId) peranList.push("Penguji 2");
      peran = peranList.join(" | ");
    }

    return {
      id: row.id,
      source: "legacy",
      nama_lengkap: row.nama_lengkap,
      npm: row.npm,
      skema: "Skripsi",
      status: row.status,
      semester: row.semester,
      judul: row.judul_skripsi,
      status_dospem: statusDospem,
      peran,
      status_approved: row.status_approved,
      status_approved_kolo: row.status_approved_kolo,
      status_approved_sidang: row.status_approved_sidang,
      status_penilaian: !!(penilaianMap[row.kolo_id] >= 1 && penilaianMap[row.kolo_id] <= 5),
      status_penilaian_sidang: !!(
        penilaianSidangMap[row.sidang_id] >= 1 && penilaianSidangMap[row.sidang_id] <= 5
      ),
    };
  });
}

// Baris dari sistem DINAMIS (Tahapan TA baru) disusun ke bentuk yang sama.
// SENGAJA tidak difilter by status - baris yang sudah 'selesai' tetap harus
// tampil (jadi rekap riwayat akademik), beda dgn index()/indexForDosen() di
// bawah yang default-nya cuma 'berjalan' (dipakai di tempat lain).
async function fetchDynamicRowsGabungan(dosenId = null) {
  const condition = {};
  if (dosenId) {
    condition[Op.or] = [
      { "$pengajuan.pembimbing_1$": dosenId },
      { "$pengajuan.pembimbing_2$": dosenId },
      { "$pengajuan.kepala_lab$": dosenId },
    ];
  }

  const allRows = await TaPelaksanaan.findAll({
    where: condition,
    include: includeRelations,
    order: [["id", "DESC"]],
  });

  // Jaga-jaga kalau Pengajuan terkait sudah dihapus (admin hapus Pengajuan
  // TA tanpa membereskan Pelaksanaan TA-nya dulu) - baris begini tidak ada
  // apa pun yang bisa ditampilkan, lebih baik disembunyikan drpd tampil "-"
  // di semua kolom.
  const rows = allRows.filter((r) => r.pengajuan);

  // Daftar tahapan per (prodi, skema) - dipakai FE utk dropdown aksi (gerigi)
  // persis spt baris lama, isinya nama2 tahapan bukan status tetap. Dibatch
  // per pasangan unik supaya tidak query berulang utk mahasiswa di skema yg
  // sama.
  const tahapanCache = new Map();
  async function getTahapanList(prodiId, skemaId) {
    const key = `${prodiId}|${skemaId}`;
    if (!tahapanCache.has(key)) {
      const list = await TaTahapan.findAll({
        where: { prodi_id: prodiId, skema_id: skemaId },
        order: [["id", "ASC"]],
      });
      tahapanCache.set(
        key,
        list.map((t) => ({ id: t.id, nama_tahapan: t.nama_tahapan }))
      );
    }
    return tahapanCache.get(key);
  }

  const mapped = [];
  for (const r of rows) {
    let peran = null;
    if (dosenId) {
      const peranList = [];
      if (r.pengajuan?.pembimbing_1 === dosenId) peranList.push("Pembimbing 1");
      if (r.pengajuan?.pembimbing_2 === dosenId) peranList.push("Pembimbing 2");
      if (r.pengajuan?.kepala_lab === dosenId) peranList.push("Kepala Lab");
      peran = peranList.join(" | ");
    }

    const tahapanList = r.tahapan
      ? await getTahapanList(r.tahapan.prodi_id, r.tahapan.skema_id)
      : [];

    mapped.push({
      id: r.id,
      source: "dinamis",
      nama_lengkap: r.mahasiswa?.personal_data?.nama_lengkap || "-",
      npm: r.pengajuan?.npm || "-",
      skema: r.tahapan?.skema?.nama_skema || "-",
      status: r.tahapan?.nama_tahapan || "-",
      semester: r.pengajuan?.semester || "-",
      judul: r.pengajuan?.judul || "-",
      status_dospem: "-",
      peran,
      pelaksanaan_status: r.status,
      tahapan_id: r.tahapan_id,
      tahapan_list: tahapanList,
    });
  }

  return mapped;
}

// Kalau salah satu sisi gagal (mis. skema tabel lama berubah lagi), tabel
// gabungan tetap tampil dgn sisi yang berhasil - bukan 500 total - supaya 1
// sumber data yang bermasalah tidak membuat admin kehilangan akses ke sisi
// yang satunya lagi.
async function settledRows(promise, label) {
  try {
    return await promise;
  } catch (error) {
    console.error(`[pelaksanaan-gabungan] gagal ambil baris ${label}:`, error.message);
    return [];
  }
}

class PelaksanaanController {
  static index = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, status } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "id";
      orderBy = orderBy ? orderBy : "DESC";
      const pagelimit = getPagination(limit, page);

      const condition = {};
      condition.status = status || "berjalan";

      if (search) {
        condition[Op.or] = [
          { "$mahasiswa.personal_data.nama_lengkap$": { [Op.iLike]: `%${search}%` } },
          { "$pengajuan.npm$": { [Op.iLike]: `%${search}%` } },
        ];
      }

      const data = await TaPelaksanaan.findAndCountAll({
        distinct: true,
        where: condition,
        order: [[order, orderBy]],
        limit: pagelimit.limit,
        offset: pagelimit.offset,
        include: includeRelations,
      });

      return response(res, true, "success", {
        limit,
        page,
        total: data.count,
        total_page: Math.ceil(parseInt(data.count) / limit),
        rows: data.rows,
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;
      const data = await TaPelaksanaan.findOne({
        where: { id },
        include: includeRelations,
      });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const kelengkapan = await getKelengkapanWithIsian(data.tahapan_id, data.id);

      return response(res, true, "success", { ...data.toJSON(), kelengkapan });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Dosen cuma boleh lihat mahasiswa yang dia bimbing (pembimbing_1/2 atau kepala
  // lab di pengajuan TA terkait) - read-only, tidak bisa advance (itu wewenang admin).
  static indexForDosen = async (req, res) => {
    try {
      const dosenId = req.user.user_id;
      let { limit, page, order, orderBy, search, status } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "id";
      orderBy = orderBy ? orderBy : "DESC";
      const pagelimit = getPagination(limit, page);

      const condition = {
        status: status || "berjalan",
        [Op.or]: [
          { "$pengajuan.pembimbing_1$": dosenId },
          { "$pengajuan.pembimbing_2$": dosenId },
          { "$pengajuan.kepala_lab$": dosenId },
        ],
      };

      if (search) {
        condition[Op.and] = [
          {
            [Op.or]: [
              { "$mahasiswa.personal_data.nama_lengkap$": { [Op.iLike]: `%${search}%` } },
              { "$pengajuan.npm$": { [Op.iLike]: `%${search}%` } },
            ],
          },
        ];
      }

      const data = await TaPelaksanaan.findAndCountAll({
        distinct: true,
        where: condition,
        order: [[order, orderBy]],
        limit: pagelimit.limit,
        offset: pagelimit.offset,
        include: includeRelations,
      });

      return response(res, true, "success", {
        limit,
        page,
        total: data.count,
        total_page: Math.ceil(parseInt(data.count) / limit),
        rows: data.rows,
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static detailForDosen = async (req, res) => {
    try {
      const dosenId = req.user.user_id;
      const { id } = req.params;

      const data = await TaPelaksanaan.findOne({
        where: {
          id,
          [Op.or]: [
            { "$pengajuan.pembimbing_1$": dosenId },
            { "$pengajuan.pembimbing_2$": dosenId },
            { "$pengajuan.kepala_lab$": dosenId },
          ],
        },
        include: includeRelations,
      });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const kelengkapan = await getKelengkapanWithIsian(data.tahapan_id, data.id);

      return response(res, true, "success", { ...data.toJSON(), kelengkapan });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Kelengkapan utk SATU tahapan tertentu, boleh bukan tahapan yang sedang
  // berjalan (mis. tahapan yang sudah lewat, utk audit/rekap). Dipakai halaman
  // detail tahapan di tabel gabungan (gerigi -> pilih nama tahapan -> halaman
  // ini), menggantikan modal "Lihat Kelengkapan" yang cuma bisa tahapan
  // berjalan.
  static tahapanDetail = async (req, res) => {
    try {
      const { id, tahapanId } = req.params;
      const data = await TaPelaksanaan.findOne({
        where: { id },
        include: includeRelations,
      });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const tahapan = await TaTahapan.findOne({ where: { id: tahapanId } });
      if (!tahapan) {
        return response(res, false, "Tahapan tidak ditemukan", null, 404);
      }

      const kelengkapan = await getKelengkapanWithIsian(tahapan.id, data.id);
      const isCurrentTahapan = Number(data.tahapan_id) === Number(tahapanId);

      return response(res, true, "success", {
        pelaksanaan_id: data.id,
        pelaksanaan_status: data.status,
        tahapan: { id: tahapan.id, nama_tahapan: tahapan.nama_tahapan },
        is_current_tahapan: isCurrentTahapan,
        can_advance: isCurrentTahapan && data.status === "berjalan",
        mahasiswa: data.mahasiswa,
        pengajuan: data.pengajuan,
        kelengkapan,
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static tahapanDetailForDosen = async (req, res) => {
    try {
      const dosenId = req.user.user_id;
      const { id, tahapanId } = req.params;
      const data = await TaPelaksanaan.findOne({
        where: {
          id,
          [Op.or]: [
            { "$pengajuan.pembimbing_1$": dosenId },
            { "$pengajuan.pembimbing_2$": dosenId },
            { "$pengajuan.kepala_lab$": dosenId },
          ],
        },
        include: includeRelations,
      });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const tahapan = await TaTahapan.findOne({ where: { id: tahapanId } });
      if (!tahapan) {
        return response(res, false, "Tahapan tidak ditemukan", null, 404);
      }

      const kelengkapan = await getKelengkapanWithIsian(tahapan.id, data.id);

      return response(res, true, "success", {
        pelaksanaan_id: data.id,
        pelaksanaan_status: data.status,
        tahapan: { id: tahapan.id, nama_tahapan: tahapan.nama_tahapan },
        is_current_tahapan: Number(data.tahapan_id) === Number(tahapanId),
        can_advance: false,
        mahasiswa: data.mahasiswa,
        pengajuan: data.pengajuan,
        kelengkapan,
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Soft-delete - data Pelaksanaan TA jadi rekap akademik, jadi dihapus harus
  // sengaja (lewat tombol ini), bukan otomatis hilang begitu status='selesai'.
  static destroy = async (req, res) => {
    try {
      const { id } = req.params;
      await TaPelaksanaan.update({ deleted_at: new Date() }, { where: { id } });
      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static advance = async (req, res) => {
    try {
      const { id } = req.params;
      const pelaksanaan = await TaPelaksanaan.findOne({ where: { id } });

      if (!pelaksanaan) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      if (pelaksanaan.status !== "berjalan") {
        return response(res, false, "Pelaksanaan ini sudah selesai", null, 400);
      }

      const currentTahapan = await TaTahapan.findOne({ where: { id: pelaksanaan.tahapan_id } });
      if (!currentTahapan) {
        return response(res, false, "Tahapan saat ini tidak ditemukan", null, 404);
      }

      const nextTahapan = await TaTahapan.findOne({
        where: {
          prodi_id: currentTahapan.prodi_id,
          skema_id: currentTahapan.skema_id,
          id: { [Op.gt]: currentTahapan.id },
        },
        order: [["id", "ASC"]],
      });

      if (nextTahapan) {
        await TaPelaksanaan.update(
          { tahapan_id: nextTahapan.id, updated_at: new Date() },
          { where: { id } }
        );
        return response(res, true, `Lanjut ke tahapan: ${nextTahapan.nama_tahapan}`, {
          tahapan_id: nextTahapan.id,
          status: "berjalan",
        });
      }

      await TaPelaksanaan.update(
        { status: "selesai", updated_at: new Date() },
        { where: { id } }
      );
      return response(res, true, "Tahapan terakhir selesai, pelaksanaan TA ditandai selesai", {
        status: "selesai",
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static myCurrent = async (req, res) => {
    try {
      const data = await TaPelaksanaan.findOne({
        where: { mhs_id: req.user.user_id, status: "berjalan" },
        order: [["id", "DESC"]],
        include: includeRelations,
      });

      if (!data) {
        return response(res, true, "success", null);
      }

      const kelengkapan = await getKelengkapanWithIsian(data.tahapan_id, data.id);

      return response(res, true, "success", { ...data.toJSON(), kelengkapan });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static submitKelengkapan = async (req, res) => {
    try {
      const items = Array.isArray(req.body.items) ? req.body.items : [];

      const pelaksanaan = await TaPelaksanaan.findOne({
        where: { mhs_id: req.user.user_id, status: "berjalan" },
        order: [["id", "DESC"]],
      });

      if (!pelaksanaan) {
        return response(res, false, "Tidak ada pelaksanaan TA yang sedang berjalan", null, 404);
      }

      const now = new Date();
      for (const item of items) {
        const def = await TaKelengkapan.findOne({
          where: { id: item.kelengkapan_id, tahapan_id: pelaksanaan.tahapan_id },
        });
        if (!def) continue;

        const existing = await TaPelaksanaanKelengkapan.findOne({
          where: { pelaksanaan_id: pelaksanaan.id, kelengkapan_id: item.kelengkapan_id },
        });

        if (existing) {
          await TaPelaksanaanKelengkapan.update(
            { isian: item.isian || null, updated_at: now },
            { where: { id: existing.id } }
          );
        } else {
          await TaPelaksanaanKelengkapan.create({
            pelaksanaan_id: pelaksanaan.id,
            kelengkapan_id: item.kelengkapan_id,
            isian: item.isian || null,
            created_at: now,
            updated_at: now,
          });
        }
      }

      const kelengkapan = await getKelengkapanWithIsian(pelaksanaan.tahapan_id, pelaksanaan.id);
      return response(res, true, "Kelengkapan berhasil disimpan", { kelengkapan });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Satu tabel gabungan (sistem lama + dinamis) dgn kolom "skema" - lama selalu
  // "Skripsi", dinamis sesuai nama_skema aslinya. Dibuat spy admin tidak perlu
  // lagi pindah tab utk lihat semua mahasiswa TA. Paginasi/pencarian dilakukan
  // di memori (bukan SQL) krn menggabungkan 2 sumber data yang skemanya beda
  // total - volume baris (~ratusan) aman utk ini.
  static indexGabungan = async (req, res) => {
    try {
      let { limit, page, search } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;

      const [legacyRows, dynamicRows] = await Promise.all([
        settledRows(fetchLegacyRowsGabungan(), "lama"),
        settledRows(fetchDynamicRowsGabungan(), "dinamis"),
      ]);

      let merged = [...dynamicRows, ...legacyRows];

      if (search) {
        const s = search.toLowerCase();
        merged = merged.filter(
          (r) =>
            (r.nama_lengkap || "").toLowerCase().includes(s) ||
            (r.npm || "").toLowerCase().includes(s) ||
            (r.judul || "").toLowerCase().includes(s)
        );
      }

      const total = merged.length;
      const offset = (page - 1) * limit;
      const rows = merged.slice(offset, offset + limit);

      return response(res, true, "success", {
        limit,
        page,
        total,
        total_page: Math.ceil(total / limit),
        rows,
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Sama seperti indexGabungan, tapi dibatasi ke mahasiswa yang dosen ini
  // terlibat (pembimbing/kepala lab/evaluator/penguji, di salah satu sistem).
  static indexGabunganForDosen = async (req, res) => {
    try {
      const dosenId = req.user.user_id;
      let { limit, page, search } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;

      const [legacyRows, dynamicRows] = await Promise.all([
        settledRows(fetchLegacyRowsGabungan(dosenId), "lama"),
        settledRows(fetchDynamicRowsGabungan(dosenId), "dinamis"),
      ]);

      let merged = [...dynamicRows, ...legacyRows];

      if (search) {
        const s = search.toLowerCase();
        merged = merged.filter(
          (r) =>
            (r.nama_lengkap || "").toLowerCase().includes(s) ||
            (r.npm || "").toLowerCase().includes(s) ||
            (r.judul || "").toLowerCase().includes(s)
        );
      }

      const total = merged.length;
      const offset = (page - 1) * limit;
      const rows = merged.slice(offset, offset + limit);

      return response(res, true, "success", {
        limit,
        page,
        total,
        total_page: Math.ceil(total / limit),
        rows,
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = PelaksanaanController;
