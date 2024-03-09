const asyncHandler = require("express-async-handler");
const axios = require("axios");
const FormData = require("form-data");
const DB = require("../../database/index");

exports.getAbsensi = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi`;

  const { dataTable, orderField, orderValue, filter, filterValue } = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable: dataTable,
        orderField: orderField,
        orderValue: orderValue,
        filter: filter,
        filterValue: filterValue,
      },
    });

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.storeAbsensi = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi/store`;

  const { id_pembelajaran, npm, status_absen } = req.body;

  try {
    const formData = new FormData();
    formData.append("id_pembelajaran", id_pembelajaran);
    formData.append("npm", npm);
    formData.append("status_absen", status_absen);

    const response = await axios.post(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving add pembelajaran Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.deleteAbsensi = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi/delete/${id}`;

  try {
    const response = await axios.delete(API_URL);

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving cek-pertemuan Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.scanQr = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi/scan-qr`;

  const { token, coordinate, status_absen, npm } = req.body;

  try {
    const formData = new FormData();
    formData.append("token", token);
    formData.append("coordinate", coordinate);
    formData.append("status_absen", status_absen);
    formData.append("npm", npm);

    const response = await axios.post(API_URL, formData);

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving add pembelajaran Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.showQr = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi/show-qr`;

  const { token } = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        token,
      },
    });
    const qrImageUrl = response.data;

    res.status(201).send(`<img src="${qrImageUrl}`);
  } catch (error) {
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.updateAbsensi = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { npm, status_absen } = req.body;

  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi/update/${id}`;

  try {
    const formData = new FormData();
    formData.append("npm", npm);
    formData.append("status_absen", status_absen);

    const response = await axios.post(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving update pembelajaran Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.dosenForMk = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/dosen-for-mk`;

  const { dataTable, academic_year, id_lecture, code } = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable: dataTable,
        academic_year: academic_year,
        id_lecture: id_lecture,
        code: code,
      },
    });

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.absensiForMhs = asyncHandler(async (req, res) => {
  const npm = req.user.npm;
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi`;

  const { id_matkul, kelas } = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        filter: ["npm"],
        filterValue: [npm],
      },
    });

    const filteredData = response.data.data.filter((item) => {
      return (
        item.pembelajaran &&
        item.pembelajaran.id_matkul === id_matkul &&
        item.pembelajaran.kelas === kelas
      );
    });

    res.status(201).json({
      data: filteredData,
      totalData: filteredData.length,
    });
  } catch (error) {
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.getDosenForAbsensi = asyncHandler(async (req, res) => {
  const { page, limit, nama_lengkap, nidn, kode_mhs } = req.query;

  try {
    let query =
      "SELECT tb_users.user_id, tb_users.nidn, tb_data_pribadi.nama_lengkap, tb_data_pribadi.nip, tb_data_pribadi.image FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.role = 'Dosen' AND tb_users.isverified = true ";

    if (nama_lengkap) {
      query += `AND tb_data_pribadi.nama_lengkap ILIKE '%${nama_lengkap}%' `;
    }

    if (nidn) {
      query += `AND tb_users.nidn = '${nidn}' `;
    }

    if (kode_mhs) {
      query += `AND tb_data_pribadi.kode_mhs = '${kode_mhs}' `;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += `ORDER BY tb_data_pribadi.nama_lengkap ASC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

    const findDosen = await DB.query(query);
    const resultsDosen = findDosen.rows;

    const promises = resultsDosen.map(async (dosen) => {
      const API_URL_GASAL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/list-pertemuan?dataTable=true&filter[]=semester&filterValue[]=gasal&code=${dosen.nip}`;
      const API_URL_GENAP = `${process.env.API_LOCAL_ABSEN}/pembelajaran/list-pertemuan?dataTable=true&filter[]=semester&filterValue[]=genap&code=${dosen.nip}`;

      const [responseGasal, responseGenap] = await Promise.all([
        axios.get(API_URL_GASAL),
        axios.get(API_URL_GENAP),
      ]);

      const persentaseGasal = calculatePersentase(responseGasal.data.data);
      const persentaseGenap = calculatePersentase(responseGenap.data.data);

      return {
        ...dosen,
        gasal: persentaseGasal,
        genap: persentaseGenap,
      };
    });

    const resultsWithPersentase = await Promise.all(promises);

    const totalDataQuery = await DB.query(
      `SELECT COUNT(*) FROM (${query
        .replace(/OFFSET.*$/g, "")
        .replace(/FETCH.*$/g, "")}) AS countQuery`
    );
    const totalData = parseInt(totalDataQuery.rows[0].count);

    res.status(200).json({
      message: "Success get data.",
      data: resultsWithPersentase,
      totalData: totalData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});

function calculatePersentase(pertemuanData) {
  const totalMataKuliah = pertemuanData.length;

  const persentaseMataKuliah = pertemuanData.map((matkul) => {
    const hadir = matkul.pertemuan.reduce((a, c) => a + c, 0);
    const persentase = (hadir / matkul.pertemuan.length) * 100;
    return persentase;
  });

  const rataRataPersentase =
    persentaseMataKuliah.reduce((acc, curr) => acc + curr, 0) / totalMataKuliah;

  return `${rataRataPersentase.toFixed(2)}%`;
}
