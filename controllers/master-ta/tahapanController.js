const { Op } = require("sequelize");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const TaTahapan = require("../../models/master-ta/TaTahapan");
const TaSkema = require("../../models/master-ta/TaSkema");
const SiakV2ProgramStudi = require("../../models/lms/SiakV2ProgramStudi");
const { resolveProdiScope, isProdiAllowed } = require("../../lib/masterTa/prodiScope");

const PENGUMPULAN_REVISI = "Pengumpulan Revisi";
const isPengumpulanRevisi = (nama) =>
  (nama || "").trim().toLowerCase() === PENGUMPULAN_REVISI.toLowerCase();
const isPengajuanTahapan = (nama) =>
  (nama || "").trim().toLowerCase().startsWith("pengajuan ");

class TahapanController {
  static index = async (req, res) => {
    try {
      const prodiScope = await resolveProdiScope(req, res);

      const { prodi_id, skema_id } = req.query;

      const condition = {};
      if (prodi_id) {
        if (!isProdiAllowed(prodiScope, prodi_id)) {
          return response(res, false, "Prodi tersebut di luar scope akun Anda.", null, 403);
        }
        condition.prodi_id = prodi_id;
      } else if (prodiScope) {
        condition.prodi_id = { [Op.in]: prodiScope };
      }
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
      const prodiScope = await resolveProdiScope(req, res);

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
      if (!isProdiAllowed(prodiScope, data.prodi_id)) {
        return response(res, false, "Data ini bukan prodi yang jadi scope akun Anda.", null, 403);
      }

      return response(res, true, "success", data);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  // Aturan sistem (dijaga di sini, bukan cuma lewat migrasi sekali jalan, supaya
  // tetap berlaku utk skema yang dibuat kapan pun ke depannya):
  // 1. Tiap (prodi, skema) yang punya Tahapan TA WAJIB diakhiri "Pengumpulan
  //    Revisi" - admin tidak perlu ingat menambahkannya sendiri.
  // 2. Tiap tahapan substantif baru (bukan "Pengumpulan Revisi", bukan sudah
  //    berupa "Pengajuan ...") otomatis dapat pasangan "Pengajuan {nama}"
  //    TEPAT SEBELUMNYA - menyamai pola sistem lama (mis. "Pengajuan
  //    Kolokium" sebelum "Pelaksanaan Kolokium"). Kalau admin memang bikin
  //    tahapan yang namanya sendiri sudah diawali "Pengajuan ", tidak
  //    dipasangkan lagi (supaya tidak "Pengajuan Pengajuan X").
  static create = async (req, res) => {
    try {
      const prodiScope = await resolveProdiScope(req, res);

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
      if (!isProdiAllowed(prodiScope, prodi_id)) {
        return response(res, false, "Prodi tersebut di luar scope akun Anda.", null, 403);
      }

      const casting = CastObject({ Model: TaTahapan, body: req.body });

      const existing = await TaTahapan.findAll({
        where: { prodi_id, skema_id },
        order: [["urutan", "ASC"]],
      });
      const maxUrutan = existing.reduce((max, t) => Math.max(max, t.urutan || 0), 0);
      const pengumpulanRevisi = existing.find((t) => isPengumpulanRevisi(t.nama_tahapan));

      const needsPengajuanPair =
        !isPengumpulanRevisi(nama_tahapan) && !isPengajuanTahapan(nama_tahapan);

      // Baris yang mau disisipkan berurutan: [Pengajuan {nama}?, {nama},
      // Pengumpulan Revisi?] - 2 yang pertama/terakhir cuma muncul kalau
      // relevan (lihat needsPengajuanPair & cek pengumpulanRevisi di bawah).
      const rowsToInsert = [];
      if (needsPengajuanPair) {
        rowsToInsert.push({
          prodi_id,
          skema_id,
          nama_tahapan: `Pengajuan ${nama_tahapan}`,
        });
      }
      rowsToInsert.push({ ...casting });
      const mainIndex = rowsToInsert.length - 1;

      if (!isPengumpulanRevisi(nama_tahapan) && !pengumpulanRevisi) {
        rowsToInsert.push({
          prodi_id,
          skema_id,
          nama_tahapan: PENGUMPULAN_REVISI,
        });
      }

      const now = new Date();
      // Kalau "Pengumpulan Revisi" sudah ada, semua baris baru disisipkan
      // TEPAT di slot urutannya (ambil alih), lalu dia didorong ke paling
      // akhir lagi. Kalau belum ada, baris baru ditambah di akhir seperti
      // biasa.
      let urutan = pengumpulanRevisi ? pengumpulanRevisi.urutan : maxUrutan + 1;
      const created = [];
      for (const row of rowsToInsert) {
        created.push(await TaTahapan.create({ ...row, urutan, created_at: now }));
        urutan += 1;
      }

      if (pengumpulanRevisi) {
        await TaTahapan.update(
          { urutan, updated_at: now },
          { where: { id: pengumpulanRevisi.id } }
        );
      }

      return response(res, true, "success", created[mainIndex]);
    } catch (error) {
      return response(res, false, error.message, null, 500);
    }
  };

  static update = async (req, res) => {
    try {
      const prodiScope = await resolveProdiScope(req, res);

      const { id } = req.params;
      const check = await TaTahapan.findOne({ where: { id } });

      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }
      if (!isProdiAllowed(prodiScope, check.prodi_id)) {
        return response(res, false, "Data ini bukan prodi yang jadi scope akun Anda.", null, 403);
      }

      const casting = CastObject({ Model: TaTahapan, body: req.body });
      delete casting.id;
      if (casting.prodi_id && !isProdiAllowed(prodiScope, casting.prodi_id)) {
        return response(res, false, "Prodi tujuan di luar scope akun Anda.", null, 403);
      }

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
      const prodiScope = await resolveProdiScope(req, res);

      const { id } = req.params;

      const check = await TaTahapan.findOne({ where: { id } });
      if (!check) {
        return response(res, false, "Data tidak ditemukan", null, 404);
      }
      if (!isProdiAllowed(prodiScope, check.prodi_id)) {
        return response(res, false, "Data ini bukan prodi yang jadi scope akun Anda.", null, 403);
      }
      if (isPengumpulanRevisi(check.nama_tahapan)) {
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
