const asyncHandler = require("express-async-handler");
const axios = require("axios");
const FormData = require("form-data");

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
    id_group_tias,
  } = req.body;

  if (
    !nm_kegiatan ||
    !nm_pengundang ||
    !pertemuan ||
    !ruangan ||
    !status_ruangan ||
    !tanggal ||
    !waktu ||
    !peserta
  ) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  const pesertaData = JSON.parse(peserta);
  const pesertaMhs = pesertaData.peserta_mhs;
  const pesertaDosen = pesertaData.peserta_dosen;

  try {
    const formData = new FormData();
    formData.append("nm_kegiatan", nm_kegiatan);
    formData.append("nm_pengundang", nm_pengundang);
    formData.append("pertemuan", pertemuan);
    formData.append("ruangan", ruangan);
    formData.append("status_ruangan", status_ruangan);
    formData.append("tanggal", tanggal);
    formData.append("waktu", waktu);
    formData.append("id_group_tias", id_group_tias);

    const response = await axios.post(API_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const id = response.data.data.id;

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

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error retrieving add pembelajaran Absensi:", error);
    res.status(500).send("Internal Server Error");
  }
});
