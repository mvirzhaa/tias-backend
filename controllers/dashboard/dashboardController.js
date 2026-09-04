const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const { default: axios } = require("axios");
const {
  getMhsBimbinganTA,
  getMhsBimbinganAkademik,
} = require("../../utils/repoDashboardDosen");
const { getMatkulByNpm } = require("../../helper/informatics");

const getCount = async (table, userLoginId) => {
  try {
    const result = await DB.query(
      `SELECT COUNT(*) FROM ${table} WHERE user_id = $1 AND status = $2 AND is_deleted = $3`,
      [userLoginId, 1, false]
    );
    return result.rows[0].count;
  } catch (error) {
    console.error(`Error in getCount for table ${table}:`, error);
    throw error; // Re-throw the error to propagate it up the call stack
  }
};

exports.dashboardData = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const role = req.user.role;
  const npm = req.user.npm;

  try {
    const tes = await getCount("tb_tes", userLoginId);
    const sertifikasi = await getCount("tb_sertifikasi", userLoginId);
    const pembicara = await getCount("tb_pembicara", userLoginId);
    const pengabdian = await getCount("tb_pengabdian", userLoginId);
    const penghargaan = await getCount("tb_penghargaan", userLoginId);
    const penelitian = await getCount("tb_penelitian", userLoginId);
    const publikasi = await getCount("tb_publikasi_karya", userLoginId);
    const hki = await getCount("tb_hki", userLoginId);

    const responseData = await DB.query(
      `SELECT tb_data_pribadi.*, tb_users.nidn, tb_users.npm, tb_users.role
      FROM tb_data_pribadi
      JOIN tb_users ON tb_data_pribadi.user_id = tb_users.user_id
      WHERE tb_data_pribadi.user_id = $1`,
      [userLoginId]
    );

    const belum_kolo = 0;
    const besum_sidang = 0;
    const belum_revisi = 0;
    const kp_selesai = 0;

    const queryIp = await DB.query(
      "SELECT * FROM tb_ip_mhs WHERE user_id = $1",
      [userLoginId]
    );

    const dataIp = queryIp.rows;

    const dataChart = {
      label: [],
      data: [],
    };

    dataIp.forEach((entry) => {
      const label = `${entry.semester}-${entry.tahun}`;
      dataChart.label.push(label);
      dataChart.data.push(entry.ip);
    });

    let data;

    if (role === "Mahasiswa") {
      let matkulMhs = {};
      try {
        matkulMhs = await getMatkulByNpm(npm);
      } catch (err) {
        console.warn("Error fetching getMatkulByNpm (likely missing MySQL):", err.message);
      }
      let status_frs =
        responseData.rows[0].kode_mhs === "ACTIVE"
          ? !matkulMhs.Data && !matkulMhs.Total && !matkulMhs.SKS
            ? 0
            : 1
          : null;

      data = {
        tes,
        sertifikasi,
        pembicara,
        pengabdian,
        penghargaan,
        penelitian,
        publikasi,
        hki,
        userData: responseData.rows[0],
        dataChart,
        status_frs,
      };
    } else if (role === "Dosen") {
      let requestSks, reqPembelajaran;

      try {
        const SKS_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/dosen-for-mk`;
        requestSks = await axios.get(SKS_URL, {
          params: {
            code: req.user.nip,
            academic_year: "2024/2025",
            semester: "GASAL",
          },
        });
      } catch (error) {
        console.error("Error fetching SKS data:", error);
        requestSks = { data: { SKS: 0 } }; // Default value if error occurs
      }

      try {
        const PEMBELAJARAN_URI = `${process.env.API_LOCAL_ABSEN_AGAIN}/pembelajaran`;
        reqPembelajaran = await axios.get(PEMBELAJARAN_URI, {
          params: {
            dataTable: true,
            filter: ["nik_dosen"],
            filterValue: [req.user.nip],
          },
        });
      } catch (error) {
        console.error("Error fetching pembelajaran data:", error);
        reqPembelajaran = { data: { recordsTotal: 0 } }; // Default value if error occurs
      }

      const dataMhsBimbinganTa = await getMhsBimbinganTA(userLoginId);
      const dataMhsBimbinganAkademik = await getMhsBimbinganAkademik(
        userLoginId
      );

      data = {
        sks: requestSks.data.SKS,
        pertemuanPerkuliahan: reqPembelajaran.data.recordsTotal,
        belum_kolo,
        besum_sidang,
        belum_revisi,
        kp_selesai,
        userData: responseData.rows[0],
        tugas_akhir: {
          pembimbing1Count: dataMhsBimbinganTa.pembimbing1Count,
          pembimbing2Count: dataMhsBimbinganTa.pembimbing2Count,
          penguji1Count: dataMhsBimbinganTa.penguji1Count,
          penguji2Count: dataMhsBimbinganTa.penguji2Count,
          pengajuan_sk: dataMhsBimbinganTa.pengajuan_sk,
          menuju_kolokium: dataMhsBimbinganTa.menuju_kolokium,
          menuju_sidang: dataMhsBimbinganTa.menuju_kolokium,
          menyelesaikan_revisi: dataMhsBimbinganTa.menyelesaikan_revisi,
          selesai: dataMhsBimbinganTa.selesai,
        },
        bimbingan_akademik: dataMhsBimbinganAkademik,
        publikasi,
        penelitian,
        hki,
        pengabdian,
        pembicara,
        penghargaan,
      };
    } else if (role === "Dosen_Ext") {
      const dataMhsBimbinganTa = await getMhsBimbinganTA(userLoginId);
      data = {
        userData: responseData.rows[0],
        tugas_akhir: {
          pembimbing1Count: dataMhsBimbinganTa.pembimbing1Count,
          pembimbing2Count: dataMhsBimbinganTa.pembimbing2Count,
          penguji1Count: dataMhsBimbinganTa.penguji1Count,
          penguji2Count: dataMhsBimbinganTa.penguji2Count,
          pengajuan_sk: dataMhsBimbinganTa.pengajuan_sk,
          menuju_kolokium: dataMhsBimbinganTa.menuju_kolokium,
          menuju_sidang: dataMhsBimbinganTa.menuju_kolokium,
          menyelesaikan_revisi: dataMhsBimbinganTa.menyelesaikan_revisi,
          selesai: dataMhsBimbinganTa.selesai,
        },
      };
    }

    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    console.error("Error in dashboardData:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

const getCountPending = async (table) => {
  try {
    const result = await DB.query(
      `SELECT COUNT(*) FROM ${table} WHERE status = $1 AND is_deleted = $2`,
      [0, false]
    );
    return result.rows[0].count;
  } catch (error) {
    console.error(`Error in getCount for table ${table}:`, error);
    throw error; // Re-throw the error to propagate it up the call stack
  }
};

exports.dashboardDataAdmin = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  try {
    const tes = await getCountPending("tb_tes");
    const sertifikasi = await getCountPending("tb_sertifikasi");
    const pembicara = await getCountPending("tb_pembicara");
    const pengabdian = await getCountPending("tb_pengabdian");
    const penghargaan = await getCountPending("tb_penghargaan");
    const penelitian = await getCountPending("tb_penelitian");
    const publikasi = await getCountPending("tb_publikasi_karya");
    const hki = await getCountPending("tb_hki");

    const userAdmin = await DB.query(
      "SELECT tb_data_pribadi.*, tb_users.npm, tb_users.nidn, tb_users.role FROM tb_data_pribadi JOIN tb_users ON tb_data_pribadi.user_id = tb_users.user_id WHERE tb_data_pribadi.user_id = $1",
      [userLoginId]
    );

    const data = {
      tes,
      sertifikasi,
      pembicara,
      pengabdian,
      penghargaan,
      penelitian,
      publikasi,
      hki,
      userData: userAdmin.rows[0],
    };

    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

exports.dashboardMobileDosen = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const dataMhsBimbinganTa = await getMhsBimbinganTA(userLoginId);

  res.status(200).json({
    status: "success",
    data: {
      pembimbing1Count: dataMhsBimbinganTa.pembimbing1Count,
      pembimbing2Count: dataMhsBimbinganTa.pembimbing2Count,
      penguji1Count: dataMhsBimbinganTa.penguji1Count,
      penguji2Count: dataMhsBimbinganTa.penguji2Count,
      pengajuan_sk: dataMhsBimbinganTa.pengajuan_sk,
      menuju_kolokium: dataMhsBimbinganTa.menuju_kolokium,
      menuju_sidang: dataMhsBimbinganTa.menuju_kolokium,
      menyelesaikan_revisi: dataMhsBimbinganTa.menyelesaikan_revisi,
      selesai: dataMhsBimbinganTa.selesai,
    },
  });
});

exports.dashboardDataPegawai = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  try {
    const userAdmin = await DB.query(
      "SELECT tb_data_pribadi.*, tb_users.npm, tb_users.nidn, tb_users.role FROM tb_data_pribadi JOIN tb_users ON tb_data_pribadi.user_id = tb_users.user_id WHERE tb_data_pribadi.user_id = $1",
      [userLoginId]
    );

    const data = {
      userData: userAdmin.rows[0],
    };

    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});
