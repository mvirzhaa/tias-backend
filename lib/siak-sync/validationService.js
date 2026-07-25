const db = require("../../config");
const { RESOURCE_ORDER } = require("./syncService");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const normalizeLimit = (value) => {
  const parsed = parseInt(value || DEFAULT_LIMIT, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const stripIssueCount = (row) => {
  const { issue_count, ...item } = row;
  return item;
};

async function countResourceRows() {
  const [rows] = await db.query(`
    SELECT 'faculties' AS resource, count(*)::int AS total FROM siak_sync_faculties
    UNION ALL SELECT 'study-programs', count(*)::int FROM siak_sync_study_programs
    UNION ALL SELECT 'curriculums', count(*)::int FROM siak_sync_curriculums
    UNION ALL SELECT 'courses', count(*)::int FROM siak_sync_courses
    UNION ALL SELECT 'classes', count(*)::int FROM siak_sync_classes
    UNION ALL SELECT 'class-lecturers', count(*)::int FROM siak_sync_class_lecturers
    UNION ALL SELECT 'class-schedules', count(*)::int FROM siak_sync_class_schedules
    UNION ALL SELECT 'class-participants', count(*)::int FROM siak_sync_class_participants
  `);

  return rows.reduce((acc, row) => {
    acc[row.resource] = row.total;
    return acc;
  }, {});
}

async function getLatestRuns() {
  const [rows] = await db.query(`
    SELECT DISTINCT ON (resource)
      resource,
      mode,
      status,
      semester,
      page_count,
      total_rows,
      error_message,
      started_at,
      finished_at,
      created_at
    FROM siak_sync_runs
    ORDER BY resource, created_at DESC
  `);

  const byResource = rows.reduce((acc, row) => {
    acc[row.resource] = row;
    return acc;
  }, {});

  return RESOURCE_ORDER.map((resource) => byResource[resource] || {
    resource,
    status: "missing",
    mode: null,
    semester: null,
    page_count: 0,
    total_rows: 0,
    error_message: "Resource belum pernah disinkronkan.",
    started_at: null,
    finished_at: null,
    created_at: null,
  });
}

function buildLatestRunIssue(latestRuns) {
  const items = latestRuns.filter((row) => row.status !== "success");
  return {
    severity: "error",
    label: "Resource dengan sync terakhir belum sukses",
    count: items.length,
    items,
  };
}

const ISSUE_QUERIES = [
  {
    key: "studyProgramsWithoutFaculty",
    severity: "error",
    label: "Prodi tanpa fakultas valid",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        sp.prodi_id, sp.kode_prodi, sp.nama_prodi, sp.fakultas_id
      FROM siak_sync_study_programs sp
      LEFT JOIN siak_sync_faculties f ON f.fakultas_id = sp.fakultas_id
      WHERE NULLIF(trim(sp.fakultas_id), '') IS NULL OR f.fakultas_id IS NULL
      ORDER BY sp.nama_prodi
    `,
  },
  {
    key: "curriculumsWithoutStudyProgram",
    severity: "error",
    label: "Kurikulum tanpa prodi valid",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        c.kurikulum_id, c.nama_kurikulum, c.tahun, c.prodi_id
      FROM siak_sync_curriculums c
      LEFT JOIN siak_sync_study_programs sp ON sp.prodi_id = c.prodi_id
      WHERE NULLIF(trim(c.prodi_id), '') IS NULL OR sp.prodi_id IS NULL
      ORDER BY c.nama_kurikulum
    `,
  },
  {
    key: "coursesWithoutStudyProgram",
    severity: "error",
    label: "Mata kuliah tanpa prodi valid",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        c.mata_kuliah_id, c.kode_matakuliah, c.nama_matakuliah, c.prodi_id
      FROM siak_sync_courses c
      LEFT JOIN siak_sync_study_programs sp ON sp.prodi_id = c.prodi_id
      WHERE NULLIF(trim(c.prodi_id), '') IS NULL OR sp.prodi_id IS NULL
      ORDER BY c.kode_matakuliah
    `,
  },
  {
    key: "coursesWithoutCurriculum",
    severity: "error",
    label: "Mata kuliah tanpa kurikulum valid",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        c.mata_kuliah_id, c.kode_matakuliah, c.nama_matakuliah, c.kurikulum_id
      FROM siak_sync_courses c
      LEFT JOIN siak_sync_curriculums k ON k.kurikulum_id = c.kurikulum_id
      WHERE NULLIF(trim(c.kurikulum_id), '') IS NULL OR k.kurikulum_id IS NULL
      ORDER BY c.kode_matakuliah
    `,
  },
  {
    key: "classesWithoutCourse",
    severity: "error",
    label: "Kelas kuliah tanpa mata kuliah valid",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        cls.kelas_kuliah_id, cls.nama_kelas, cls.semester, cls.mata_kuliah_id
      FROM siak_sync_classes cls
      LEFT JOIN siak_sync_courses c ON c.mata_kuliah_id = cls.mata_kuliah_id
      WHERE NULLIF(trim(cls.mata_kuliah_id), '') IS NULL OR c.mata_kuliah_id IS NULL
      ORDER BY cls.semester, cls.nama_kelas
    `,
  },
  {
    key: "classesWithoutStudyProgram",
    severity: "error",
    label: "Kelas kuliah tanpa prodi valid",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        cls.kelas_kuliah_id, cls.nama_kelas, cls.semester, cls.prodi_id
      FROM siak_sync_classes cls
      LEFT JOIN siak_sync_study_programs sp ON sp.prodi_id = cls.prodi_id
      WHERE NULLIF(trim(cls.prodi_id), '') IS NULL OR sp.prodi_id IS NULL
      ORDER BY cls.semester, cls.nama_kelas
    `,
  },
  {
    key: "lecturersWithoutClass",
    severity: "error",
    label: "Dosen pengajar tanpa kelas valid",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        l.id, l.kelas_kuliah_id, l.nip, l.nama_dosen
      FROM siak_sync_class_lecturers l
      LEFT JOIN siak_sync_classes cls ON cls.kelas_kuliah_id = l.kelas_kuliah_id
      WHERE cls.kelas_kuliah_id IS NULL
      ORDER BY l.kelas_kuliah_id, l.nip
    `,
  },
  {
    key: "lecturersWithoutNip",
    severity: "error",
    label: "Dosen pengajar tanpa NIP",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        id, kelas_kuliah_id, nip, nama_dosen
      FROM siak_sync_class_lecturers
      WHERE NULLIF(trim(nip), '') IS NULL
      ORDER BY kelas_kuliah_id
    `,
  },
  {
    key: "schedulesWithoutClass",
    severity: "error",
    label: "Jadwal tanpa kelas valid",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        s.id, s.kelas_kuliah_id, s.hari, s.jam_mulai, s.jam_selesai, s.nama_ruang
      FROM siak_sync_class_schedules s
      LEFT JOIN siak_sync_classes cls ON cls.kelas_kuliah_id = s.kelas_kuliah_id
      WHERE cls.kelas_kuliah_id IS NULL
      ORDER BY s.kelas_kuliah_id, s.hari, s.jam_mulai
    `,
  },
  {
    key: "invalidScheduleTime",
    severity: "error",
    label: "Jadwal dengan jam selesai tidak valid",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        id, kelas_kuliah_id, hari, jam_mulai, jam_selesai, nama_ruang
      FROM siak_sync_class_schedules
      WHERE jam_selesai <= jam_mulai
      ORDER BY kelas_kuliah_id, hari, jam_mulai
    `,
  },
  {
    key: "participantsWithoutClass",
    severity: "error",
    label: "Peserta kelas tanpa kelas valid",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        p.id, p.kelas_kuliah_id, p.npm, p.nama_mahasiswa
      FROM siak_sync_class_participants p
      LEFT JOIN siak_sync_classes cls ON cls.kelas_kuliah_id = p.kelas_kuliah_id
      WHERE cls.kelas_kuliah_id IS NULL
      ORDER BY p.kelas_kuliah_id, p.npm
    `,
  },
  {
    key: "participantsWithoutNpm",
    severity: "error",
    label: "Peserta kelas tanpa NPM",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        id, kelas_kuliah_id, npm, nama_mahasiswa
      FROM siak_sync_class_participants
      WHERE NULLIF(trim(npm), '') IS NULL
      ORDER BY kelas_kuliah_id
    `,
  },
  {
    key: "duplicateClassParticipants",
    severity: "error",
    label: "Duplikasi peserta pada kelas yang sama",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        kelas_kuliah_id, npm, count(*)::int AS duplicate_count
      FROM siak_sync_class_participants
      GROUP BY kelas_kuliah_id, npm
      HAVING count(*) > 1
      ORDER BY kelas_kuliah_id, npm
    `,
  },
  {
    key: "duplicateClassLecturers",
    severity: "error",
    label: "Duplikasi dosen pada kelas yang sama",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        kelas_kuliah_id, nip, count(*)::int AS duplicate_count
      FROM siak_sync_class_lecturers
      GROUP BY kelas_kuliah_id, nip
      HAVING count(*) > 1
      ORDER BY kelas_kuliah_id, nip
    `,
  },
  {
    key: "duplicateClassScheduleSlots",
    severity: "error",
    label: "Duplikasi slot jadwal pada kelas yang sama",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        kelas_kuliah_id, hari, jam_mulai, jam_selesai, count(*)::int AS duplicate_count
      FROM siak_sync_class_schedules
      GROUP BY kelas_kuliah_id, hari, jam_mulai, jam_selesai
      HAVING count(*) > 1
      ORDER BY kelas_kuliah_id, hari, jam_mulai
    `,
  },
  {
    key: "mappingsWithoutLocalCourse",
    severity: "error",
    label: "Mapping mengarah ke m_matakuliah yang tidak ada",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        map.id, map.matakuliah_id, map.kode_matakuliah_lokal, map.mata_kuliah_id, map.status
      FROM matakuliah_siak_mapping map
      LEFT JOIN m_matakuliah mk ON mk.id = map.matakuliah_id
      WHERE mk.id IS NULL
      ORDER BY map.id
    `,
  },
  {
    key: "mappingsWithoutSiakCourse",
    severity: "error",
    label: "Mapping mengarah ke mata kuliah SIAK yang tidak ada",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        map.id, map.matakuliah_id, map.kode_matakuliah_lokal, map.mata_kuliah_id, map.status
      FROM matakuliah_siak_mapping map
      LEFT JOIN siak_sync_courses c ON c.mata_kuliah_id = map.mata_kuliah_id
      WHERE c.mata_kuliah_id IS NULL
      ORDER BY map.id
    `,
  },
  {
    key: "unmappedCourses",
    severity: "warning",
    label: "Mata kuliah SIAK belum termapping ke m_matakuliah",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        c.mata_kuliah_id, c.kode_matakuliah, c.nama_matakuliah, c.prodi_id, c.kurikulum_id
      FROM siak_sync_courses c
      LEFT JOIN matakuliah_siak_mapping map ON map.mata_kuliah_id = c.mata_kuliah_id
      WHERE map.id IS NULL
      ORDER BY c.kode_matakuliah
    `,
  },
  {
    key: "unverifiedCourseMappings",
    severity: "warning",
    label: "Mapping mata kuliah belum diverifikasi",
    sql: `
      SELECT count(*) OVER()::int AS issue_count,
        map.id, map.matakuliah_id, map.kode_matakuliah_lokal,
        map.mata_kuliah_id, map.kode_matakuliah_siak, map.status
      FROM matakuliah_siak_mapping map
      WHERE map.status NOT IN ('verified', 'active')
      ORDER BY map.id
    `,
  },
];

async function runIssueQuery(query, limit) {
  const [rows] = await db.query(`${query.sql}\nLIMIT ${limit}`);
  const count = rows.length ? Number(rows[0].issue_count) : 0;

  return {
    severity: query.severity,
    label: query.label,
    count,
    items: rows.map(stripIssueCount),
  };
}

async function validateSiakSync(options = {}) {
  const limit = normalizeLimit(options.limit);
  const [resourceCounts, latestRuns] = await Promise.all([
    countResourceRows(),
    getLatestRuns(),
  ]);

  const groupedIssues = {
    errors: {
      latestSyncNotSuccessful: buildLatestRunIssue(latestRuns),
    },
    warnings: {},
  };

  for (const issueQuery of ISSUE_QUERIES) {
    const issue = await runIssueQuery(issueQuery, limit);
    const bucket = issue.severity === "warning" ? "warnings" : "errors";
    groupedIssues[bucket][issueQuery.key] = issue;
  }

  const totalErrors = Object.values(groupedIssues.errors)
    .reduce((total, issue) => total + issue.count, 0);
  const totalWarnings = Object.values(groupedIssues.warnings)
    .reduce((total, issue) => total + issue.count, 0);

  return {
    valid: totalErrors === 0,
    ready_for_cutover: totalErrors === 0 && totalWarnings === 0,
    limit,
    summary: {
      total_errors: totalErrors,
      total_warnings: totalWarnings,
      resource_counts: resourceCounts,
      latest_runs: latestRuns,
    },
    issues: groupedIssues,
  };
}

module.exports = {
  validateSiakSync,
};
