const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const { response } = require("../../lib/response");
const LmsAttendanceSession = require("../../models/lms/LmsAttendanceSession");
const LmsAttendanceRecord = require("../../models/lms/LmsAttendanceRecord");
const LmsAttendanceAttempt = require("../../models/lms/LmsAttendanceAttempt");
const SiakV2Jadwal = require("../../models/lms/SiakV2Jadwal");
const SiakV2Participant = require("../../models/lms/SiakV2Participant");
const SiakV2Class = require("../../models/lms/SiakV2Class");
const storage = require("../../lib/lms/storage");
const { haversineDistanceMeters } = require("../../lib/lms/geo");
const { isOnlineMethod } = require("../../lib/lms/attendanceMethod");
const faceApiClient = require("../../lib/lms/faceApi/client");
const { getRekapByClass } = require("../../lib/lms/attendanceRekapService");
const { lecturerOwns } = require("../../middleware/lms/lecturerOwnsClass");

const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Pilih jadwal yang `hari`-nya cocok hari ini (kelas bisa punya banyak slot, mis. Senin+Rabu,
// dgn metode_pembelajaran berbeda per slot) — fallback ke baris pertama kalau tak ada yang
// cocok (mis. dibuka di luar hari jadwal biasa). Sebelumnya ambil baris pertama TANPA urutan
// sama sekali, bisa salah tentukan apakah GPS wajib.
async function findRelevantJadwal(kelasKuliahId) {
  const rows = await SiakV2Jadwal.findAll({ where: { kelasKuliahId } });
  if (!rows.length) return null;
  const today = HARI_ID[new Date().getDay()];
  return rows.find((j) => (j.hari || "").trim().toLowerCase() === today.toLowerCase()) || rows[0];
}

const DEFAULT_RADIUS_M = parseInt(process.env.GEOFENCE_DEFAULT_RADIUS_M || "100", 10);
const MAX_ATTEMPTS = parseInt(process.env.ATTENDANCE_MAX_ATTEMPTS || "5", 10);
const ATTEMPT_WINDOW_MIN = parseInt(process.env.ATTENDANCE_ATTEMPT_WINDOW_MIN || "5", 10);
const FACE_API_THRESHOLD = process.env.FACE_API_THRESHOLD
  ? parseFloat(process.env.FACE_API_THRESHOLD)
  : undefined;

const logAttempt = (fields) =>
  LmsAttendanceAttempt.create({ attempted_at: new Date(), ...fields });

const generateToken = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /lms/attendance/sessions — dosen membuka sesi presensi untuk satu pertemuan.
exports.openSession = asyncHandler(async (req, res) => {
  const { kelasKuliahId, jadwal_id, pertemuan_ke, session_date, lat, lng, accuracy_m, radius_m } =
    req.body;

  if (!pertemuan_ke || !session_date) {
    return response(res, false, "pertemuan_ke dan session_date wajib diisi.", null, 400);
  }

  let jadwal = null;
  if (jadwal_id) {
    jadwal = await SiakV2Jadwal.findByPk(jadwal_id);
  } else {
    jadwal = await findRelevantJadwal(kelasKuliahId);
  }

  const metodeSnapshot = jadwal ? jadwal.metode_pembelajaran : null;
  const isOffline = !isOnlineMethod(metodeSnapshot);

  if (isOffline && (lat === undefined || lng === undefined || lat === null || lng === null)) {
    return response(
      res,
      false,
      "Lokasi GPS (lat/lng) wajib diisi untuk membuka sesi kelas offline.",
      null,
      400
    );
  }

  let token;
  let created = null;
  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    token = generateToken();
    try {
      created = await LmsAttendanceSession.create({
        kelasKuliahId,
        jadwal_id: jadwal ? jadwal.id : null,
        opened_by: req.user.user_id,
        pertemuan_ke: parseInt(pertemuan_ke, 10),
        session_date,
        token,
        metode_pembelajaran_snapshot: metodeSnapshot,
        is_offline: isOffline,
        ruangan_nama_snapshot: jadwal ? jadwal.ruangan_nama : null,
        geofence_lat: isOffline ? lat : null,
        geofence_lng: isOffline ? lng : null,
        geofence_accuracy_m: isOffline ? accuracy_m || null : null,
        geofence_radius_m: isOffline ? parseInt(radius_m, 10) || DEFAULT_RADIUS_M : null,
        status: "open",
        opened_at: new Date(),
      });
    } catch (error) {
      if (error.name !== "SequelizeUniqueConstraintError") throw error;
      // token bentrok dengan sesi lain yang masih open — coba token baru.
    }
  }

  if (!created) {
    return response(res, false, "Gagal membuat token unik, coba lagi.", null, 500);
  }

  return response(res, true, "Sesi presensi dibuka.", created, 201);
});

// PATCH /lms/attendance/sessions/:id/close — dosen menutup sesi (idempoten).
exports.closeSession = asyncHandler(async (req, res) => {
  const session = req.lmsAttendanceSession;
  if (session.status === "open") {
    await session.update({ status: "closed", closed_at: new Date() });
  }
  return response(res, true, "Sesi presensi ditutup.", session, 200);
});

