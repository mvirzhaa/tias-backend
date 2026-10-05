const { Op } = require("sequelize");
const DB = require("../../database");
const { response } = require("../../lib/response");
const { getPagination } = require("../../lib/pagination-parser");
const TaPelaksanaan = require("../../models/master-ta/TaPelaksanaan");
const TaTahapan = require("../../models/master-ta/TaTahapan");
const TaSkema = require("../../models/master-ta/TaSkema");
const TaKelengkapan = require("../../models/master-ta/TaKelengkapan");
const TaPelaksanaanKelengkapan = require("../../models/master-ta/TaPelaksanaanKelengkapan");
const TaPelaksanaanTahapanMeta = require("../../models/master-ta/TaPelaksanaanTahapanMeta");
const TaKomponenPenilaian = require("../../models/master-ta/TaKomponenPenilaian");
const TaPelaksanaanPenilaian = require("../../models/master-ta/TaPelaksanaanPenilaian");
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

// Nama dosen utk sekumpulan user_id (dipakai menampilkan nama Pembimbing
// 1/2/Kepala Lab dari Pengajuan TA & Evaluator 1/2 dari meta tahapan) - query
// terpisah drpd nambah include dalam2 ke includeRelations yang dipakai banyak
// method lain.
async function getDosenNamesMap(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length < 1) return {};

  const users = await User.findAll({
    where: { user_id: ids },
    include: { model: DataPribadi, as: "personal_data", required: false },
  });

  return Object.fromEntries(
    users.map((u) => [u.user_id, u.personal_data?.nama_lengkap || null])
  );
}

// Versi lebih lengkap dari getDosenNamesMap - dipakai Berita Acara (FE butuh
// nip & ttd dosen jg utk blok tanda-tangan per dosen, bukan cuma nama).
async function getDosenDetailMap(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length < 1) return {};

  const users = await User.findAll({
    where: { user_id: ids },
    include: { model: DataPribadi, as: "personal_data", required: false },
  });

  return Object.fromEntries(
    users.map((u) => [
      u.user_id,
      {
        nama: u.personal_data?.nama_lengkap || null,
        nip: u.personal_data?.nip || null,
        ttd: u.personal_data?.ttd || null,
      },
    ])
  );
}

const EMPTY_META = {
  jadwal_pelaksanaan: null,
  evaluator_1: null,
  evaluator_2: null,
  acc_pembimbing_1: false,
  acc_pembimbing_2: false,
  acc_kepala_lab: false,
  status_kp: false,
  status_sks_ipk: false,
  jumlah_sks: null,
  ipk: null,
};

// Komponen penilaian (TaKomponenPenilaian) berbobot per tahapan sudah admin-configurable
// (lihat penilaianController.js). Di sini kita gabungkan dengan nilai yang sudah diisi
// dosen (TaPelaksanaanPenilaian) untuk satu (pelaksanaan, tahapan), dan hitung nilai
// akhir berbobot per dosen on-the-fly (tidak disimpan) — tidak ada agregasi lintas-dosen,
// itu keputusan bisnis yang belum diminta.
async function getPenilaianWithNilai(tahapanId, pelaksanaanId) {
  const komponen = await TaKomponenPenilaian.findAll({
    where: { tahapan_id: tahapanId },
    order: [["id", "ASC"]],
  });

  const nilaiRows = await TaPelaksanaanPenilaian.findAll({
    where: { pelaksanaan_id: pelaksanaanId, tahapan_id: tahapanId },
    include: [
      {
        model: User,
        as: "dosen",
        required: false,
        include: { model: DataPribadi, as: "personal_data", required: false },
      },
    ],
  });

  const byDosen = new Map();
  for (const row of nilaiRows) {
    if (!byDosen.has(row.dosen_id)) {
      byDosen.set(row.dosen_id, {
        dosen_id: row.dosen_id,
        nama: row.dosen?.personal_data?.nama_lengkap || null,
        items: [],
      });
    }
    byDosen.get(row.dosen_id).items.push({
      komponen_id: row.komponen_id,
      nilai: Number(row.nilai),
    });
  }

  const nilai_per_dosen = Array.from(byDosen.values()).map((d) => {
    const nilai_akhir = komponen.reduce((sum, k) => {
      const item = d.items.find((i) => i.komponen_id === k.id);
      return item ? sum + (item.nilai * Number(k.bobot)) / 100 : sum;
    }, 0);
    return { ...d, nilai_akhir };
  });

  return { komponen, nilai_per_dosen };
}

