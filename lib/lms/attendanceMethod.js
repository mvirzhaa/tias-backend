/**
 * siak_v2_jadwal.metode_pembelajaran adalah string bebas dari SIAK (disalin verbatim oleh
 * lib/lms/siakV2/adapter.js), tidak ada enum resmi di sistem ini. Karena itu default di sini
 * FAIL-SAFE ke OFFLINE: hanya nilai yang jelas-jelas mengandung "daring"/"online" yang
 * dianggap online (GPS tidak wajib). Nilai kosong/null/tidak dikenal → offline (geofence tetap
 * ditegakkan) — lebih aman salah menegakkan GPS untuk kelas online daripada lupa menegakkan
 * GPS untuk kelas offline.
 */
function isOnlineMethod(value) {
  if (!value || typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized.includes("daring") || normalized.includes("online");
}

module.exports = { isOnlineMethod };
