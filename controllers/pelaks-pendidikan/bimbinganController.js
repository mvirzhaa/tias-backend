const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const { unixTimestamp, convertDate } = require("../../utils");

// ====================  BIMBINGAN MAHASISWA ==========================
exports.addDataBimbingan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userLoginId,
  ]);

  if (user.rows.length) {
    const data = req.body;
    if (
      !data.judul_bimbingan ||
      !data.jenis_bimbingan ||
      !data.program_studi ||
      !data.no_sk_penugasan ||
      !data.tgl_sk_penugasan ||
      !data.lokasi_kegiatan ||
      !data.semester ||
      !data.dosen_pembimbing ||
      !data.mhs_bimbingan
    ) {
      res.status(400);
      throw new Error("Pleas fill in all the required fields.");
    }
    // ==============BIMBINGAN MAHASISWA===================
    const dataBimbingan = {
      judul_bimbingan: data.judul_bimbingan,
      jenis_bimbingan: data.jenis_bimbingan,
      program_studi: data.program_studi,
      no_sk_penugasan: data.no_sk_penugasan,
      tgl_sk_penugasan: data.tgl_sk_penugasan,
      lokasi_kegiatan: data.lokasi_kegiatan,
      semester: data.semester,
    };

    const existsNoSk = await DB.query(
      "SELECT * FROM tb_bimbingan_mhs WHERE no_sk_penugasan = $1",
      [dataBimbingan.no_sk_penugasan]
    );

    if (existsNoSk.rows.length) {
      res.status(400);
      throw new Error("No SK Already Exists.");
    }

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const keys = ["user_id", ...Object.keys(dataBimbingan), "created_at"];
    const values = [userLoginId, ...Object.values(dataBimbingan), convert];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    const saveData = await DB.query(
      `INSERT INTO tb_bimbingan_mhs(${keys.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) returning *`,
      values
    );

    // ==============END BIMBINGAN MAHASISWA===================

    const bimbinganId = saveData.rows[0].bimbingan_id;

    // ==============DOSEN PEMBIMBING===================
    JSON.parse(data.dosen_pembimbing).forEach(async (dosen) => {
      const dosenPembimbing = {
        user_id: dosen.user_id,
        kategori_kegiatan: dosen.kategori_kegiatan,
        urutan_promotor: dosen.urutan_promotor,
      };

      const keysData = ["bimbingan_id", ...Object.keys(dosenPembimbing)];
      const valuesData = [bimbinganId, ...Object.values(dosenPembimbing)];
      const placeholdersData = keysData.map((key, index) => `$${index + 1}`);

      await DB.query(
        `INSERT INTO dosen_pembimbing(${keysData.join(
          ", "
        )}) VALUES (${placeholdersData.join(", ")}) returning *`,
        valuesData
      );
    });
    // ==============END DOSEN PEMBIMBING===================

    // ==============MAHASISWA BIMBINGAN===================
    JSON.parse(data.mhs_bimbingan).forEach(async (mhs) => {
      const mhsBimbingan = {
        user_id: mhs.user_id,
        peran: mhs.peran,
      };

      const keysData = ["bimbingan_id", ...Object.keys(mhsBimbingan)];
      const valuesData = [bimbinganId, ...Object.values(mhsBimbingan)];
      const placeholdersData = keysData.map((key, index) => `$${index + 1}`);

      await DB.query(
        `INSERT INTO mhs_bimbingan(${keysData.join(
          ", "
        )}) VALUES (${placeholdersData.join(", ")}) returning *`,
        valuesData
      );
    });
    // ==============END MAHASISWA BIMBINGAN===================

    if (saveData.rows) {
      res.status(200).json({
        message: "Successfull created data.",
      });
    } else {
      res.status(400);
      throw new Error("Invalid data.");
    }
  } else {
    res.status(404);
    throw new Error("User not found.");
  }
});

exports.getDataBimbingan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const findData = await DB.query(
    "SELECT * FROM tb_bimbingan_mhs WHERE user_id = $1 and is_deleted = $2",
    [userLoginId, false]
  );

  const jumlahData = await DB.query(
    "SELECT COUNT(*) FROM tb_bimbingan_mhs WHERE user_id = $1 and is_deleted = $2",
    [userLoginId, false]
  );

  res.status(201).json({
    data: findData.rows,
    totalData: jumlahData.rows[0].count,
  });
});

exports.detailDataBimbingan = asyncHandler(async (req, res) => {
  const { bimbinganId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bimbingan_mhs WHERE bimbingan_id = $1",
    [bimbinganId]
  );

  const dosenPembimbing = await DB.query(
    "SELECT dosen_pembimbing.*, tb_users.user_id, tb_users.role, tb_data_pribadi.nama_lengkap FROM dosen_pembimbing JOIN tb_users ON tb_users.user_id = dosen_pembimbing.user_id JOIN tb_data_pribadi ON tb_data_pribadi.user_id = tb_users.user_id WHERE dosen_pembimbing.bimbingan_id = $1",
    [bimbinganId]
  );

  const mhsBimbingan = await DB.query(
    "SELECT mhs_bimbingan.*, tb_users.user_id, tb_users.role, tb_data_pribadi.nama_lengkap FROM mhs_bimbingan JOIN tb_users ON tb_users.user_id = mhs_bimbingan.user_id JOIN tb_data_pribadi ON tb_data_pribadi.user_id = tb_users.user_id WHERE mhs_bimbingan.bimbingan_id = $1",
    [bimbinganId]
  );

  res.status(201).json({
    data: {
      dataBimbingan: findData.rows,
      dosenPembimbing: dosenPembimbing.rows,
      mhsBimbingan: mhsBimbingan.rows,
    },
  });
});

