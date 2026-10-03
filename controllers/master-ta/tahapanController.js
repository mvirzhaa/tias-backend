const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const TaTahapan = require("../../models/master-ta/TaTahapan");
const TaSkema = require("../../models/master-ta/TaSkema");
const SiakV2ProgramStudi = require("../../models/lms/SiakV2ProgramStudi");

const PENGUMPULAN_REVISI = "Pengumpulan Revisi";
const isPengumpulanRevisi = (nama) =>
  (nama || "").trim().toLowerCase() === PENGUMPULAN_REVISI.toLowerCase();

class TahapanController {
  static index = async (req, res) => {
    try {
      const { prodi_id, skema_id } = req.query;

      const condition = {};
      if (prodi_id) condition.prodi_id = prodi_id;
      if (skema_id) condition.skema_id = skema_id;

      const data = await TaTahapan.findAll({
        where: condition,
        order: [["urutan", "ASC"]],
        include: [
          { model: TaSkema, as: "skema", required: false },
          { model: SiakV2ProgramStudi, as: "prodi", required: false },
        ],
      });

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;
      const data = await TaTahapan.findOne({
        where: { id },
        include: [
          { model: TaSkema, as: "skema", required: false },
          { model: SiakV2ProgramStudi, as: "prodi", required: false },
        ],
      });

      if (!data) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Aturan sistem: tiap (prodi, skema) yang punya Tahapan TA WAJIB diakhiri
  // tahapan "Pengumpulan Revisi" - admin tidak perlu ingat menambahkannya
  // sendiri. Dijaga di sini (bukan cuma lewat migrasi sekali jalan) supaya
  // tetap berlaku utk skema yang dibuat kapan pun ke depannya:
  // - Tahapan baru BUKAN "Pengumpulan Revisi": kalau grup ini belum punya
  //   "Pengumpulan Revisi", otomatis dibuatkan satu lagi tepat setelah
  //   tahapan baru ini. Kalau sudah ada, tahapan baru disisipkan SEBELUM
  //   "Pengumpulan Revisi" (urutannya digeser ke paling akhir lagi).
  // - Tahapan baru namanya "Pengumpulan Revisi": dibuat apa adanya di akhir
  //   (jalur ini juga yang dipakai migrasi seed, sama persis logikanya).
  static create = async (req, res) => {
    try {
      const { prodi_id, skema_id, nama_tahapan } = req.body;

      if (!prodi_id || !skema_id || !nama_tahapan) {
        return response(
          res,
          false,
          "Prodi, skema, dan nama tahapan wajib diisi",
          null,
          400
        );
      }

      const casting = CastObject({ Model: TaTahapan, body: req.body });

      const existing = await TaTahapan.findAll({
        where: { prodi_id, skema_id },
        order: [["urutan", "ASC"]],
      });
      const maxUrutan = existing.reduce((max, t) => Math.max(max, t.urutan || 0), 0);
      const pengumpulanRevisi = existing.find((t) => isPengumpulanRevisi(t.nama_tahapan));

      if (isPengumpulanRevisi(nama_tahapan) || !pengumpulanRevisi) {
        // Normal: tambah di akhir. Kalau ini BUKAN "Pengumpulan Revisi" dan
        // grup belum punya satu pun, sekalian buatkan setelahnya.
        const save = await TaTahapan.create({
          ...casting,
          urutan: maxUrutan + 1,
          created_at: new Date(),
        });

        if (!isPengumpulanRevisi(nama_tahapan) && !pengumpulanRevisi) {
          await TaTahapan.create({
            prodi_id,
            skema_id,
            nama_tahapan: PENGUMPULAN_REVISI,
            urutan: maxUrutan + 2,
            created_at: new Date(),
          });
        }

        return response(res, true, "success", save);
      }

      // Sudah ada "Pengumpulan Revisi" - sisipkan tahapan baru tepat di
      // slotnya (ambil alih urutannya), lalu dorong "Pengumpulan Revisi" ke
      // urutan paling akhir supaya tetap jadi tahapan terakhir.
      const save = await TaTahapan.create({
        ...casting,
        urutan: pengumpulanRevisi.urutan,
        created_at: new Date(),
      });
      await TaTahapan.update(
        { urutan: maxUrutan + 1, updated_at: new Date() },
        { where: { id: pengumpulanRevisi.id } }
      );

      return response(res, true, "success", save);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static update = async (req, res) => {
    try {
      const { id } = req.params;
      const check = await TaTahapan.findOne({ where: { id } });

      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }

      const casting = CastObject({ Model: TaTahapan, body: req.body });
      delete casting.id;

      if (
        isPengumpulanRevisi(check.nama_tahapan) &&
        casting.nama_tahapan &&
        !isPengumpulanRevisi(casting.nama_tahapan)
      ) {
        return response(
          res,
          false,
          "Tahapan \"Pengumpulan Revisi\" wajib ada di tiap skema, tidak bisa diganti namanya",
          null,
          400
        );
      }

      const update = await TaTahapan.update(
        { ...casting, updated_at: new Date() },
        { where: { id } }
      );

      return response(res, true, "success", update);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static destroy = async (req, res) => {
    try {
      const { id } = req.params;

      const check = await TaTahapan.findOne({ where: { id } });
      if (check && isPengumpulanRevisi(check.nama_tahapan)) {
        return response(
          res,
          false,
          "Tahapan \"Pengumpulan Revisi\" wajib ada di tiap skema, tidak bisa dihapus",
          null,
          400
        );
      }

      await TaTahapan.update({ deleted_at: new Date() }, { where: { id } });

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };
}

module.exports = TahapanController;
