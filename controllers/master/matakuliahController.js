const { Op } = require("sequelize");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const SiakV2MataKuliah = require("../../models/lms/SiakV2MataKuliah");
const Matakuliah = require("../../models/master/Matakuliah");

/**
 * Sumber data utk index()/detail() (dipakai tab admin "Matakuliah") dipindah dari
 * tabel lokal lama `m_matakuliah` (model master/Matakuliah, diisi manual lewat tombol
 * Tambah/Edit) ke `siak_v2_mata_kuliah` (pull-direct dari SIAK, lihat
 * lib/lms/siakV2/syncService.js syncMataKuliahFull) — m_matakuliah sudah orphan sejak
 * sync v1 dimatikan pas migrasi ke SIAK v2, makanya tab itu selalu kosong.
 * Konsekuensinya data ini sekarang READ-ONLY dari sisi UCL (SIAK jadi satu-satunya
 * sumber kebenaran, sama kayak Kelas LMS) — create/update/destroy sengaja ditolak,
 * bukan dihapus endpoint-nya (supaya FE lama yang masih manggil dapat pesan jelas,
 * bukan 404).
 *
 * all() SENGAJA TIDAK ikut dipindah -- masih baca Matakuliah (m_matakuliah) apa
 * adanya, karena dipakai dropdown "Generate Presensi" Dosen_Ext
 * (src/pages/dosen_ext/absen/daftar-hadir/generate.jsx) yang nyimpen `item.id`
 * (integer m_matakuliah.id) sbg id_matkul ke tabel terpisah (Pembelajaran,
 * models/absensi-dosen/Pembelajaran.js, id_matkul:INTEGER) -- siakMataKuliahId
 * (UUID) tidak cocok di situ. m_matakuliah yang kosong itu bug lain yang sudah
 * ada dari sebelumnya (di luar scope perbaikan ini), bukan disebabkan/diperbaiki
 * di sini.
 */
class MatakuliahController {
  static index = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order && order !== "id" ? order : "nama_matakuliah";
      orderBy = orderBy ? orderBy : "ASC";
      const pagelimit = getPagination(limit, page);

      const condition = {};
      if (search) {
        condition[Op.or] = [
          { kode_matakuliah: { [Op.iLike]: `%${search}%` } },
          { nama_matakuliah: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const data = await SiakV2MataKuliah.findAndCountAll({
        distinct: true,
        where: condition,
        order: [[order, orderBy]],
        limit: pagelimit.limit,
        offset: pagelimit.offset,
      });

      return response(res, true, "success", {
        limit,
        page,
        total: data.count,
        total_page: Math.ceil(parseInt(data.count) / limit),
        rows: data.rows,
      });
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static all = async (req, res) => {
    try {
      const data = await Matakuliah.findAll();

      res.status(200).json({
        message: "Success get data.",
        data,
      });
    } catch (error) {
      return response(res, true, "error", error.message);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;

      const data = await SiakV2MataKuliah.findOne({
        where: { siakMataKuliahId: id },
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
      "Data mata kuliah sekarang sinkron langsung dari SIAK, tidak bisa ditambah manual. Gunakan tombol Sync SIAK.",
      null,
      400
    );
  };

  static update = async (req, res) => {
    return response(
      res,
      false,
      "Data mata kuliah sekarang sinkron langsung dari SIAK, tidak bisa diubah manual. Perbaikan data dilakukan di SIAK lalu Sync SIAK.",
      null,
      400
    );
  };

  static destroy = async (req, res) => {
    return response(
      res,
      false,
      "Data mata kuliah sekarang sinkron langsung dari SIAK, tidak bisa dihapus manual.",
      null,
      400
    );
  };
}

module.exports = MatakuliahController;
