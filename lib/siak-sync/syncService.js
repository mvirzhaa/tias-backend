const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const db = require("../../config");
const {
  SiakSyncRun,
  SiakSyncFaculty,
  SiakSyncStudyProgram,
  SiakSyncCurriculum,
  SiakSyncCourse,
  SiakSyncClass,
  SiakSyncClassLecturer,
  SiakSyncClassSchedule,
  SiakSyncClassParticipant,
} = require("../../models/siak-sync");

const MOCK_DIR = path.resolve(__dirname, "../../docs/mock-siak");
const DEFAULT_PER_PAGE = 500;
const DEFAULT_SEMESTER = "20241";

const RESOURCE_ORDER = [
  "faculties",
  "study-programs",
  "curriculums",
  "courses",
  "classes",
  "class-lecturers",
  "class-schedules",
  "class-participants",
];

const boolOrDefault = (value, fallback = true) =>
  value === undefined || value === null ? fallback : value === true || value === "true";

const parseDate = (value) => (value ? new Date(value) : null);

const auditFields = (row, syncRunId, now) => ({
  is_active: boolOrDefault(row.isActive, true),
  siak_updated_at: parseDate(row.updatedAt),
  raw_payload: row,
  last_sync_run_id: syncRunId,
  created_at: now,
  updated_at: now,
});

