const { isSuperAdmin } = require("./authMiddleware");

/**
 * Dipakai di controller admin-facing Presensi/Tugas Akhir utk tahu apakah query
 * perlu difilter ke 1 prodi, dan ke prodi mana.
 *
 * - Superadmin (lihat isSuperAdmin) -> null, query TIDAK difilter (akses semua prodi).
 * - Admin biasa dgn department_code terisi -> kode prodinya, WAJIB dipakai filter.
 * - Admin biasa TANPA department_code -> set res.status(403) & throw, supaya
 *   controller tidak sengaja treat "tidak ada kode" sebagai "boleh lihat semua".
 *
 * Panggil di dalam asyncHandler (error yg di-throw otomatis ditangkap & dikirim
 * sbg response, sama seperti pola exports.adminOnly dkk di authMiddleware.js).
 */
exports.resolveDepartmentScope = (req, res) => {
  if (isSuperAdmin(req.user)) return null;

  const departmentCode = req.user && req.user.department_code;
  if (!departmentCode) {
    res.status(403);
    throw new Error("Akun ini belum terhubung ke prodi manapun (department_code kosong).");
  }
  return departmentCode;
};
