/**
 * Pencocokan ID untuk jalur otorisasi LMS (keamanan).
 *
 * SPEC v7: kunci kelas kini UUID tunggal `kelasKuliahId` dari SIAK v2, jadi pencocokan
 * adalah perbandingan UUID-vs-UUID (masalah loose-equality id_matkul/kelas v6 telah musnah).
 * Util ini tetap dipakai agar normalisasi terpusat & aman.
 *
 * ATURAN:
 *  - normalisasi kedua sisi → String().trim(), lalu banding KETAT (===).
 *  - DILARANG `==` (loose equality) di jalur otorisasi (koersi JS = fail-open).
 *  - nilai kosong/null TIDAK PERNAH cocok (default-deny — cegah fail-open empty===empty).
 */
const idEq = (a, b) => {
  const na = String(a ?? "").trim();
  const nb = String(b ?? "").trim();
  if (na === "" || nb === "") return false; // default-deny
  return na === nb;
};

module.exports = { idEq };