const isPengajuanNama = (nama) => (nama || "").trim().toLowerCase().startsWith("pengajuan ");

// Tahapan "X" (bukan "Pengajuan X") itu TAMPILAN ULANG dari pasangannya "Pengajuan
// X" - mahasiswa isi kelengkapan & admin isi jadwal/evaluator/ACC di "Pengajuan X",
// lalu di "X" data itu ditampilkan lagi (read-only) sementara dosen/evaluator
// menilai & cetak Berita Acara. Dicari by (prodi_id, skema_id, nama persis
// "Pengajuan {nama tahapan ini}") - bukan FK eksplisit, krn pasangan ini sepenuhnya
// konvensi penamaan dari tahapanController#create, bukan relasi di skema DB. Kalau
// pasangannya tidak ketemu (admin hapus manual / tahapan ini sendiri "Pengajuan X"
// atau "Pengumpulan Revisi"), fallback ke tahapan itu sendiri - endpoint tidak
// pernah gagal total krn pasangan ini sifatnya opsional/bisa hilang.
async function resolveKelengkapanTahapan(tahapan) {
  if (isPengajuanNama(tahapan.nama_tahapan)) return tahapan;
  const pasangan = await TaTahapan.findOne({
    where: {
      prodi_id: tahapan.prodi_id,
      skema_id: tahapan.skema_id,
      nama_tahapan: `Pengajuan ${tahapan.nama_tahapan}`,
    },
  });
  return pasangan || tahapan;
}

// Dosen boleh isi Penilaian kalau dia pembimbing_1/2/kepala_lab di Pengajuan TA
// terkait, ATAU evaluator_1/2 yang ditugaskan admin utk tahapan ini secara khusus
// (lihat TaPelaksanaanTahapanMeta) — lebih longgar drpd gerbang ACC yang cuma
// pembimbing_1/2/kepala_lab.
function isDosenTerkaitTahapan(pengajuan, meta, userId) {
  if (!userId) return false;
  return [
    pengajuan?.pembimbing_1,
    pengajuan?.pembimbing_2,
    pengajuan?.kepala_lab,
    meta?.evaluator_1,
    meta?.evaluator_2,
  ].includes(userId);
}

// GET murni baca - kalau belum pernah disentuh admin, baris memang belum ada
// di DB sama sekali, jadi dikembalikan nilai kosong tanpa menulis apa pun.
async function getMetaOrDefault(pelaksanaanId, tahapanId) {
  const meta = await TaPelaksanaanTahapanMeta.findOne({
    where: { pelaksanaan_id: pelaksanaanId, tahapan_id: tahapanId },
  });
  return meta ? meta.toJSON() : { ...EMPTY_META, pelaksanaan_id: pelaksanaanId, tahapan_id: tahapanId };
}