// GET /lms/attendance/sessions/resolve?token= — mahasiswa cek token sebelum buka kamera.
exports.resolveToken = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return response(res, false, "Parameter token wajib diisi.", null, 400);
  }

  const session = await LmsAttendanceSession.findOne({
    where: { token: String(token).trim(), status: "open" },
  });
  if (!session) {
    return response(res, false, "Token tidak valid atau sesi presensi sudah ditutup.", null, 404);
  }

  const participant = await SiakV2Participant.findOne({
    where: { kelasKuliahId: session.kelasKuliahId, siak_mahasiswa_id: req.user.siakUserUuid },
  });
  if (!participant) {
    return response(res, false, "Anda tidak terdaftar di kelas ini.", null, 403);
  }

  try {
    const client = faceApiClient.createClient();
    const enrolled = await faceApiClient.isEnrolled(client, participant.npm);
    if (!enrolled) {
      return response(
        res,
        false,
        "Wajah Anda belum terdaftar di sistem. Hubungi admin untuk pendaftaran wajah.",
        null,
        422
      );
    }
  } catch (error) {
    return response(res, false, "Layanan verifikasi wajah sedang tidak tersedia.", null, 502);
  }

  const kelas = await SiakV2Class.findByPk(session.kelasKuliahId, {
    attributes: ["kelasKuliahId", "nama", "kode_matakuliah", "nama_matakuliah"],
  });

  return response(res, true, "success", {
    id: session.id,
    kelasKuliahId: session.kelasKuliahId,
    kode_matakuliah: kelas ? kelas.kode_matakuliah : null,
    nama_matakuliah: kelas ? kelas.nama_matakuliah : null,
    nama_kelas: kelas ? kelas.nama : null,
    pertemuan_ke: session.pertemuan_ke,
    is_offline: session.is_offline,
    ruangan_nama: session.ruangan_nama_snapshot,
  });
});

// POST /lms/attendance/submit — token + GPS(jika offline) + foto -> verifikasi wajah -> simpan.
exports.submitAttendance = asyncHandler(async (req, res) => {
  const session = req.lmsAttendanceSession;
  const siakMahasiswaId = req.user.siakUserUuid;
  const { lat, lng, accuracy_m } = req.body;

  const windowStart = new Date(Date.now() - ATTEMPT_WINDOW_MIN * 60 * 1000);
  const recentAttempts = await LmsAttendanceAttempt.count({
    where: {
      session_id: session.id,
      siak_mahasiswa_id: siakMahasiswaId,
      attempted_at: { [Op.gte]: windowStart },
    },
  });
  if (recentAttempts >= MAX_ATTEMPTS) {
    return response(
      res,
      false,
      "Terlalu banyak percobaan presensi. Coba lagi beberapa menit lagi.",
      null,
      429
    );
  }

  let gpsDistanceM = null;
  if (session.is_offline) {
    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      await logAttempt({
        session_id: session.id,
        siak_mahasiswa_id: siakMahasiswaId,
        outcome: "geofence_failed",
      });
      return response(res, false, "Lokasi GPS wajib diisi untuk kelas offline.", null, 400);
    }
    gpsDistanceM = haversineDistanceMeters(
      session.geofence_lat,
      session.geofence_lng,
      parseFloat(lat),
      parseFloat(lng)
    );
    if (gpsDistanceM > session.geofence_radius_m) {
      await logAttempt({
        session_id: session.id,
        siak_mahasiswa_id: siakMahasiswaId,
        outcome: "geofence_failed",
        gps_distance_m: gpsDistanceM,
      });
      return response(
        res,
        false,
        `Anda berada di luar radius kelas (${Math.round(gpsDistanceM)}m dari batas ${session.geofence_radius_m}m).`,
        null,
        403
      );
    }
  }

  if (!req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
    await logAttempt({
      session_id: session.id,
      siak_mahasiswa_id: siakMahasiswaId,
      outcome: "face_api_error",
      gps_distance_m: gpsDistanceM,
    });
    return response(res, false, "File yang diunggah bukan gambar.", null, 400);
  }

  const participant = await SiakV2Participant.findOne({
    where: { kelasKuliahId: session.kelasKuliahId, siak_mahasiswa_id: siakMahasiswaId },
  });
  if (!participant) {
    await logAttempt({
      session_id: session.id,
      siak_mahasiswa_id: siakMahasiswaId,
      outcome: "not_enrolled",
      gps_distance_m: gpsDistanceM,
    });
    return response(res, false, "Anda tidak terdaftar di kelas ini.", null, 403);
  }

  let verifyResult;
  try {
    const client = faceApiClient.createClient();
    verifyResult = await faceApiClient.verify(client, {
      subjectId: participant.npm,
      imageBuffer: req.file.buffer,
      threshold: FACE_API_THRESHOLD,
    });
  } catch (error) {
    const outcome =
      error.response && error.response.status === 404 ? "face_not_enrolled" : "face_api_error";
    await logAttempt({
      session_id: session.id,
      siak_mahasiswa_id: siakMahasiswaId,
      outcome,
      gps_distance_m: gpsDistanceM,
    });
    return response(res, false, "Verifikasi wajah gagal, coba lagi.", null, 502);
  }

  if (!verifyResult.match) {
    await logAttempt({
      session_id: session.id,
      siak_mahasiswa_id: siakMahasiswaId,
      outcome: "face_no_match",
      gps_distance_m: gpsDistanceM,
      face_score: verifyResult.score,
    });
    return response(res, false, "Wajah tidak cocok. Presensi ditolak.", null, 401);
  }

  const storageKey = await storage.save(req.file.buffer, "jpg");

  let record;
  try {
    record = await LmsAttendanceRecord.create({
      session_id: session.id,
      kelasKuliahId: session.kelasKuliahId,
      siak_mahasiswa_id: siakMahasiswaId,
      metode: "face",
      status: "hadir",
      gps_lat: lat !== undefined ? parseFloat(lat) : null,
      gps_lng: lng !== undefined ? parseFloat(lng) : null,
      gps_accuracy_m: accuracy_m !== undefined ? parseFloat(accuracy_m) : null,
      gps_distance_m: gpsDistanceM,
      face_score: verifyResult.score,
      face_threshold: verifyResult.threshold,
      face_match: true,
      face_photo_storage_key: storageKey,
      submitted_at: new Date(),
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      await logAttempt({
        session_id: session.id,
        siak_mahasiswa_id: siakMahasiswaId,
        outcome: "duplicate",
        gps_distance_m: gpsDistanceM,
        face_score: verifyResult.score,
      });
      return response(res, false, "Anda sudah presensi pada sesi ini.", null, 409);
    }
    throw error;
  }

  await logAttempt({
    session_id: session.id,
    siak_mahasiswa_id: siakMahasiswaId,
    outcome: "success",
    gps_distance_m: gpsDistanceM,
    face_score: verifyResult.score,
  });

  return response(res, true, "Presensi berhasil.", record, 201);
});

