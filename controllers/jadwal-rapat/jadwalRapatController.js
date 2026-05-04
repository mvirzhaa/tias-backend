const asyncHandler = require("express-async-handler");
const DB_TIAS = require("../../database");
const axios = require("axios");
const FormData = require("form-data");
const DataPribadi = require("../../models/DataPribadi");
const User = require("../../models/User");
const KategoriKegiatan = require("../../models/master/KategoriKegiatan");
const Ruangan = require("../../models/master/Ruangan");
const GroupMeet = require("../../models/master/group/GroupMeet");
const { Op } = require("sequelize");

exports.storeMeeting = asyncHandler(async (req, res) => {
  const API_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/meeting/store`;

  const {
    nm_kegiatan,
    nm_pengundang,
    pertemuan,
    ruangan,
    status_ruangan,
    tanggal,
    waktu,
    peserta,
    waktu_end,
    tipe_kegiatan,
    sub_tema,
    narsum,
    ket_narsum,
    contact,
    link_online,
  } = req.body;

  if (
    !nm_kegiatan ||
    !nm_pengundang ||
    !pertemuan ||
    !ruangan ||
    !status_ruangan ||
    !tanggal ||
    !waktu ||
    !waktu_end ||
    !tipe_kegiatan ||
    !narsum ||
    !ket_narsum ||
    !contact ||
    !sub_tema ||
    !peserta
  ) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  const pesertaData = JSON.parse(peserta);
  const pesertaMhs = pesertaData.peserta_mhs;
  const pesertaDosen = pesertaData.peserta_dosen;
  const groups = pesertaData.groups;

  let idGroupMeet = [];

  if (groups?.length) {
    let dataInput = [];
    for (const iterator of groups) {
      if (iterator !== "" && iterator !== null) {
        dataInput.push({
          id_meet: 0,
          id_group: iterator.id,
        });
      }
    }

    const inserts = await GroupMeet.bulkCreate(dataInput, { returning: true });

    idGroupMeet = inserts.map((insert) => insert.id_group);
  }

  try {
    const formData = new FormData();
    formData.append("nm_kegiatan", nm_kegiatan);
    formData.append("nm_pengundang", nm_pengundang);
    formData.append("pertemuan", pertemuan);
    formData.append("ruangan", ruangan);
    formData.append("status_ruangan", status_ruangan);
    formData.append("tanggal", tanggal);
    formData.append("waktu", waktu);
    // formData.append("id_group_tias", idGroupMeet);
    formData.append("waktu_end", waktu_end);
    formData.append("tipe_kegiatan", tipe_kegiatan);
    formData.append("sub_tema", sub_tema);
    formData.append("narsum", narsum);
    formData.append("ket_narsum", ket_narsum);
    formData.append("contact", contact);
    formData.append("link_online", link_online);

    const response = await axios.post(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data.data) {
      const GENERATE_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/generate-pamplet`;
      const narsum = await DB_TIAS.query(
        "SELECT tb_data_pribadi.nama_lengkap, tb_data_pribadi.foto_narsum FROM tb_data_pribadi WHERE user_id = $1",
        [response.data.data.narsum]
      );

      const tipeKegiatan = await KategoriKegiatan.findOne({
        where: {
          id: response.data.data.tipe_kegiatan, // Memastikan 'id' dicocokkan dengan 'tipe_kegiatan'
        },
      });

      const ruangan = await Ruangan.findOne({
        where: {
          id: response.data.data.ruangan, // Memastikan 'id' dicocokkan dengan 'ruangan'
        },
      });

      const generatePamflet = await axios.post(GENERATE_URL, {
        tipe_kegiatan: tipeKegiatan?.nama_kegiatan,
        nm_kegiatan: response.data.data?.nm_kegiatan,
        sub_tema: response.data.data?.sub_tema,
        narsum: narsum.rows[0].nama_lengkap,
        ket_narsum: response.data.data?.ket_narsum,
        ruangan: ruangan?.nama_ruangan,
        tanggal: response.data.data?.tanggal,
        waktu: response.data.data?.waktu,
        waktu_end: response.data.data?.waktu_end,
        contact: response.data.data?.contact,
        foto_narsum: `https://api-tias.ti.ft.uika-bogor.ac.id/foto-narsum/1724489880652-computer-administrator.png`,
      });

      if (!generatePamflet.data) {
        const delete_url = `${process.env.API_LOCAL_ABSEN_AGAIN}/meeting/delete/${response.data.data.id}`;
        const deleteData = await axios.delete(delete_url);
        console.log(deleteData);
        throw new Error("Narasumber belum mememiliki foto.");
      }
    }

    const id = response.data.data.id;

    if (groups?.length) {
      await GroupMeet.update(
        {
          id_meet: id,
        },
        {
          where: {
            id_group: {
              [Op.in]: idGroupMeet,
            },
          },
        }
      );
    }

    const INSERT_MEET_URL = `${process.env.API_LOCAL_ABSEN_AGAIN}/meeting-invite/store`;

    if (pesertaMhs && pesertaMhs.length > 0) {
      for (const mahasiswa of pesertaMhs) {
        const { npm } = mahasiswa;
        const dataMhs = new FormData();
        dataMhs.append("id_meeting", id);
        dataMhs.append("npm", npm);

        await axios.post(INSERT_MEET_URL, dataMhs, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }
    }

    // Pengiriman data peserta dosen jika ada
    if (pesertaDosen && pesertaDosen.length > 0) {
      for (const dosen of pesertaDosen) {
        const { nip } = dosen;
        const dataDosen = new FormData();
        dataDosen.append("id_meeting", id);
        dataDosen.append("nip_dosen", nip);

        await axios.post(INSERT_MEET_URL, dataDosen, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }
    }

    // Pengiriman data groups jika ada

    res.status(201).json(response.data);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

exports.getGroupUserMeet = asyncHandler(async (req, res) => {
  const { filter, filterValue } = req.query;

  let query = "SELECT * FROM tb_group_meet";

  if (filter && filterValue) {
    if (Array.isArray(filter) && Array.isArray(filterValue)) {
      for (let i = 0; i < filter.length; i++) {
        query += ` WHERE ${filter[i]} = '${filterValue[i]}'`;
        if (i !== filter.length - 1) {
          query += " AND";
        }
      }
    } else {
      res
        .status(400)
        .json({ message: "Filter and filterValue must be arrays." });
      return;
    }
  }

  const findMeetGroup = await DB_TIAS.query(query);
  const findGroup = await DB_TIAS.query("SELECT * FROM tb_group");
  const findGroupUsers = await DB_TIAS.query("SELECT * FROM tb_group_user");
  const findDataPribadi = await DB_TIAS.query(
    "SELECT user_id, nama_lengkap FROM tb_data_pribadi"
  );

  const result = findMeetGroup.rows.map((meet) => {
    const groups = meet.id_group.map((groupId) => {
      const group = findGroup.rows.find(
        (group) => group.id === parseInt(groupId)
      );
      const users = findGroupUsers.rows.filter((user) =>
        user.id_group.includes(groupId)
      );
      const formattedUsers = users.map((user) => {
        const userDataPribadi = findDataPribadi.rows.find(
          (data) => data.user_id === user.user_id
        );
        return {
          user_id: user.user_id,
          code: user.code,
          nama_lengkap: userDataPribadi ? userDataPribadi.nama_lengkap : null,
        };
      });
      return {
        ...group,
        users: formattedUsers,
      };
    });

    const data = {
      id: meet.id,
      id_meet: meet.id_meet,
      groups: groups,
    };

    return {
      ...data,
    };
  });

  res.json(result);
});
