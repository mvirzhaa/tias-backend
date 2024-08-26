const asyncHandler = require("express-async-handler");
const axios = require("axios");
const FormData = require("form-data");
const Ruangan = require("../../models/master/Ruangan");
const { Op } = require("sequelize");
const { response } = require("../../lib/response");
const GroupMeet = require("../../models/master/group/GroupMeet");
const GroupUsers = require("../../models/master/group/GroupUsers");
const User = require("../../models/User");
const DataPribadi = require("../../models/DataPribadi");

exports.getMeeting = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/meeting`;

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
    console.error("Error retrieving Meeting:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.meetingStore = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/meeting/store`;

  const { nm_pengundang, nm_kegiatan, pertemuan, ruangan, status_ruangan } =
    req.body;

  try {
    const formData = new FormData();
    formData.append("nm_pengundang", nm_pengundang);
    formData.append("nm_kegiatan", nm_kegiatan);
    formData.append("pertemuan", pertemuan);
    formData.append("ruangan", ruangan);
    formData.append("status_ruangan", status_ruangan);

    const response = await axios.post(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving add meeting store:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.meetingInviteStore = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN}/meeting-invite/store`;

  const { id_meeting, nip_dosen, npm } = req.body;

  if ((nip_dosen && npm) || (!nip_dosen && !npm)) {
    return res.status(400).json({
      error: "Either nip_dosen or npm should be provided, but not both or none",
    });
  }

  try {
    const formData = new FormData();
    formData.append("id_meeting", id_meeting);
    if (nip_dosen) {
      formData.append("nip_dosen", nip_dosen);
    } else {
      formData.append("npm", npm);
    }

    const response = await axios.post(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving add meeting store:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.petaSebaran = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/meeting`;

  const { tanggal_mulai, tanggal_selesai } = req.query;

  console.log(tanggal_mulai, tanggal_selesai);

  try {
    const response = await axios.get(API_URL, {
      params: {
        dataTable: true,
        tanggal_mulai: tanggal_mulai,
        tanggal_selesai: tanggal_selesai,
      },
    });

    const meetingData = response.data?.data;

    const ruanganMap = {};

    for (const meeting of meetingData) {
      const ruanganId = meeting.ruangan;

      if (!ruanganMap[ruanganId]) {
        const ruanganData = await Ruangan.findOne({
          where: { id: ruanganId },
          attributes: ["id", "lat", "long", "nama_ruangan", "alamat"],
        });

        if (ruanganData) {
          ruanganMap[ruanganId] = {
            ...ruanganData.dataValues,
            lat: parseFloat(ruanganData.lat),
            long: parseFloat(ruanganData.long),
            meeting: [],
          };
        }
      }

      if (ruanganMap[ruanganId]) {
        ruanganMap[ruanganId].meeting.push(meeting);
      }
    }

    const combinedData = Object.values(ruanganMap);

    res.status(200).json({
      message: "Successfully retrieved combined data",
      data: combinedData,
    });
  } catch (error) {
    console.error(
      "Error retrieving and combining Meeting and Ruangan data:",
      error
    );
    return res.status(500).json({
      success: false,
      message: error.message,
      error,
    });
  }
});

