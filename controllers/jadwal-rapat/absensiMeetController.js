const asyncHandler = require("express-async-handler");
const  axios  = require("axios");
const FormData = require('form-data');


exports.getAbsensiMeeting = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi-meeting`;

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
    console.error("Error retrieving Meeting:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.absensiMeetStore = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi-meeting/store`;
  
  const { id_meeting, code, status_absen, name_absen } = req.body;

  try {
    const formData = new FormData();
    formData.append('id_meeting', id_meeting);
    formData.append('code', code);
    formData.append('status_absen', status_absen);
    formData.append('name_absen', name_absen);
    
    const response = await axios.post(API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving add meeting store:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.showQr = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi-meeting/show-qr`;

  const {token} = req.query;

  try {
    const response = await axios.get(API_URL, {
      params: {
        token
      }
    })
    const qrImageUrl = response.data;

    res.status(201).send(`<img src="${qrImageUrl}`);
  } catch (error) {
    console.error("Error retrieving Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.scanQr = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/absensi-meeting/scan-qr`;

  const { token, coordinate, status_absen, code, name_absen } = req.body;

  try {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('coordinate', coordinate);
    formData.append('status_absen', status_absen);
    formData.append('code', code);
    formData.append('name_absen', name_absen);

    const response = await axios.post(API_URL, formData);

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving add pembelajaran Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});