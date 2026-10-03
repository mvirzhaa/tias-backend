const { Op } = require("sequelize");
const { response } = require("../../lib/response");
const { getPagination } = require("../../lib/pagination-parser");
const TaPengajuan = require("../../models/TugasAkhir/TaPengajuan");
const TaSkema = require("../../models/master-ta/TaSkema");
const TaTahapan = require("../../models/master-ta/TaTahapan");
const TaPelaksanaan = require("../../models/master-ta/TaPelaksanaan");
const SiakV2ProgramStudi = require("../../models/lms/SiakV2ProgramStudi");
const User = require("../../models/User");
const DataPribadi = require("../../models/DataPribadi");
const { createLegacyPengajuanSk } = require("../../lib/masterTa/legacyBridge");

const STATUS_OPTIONS = ["diajukan", "disetujui", "ditolak"];

// required:false di semua level (termasuk nested personal_data) WAJIB — tanpa ini
// Sequelize generate INNER JOIN, jadi baris ta_pengajuan hilang total dari hasil query
// setiap kali pembimbing_2 NULL (field opsional) atau dosen/skema terkait tidak match.
const includeRelations = [
  { model: TaSkema, as: "skema", required: false },
  { model: SiakV2ProgramStudi, as: "prodi", required: false },
  {
    model: User,
    as: "dosen_pembimbing_1",
    required: false,
    include: { model: DataPribadi, as: "personal_data", required: false },
  },
  {
    model: User,
    as: "dosen_pembimbing_2",
    required: false,
    include: { model: DataPribadi, as: "personal_data", required: false },
  },
  {
    model: User,
    as: "dosen_kepala_lab",
    required: false,
    include: { model: DataPribadi, as: "personal_data", required: false },
  },
];

// Saat pengajuan disetujui, otomatis buka Pelaksanaan TA di tahapan pertama (id
// terkecil) untuk (prodi_id, skema_id) pengajuan itu — "alur sepenuhnya dinamis
// sesuai Tahapan TA" (bukan dipaksa ke alur kolokium/sidang lama). Idempoten: tidak
// dobel-create kalau endpoint ini terpanggil ulang (klik 2x / re-approve).
// Best-effort: kalau skema belum punya tahapan sama sekali, approval tetap jalan,
// hanya dikembalikan sebagai warning (data master belum lengkap bukan salah user).
async function provisionPelaksanaan(pengajuan) {
  const existing = await TaPelaksanaan.findOne({
    where: { pengajuan_id: pengajuan.id },
  });
  if (existing) return null;

  if (!pengajuan.prodi_id) {
    return "Status disetujui, tapi Pelaksanaan TA tidak otomatis dibuat karena pengajuan ini belum punya Prodi (data lama).";
  }

  const firstTahapan = await TaTahapan.findOne({
    where: { prodi_id: pengajuan.prodi_id, skema_id: pengajuan.skema_id },
    order: [["urutan", "ASC"]],
  });

  if (!firstTahapan) {
    return "Status disetujui, tapi Pelaksanaan TA tidak otomatis dibuat karena skema ini belum punya Tahapan TA. Tambahkan Tahapan TA dulu lalu buat Pelaksanaan secara manual.";
  }

  await TaPelaksanaan.create({
    pengajuan_id: pengajuan.id,
    mhs_id: pengajuan.mhs_id,
    tahapan_id: firstTahapan.id,
    status: "berjalan",
    created_at: new Date(),
    updated_at: new Date(),
  });

  return null;
}