exports.getMeetingInvite = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/meeting-invite`;

  let { filterValue, page = 1, perPage = 10 } = req.query;
  let dataResponse;
  try {
    const response = await axios.get(API_URL, {
      params: {
        ...req.query,
      },
    });

    const idMeet = parseInt(filterValue ? filterValue[0] : null);

    if (idMeet) {
      const groupMeet = await GroupMeet.findOne({
        where: {
          id_meet: idMeet,
        },
      });

      if (groupMeet) {
        const groupIds = groupMeet.id_group;

        const groupUsers = await GroupUsers.findAll({
          where: {
            id_group: {
              [Op.overlap]: groupIds,
            },
          },
          include: {
            model: DataPribadi,
            as: "personal_data",
            attributes: ["nama_lengkap"],
          },
        });

        const senitizedResponse = response.data.data.map((iterate) => ({
          code: iterate.nip_dosen ? iterate.nip_dosen : iterate.npm,
          nama: iterate.nip_dosen
            ? iterate.dosen?.nama
            : iterate.mahasiswa?.name,
        }));

        const senitizedGroupUsers = groupUsers.map((iterate) => ({
          code: iterate.code,
          nama: iterate.personal_data.nama_lengkap,
        }));

        const data = [...senitizedResponse, ...senitizedGroupUsers];

        const offset = (parseInt(page) - 1) * parseInt(perPage);
        const paginatedData = data.slice(offset, offset + parseInt(perPage));

        dataResponse = {
          message: "success",
          recordsTotal: data.length,
          page: parseInt(page),
          perPage: parseInt(perPage),
          recordsFiltered: paginatedData.length,
          data: paginatedData,
        };
      } else {
        const senitizedResponse = response.data.data.map((iterate) => ({
          code: iterate.nip_dosen ? iterate.nip_dosen : iterate.npm,
          nama: iterate.nip_dosen
            ? iterate.dosen?.nama
            : iterate.mahasiswa?.name,
        }));

        const offset = (parseInt(page) - 1) * parseInt(perPage);
        const paginatedData = senitizedResponse.slice(
          offset,
          offset + parseInt(perPage)
        );
        dataResponse = {
          message: "success",
          recordsTotal: senitizedResponse.length,
          page: parseInt(page),
          perPage: parseInt(perPage),
          recordsFiltered: paginatedData.length,
          data: paginatedData,
        };
      }
    } else {
      dataResponse = {
        message: "success",
        recordsTotal: 0,
        page: 1,
        perPage: 10,
        recordsFiltered: 0,
        data: [],
      };
    }
    res.status(201).json(dataResponse);
  } catch (error) {
    console.error("Error retrieving Meeting:", error);
    res.status(500).send("Internal Server Error");
  }
});

exports.getMeetingInviteByUser = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/meeting-invite`;

  let { filterValue, page = 1, perPage = 10 } = req.query;
  let dataResponse;
  try {
    const response = await axios.get(API_URL, {
      params: {
        ...req.query,
      },
    });

    const idMeet = parseInt(filterValue ? filterValue[0] : null);

    if (idMeet) {
      const groupMeet = await GroupMeet.findOne({
        where: {
          id_meet: idMeet,
        },
      });

      if (groupMeet) {
        const groupIds = groupMeet.id_group;

        const groupUsers = await GroupUsers.findAll({
          where: {
            id_group: {
              [Op.overlap]: groupIds,
            },
          },
          include: {
            model: DataPribadi,
            as: "personal_data",
            attributes: ["nama_lengkap"],
          },
        });

        const senitizedResponse = response.data.data.map((iterate) => ({
          code: iterate.nip_dosen ? iterate.nip_dosen : iterate.npm,
          nama: iterate.nip_dosen
            ? iterate.dosen?.nama
            : iterate.mahasiswa?.name,
        }));

        const senitizedGroupUsers = groupUsers.map((iterate) => ({
          code: iterate.code,
          nama: iterate.personal_data.nama_lengkap,
        }));

        const data = [...senitizedResponse, ...senitizedGroupUsers];

        const offset = (parseInt(page) - 1) * parseInt(perPage);
        const paginatedData = data.slice(offset, offset + parseInt(perPage));

        dataResponse = {
          message: "success",
          recordsTotal: data.length,
          page: parseInt(page),
          perPage: parseInt(perPage),
          recordsFiltered: paginatedData.length,
          data: paginatedData,
        };
      } else {
        const senitizedResponse = response.data.data.map((iterate) => ({
          code: iterate.nip_dosen ? iterate.nip_dosen : iterate.npm,
          nama: iterate.nip_dosen
            ? iterate.dosen?.nama
            : iterate.mahasiswa?.name,
        }));

        const offset = (parseInt(page) - 1) * parseInt(perPage);
        const paginatedData = senitizedResponse.slice(
          offset,
          offset + parseInt(perPage)
        );
        dataResponse = {
          message: "success",
          recordsTotal: senitizedResponse.length,
          page: parseInt(page),
          perPage: parseInt(perPage),
          recordsFiltered: paginatedData.length,
          data: paginatedData,
        };
      }
    } else {
      dataResponse = {
        message: "success",
        recordsTotal: 0,
        page: 1,
        perPage: 10,
        recordsFiltered: 0,
        data: [],
      };
    }
    res.status(201).json(dataResponse);
  } catch (error) {
    console.error("Error retrieving Meeting:", error);
    res.status(500).send("Internal Server Error");
  }
});
