const { getWithRetry } = require("./client");

/**
 * Adapter SIAK v2 — ISOLASI path + parsing (BRIEF v2 Task 3, repoint endpoint publik).
 *
 * SEMUA pengetahuan tentang URL path, query param, bentuk payload, dan nama field
 * SIAK v2 hidup HANYA di file ini. Orkestrasi (syncService) memanggil method di sini
 * dan menerima objek domain ter-normalisasi (flat).
 *
 * SUMBER: endpoint publik resmi SIAK `/api/public` (tanpa auth). Satu payload kelas
 * mengonsolidasikan: mataKuliah, programStudi, jadwalKuliah[] (+ ruangan & dosen), dan
 * rincianKrsMahasiswa[].krsMahasiswa.mahasiswa (peserta). Verifikasi prod 2026-06-23.
 */

const PATHS = {
  // Endpoint publik konsolidasi. Mengabaikan filter periode → mengembalikan semua periode;
  // scoping aktif/non-aktif ditentukan per-kelas via statusKelas (lihat syncService).
  publicKelas: "/public",
};

const trimOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
};

// data[] bisa di root.data atau root langsung — toleran.
const extractData = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

/**
 * Paginasi (capture terverifikasi):
 *   pagination: { currentPage, perPage (STRING), totalPage, totalItems }
 *   hasNext = currentPage < totalPage
 */
const extractHasNext = (payload) => {
  const p = payload && payload.pagination ? payload.pagination : null;
  if (!p) return false;
  const current = parseInt(p.currentPage, 10);
  const total = parseInt(p.totalPage, 10);
  if (Number.isNaN(current) || Number.isNaN(total)) return false;
  return current < total;
};

// jenjang bisa string ("S1") atau objek { jenjang: "S1" }.
const parseJenjang = (prodi) => {
  if (!prodi) return null;
  if (typeof prodi.jenjang === "string") return trimOrNull(prodi.jenjang);
  if (prodi.jenjang && typeof prodi.jenjang === "object") return trimOrNull(prodi.jenjang.jenjang);
  return null;
};

/**
 * Jadwal kuliah per kelas dari jadwalKuliah[]. Distinct by slot.id.
 * Ruangan & dosen di-flatten ke kolom skalar (TANPA menyimpan payload mentah/PII).
 */
function parseJadwal(raw) {
  const slots = Array.isArray(raw.jadwalKuliah) ? raw.jadwalKuliah : [];
  const out = [];
  const seen = new Set();
  for (const slot of slots) {
    if (!slot || !slot.id || seen.has(slot.id)) continue;
    seen.add(slot.id);
    const r = slot.ruangan || {};
    out.push({
      siak_jadwal_id: slot.id,
      hari: trimOrNull(slot.hari),
      jam_mulai: trimOrNull(slot.jamMulai),
      jam_selesai: trimOrNull(slot.jamSelesai),
      jenis_pertemuan: trimOrNull(slot.jenisPertemuan),
      metode_pembelajaran: trimOrNull(slot.metodePembelajaran),
      siak_dosen_id: slot.siakDosenId || (slot.dosen && slot.dosen.id) || null,
      siak_ruangan_id: slot.siakRuanganId || r.id || null,
      ruangan_nama: trimOrNull(r.nama),
      ruangan_kode: trimOrNull(r.ruangan),
      lantai: r.lantai != null ? r.lantai : null,
      ruangan_kapasitas: r.kapasitas != null ? r.kapasitas : null,
    });
  }
  return out;
}

/**
 * Peserta dari rincianKrsMahasiswa[].krsMahasiswa.mahasiswa. Distinct by mahasiswa.id.
 * HANYA ambil { siak_mahasiswa_id, npm, nama } — objek mahasiswa memuat PII
 * (NIK/alamat/rekening) yang TIDAK boleh masuk DB.
 */
function parsePesertaList(raw) {
  const list = Array.isArray(raw.rincianKrsMahasiswa) ? raw.rincianKrsMahasiswa : [];
  const out = [];
  const seen = new Set();
  for (const r of list) {
    const m = r && r.krsMahasiswa && r.krsMahasiswa.mahasiswa;
    if (!m || !m.id || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push({
      siak_mahasiswa_id: m.id,
      npm: trimOrNull(m.npm),
      nama: trimOrNull(m.nama),
    });
  }
  return out;
}

function parseKelas(raw) {
  const mk = raw.mataKuliah || {};
  // programStudi ter-nest di `mataKuliah` pada payload publik (BUKAN di root kelas).
  // Fallback ke root demi toleransi bila bentuk payload berubah.
  const prodi = mk.programStudi || raw.programStudi || null;
  const siakProgramStudiId =
    raw.siakProgramStudiId || (prodi && prodi.id) || null;

  // Dosen distinct by dosen.id dari semua jadwalKuliah[] (co-teaching didukung).
  const lecturerMap = new Map();
  const jadwalSlots = Array.isArray(raw.jadwalKuliah) ? raw.jadwalKuliah : [];
  for (const slot of jadwalSlots) {
    const dosen = slot && slot.dosen;
    if (dosen && dosen.id && !lecturerMap.has(dosen.id)) {
      lecturerMap.set(dosen.id, {
        siak_dosen_id: dosen.id,
        nidn: trimOrNull(dosen.nidn),
        nama: trimOrNull(dosen.nama), // untuk saran match berbasis nama (Task 6)
      });
    }
  }

  // Payload publik memakai `statusKelas` (camelCase) — TIDAK ada mirror snake_case.
  const statusKelas = trimOrNull(raw.statusKelas || raw.status_kelas);

  return {
    kelasKuliahId: raw.id,
    siakProgramStudiId,
    siakPeriodeAkademikId:
      raw.siakPeriodeAkademikId || (raw.periodeAkademik && raw.periodeAkademik.id) || null,
    siakMataKuliahId: raw.siakMataKuliahId || mk.id || null,
    nama: trimOrNull(raw.nama),
    kode_matakuliah: trimOrNull(mk.kode),
    nama_matakuliah: trimOrNull(mk.nama),
    status_kelas: statusKelas,
    kapasitas: raw.kapasitas != null ? raw.kapasitas : null,
    lecturers: Array.from(lecturerMap.values()),
    jadwal: parseJadwal(raw),
    peserta: parsePesertaList(raw),
    // Dimensi prodi dari programStudi nested (termasuk fakultas).
    programStudi: siakProgramStudiId
      ? {
          siakProgramStudiId,
          kode_prodi: trimOrNull(prodi && prodi.kode),
          nama_prodi: trimOrNull(prodi && prodi.nama),
          jenjang: parseJenjang(prodi) || trimOrNull(prodi && prodi.siakJenjangId),
          siakFakultasId:
            (prodi &&
              (prodi.siakFakultasId || (prodi.fakultas && prodi.fakultas.id))) ||
            null,
          nama_fakultas: trimOrNull(prodi && prodi.fakultas && prodi.fakultas.nama),
        }
      : null,
  };
}

/**
 * List kelas dari endpoint publik (paginated). Peserta & jadwal sudah nested di payload
 * → tidak ada fan-out per kelas.
 */
async function listKelas(client, { page, size }) {
  const res = await getWithRetry(client, PATHS.publicKelas, {
    params: { page, size },
  });
  const rows = extractData(res.data)
    .map(parseKelas)
    .filter((k) => k.kelasKuliahId);
  return { rows, hasNext: extractHasNext(res.data) };
}

module.exports = {
  listKelas,
  // diekspos untuk unit test parsing tanpa HTTP
  _parse: { parseKelas, parseJadwal, parsePesertaList, extractHasNext },
};
