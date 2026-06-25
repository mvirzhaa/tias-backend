const { response } = require("../../lib/response");

class SuratValidator {
  static create(req, res, next) {
    const { penerima_id, jenis_surat, form_data } = req.body;
    const userRole = req.user?.role?.toLowerCase();

    if (userRole !== "mahasiswa" && !penerima_id) {
      return response(res, false, "Penerima surat wajib dipilih.");
    }

    if (!jenis_surat) return response(res, false, "Jenis surat wajib diisi.");
    if (!form_data) return response(res, false, "Data formulir tidak boleh kosong.");

    next();
  }

  static disposisi(req, res, next) {
    const { target_penerima_id } = req.body;

    if (!target_penerima_id) {
      return response(res, false, "Target penerima disposisi wajib dipilih.");
    }

    next();
  }

  static updateStatus(req, res, next) {
    const { status } = req.body;

    if (!status) return response(res, false, "Status tidak boleh kosong.");

    const allowedStatus = ["Sent", "Read", "Replied", "Disposisi", "Disetujui", "Ditolak", "Selesai", "Archived"];
    if (!allowedStatus.includes(status)) {
      return response(res, false, "Status yang dikirim tidak valid.");
    }

    next();
  }
}

module.exports = SuratValidator;
