const { Op } = require("sequelize");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const SiakV2MataKuliah = require("../../models/lms/SiakV2MataKuliah");
const Matakuliah = require("../../models/master/Matakuliah");
// Nama folder "masterTa" historis (helper ini dibuat pertama kali buat Master TA) --
// logikanya generik (resolve prodi_id dari LmsRoleScope), dipakai ulang di sini apa
// adanya, bukan scope khusus Master TA.
const { resolveProdiScope, isProdiAllowed } = require("../../lib/masterTa/prodiScope");

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
 *
 * index()/detail() juga di-scope per prodi (siakProgramStudiId) lewat
 * resolveProdiScope/isProdiAllowed, pola sama persis Master TA -- admin prodi cuma
 * lihat mata kuliah prodinya sendiri, superadmin tetap lihat semua. Sebelumnya
 * SEMUA 1382 mata kuliah se-universitas kelihatan ke admin manapun (tanpa filter),
 * bikin admin prodi X bingung lihat matkul prodi lain yang nggak familiar (mis.
 * "Wrap and Drape" dari Pendidikan Vokasional Desain Fashion) dan sempat dikira data
 * salah -- padahal datanya benar, cuma belum ke-scope.
 */
class MatakuliahController {
  static index = async (req, res) => {
    try {
      const prodiScope = await resolveProdiScope(req, res);

      let { limit, page, order, orderBy, search } = req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order && order !== "id" ? order : "nama_matakuliah";
      orderBy = orderBy ? orderBy : "ASC";
      const pagelimit = getPagination(limit, page);

      const condition = {};
      if (prodiScope) condition.siakProgramStudiId = { [Op.in]: prodiScope };
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
      const prodiScope = await resolveProdiScope(req, res);

      const { id } = req.params;

      const data = await SiakV2MataKuliah.findOne({
        where: { siakMataKuliahId: id },
      });

      if (data && !isProdiAllowed(prodiScope, data.siakProgramStudiId)) {
        return response(res, false, "Data ini bukan prodi yang jadi scope akun Anda.", null, 403);
      }

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
