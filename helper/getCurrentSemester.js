const SiakV2Class = require("../models/lms/SiakV2Class");

const parsePeriodeString = (namaPeriode) => {
  if (!namaPeriode || typeof namaPeriode !== "string") return null;

  const trimmed = namaPeriode.trim();

  const rangeMatch = trimmed.match(/(\d{4})[/-](\d{4})/);
  let tahunAkademik = null;
  if (rangeMatch) {
    tahunAkademik = `${rangeMatch[1]}/${rangeMatch[2]}`;
  }

  let semesterNormalized = null;
  if (/ganjil/i.test(trimmed)) {
    semesterNormalized = "Ganjil";
  } else if (/genap/i.test(trimmed)) {
    semesterNormalized = "Genap";
  }

  if (!semesterNormalized) return null;

  if (!tahunAkademik) {
    const singleYearMatch = trimmed.match(/(\d{4})/);
    if (!singleYearMatch) return null;
    const tahunAwal = parseInt(singleYearMatch[1], 10);
    tahunAkademik = `${tahunAwal}/${tahunAwal + 1}`;
  }

  return {
    semester: semesterNormalized,
    tahun_akademik: tahunAkademik,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL: Fallback — hitung berdasarkan tanggal sistem
// Agustus (8) – Januari (1) → Ganjil
// Februari (2) – Juli (7)   → Genap
// ─────────────────────────────────────────────────────────────────────────────
const hitungDariTanggal = () => {
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const isGanjil = bulan >= 8 || bulan <= 1;
  const semester = isGanjil ? "Ganjil" : "Genap";

  let tahunAkademik;
  if (isGanjil) {
    const tahunAwal = bulan >= 8 ? tahun : tahun - 1;
    tahunAkademik = `${tahunAwal}/${tahunAwal + 1}`;
  } else {
    tahunAkademik = `${tahun - 1}/${tahun}`;
  }

  return { semester, tahun_akademik: tahunAkademik };
};

const getCurrentSemester = async () => {
  try {
    const kelasAktif = await SiakV2Class.findOne({
      where: { is_active: true },
      attributes: ["nama_periode"],
      order: [["updated_at", "DESC"], ["created_at", "DESC"]],
    });

    if (kelasAktif && kelasAktif.nama_periode) {
      const parsed = parsePeriodeString(kelasAktif.nama_periode);
      if (parsed) {
        console.log(`[getCurrentSemester] Source: SIAK → ${kelasAktif.nama_periode}`);
        return { ...parsed, source: "siak" };
      }
    }
  } catch (err) {
    console.warn(`[getCurrentSemester] Query SIAK gagal, pakai fallback. Error: ${err.message}`);
  }

  const hasil = hitungDariTanggal();
  console.log(`[getCurrentSemester] Source: fallback (tanggal) → Semester ${hasil.semester} ${hasil.tahun_akademik}`);
  return { ...hasil, source: "fallback" };
};

const getNextSemester = async () => {
  const aktif = await getCurrentSemester();
  const [tahunAwal, tahunAkhir] = aktif.tahun_akademik.split("/").map(Number);

  let semesterBerikutnya;
  let tahunAkademikBerikutnya;

  if (aktif.semester === "Ganjil") {
    semesterBerikutnya = "Genap";
    tahunAkademikBerikutnya = `${tahunAwal}/${tahunAkhir}`;
  } else {
    semesterBerikutnya = "Ganjil";
    tahunAkademikBerikutnya = `${tahunAkhir}/${tahunAkhir + 1}`;
  }

  return {
    semester: semesterBerikutnya,
    tahun_akademik: tahunAkademikBerikutnya,
  };
};

module.exports = { getCurrentSemester, getNextSemester };