exports.editDataBimbingan = asyncHandler(async (req, res) => {
  const { bimbinganId } = req.params;
  const data = req.body;

  if (data.status) {
    res.status(400);
    throw new Error("Access Danied.");
  }

  const findDataBimbingan = await DB.query(
    "SELECT * FROM tb_bimbingan_mhs WHERE bimbingan_id = $1",
    [bimbinganId]
  );

  if (findDataBimbingan.rows[0].status == 1) {
    res.status(400);
    throw new Error("Your data already approved.");
  }

  if (findDataBimbingan.rows.length) {
    // BIMBINGAN
    function filterData(data) {
      const result = {};

      for (let prop in data) {
        if (data[prop] !== undefined) {
          result[prop] = data[prop];
        }
      }

      return result;
    }

    const statusValue =
      findDataBimbingan.rows[0].status === 2
        ? 0
        : findDataBimbingan.rows[0].status;

    const dataBimbingan = {
      judul_bimbingan: data.judul_bimbingan,
      jenis_bimbingan: data.jenis_bimbingan,
      program_studi: data.program_studi,
      no_sk_penugasan: data.no_sk_penugasan,
      tgl_sk_penugasan: data.tgl_sk_penugasan,
      lokasi_kegiatan: data.lokasi_kegiatan,
      semester: data.semester,
      status: statusValue,
    };

    const filteredObject = filterData(dataBimbingan);

    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);

    const entries = Object.entries({ ...filteredObject, updated_at: convert });
    const setQuery = entries
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(", ");

    await DB.query(
      `UPDATE tb_bimbingan_mhs SET ${setQuery} WHERE bimbingan_id = '${findDataBimbingan.rows[0].bimbingan_id}' `,
      entries.map(([_, value]) => value)
    );
    // END BIMBINGAN

    // DOSEN PEMBIMBING
    if (data.dosen_pembimbing) {
      await DB.query("DELETE FROM dosen_pembimbing WHERE bimbingan_id = $1", [
        bimbinganId,
      ]);

      JSON.parse(data.dosen_pembimbing).forEach(async (dosen) => {
        const dosenPembimbing = {
          user_id: dosen.user_id,
          kategori_kegiatan: dosen.kategori_kegiatan,
          urutan_promotor: dosen.urutan_promotor,
        };

        const keysData = ["bimbingan_id", ...Object.keys(dosenPembimbing)];
        const valuesData = [bimbinganId, ...Object.values(dosenPembimbing)];
        const placeholdersData = keysData.map((key, index) => `$${index + 1}`);

        await DB.query(
          `INSERT INTO dosen_pembimbing(${keysData.join(
            ", "
          )}) VALUES (${placeholdersData.join(", ")}) returning *`,
          valuesData
        );
      });
    }
    // END DOSEN PEMBIMBING

    // Add Mahasiswa Bimbingan
    if (data.mhs_bimbingan) {
      await DB.query("DELETE FROM mhs_bimbingan WHERE bimbingan_id = $1", [
        bimbinganId,
      ]);

      JSON.parse(data.mhs_bimbingan).forEach(async (mhs) => {
        const mhsBimbingan = {
          user_id: mhs.user_id,
          peran: mhs.peran,
        };

        const keysData = ["bimbingan_id", ...Object.keys(mhsBimbingan)];
        const valuesData = [bimbinganId, ...Object.values(mhsBimbingan)];
        const placeholdersData = keysData.map((key, index) => `$${index + 1}`);

        await DB.query(
          `INSERT INTO mhs_bimbingan(${keysData.join(
            ", "
          )}) VALUES (${placeholdersData.join(", ")}) returning *`,
          valuesData
        );
      });
    }
    // END Mahasiswa Bimbingan

    res.status(201).json({
      message: "Successfully update data.",
    });
  } else {
    res.status(404).json({
      message: "Data not found",
    });
  }
});

exports.deleteDataBimbingan = asyncHandler(async (req, res) => {
  const { bimbinganId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bimbingan_mhs WHERE bimbingan_id = $1",
    [bimbinganId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  await DB.query(
    "UPDATE tb_bimbingan_mhs SET is_deleted = $1, deleted_at = $2 WHERE bimbingan_id = $3",
    [true, convert, bimbinganId]
  );

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.approveStatusBimbingan = asyncHandler(async (req, res) => {
  const { bimbinganId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bimbingan_mhs WHERE bimbingan_id = $1",
    [bimbinganId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_bimbingan_mhs SET status = $1, updated_at = $2 WHERE bimbingan_id = $3`,
      [1, convert, bimbinganId]
    );

    res.status(201).json({
      message: "Successfully update data.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.rejectStatusBimbingan = asyncHandler(async (req, res) => {
  const { bimbinganId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bimbingan_mhs WHERE bimbingan_id = $1",
    [bimbinganId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_bimbingan_mhs SET status = $1, updated_at = $2 WHERE bimbingan_id = $3`,
      [2, convert, bimbinganId]
    );

    res.status(201).json({
      message: "Data has been rejected.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});
