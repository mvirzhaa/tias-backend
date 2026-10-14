const { Op } = require("sequelize");
const { response } = require("../../lib/response");
const SiakV2MataKuliah = require("../../models/lms/SiakV2MataKuliah");

/**
 * Sama akar masalah & perbaikan dgn matakuliahController.js: tabel lokal lama
 * `m_kurikulum` (model master/Kurikulum, diisi manual) orphan sejak sync v1
 * dimatikan, jadi tab "Kurikulum" di admin Pembelajaran selalu kosong.
 *
 * SIAK v2 sendiri tidak punya entitas "kurikulum" yang berdiri sendiri (tidak ada
 * endpoint publik /tahun-kurikulum) -- kurikulum di sana cuma label tahun yang
 * nempel per mata kuliah (lihat SiakV2MataKuliah.kurikulum, diisi dari
 * mataKuliah.tahunKurikulum.tahun pas syncMataKuliahFull). Jadi "Kurikulum" di sini
 * diturunkan (DISTINCT) dari situ, bukan sinkron terpisah -- tidak perlu
 * endpoint/sync baru, otomatis ikut ter-update tiap kali "Sync SIAK" mata kuliah
 * dijalankan.
 *
 * Konsekuensinya data ini read-only (sama kayak Matakuliah/Kelas LMS) -- create/
 * update/destroy sengaja ditolak.
 *
 * Kurikulum.id (legacy, m_kurikulum) TIDAK dipakai FK di tempat lain selain
 * Matakuliah lokal lama (yang juga sudah tidak dipakai lagi, kecuali all() -- lihat
 * catatan di matakuliahController.js) -- aman dipindah total, beda dari
 * matakuliahController.js yang masih harus jaga all() demi Dosen_Ext.
 */
class KurikulumController {
  static index = async (req, res) => {
    try {
      let { limit, page, search } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      const offset = (page - 1) * limit;

      const where = { kurikulum: { [Op.ne]: null } };
      if (search) {
        where.kurikulum = { ...where.kurikulum, [Op.iLike]: `%${search}%` };
      }

      const distinctRows = await SiakV2MataKuliah.findAll({
        attributes: ["kurikulum"],
        where,
        group: ["kurikulum"],
        order: [["kurikulum", "DESC"]],
        raw: true,
      });

      const total = distinctRows.length;
      const rows = distinctRows.slice(offset, offset + limit);

      return response(res, true, "success", {
        limit,
        page,
        total,
        total_page: Math.max(1, Math.ceil(total / limit)),
        rows,
      });
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static all = async (req, res) => {
    try {
      const distinctRows = await SiakV2MataKuliah.findAll({
        attributes: ["kurikulum"],
        where: { kurikulum: { [Op.ne]: null } },
        group: ["kurikulum"],
        order: [["kurikulum", "DESC"]],
        raw: true,
      });

      res.status(200).json({
        message: "Success get data.",
        data: distinctRows,
      });
    } catch (error) {
      return response(res, true, "error", error.message);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;
      const data = await SiakV2MataKuliah.findOne({
        attributes: ["kurikulum"],
        where: { kurikulum: id },
        raw: true,
      });

      return response(res, true, "Success", data);
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };

  static create = async (req, res) => {
    return response(
      res,
      false,
      "Data kurikulum sekarang diturunkan dari data mata kuliah SIAK, tidak bisa ditambah manual. Gunakan tombol Sync SIAK di tab Matakuliah.",
      null,
      400
    );
  };

  static update = async (req, res) => {
    return response(
      res,
      false,
      "Data kurikulum sekarang diturunkan dari data mata kuliah SIAK, tidak bisa diubah manual.",
      null,
      400
    );
  };

  static destroy = async (req, res) => {
    return response(
      res,
      false,
      "Data kurikulum sekarang diturunkan dari data mata kuliah SIAK, tidak bisa dihapus manual.",
      null,
      400
    );
  };
}

module.exports = KurikulumController;