class PengajuanController {
  static create = async (req, res) => {
    try {
      const mhsId = req.user.user_id;
      const { npm, nama_lengkap, ipk, curr_code } = req.user;
      const {
        prodi_id,
        skema_id,
        judul,
        pembimbing_1,
        pembimbing_2,
        pembimbing_luar,
        kepala_lab,
        lokasi_kegiatan,
        semester,
      } = req.body;

      if (!prodi_id || !skema_id || !judul || !pembimbing_1 || !kepala_lab) {
        return response(
          res,
          false,
          "Prodi, skema, judul, pembimbing 1, dan kepala lab wajib diisi",
          null,
          400
        );
      }

      const skema = await TaSkema.findOne({ where: { id: skema_id } });
      if (!skema) {
        return response(res, false, "Skema tidak ditemukan", null, 400);
      }

      // Skema lama (is_legacy) = masuk ke pipeline kolokium/sidang yang sudah ada
      // (tabel ta_pengajuan_sk), bukan Pelaksanaan TA dinamis. Lihat
      // lib/masterTa/legacyBridge.js.
      if (skema.is_legacy) {
        if (!pembimbing_2 || !lokasi_kegiatan || !semester) {
          return response(
            res,
            false,
            "Untuk skema ini, pembimbing 2, lokasi kegiatan, dan semester wajib diisi",
            null,
            400
          );
        }

        const legacyRow = await createLegacyPengajuanSk({
          mhsId,
          npm,
          namaLengkap: nama_lengkap,
          ipk,
          currCode: curr_code,
          judulSkripsi: judul,
          lokasiKegiatan: lokasi_kegiatan,
          semester,
          skPembimbing1: pembimbing_1,
          skPembimbing2: pembimbing_2,
          skPembimbing3: null,
          kepalaLab: kepala_lab,
        });

        const save = await TaPengajuan.create({
          mhs_id: mhsId,
          nama: nama_lengkap,
          npm,
          prodi_id,
          skema_id,
          judul,
          pembimbing_1,
          pembimbing_2,
          pembimbing_luar: pembimbing_luar || null,
          kepala_lab,
          lokasi_kegiatan,
          semester,
          legacy_pengajuan_sk_id: legacyRow.id,
          status: "disetujui",
          created_at: new Date(),
        });

        return response(res, true, "success", save);
      }

      const save = await TaPengajuan.create({
        mhs_id: mhsId,
        nama: nama_lengkap,
        npm,
        prodi_id,
        skema_id,
        judul,
        pembimbing_1,
        pembimbing_2: pembimbing_2 || null,
        pembimbing_luar: pembimbing_luar || null,
        kepala_lab,
        status: "diajukan",
        created_at: new Date(),
      });

      return response(res, true, "success", save);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static myList = async (req, res) => {
    try {
      const data = await TaPengajuan.findAll({
        where: { mhs_id: req.user.user_id },
        order: [["id", "DESC"]],
        include: includeRelations,
      });

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static index = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, status } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "id";
      orderBy = orderBy ? orderBy : "DESC";
      const pagelimit = getPagination(limit, page);

      const condition = {};
      if (status) condition.status = status;
      if (search) {
        condition[Op.or] = [
          { nama: { [Op.iLike]: `%${search}%` } },
          { npm: { [Op.iLike]: `%${search}%` } },
          { judul: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const data = await TaPengajuan.findAndCountAll({
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
      const data = await TaPengajuan.findOne({
        where: { id },
        include: includeRelations,
      });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static update = async (req, res) => {
    try {
      const { id } = req.params;
      const check = await TaPengajuan.findOne({ where: { id } });

      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const {
        prodi_id,
        skema_id,
        judul,
        pembimbing_1,
        pembimbing_2,
        pembimbing_luar,
        kepala_lab,
      } = req.body;

      if (!prodi_id || !skema_id || !judul || !pembimbing_1 || !kepala_lab) {
        return response(
          res,
          false,
          "Prodi, skema, judul, pembimbing 1, dan kepala lab wajib diisi",
          null,
          400
        );
      }

      const update = await TaPengajuan.update(
        {
          prodi_id,
          skema_id,
          judul,
          pembimbing_1,
          pembimbing_2: pembimbing_2 || null,
          pembimbing_luar: pembimbing_luar || null,
          kepala_lab,
          updated_at: new Date(),
        },
        { where: { id } }
      );

      return response(res, true, "success", update);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static updateMine = async (req, res) => {
    try {
      const { id } = req.params;
      const check = await TaPengajuan.findOne({
        where: { id, mhs_id: req.user.user_id },
      });

      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      if (check.status !== "diajukan") {
        return response(
          res,
          false,
          "Pengajuan yang sudah diproses admin tidak bisa diubah lagi",
          null,
          400
        );
      }

      const {
        prodi_id,
        skema_id,
        judul,
        pembimbing_1,
        pembimbing_2,
        pembimbing_luar,
        kepala_lab,
      } = req.body;

      if (!prodi_id || !skema_id || !judul || !pembimbing_1 || !kepala_lab) {
        return response(
          res,
          false,
          "Prodi, skema, judul, pembimbing 1, dan kepala lab wajib diisi",
          null,
          400
        );
      }

      const update = await TaPengajuan.update(
        {
          prodi_id,
          skema_id,
          judul,
          pembimbing_1,
          pembimbing_2: pembimbing_2 || null,
          pembimbing_luar: pembimbing_luar || null,
          kepala_lab,
          updated_at: new Date(),
        },
        { where: { id } }
      );

      return response(res, true, "success", update);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static updateStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!STATUS_OPTIONS.includes(status)) {
        return response(
          res,
          false,
          `Status harus salah satu dari: ${STATUS_OPTIONS.join(", ")}`,
          null,
          400
        );
      }

      const check = await TaPengajuan.findOne({ where: { id } });
      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const update = await TaPengajuan.update(
        { status, updated_at: new Date() },
        { where: { id } }
      );

      let pelaksanaanWarning = null;
      if (status === "disetujui") {
        pelaksanaanWarning = await provisionPelaksanaan(check);
      }

      return response(res, true, pelaksanaanWarning || "success", update);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static destroy = async (req, res) => {
    try {
      const { id } = req.params;

      await TaPengajuan.update(
        { deleted_at: new Date() },
        { where: { id } }
      );

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = PengajuanController;
