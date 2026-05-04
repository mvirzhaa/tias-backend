const asyncHandler = require("express-async-handler");
const  axios  = require("axios");
const FormData = require('form-data');


exports.getPembelajaran = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran`;

  const {dataTable, orderField, orderValue, filter, filterValue} = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable: dataTable,
        orderField: orderField,
        orderValue: orderValue,
        filter: filter,
        filterValue: filterValue
      }
    })

    res.status(201).json(response.data)
  } catch (error) {
    console.error("Error retrieving pembelajaran Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.storePembelajaran = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/store`;

  const { nik_dosen, kelas, pertemuan, status_kelas, id_matkul, id_lecture } = req.body;

  try {
    const formData = new FormData();
    formData.append('nik_dosen', nik_dosen);
    formData.append('kelas', kelas);
    formData.append('pertemuan', pertemuan);
    formData.append('status_kelas', status_kelas);
    formData.append('id_matkul', id_matkul);
    formData.append('id_lecture', id_lecture);

    const response = await axios.post(API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving add pembelajaran Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.cekPertemuan = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/cek-pertemuan`;
  const {nik_dosen, id_matkul, kelas, id_lecture} = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        nik_dosen,
        id_matkul,
        kelas,
        id_lecture,
      }
    })

    res.status(201).json(response.data)
  } catch (error) {
    console.error("Error retrieving cek-pertemuan Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.listPertemuan = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/list-pertemuan`;
  const {dataTable, code} = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable,
        code
      }
    })

    res.status(201).json(response.data)
  } catch (error) {
    console.error("Error retrieving cek-pertemuan Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.listAbsensi = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/list-absen`;
  const {dataTable, id_matkul, kelas} = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable,
        id_matkul,
        kelas
      }
    })

    res.status(201).json(response.data)
  } catch (error) {
    console.error("Error retrieving cek-pertemuan Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.deletePertemuan = asyncHandler(async (req, res) => {
  const {id} = req.params;
  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran/delete/${id}`;

  try {
    const response = await axios.delete(API_URL)

    res.status(201).json(response.data)
  } catch (error) {
    console.error("Error retrieving cek-pertemuan Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});