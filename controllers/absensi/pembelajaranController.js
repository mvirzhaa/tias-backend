const asyncHandler = require("express-async-handler");
const axios = require("axios");
const FormData = require('form-data');


exports.getPembelajaran = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/pembelajaran`;

  const {dataTable, orderField, orderValue, filter, filterValue} = req.query;

  try {
    // PHP Laravel mengharapkan format bracket: ?filter[]=token&filterValue[]=373210
    // Bangun query string manual dengan bracket notation
    const params = new URLSearchParams();
    if (dataTable)    params.append('dataTable',      dataTable);
    if (orderField)   params.append('orderField',     orderField);
    if (orderValue)   params.append('orderValue',     orderValue);
    if (filter)       params.append('filter[]',       filter);
    if (filterValue)  params.append('filterValue[]',  filterValue);

    const response = await axios.get(`${API_URL}?${params.toString()}`);

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving pembelajaran Absensi:", error.message);
    // Teruskan error response dari PHP jika ada
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
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