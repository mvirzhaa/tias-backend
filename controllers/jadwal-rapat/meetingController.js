const asyncHandler = require("express-async-handler");
const  axios  = require("axios");
const FormData = require('form-data');


exports.getMeeting = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/meeting`;

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

exports.meetingStore = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/meeting/store`;
  
  const { nm_pengundang, nm_kegiatan, pertemuan, ruangan, status_ruangan } = req.body;

  try {
    const formData = new FormData();
    formData.append('nm_pengundang', nm_pengundang);
    formData.append('nm_kegiatan', nm_kegiatan);
    formData.append('pertemuan', pertemuan);
    formData.append('ruangan', ruangan);
    formData.append('status_ruangan', status_ruangan);
    
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

exports.getMeetingInvite = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/meeting-invite`;

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

exports.meetingInviteStore = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/meeting-invite/store`;
  
  const { id_meeting, nip_dosen, npm } = req.body;

  if ((nip_dosen && npm) || (!nip_dosen && !npm)) {
    return res.status(400).json({ error: 'Either nip_dosen or npm should be provided, but not both or none' });
  }

  try {
    const formData = new FormData();
    formData.append('id_meeting', id_meeting);
    if (nip_dosen) {
      formData.append('nip_dosen', nip_dosen);
    } else {
      formData.append('npm', npm);
    }

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