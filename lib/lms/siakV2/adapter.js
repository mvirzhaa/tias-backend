const { getWithRetry } = require("./client");

/**
 * Adapter SIAK v2 — ISOLASI path + parsing (BRIEF v2 Task 3).
 *
 * SEMUA pengetahuan tentang URL path, query param, bentuk payload, dan nama field
 * SIAK v2 hidup HANYA di file ini. Orkestrasi (syncService) memanggil method di sini
 * dan menerima objek domain ter-normalisasi (flat). Saat API live berbeda dari capture
 * DevTools (rule 5), cukup ubah file INI.
 *
 * Path & bentuk berasal dari capture DevTools brief v2 §0.3 — WAJIB divalidasi ke
 * be-siakad live (lihat catatan validasi di akhir Task 3).
 */

const PATHS = {
  // Live: /periode-akademik/active-status TIDAK ada (404). Yang tersedia adalah list
  // /akademik/periode-akademik (data[] berisi {id, nama, kode, status}); parser memilih
  // elemen status === "Aktif". Divalidasi ke be-siakad live 2026-06-18.
  activePeriode: "/akademik/periode-akademik",
  kelasKuliah: "/akademik/kelas-kuliah",
  // Live: sub-path roster adalah `/participant` (brief menulis `peserta-kelas` → 404).
  // Bentuk data[] sama: {id, npm, nama, angkatan, programStudi, status, rincianKrsId}.
  // Divalidasi ke be-siakad live 2026-06-18.
  pesertaKelas: (id) => `/akademik/kelas-kuliah/${id}/participant`,
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

function parseActivePeriode(payload) {
  let obj = payload;
  if (payload && payload.data !== undefined) obj = payload.data;
  const list = Array.isArray(obj) ? obj : obj ? [obj] : [];
  const active =
    list.find((p) => p && String(p.status).toLowerCase() === "aktif") || list[0];
  if (!active || !active.id) return null;
  return {
    id: active.id,
    kode: trimOrNull(active.kode),
    nama: trimOrNull(active.nama),
    status: active.status,
  };
}

function parseKelas(raw) {
  const mk = raw.mataKuliah || {};
  // programStudi ter-nest di payload ADMIN (wajib divalidasi). Fallback ke field flat.
  const prodi = raw.programStudi || null;
  const siakProgramStudiId = raw.siakProgramStudiId || (prodi && prodi.id) || null;

  // Dosen distinct by dosen.id dari semua jadwalKuliah[] (co-teaching didukung).
  const lecturerMap = new Map();
  const jadwal = Array.isArray(raw.jadwalKuliah) ? raw.jadwalKuliah : [];
  for (const slot of jadwal) {
    const dosen = slot && slot.dosen;
    if (dosen && dosen.id && !lecturerMap.has(dosen.id)) {
      lecturerMap.set(dosen.id, { siak_dosen_id: dosen.id, nidn: trimOrNull(dosen.nidn) });
    }
  }

  return {
    kelasKuliahId: raw.id,
    siakProgramStudiId,
    siakPeriodeAkademikId:
      raw.siakPeriodeAkademikId || (raw.periodeAkademik && raw.periodeAkademik.id) || null,
    siakMataKuliahId: raw.siakMataKuliahId || mk.id || null,
    nama: trimOrNull(raw.nama),
    kode_matakuliah: trimOrNull(mk.kode),
    nama_matakuliah: trimOrNull(mk.nama),
    status_kelas: trimOrNull(raw.status_kelas),
    kapasitas: raw.kapasitas != null ? raw.kapasitas : null,
    lecturers: Array.from(lecturerMap.values()),
    // Dimensi prodi dari nested (fakultas TIDAK tersedia di sini → null).
    programStudi: siakProgramStudiId
      ? {
          siakProgramStudiId,
          nama_prodi: trimOrNull(prodi && prodi.nama),
          jenjang: parseJenjang(prodi),
        }
      : null,
  };
}

function parsePeserta(raw) {
  return {
    // Open Dep #3: peserta.id diasumsikan = master mahasiswa (bukan id baris KRS).
    siak_mahasiswa_id: raw.id,
    npm: trimOrNull(raw.npm),
  };
}

async function getActivePeriode(client) {
  const res = await getWithRetry(client, PATHS.activePeriode);
  return parseActivePeriode(res.data);
}

async function listKelasKuliah(client, { periodeId, page, size }) {
  const res = await getWithRetry(client, PATHS.kelasKuliah, {
    params: { periodeAkademik: periodeId, page, size },
  });
  const rows = extractData(res.data)
    .map(parseKelas)
    .filter((k) => k.kelasKuliahId);
  return { rows, hasNext: extractHasNext(res.data) };
}

async function listPeserta(client, kelasKuliahId) {
  const res = await getWithRetry(client, PATHS.pesertaKelas(kelasKuliahId));
  return extractData(res.data)
    .map(parsePeserta)
    .filter((p) => p.siak_mahasiswa_id);
}

module.exports = {
  getActivePeriode,
  listKelasKuliah,
  listPeserta,
  // diekspos untuk unit test parsing tanpa HTTP
  _parse: { parseActivePeriode, parseKelas, parsePeserta, extractHasNext },
};
