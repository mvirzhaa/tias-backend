const asyncHandler = require("express-async-handler");
const  axios  = require("axios");
const FormData = require('form-data');


exports.getAbsensi = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi`;

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
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.storeAbsensi = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi/store`;

  const { id_pembelajaran, npm, status_absen } = req.body;

  try {
    const formData = new FormData();
    formData.append('id_pembelajaran', id_pembelajaran);
    formData.append('npm', npm);
    formData.append('status_absen', status_absen);

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

exports.deleteAbsensi = asyncHandler(async (req, res) => {
  const {id} = req.params;
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi/delete/${id}`;

  try {
    const response = await axios.delete(API_URL)

    res.status(201).json(response.data)
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
    formData.append('token', token);
    formData.append('coordinate', coordinate);
    formData.append('status_absen', status_absen);
    formData.append('npm', npm);

    const response = await axios.post(API_URL, formData);

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving add pembelajaran Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.showQr = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi/show-qr`;

  const {token} = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        token
      }
    })

    res.status(201).json(response.data)
  } catch (error) {
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.updateAbsensi = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {npm, status_absen} = req.body;

  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi/update/${id}`;

console.log(status_absen);
  try {
    const formData = new FormData();
    formData.append('npm', npm);
    formData.append('status_absen', status_absen);

    const response = await axios.post(API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving update pembelajaran Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.dosenForMk = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/dosen-for-mk`;

  const {dataTable, academic_year, id_lecture, code} = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable: dataTable,
        academic_year: academic_year,
        id_lecture: id_lecture,
        code: code,
      }
    })

    res.status(201).json(response.data)
  } catch (error) {
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});
