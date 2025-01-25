const asyncHandler = require("express-async-handler");
const axios = require("axios");
const FormData = require("form-data");
const DB = require("../../database/index");
const async = require("async");
const path = require("path");
const fs = require("fs-extra");

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
  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/absensi`;

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
  try {
    const findDosen = await DB.query(
      "SELECT tb_users.user_id, tb_users.nidn, tb_data_pribadi.nama_lengkap, tb_data_pribadi.nip, tb_data_pribadi.image FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.role = 'Dosen' AND tb_users.isverified = true "
    );

    const resultsDosen = findDosen.rows;

    const results = [];
    const queue = async.queue(async (dosen, callback) => {
      const API_URL_GASAL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/list-pertemuan`;
      const responseGasal = await axios.get(API_URL_GASAL, {
        params: {
          dataTable: true,
          filter: ["semester"],
          filterValue: ["gasal"],
          code: dosen.nip,
        },
      });
      const persentaseGasal = calculatePersentase(responseGasal.data.data);
      results.push({
        ...dosen,
        gasal: persentaseGasal,
      });
      await sleep(1000);
      const API_URL_GENAP = `${process.env.API_LOCAL_ABSEN}/pembelajaran/list-pertemuan`;
      const responseGenap = await axios.get(API_URL_GENAP, {
        params: {
          dataTable: true,
          filter: ["semester"],
          filterValue: ["genap"],
          code: dosen.nip,
        },
      });
      const persentaseGenap = calculatePersentase(responseGenap.data.data);
      results.find((result) => result.nip === dosen.nip).genap =
        persentaseGenap;
      callback();
    });

    queue.drain(() => {
      res.status(200).json({
        message: "Success get data.",
        data: results,
      });
    });

    queue.push(resultsDosen);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

exports.getRekapPerkuliahan = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/pembelajaran/list-pertemuan`;

  const { dataTable, filter, filterValue, code, academic_year } = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable,
        filter: filter,
        filterValue: filterValue,
        code,
        academic_year: academic_year,
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error retrieving Absensi:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

exports.uploadDokumenSkPerkuliahan = asyncHandler(async (req, res) => {
  const { nip, academic_year, semester } = req.body;
  const file = req.file;

  if (!file) {
    res.status(400);
    throw new Error("Please upload a file.");
  }

  try {
    const existingData = await DB.query(
      `SELECT * FROM dokumen_sk_pembelajaran WHERE nip = $1 AND academic_year = $2 AND semester = $3`,
      [nip, academic_year, semester]
    );

    if (existingData.rows.length > 0) {
      const deleteQuery = await DB.query(
        `DELETE FROM dokumen_sk_pembelajaran WHERE nip = $1 AND academic_year = $2 AND semester = $3 returning *`,
        [nip, academic_year, semester]
      );

      for (const iterate of deleteQuery.rows) {
        await fs.remove(
          path.join(`public/dokumen-sk-perkuliahan/${iterate.file}`)
        );
      }
    }

    const insertDok = await DB.query(
      `INSERT INTO dokumen_sk_pembelajaran (nip, academic_year, semester, file)
       VALUES ($1, $2, $3, $4) returning *`,
      [nip, academic_year, semester, file.filename]
    );

    res.status(201).json({
      message: "Successfully created data.",
      data: insertDok.rows[0],
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ message: "Failed to upload document." });
  }
});

exports.getDokumenSkPerkuliahan = asyncHandler(async (req, res) => {
  const { nip, academic_year, semester } = req.query;

  const getDok = await DB.query(
    `SELECT * FROM dokumen_sk_pembelajaran WHERE nip = $1 AND academic_year = $2 AND semester = $3`,
    [nip, academic_year, semester]
  );

  res.status(200).json({
    message: "succes",
    data: getDok.rows[0],
  });
});