const RESOURCE_CONFIG = {
  faculties: {
    mockName: "faculties",
    apiPath: "/ucl/faculties",
    model: SiakSyncFaculty,
    conflictAttributes: ["fakultas_id"],
    updateOnDuplicate: [
      "kode_fakultas",
      "nama_fakultas",
      "is_active",
      "siak_updated_at",
      "raw_payload",
      "last_sync_run_id",
      "updated_at",
    ],
    map: (row, syncRunId, now) => ({
      fakultas_id: row.fakultasId,
      kode_fakultas: row.kodeFakultas ?? null,
      nama_fakultas: row.namaFakultas,
      ...auditFields(row, syncRunId, now),
    }),
  },
  "study-programs": {
    mockName: "study-programs",
    apiPath: "/ucl/study-programs",
    model: SiakSyncStudyProgram,
    conflictAttributes: ["prodi_id"],
    updateOnDuplicate: [
      "fakultas_id",
      "kode_prodi",
      "nama_prodi",
      "jenjang",
      "is_active",
      "siak_updated_at",
      "raw_payload",
      "last_sync_run_id",
      "updated_at",
    ],
    map: (row, syncRunId, now) => ({
      prodi_id: row.prodiId,
      fakultas_id: row.fakultasId ?? null,
      kode_prodi: row.kodeProdi ?? null,
      nama_prodi: row.namaProdi,
      jenjang: row.jenjang ?? null,
      ...auditFields(row, syncRunId, now),
    }),
  },
  curriculums: {
    mockName: "curriculums",
    apiPath: "/ucl/curriculums",
    model: SiakSyncCurriculum,
    conflictAttributes: ["kurikulum_id"],
    updateOnDuplicate: [
      "prodi_id",
      "nama_kurikulum",
      "tahun",
      "is_active",
      "siak_updated_at",
      "raw_payload",
      "last_sync_run_id",
      "updated_at",
    ],
    map: (row, syncRunId, now) => ({
      kurikulum_id: row.kurikulumId,
      prodi_id: row.prodiId ?? null,
      nama_kurikulum: row.namaKurikulum,
      tahun: row.tahun ?? null,
      ...auditFields(row, syncRunId, now),
    }),
  },
  courses: {
    mockName: "courses",
    apiPath: "/ucl/courses",
    model: SiakSyncCourse,
    conflictAttributes: ["mata_kuliah_id"],
    updateOnDuplicate: [
      "kurikulum_id",
      "prodi_id",
      "kode_matakuliah",
      "nama_matakuliah",
      "sks",
      "semester_kurikulum",
      "jenis",
      "is_active",
      "siak_updated_at",
      "raw_payload",
      "last_sync_run_id",
      "updated_at",
    ],
    map: (row, syncRunId, now) => ({
      mata_kuliah_id: row.mataKuliahId,
      kurikulum_id: row.kurikulumId ?? null,
      prodi_id: row.prodiId ?? null,
      kode_matakuliah: row.kodeMatakuliah,
      nama_matakuliah: row.namaMatakuliah,
      sks: row.sks ?? null,
      semester_kurikulum: row.semesterKurikulum ?? null,
      jenis: row.jenis ?? null,
      ...auditFields(row, syncRunId, now),
    }),
  },
  classes: {
    mockName: "classes",
    apiPath: "/ucl/classes",
    model: SiakSyncClass,
    conflictAttributes: ["kelas_kuliah_id"],
    updateOnDuplicate: [
      "mata_kuliah_id",
      "prodi_id",
      "semester",
      "nama_kelas",
      "kapasitas",
      "metode",
      "is_active",
      "siak_updated_at",
      "raw_payload",
      "last_sync_run_id",
      "updated_at",
    ],
    map: (row, syncRunId, now) => ({
      kelas_kuliah_id: row.kelasKuliahId,
      mata_kuliah_id: row.mataKuliahId,
      prodi_id: row.prodiId ?? null,
      semester: row.semester,
      nama_kelas: row.namaKelas,
      kapasitas: row.kapasitas ?? null,
      metode: row.metode ?? null,
      ...auditFields(row, syncRunId, now),
    }),
  },
  "class-lecturers": {
    mockName: "class-lecturers",
    apiPath: "/ucl/class-lecturers",
    model: SiakSyncClassLecturer,
    conflictAttributes: ["kelas_kuliah_id", "nip"],
    updateOnDuplicate: [
      "nama_dosen",
      "email",
      "is_koordinator",
      "is_active",
      "siak_updated_at",
      "raw_payload",
      "last_sync_run_id",
      "updated_at",
    ],
    map: (row, syncRunId, now) => ({
      kelas_kuliah_id: row.kelasKuliahId,
      nip: row.nip,
      nama_dosen: row.namaDosen ?? null,
      email: row.email ?? null,
      is_koordinator: boolOrDefault(row.isKoordinator, false),
      ...auditFields(row, syncRunId, now),
    }),
  },
  "class-schedules": {
    mockName: "class-schedules",
    apiPath: "/ucl/class-schedules",
    model: SiakSyncClassSchedule,
    conflictAttributes: ["kelas_kuliah_id", "hari", "jam_mulai", "jam_selesai"],
    updateOnDuplicate: [
      "ruang_id",
      "nama_ruang",
      "metode",
      "is_active",
      "siak_updated_at",
      "raw_payload",
      "last_sync_run_id",
      "updated_at",
    ],
    map: (row, syncRunId, now) => ({
      kelas_kuliah_id: row.kelasKuliahId,
      hari: row.hari,
      jam_mulai: row.jamMulai,
      jam_selesai: row.jamSelesai,
      ruang_id: row.ruangId ?? null,
      nama_ruang: row.namaRuang ?? null,
      metode: row.metode ?? null,
      ...auditFields(row, syncRunId, now),
    }),
  },
  "class-participants": {
    mockName: "class-participants",
    apiPath: "/ucl/class-participants",
    model: SiakSyncClassParticipant,
    conflictAttributes: ["kelas_kuliah_id", "npm"],
    updateOnDuplicate: [
      "nama_mahasiswa",
      "email",
      "status",
      "is_active",
      "siak_updated_at",
      "raw_payload",
      "last_sync_run_id",
      "updated_at",
    ],
    map: (row, syncRunId, now) => ({
      kelas_kuliah_id: row.kelasKuliahId,
      npm: row.npm,
      nama_mahasiswa: row.namaMahasiswa ?? null,
      email: row.email ?? null,
      status: row.status ?? null,
      ...auditFields(row, syncRunId, now),
    }),
  },
};

function normalizeResource(resource) {
  const key = String(resource || "").trim();
  if (!RESOURCE_CONFIG[key]) {
    throw new Error(`Resource SIAK tidak dikenal: ${resource}`);
  }
  return key;
}

async function fetchMockPage(resource, page) {
  const config = RESOURCE_CONFIG[resource];
  const file = path.join(MOCK_DIR, `${config.mockName}-page-${page}.json`);
  if (!(await fs.pathExists(file))) {
    return {
      data: [],
      meta: { page, perPage: DEFAULT_PER_PAGE, total: 0, lastPage: page, hasNext: false },
    };
  }
  return fs.readJson(file);
}

