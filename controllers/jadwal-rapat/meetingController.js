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
const KategoriKegiatan = require("../../models/master/KategoriKegiatan");

exports.getMeeting = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/meeting`;

  try {
    const response = await axios.get(API_URL, {
      params: {
        ...req.query,
      },
    });

    const data = await Promise.all(
      response.data.data.map(async (data) => {
        const tipeKegiatanId = parseInt(data.tipe_kegiatan);
        const getKegiatan = await KategoriKegiatan.findOne({
          where: { id: tipeKegiatanId },
        });

        const ruanganId = parseInt(data.ruangan);
        const getRuangan = await Ruangan.findOne({
          where: { id: ruanganId },
        });

        const narsumId = data.narsum;
        const getNarsum = await DataPribadi.findOne({
          where: {
            user_id: narsumId,
          },
        });

        return {
          ...data,
          tipe_kegiatan: getKegiatan ? getKegiatan.nama_kegiatan : null,
          ruangan: getRuangan ? getRuangan.nama_ruangan : null,
          narsum: getNarsum ? getNarsum.nama_lengkap : null,
        };
      })
    );

    res.status(201).json({
      recordsTotal: response.data.recordsTotal,
      recordsFiltered: response.data.recordsFiltered,
      data: data,
    });
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

  let { filterValue, page = 1, perPage = 10, search } = req.query;

  let dataResponse;
  const response = await axios.get(API_URL, {
    params: {
      ...req.query,
    },
  });

  const idMeet = parseInt(filterValue ? filterValue[0] : null);

  if (idMeet) {
    const groupMeet = await GroupMeet.findAll({
      where: {
        id_meet: idMeet,
      },
    });

    if (groupMeet) {
      const groupIds = groupMeet.map((data) => data.id_group);

      const groupUsers = await GroupUsers.findAll({
        where: {
          id_group: {
            [Op.in]: groupIds,
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
        nama: iterate.nip_dosen ? iterate.dosen?.nama : iterate.mahasiswa?.name,
      }));

      const senitizedGroupUsers = groupUsers.map((iterate) => ({
        code: iterate.code,
        nama: iterate.personal_data.nama_lengkap,
      }));

      let data = [...senitizedResponse, ...senitizedGroupUsers];

      if (search) {
        data = data.filter(
          (item) =>
            item.code.toLowerCase().includes(search.toLowerCase()) ||
            item.nama.toLowerCase().includes(search.toLowerCase())
        );
      }

      const offset = (parseInt(page) - 1) * parseInt(perPage);
      const paginatedData = data.slice(offset, offset + parseInt(perPage));

      dataResponse = {
        message: "success",
        recordsTotal: data.length,
        page: parseInt(page),
        perPage: parseInt(perPage),
        recordsFiltered: paginatedData.length,
        pageCount: Math.ceil(data.length / perPage),
        data: paginatedData,
      };
    } else {
      let senitizedResponse = response.data.data.map((iterate) => ({
        code: iterate.nip_dosen ? iterate.nip_dosen : iterate.npm,
        nama: iterate.nip_dosen ? iterate.dosen?.nama : iterate.mahasiswa?.name,
      }));

      if (search) {
        senitizedResponse = senitizedResponse.filter((item) =>
          item.code && item.nama
            ? item.code.toLowerCase().includes(search.toLowerCase()) ||
              item.nama.toLowerCase().includes(search.toLowerCase())
            : item.code || item.nam
        );
      }

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
        pageCount: Math.ceil(senitizedResponse.length / perPage),
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
      pageCount: 0,
      data: [],
    };
  }

  res.status(201).json(dataResponse);
});

exports.getMeetingByUser = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/meeting`;

  try {
    const findGroupUser = await GroupUsers.findAll({
      where: {
        user_id: userLoginId,
      },
    });

    const groupIds = findGroupUser.map((data) => data.id_group);

    const groupMeet = await GroupMeet.findAll({
      where: {
        id_group: {
          [Op.in]: groupIds,
        },
      },
    });

    const meetIds = groupMeet.map((data) => data.id_meet);

    const response = await axios.get(API_URL, {
      params: {
        ...req.query,
        meetIds: meetIds,
      },
    });

    const data = await Promise.all(
      response.data.data.map(async (data) => {
        const tipeKegiatanId = parseInt(data.tipe_kegiatan);
        const getKegiatan = await KategoriKegiatan.findOne({
          where: { id: tipeKegiatanId },
        });

        const ruanganId = parseInt(data.ruangan);
        const getRuangan = await Ruangan.findOne({
          where: { id: ruanganId },
        });

        const narsumId = data.narsum;
        const getNarsum = await DataPribadi.findOne({
          where: {
            user_id: narsumId,
          },
        });

        return {
          ...data,
          tipe_kegiatan: getKegiatan ? getKegiatan.nama_kegiatan : null,
          ruangan: getRuangan ? getRuangan.nama_ruangan : null,
          narsum: getNarsum ? getNarsum.nama_lengkap : null,
        };
      })
    );

    res.status(201).json({
      recordsTotal: response.data.recordsTotal,
      recordsFiltered: response.data.recordsFiltered,
      data: data,
    });
  } catch (error) {
    console.error("Error retrieving Meeting:", error);
    res.status(500).send("Internal Server Error");
  }
});