// GET /lms/attendance/me?kelasKuliahId= — riwayat presensi mahasiswa sendiri.
exports.myAttendanceHistory = asyncHandler(async (req, res) => {
  const where = { siak_mahasiswa_id: req.user.siakUserUuid };
  if (req.query.kelasKuliahId) where.kelasKuliahId = req.query.kelasKuliahId;

  const rows = await LmsAttendanceRecord.findAll({
    where,
    order: [["submitted_at", "DESC"]],
  });
  return response(res, true, "success", rows);
});

// GET /lms/attendance/rekap?kelasKuliahId= — union presensi legacy + LMS (admin only, v1).
exports.rekap = asyncHandler(async (req, res) => {
  const { kelasKuliahId } = req.query;
  if (!kelasKuliahId) {
    return response(res, false, "Parameter kelasKuliahId wajib diisi.", null, 400);
  }
  const rekap = await getRekapByClass({ kelasKuliahId });
  return response(res, true, "success", rekap);
});

// GET /lms/attendance/sessions/current?kelasKuliahId=&pertemuan_ke= — dosen pengampu/admin
// cek apakah sudah ada sesi 'open' utk pertemuan ini (UI hindari selalu nawarin buka baru).
exports.getCurrentSession = asyncHandler(async (req, res) => {
  const { kelasKuliahId, pertemuan_ke } = req.query;
  if (!kelasKuliahId || !pertemuan_ke) {
    return response(res, false, "Parameter kelasKuliahId dan pertemuan_ke wajib diisi.", null, 400);
  }
  if (!req.user) {
    return response(res, false, "Anda tidak mengampu kelas ini.", null, 403);
  }
  const allowed = req.user.role === "Admin" || (await lecturerOwns(req, kelasKuliahId));
  if (!allowed) {
    return response(res, false, "Anda tidak mengampu kelas ini.", null, 403);
  }

  const session = await LmsAttendanceSession.findOne({
    where: { kelasKuliahId, pertemuan_ke: parseInt(pertemuan_ke, 10), status: "open" },
  });
  return response(res, true, "success", { session });
});

// GET /lms/attendance/sessions/:id/records — roster (middleware lecturerOwnsSession sudah
// memuat & memverifikasi kepemilikan req.lmsAttendanceSession).
exports.getSessionRecords = asyncHandler(async (req, res) => {
  const session = req.lmsAttendanceSession;

  const records = await LmsAttendanceRecord.findAll({
    where: { session_id: session.id },
    order: [["submitted_at", "ASC"]],
  });

  const participants = records.length
    ? await SiakV2Participant.findAll({
        where: {
          kelasKuliahId: session.kelasKuliahId,
          siak_mahasiswa_id: records.map((r) => r.siak_mahasiswa_id),
        },
      })
    : [];
  const byId = new Map(participants.map((p) => [p.siak_mahasiswa_id, p]));

  const rows = records.map((r) => {
    const p = byId.get(r.siak_mahasiswa_id);
    return { ...r.toJSON(), npm: p ? p.npm : null, nama: p ? p.nama : null };
  });

  return response(res, true, "success", rows);
});