async function fetchApiPage(resource, page, options) {
  const config = RESOURCE_CONFIG[resource];
  const baseURL = process.env.SIAK_V2_BASE_URL;
  if (!baseURL) {
    throw new Error("SIAK_V2_BASE_URL wajib diisi saat SIAK_SYNC_MODE=api.");
  }

  const client = axios.create({
    baseURL,
    timeout: parseInt(process.env.SIAK_SYNC_TIMEOUT_MS || "30000", 10),
    headers: process.env.SIAK_V2_TOKEN
      ? { Authorization: `Bearer ${process.env.SIAK_V2_TOKEN}` }
      : {},
  });

  const response = await client.get(config.apiPath, {
    params: {
      page,
      perPage: options.perPage,
      semester: options.semester,
    },
  });
  return response.data;
}

async function fetchPage(resource, page, options) {
  if (options.mode === "mock") return fetchMockPage(resource, page);
  if (options.mode === "api") return fetchApiPage(resource, page, options);
  throw new Error(`SIAK_SYNC_MODE tidak valid: ${options.mode}`);
}

function getHasNext(payload, page) {
  const meta = payload.meta || {};
  if (typeof meta.hasNext === "boolean") return meta.hasNext;
  if (meta.lastPage != null) return page < Number(meta.lastPage);
  return false;
}

async function upsertRows(resource, rows, syncRunId, transaction) {
  if (!rows.length) return 0;
  const config = RESOURCE_CONFIG[resource];
  const now = new Date();
  const mapped = rows.map((row) => config.map(row, syncRunId, now));
  await config.model.bulkCreate(mapped, {
    transaction,
    conflictAttributes: config.conflictAttributes,
    updateOnDuplicate: config.updateOnDuplicate,
  });
  return mapped.length;
}

async function syncResource(resourceInput, optionsInput = {}) {
  const resource = normalizeResource(resourceInput);
  const mode = optionsInput.mode || process.env.SIAK_SYNC_MODE || "mock";
  const options = {
    mode,
    perPage: parseInt(optionsInput.perPage || process.env.SIAK_SYNC_PER_PAGE || DEFAULT_PER_PAGE, 10),
    semester: optionsInput.semester || process.env.SIAK_SYNC_SEMESTER || DEFAULT_SEMESTER,
  };

  const syncRun = await SiakSyncRun.create({
    resource,
    mode: options.mode,
    status: "running",
    semester: options.semester,
    started_at: new Date(),
    page_count: 0,
    total_rows: 0,
    created_at: new Date(),
    updated_at: new Date(),
  });

  let page = 1;
  let totalRows = 0;
  let pageCount = 0;
  const pageMeta = [];

  try {
    while (true) {
      const payload = await fetchPage(resource, page, options);
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const meta = payload.meta || {};

      await db.transaction(async (transaction) => {
        const count = await upsertRows(resource, rows, syncRun.id, transaction);
        totalRows += count;
      });

      pageCount += 1;
      pageMeta.push({ page, rows: rows.length, meta });

      if (!getHasNext(payload, page)) break;
      page += 1;
    }

    await syncRun.update({
      status: "success",
      finished_at: new Date(),
      page_count: pageCount,
      total_rows: totalRows,
      meta: { pages: pageMeta },
      updated_at: new Date(),
    });

    return {
      resource,
      mode: options.mode,
      semester: options.semester,
      sync_run_id: syncRun.id,
      status: "success",
      page_count: pageCount,
      total_rows: totalRows,
    };
  } catch (error) {
    await syncRun.update({
      status: "failed",
      finished_at: new Date(),
      page_count: pageCount,
      total_rows: totalRows,
      error_message: error.message,
      meta: { pages: pageMeta },
      updated_at: new Date(),
    });
    throw error;
  }
}

async function syncAllResources(options = {}) {
  const results = [];
  for (const resource of RESOURCE_ORDER) {
    results.push(await syncResource(resource, options));
  }
  return results;
}

module.exports = {
  RESOURCE_ORDER,
  RESOURCE_CONFIG,
  fetchMockPage,
  syncResource,
  syncAllResources,
};