// Dipakai PUT /meta - baris baru dibuat on-demand saat admin pertama kali
// menyimpan sesuatu utk (pelaksanaan, tahapan) itu.
async function upsertMeta(pelaksanaanId, tahapanId, fields) {
  const existing = await TaPelaksanaanTahapanMeta.findOne({
    where: { pelaksanaan_id: pelaksanaanId, tahapan_id: tahapanId },
  });
  if (existing) {
    await TaPelaksanaanTahapanMeta.update(
      { ...fields, updated_at: new Date() },
      { where: { id: existing.id } }
    );
    return TaPelaksanaanTahapanMeta.findOne({ where: { id: existing.id } });
  }
  return TaPelaksanaanTahapanMeta.create({
    pelaksanaan_id: pelaksanaanId,
    tahapan_id: tahapanId,
    ...fields,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

// Baca-saja, mengambil baris dari sistem LAMA (ta_pengajuan_sk) dan menyusunnya
// ke bentuk yang sama dgn baris dinamis, supaya admin/dosen bisa lihat SATU
// tabel gabungan (kolom "Skema") alih-alih 2 tab terpisah. Query & logika
// statusDospem SENGAJA diduplikasi dari controllers/bimbingan/tugasAkhirController.js
// (getForAdmin/getForDosen) - bukan memanggilnya - supaya endpoint lama itu
// sendiri nol diubah/berisiko. Pakai parameterized query (bukan interpolasi
// string spt kode lama) utk dosenId.
async function fetchLegacyRowsGabungan(dosenId = null, mhsId = null) {
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

  if (mhsId) {
    params.push(mhsId);
    query += ` AND ta_pengajuan_sk.mhs_id = $${params.length}`;
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
async function fetchDynamicRowsGabungan(dosenId = null, mhsId = null) {
  const condition = {};
  if (dosenId) {
    condition[Op.or] = [
      { "$pengajuan.pembimbing_1$": dosenId },
      { "$pengajuan.pembimbing_2$": dosenId },
      { "$pengajuan.kepala_lab$": dosenId },
    ];
  }
  if (mhsId) {
    condition.mhs_id = mhsId;
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
        order: [["urutan", "ASC"]],
      });
      tahapanCache.set(
        key,
        list.map((t) => ({ id: t.id, nama_tahapan: t.nama_tahapan, urutan: t.urutan }))
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
      current_urutan: r.tahapan?.urutan ?? null,
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

      const kelengkapanTahapan = await resolveKelengkapanTahapan(tahapan);
      const kelengkapan = await getKelengkapanWithIsian(kelengkapanTahapan.id, data.id);
      const isCurrentTahapan = Number(data.tahapan_id) === Number(tahapanId);
      const meta = await getMetaOrDefault(data.id, kelengkapanTahapan.id);

      const namesMap = await getDosenNamesMap([
        data.pengajuan?.pembimbing_1,
        data.pengajuan?.pembimbing_2,
        data.pengajuan?.kepala_lab,
        meta.evaluator_1,
        meta.evaluator_2,
      ]);

      // ACC cuma relevan di tahapan "Pengajuan X" (gerbang masuk ke pasangannya).
      // Pas lagi lihat "X" sendiri, ACC sudah lunas dari pasangannya - tidak perlu
      // digerbang ulang, sama seperti advance() (lihat di bawah).
      const isPengajuanStage = isPengajuanNama(tahapan.nama_tahapan);
      const accComplete = !isPengajuanStage
        ? true
        : !!meta.acc_pembimbing_1 &&
          !!meta.acc_kepala_lab &&
          (!data.pengajuan?.pembimbing_2 || !!meta.acc_pembimbing_2);

      return response(res, true, "success", {
        pelaksanaan_id: data.id,
        pelaksanaan_status: data.status,
        tahapan: { id: tahapan.id, nama_tahapan: tahapan.nama_tahapan },
        kelengkapan_tahapan: { id: kelengkapanTahapan.id, nama_tahapan: kelengkapanTahapan.nama_tahapan },
        is_kelengkapan_tahapan_sendiri: kelengkapanTahapan.id === tahapan.id,
        is_current_tahapan: isCurrentTahapan,
        can_advance: isCurrentTahapan && data.status === "berjalan" && accComplete,
        acc_complete: accComplete,
        mahasiswa: data.mahasiswa,
        pengajuan: data.pengajuan,
        pembimbing_names: {
          pembimbing_1: namesMap[data.pengajuan?.pembimbing_1] || null,
          pembimbing_2: namesMap[data.pengajuan?.pembimbing_2] || null,
          kepala_lab: namesMap[data.pengajuan?.kepala_lab] || null,
        },
        kelengkapan,
        meta: {
          jadwal_pelaksanaan: meta.jadwal_pelaksanaan,
          evaluator_1: meta.evaluator_1,
          evaluator_1_nama: namesMap[meta.evaluator_1] || null,
          evaluator_2: meta.evaluator_2,
          evaluator_2_nama: namesMap[meta.evaluator_2] || null,
          acc_pembimbing_1: meta.acc_pembimbing_1,
          acc_pembimbing_2: meta.acc_pembimbing_2,
          acc_kepala_lab: meta.acc_kepala_lab,
          status_kp: meta.status_kp,
          status_sks_ipk: meta.status_sks_ipk,
          jumlah_sks: meta.jumlah_sks,
          ipk: meta.ipk,
        },
        penilaian: await getPenilaianWithNilai(tahapan.id, data.id),
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

      const kelengkapanTahapan = await resolveKelengkapanTahapan(tahapan);
      const kelengkapan = await getKelengkapanWithIsian(kelengkapanTahapan.id, data.id);
      const meta = await getMetaOrDefault(data.id, kelengkapanTahapan.id);

      const namesMap = await getDosenNamesMap([
        data.pengajuan?.pembimbing_1,
        data.pengajuan?.pembimbing_2,
        data.pengajuan?.kepala_lab,
        meta.evaluator_1,
        meta.evaluator_2,
      ]);

      return response(res, true, "success", {
        pelaksanaan_id: data.id,
        pelaksanaan_status: data.status,
        tahapan: { id: tahapan.id, nama_tahapan: tahapan.nama_tahapan },
        kelengkapan_tahapan: { id: kelengkapanTahapan.id, nama_tahapan: kelengkapanTahapan.nama_tahapan },
        is_kelengkapan_tahapan_sendiri: kelengkapanTahapan.id === tahapan.id,
        is_current_tahapan: Number(data.tahapan_id) === Number(tahapanId),
        can_advance: false,
        mahasiswa: data.mahasiswa,
        pengajuan: data.pengajuan,
        pembimbing_names: {
          pembimbing_1: namesMap[data.pengajuan?.pembimbing_1] || null,
          pembimbing_2: namesMap[data.pengajuan?.pembimbing_2] || null,
          kepala_lab: namesMap[data.pengajuan?.kepala_lab] || null,
        },
        kelengkapan,
        meta: {
          jadwal_pelaksanaan: meta.jadwal_pelaksanaan,
          evaluator_1: meta.evaluator_1,
          evaluator_1_nama: namesMap[meta.evaluator_1] || null,
          evaluator_2: meta.evaluator_2,
          evaluator_2_nama: namesMap[meta.evaluator_2] || null,
          acc_pembimbing_1: meta.acc_pembimbing_1,
          acc_pembimbing_2: meta.acc_pembimbing_2,
          acc_kepala_lab: meta.acc_kepala_lab,
          status_kp: meta.status_kp,
          status_sks_ipk: meta.status_sks_ipk,
          jumlah_sks: meta.jumlah_sks,
          ipk: meta.ipk,
        },
        penilaian: await getPenilaianWithNilai(tahapan.id, data.id),
      });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Mahasiswa lihat SATU tahapan miliknya sendiri - sama persis bentuknya dgn
  // tahapanDetailForDosen (jadwal/evaluator/checklist/ACC/penilaian read-only),
  // bedanya kelengkapan BOLEH diisi mahasiswa lewat submitKelengkapan yang
  // sudah ada kalau ini tahapan yang sedang berjalan (is_current_tahapan) -
  // FE yang menentukan form kelengkapan editable atau read-only berdasar flag
  // itu. IDOR-safe: scoped ke mhs_id = req.user.user_id, bukan ke pembimbing.
  static tahapanDetailForMahasiswa = async (req, res) => {
    try {
      const mhsId = req.user.user_id;
      const { tahapanId } = req.params;
      const data = await TaPelaksanaan.findOne({
        where: { id: req.params.id, mhs_id: mhsId },
        include: includeRelations,
      });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const tahapan = await TaTahapan.findOne({ where: { id: tahapanId } });
      if (!tahapan) {
        return response(res, false, "Tahapan tidak ditemukan", null, 404);
      }

      const kelengkapanTahapan = await resolveKelengkapanTahapan(tahapan);
      const kelengkapan = await getKelengkapanWithIsian(kelengkapanTahapan.id, data.id);
      const meta = await getMetaOrDefault(data.id, kelengkapanTahapan.id);

      const namesMap = await getDosenNamesMap([
        data.pengajuan?.pembimbing_1,
        data.pengajuan?.pembimbing_2,
        data.pengajuan?.kepala_lab,
        meta.evaluator_1,
        meta.evaluator_2,
      ]);

      return response(res, true, "success", {
        pelaksanaan_id: data.id,
        pelaksanaan_status: data.status,
        tahapan: { id: tahapan.id, nama_tahapan: tahapan.nama_tahapan },
        kelengkapan_tahapan: { id: kelengkapanTahapan.id, nama_tahapan: kelengkapanTahapan.nama_tahapan },
        is_kelengkapan_tahapan_sendiri: kelengkapanTahapan.id === tahapan.id,
        is_current_tahapan: Number(data.tahapan_id) === Number(tahapanId),
        can_advance: false,
        mahasiswa: data.mahasiswa,
        pengajuan: data.pengajuan,
        pembimbing_names: {
          pembimbing_1: namesMap[data.pengajuan?.pembimbing_1] || null,
          pembimbing_2: namesMap[data.pengajuan?.pembimbing_2] || null,
          kepala_lab: namesMap[data.pengajuan?.kepala_lab] || null,
        },
        kelengkapan,
        meta: {
          jadwal_pelaksanaan: meta.jadwal_pelaksanaan,
          evaluator_1: meta.evaluator_1,
          evaluator_1_nama: namesMap[meta.evaluator_1] || null,
          evaluator_2: meta.evaluator_2,
          evaluator_2_nama: namesMap[meta.evaluator_2] || null,
          acc_pembimbing_1: meta.acc_pembimbing_1,
          acc_pembimbing_2: meta.acc_pembimbing_2,
          acc_kepala_lab: meta.acc_kepala_lab,
          status_kp: meta.status_kp,
          status_sks_ipk: meta.status_sks_ipk,
          jumlah_sks: meta.jumlah_sks,
          ipk: meta.ipk,
        },
        penilaian: await getPenilaianWithNilai(tahapan.id, data.id),
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

      // Gerbang ACC: cuma relevan pas tahapan SAAT INI itu "Pengajuan X" (gerbang
      // masuk ke pasangannya "X"/Pelaksanaan) - Pembimbing 1, Pembimbing 2 (kalau
      // ada), dan Kepala Lab harus sudah dicentang ACC admin dulu (ACC-nya berupa
      // surat fisik, bukan dosen yang centang sendiri). Pas tahapan SAAT INI itu
      // "X" atau "Pengumpulan Revisi", ACC sudah lunas dari pasangannya waktu masuk
      // ke sini - tidak digerbang ulang saat KELUAR dari "X".
      if (isPengajuanNama(currentTahapan.nama_tahapan)) {
        const pengajuan = await TaPengajuan.findOne({ where: { id: pelaksanaan.pengajuan_id } });
        const meta = await getMetaOrDefault(pelaksanaan.id, currentTahapan.id);
        const accComplete =
          !!meta.acc_pembimbing_1 &&
          !!meta.acc_kepala_lab &&
          (!pengajuan?.pembimbing_2 || !!meta.acc_pembimbing_2);

        if (!accComplete) {
          return response(
            res,
            false,
            "Belum bisa lanjut - ACC Pembimbing 1/2 & Kepala Lab utk tahapan ini belum lengkap",
            null,
            400
          );
        }
      }

      const nextTahapan = await TaTahapan.findOne({
        where: {
          prodi_id: currentTahapan.prodi_id,
          skema_id: currentTahapan.skema_id,
          urutan: { [Op.gt]: currentTahapan.urutan },
        },
        order: [["urutan", "ASC"]],
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

  // Admin isi Jadwal Pelaksanaan, Evaluator 1/2, dan centang ACC Pembimbing
  // 1/2/Kepala Lab utk tahapan tertentu - partial update (field yang tidak
  // dikirim tidak ikut berubah), supaya form Jadwal/Evaluator dan checkbox
  // ACC bisa disimpan terpisah tanpa saling menimpa.
  static updateMeta = async (req, res) => {
    try {
      const { id, tahapanId } = req.params;
      const pelaksanaan = await TaPelaksanaan.findOne({ where: { id } });
      if (!pelaksanaan) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const tahapan = await TaTahapan.findOne({ where: { id: tahapanId } });
      if (!tahapan) {
        return response(res, false, "Tahapan tidak ditemukan", null, 404);
      }

      const booleanFields = [
        "acc_pembimbing_1",
        "acc_pembimbing_2",
        "acc_kepala_lab",
        "status_kp",
        "status_sks_ipk",
      ];
      const nullableFields = [
        "jadwal_pelaksanaan",
        "evaluator_1",
        "evaluator_2",
        "jumlah_sks",
        "ipk",
      ];
      const fields = {};
      for (const key of booleanFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          fields[key] = !!req.body[key];
        }
      }
      for (const key of nullableFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          fields[key] = req.body[key] || null;
        }
      }

      const meta = await upsertMeta(pelaksanaan.id, tahapan.id, fields);

      return response(res, true, "success", meta);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Dosen isi nilai per komponen (TaKomponenPenilaian) utk tahapan tertentu —
  // dosen_id SELALU dari token (req.user.user_id), tidak pernah dari body, jadi
  // tiap dosen cuma bisa menulis baris nilainya sendiri (isolasi by construction,
  // bukan whitelist kolom).
  static submitPenilaianTahapan = async (req, res) => {
    try {
      const dosenId = req.user.user_id;
      const { id, tahapanId } = req.params;
      const items = Array.isArray(req.body.items) ? req.body.items : [];

      const pelaksanaan = await TaPelaksanaan.findOne({ where: { id }, include: includeRelations });
      if (!pelaksanaan) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const tahapan = await TaTahapan.findOne({ where: { id: tahapanId } });
      if (!tahapan) {
        return response(res, false, "Tahapan tidak ditemukan", null, 404);
      }

      // Evaluator/pembimbing ditentukan admin di tahapan "Pengajuan X" (pasangan
      // tahapan ini) - gerbang terkait harus cek meta di situ, bukan di "X" sendiri
      // yang hampir pasti kosong.
      const kelengkapanTahapan = await resolveKelengkapanTahapan(tahapan);
      const meta = await getMetaOrDefault(pelaksanaan.id, kelengkapanTahapan.id);
      if (!isDosenTerkaitTahapan(pelaksanaan.pengajuan, meta, dosenId)) {
        return response(res, false, "Anda tidak terkait dengan pengajuan ini", null, 403);
      }

      const now = new Date();
      for (const item of items) {
        const komponen = await TaKomponenPenilaian.findOne({
          where: { id: item.komponen_id, tahapan_id: tahapan.id },
        });
        if (!komponen) continue;

        const existing = await TaPelaksanaanPenilaian.findOne({
          where: {
            pelaksanaan_id: pelaksanaan.id,
            tahapan_id: tahapan.id,
            komponen_id: item.komponen_id,
            dosen_id: dosenId,
          },
        });

        if (existing) {
          await TaPelaksanaanPenilaian.update(
            { nilai: item.nilai, updated_at: now },
            { where: { id: existing.id } }
          );
        } else {
          await TaPelaksanaanPenilaian.create({
            pelaksanaan_id: pelaksanaan.id,
            tahapan_id: tahapan.id,
            komponen_id: item.komponen_id,
            dosen_id: dosenId,
            nilai: item.nilai,
            created_at: now,
            updated_at: now,
          });
        }
      }

      const penilaian = await getPenilaianWithNilai(tahapan.id, pelaksanaan.id);
      return response(res, true, "Penilaian berhasil disimpan", penilaian);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Data utk cetak Berita Acara (dosen) di tahapan "X"/Pelaksanaan - meniru
  // getBeritaAcaraKolo/Sidang legacy (controllers/bimbingan/tugasAkhirController.js)
  // tapi sumbernya sistem dinamis: identitas mahasiswa dari pelaksanaan.mahasiswa/
  // pengajuan, jadwal+nama pembimbing/evaluator dari meta tahapan "Pengajuan X"
  // pasangannya, nilai dari tahapan ini sendiri. Kaprodi dicari query yang SAMA
  // PERSIS dgn legacy - filter m_unit.code di-hardcode 'FT_TI' sama spt legacy krn
  // belum ada mapping bersih dari prodi SIAK (kode_prodi) ke kode m_unit lawas;
  // kalau skema dinamis sudah dipakai prodi lain di luar FT/TI, filter ini perlu
  // diganti jadi resolve dari pengajuan.prodi_id.
  static getBeritaAcaraTahapan = async (req, res) => {
    try {
      const dosenId = req.user.user_id;
      const { id, tahapanId } = req.params;

      const pelaksanaan = await TaPelaksanaan.findOne({
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
      if (!pelaksanaan) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const tahapan = await TaTahapan.findOne({ where: { id: tahapanId } });
      if (!tahapan) {
        return response(res, false, "Tahapan tidak ditemukan", null, 404);
      }

      const kelengkapanTahapan = await resolveKelengkapanTahapan(tahapan);
      const meta = await getMetaOrDefault(pelaksanaan.id, kelengkapanTahapan.id);

      if (!isDosenTerkaitTahapan(pelaksanaan.pengajuan, meta, dosenId)) {
        return response(res, false, "Anda tidak terkait dengan pengajuan ini", null, 403);
      }

      const namesMap = await getDosenNamesMap([
        pelaksanaan.pengajuan?.pembimbing_1,
        pelaksanaan.pengajuan?.pembimbing_2,
        pelaksanaan.pengajuan?.kepala_lab,
        meta.evaluator_1,
        meta.evaluator_2,
      ]);
      const detailMap = await getDosenDetailMap([
        pelaksanaan.pengajuan?.pembimbing_1,
        pelaksanaan.pengajuan?.pembimbing_2,
        pelaksanaan.pengajuan?.kepala_lab,
        meta.evaluator_1,
        meta.evaluator_2,
      ]);

      const penilaian = await getPenilaianWithNilai(tahapan.id, pelaksanaan.id);

      let kaprodiData = null;
      try {
        const kaprodiResult = await DB.query(
          `SELECT tb_data_pribadi.nama_lengkap, tb_data_pribadi.nip, tb_data_pribadi.ttd
           FROM trx_user_jabatan_unit
           JOIN m_jabatan ON trx_user_jabatan_unit.jabatan_id = m_jabatan.id
           JOIN m_unit ON trx_user_jabatan_unit.unit_id = m_unit.id
           JOIN tb_data_pribadi ON trx_user_jabatan_unit.user_id = tb_data_pribadi.user_id
           WHERE trx_user_jabatan_unit.deleted_at IS NULL
             AND LOWER(m_jabatan.nama_jabatan) LIKE '%ketua program studi%'
             AND m_unit.code = 'FT_TI'
           LIMIT 1`
        );
        if (kaprodiResult.rows.length) kaprodiData = kaprodiResult.rows[0];
      } catch (err) {
        // kaprodi tidak ketemu - lanjut tanpa itu, sama spt legacy.
      }

      return response(res, true, "success", {
        nama_lengkap: pelaksanaan.mahasiswa?.personal_data?.nama_lengkap || null,
        npm: pelaksanaan.mahasiswa?.npm || pelaksanaan.pengajuan?.npm || null,
        email: pelaksanaan.mahasiswa?.email || null,
        no_hp: pelaksanaan.mahasiswa?.personal_data?.no_hp || null,
        judul_skripsi: pelaksanaan.pengajuan?.judul || null,
        semester: pelaksanaan.pengajuan?.semester || null,
        nama_tahapan: tahapan.nama_tahapan,
        jadwal_pelaksanaan: meta.jadwal_pelaksanaan,
        nama_pembimbing_1: namesMap[pelaksanaan.pengajuan?.pembimbing_1] || null,
        nama_pembimbing_2: namesMap[pelaksanaan.pengajuan?.pembimbing_2] || null,
        nama_kepala_lab: namesMap[pelaksanaan.pengajuan?.kepala_lab] || null,
        nama_evaluator_1: namesMap[meta.evaluator_1] || null,
        nama_evaluator_2: namesMap[meta.evaluator_2] || null,
        // Dipakai FE menyusun blok tanda-tangan per dosen (role + nip + ttd) -
        // dosen_id di sini cocok dgn dosen_id pada nilai_per_dosen di bawah.
        peran_dosen: [
          { role: "pembimbing_1", label: "Pembimbing I", dosen_id: pelaksanaan.pengajuan?.pembimbing_1 || null },
          { role: "pembimbing_2", label: "Pembimbing II", dosen_id: pelaksanaan.pengajuan?.pembimbing_2 || null },
          { role: "kepala_lab", label: "Kepala Lab", dosen_id: pelaksanaan.pengajuan?.kepala_lab || null },
          { role: "evaluator_1", label: "Evaluator I", dosen_id: meta.evaluator_1 || null },
          { role: "evaluator_2", label: "Evaluator II", dosen_id: meta.evaluator_2 || null },
        ].filter((p) => p.dosen_id),
        dosen_detail: detailMap,
        komponen: penilaian.komponen,
        nilai_per_dosen: penilaian.nilai_per_dosen,
        kaprodi: kaprodiData,
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

  // Daftar TA milik mahasiswa SENDIRI - satu mahasiswa bisa punya lebih dari
  // satu baris sekaligus (mis. sedang nyoba skema dinamis sambil masih punya
  // riwayat/baris di sistem lama) - makanya ini tabel+gerigi juga, bukan
  // langsung ambil "yang aktif" terus render 1 form (asumsi lama itu salah,
  // kebukti dari data production). Tidak dipaginasi - jumlah baris per
  // mahasiswa kecil (1-3), beda dgn indexGabungan/indexGabunganForDosen yang
  // lintas-mahasiswa.
  static indexGabunganForMahasiswa = async (req, res) => {
    try {
      const mhsId = req.user.user_id;

      const [legacyRows, dynamicRows] = await Promise.all([
        settledRows(fetchLegacyRowsGabungan(null, mhsId), "lama"),
        settledRows(fetchDynamicRowsGabungan(null, mhsId), "dinamis"),
      ]);

      return response(res, true, "success", { rows: [...dynamicRows, ...legacyRows] });
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = PelaksanaanController;
