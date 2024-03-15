const asyncHandler = require("express-async-handler");
const DB = require("../../db-bimbingan-akademik");
const DB_TIAS = require("../../database");
const { unixTimestamp, convertDate } = require("../../utils");

// ====================  BIMBINGAN MAHASISWA ==========================
exports.addDataBimbinganAkademik = asyncHandler(async (req, res) => {
  const data = req.body;
  if (!data.tahun_akademik || !data.dosen_id || !data.mhs_bimbingan) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }
  // ==============BIMBINGAN MAHASISWA===================
  const dataBimbingan = {
    tahun_akademik: data.tahun_akademik,
    dosen_id: data.dosen_id,
  };

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const keys = [...Object.keys(dataBimbingan), "created_at"];
  const values = [...Object.values(dataBimbingan), convert];
  const placeholders = keys.map((key, index) => `$${index + 1}`);

  const saveData = await DB.query(
    `INSERT INTO tb_bimbingan_akademik(${keys.join(
      ", "
    )}) VALUES (${placeholders.join(", ")}) returning *`,
    values
  );

  // ==============END BIMBINGAN MAHASISWA===================

  const bimbinganId = saveData.rows[0].id;

  // ==============MAHASISWA BIMBINGAN===================
  JSON.parse(data.mhs_bimbingan).forEach(async (mhs) => {
    const mhsBimbingan = {
      mhs_id: mhs.user_id,
      dok_frs: "index.pdf"
    };

    const keysData = ["id_bimbingan", ...Object.keys(mhsBimbingan)];
    const valuesData = [bimbinganId, ...Object.values(mhsBimbingan)];
    const placeholdersData = keysData.map((key, index) => `$${index + 1}`);

    await DB.query(
      `INSERT INTO mhs_bimbingan_akademik(${keysData.join(
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
});

exports.getDataBimbingan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const role = req.user.role;

  if (role === "Dosen") {
    const findData = await DB.query(
      "SELECT * FROM tb_bimbingan_akademik WHERE dosen_id = $1",
      [userLoginId]
    );

    res.status(200).json({
      message: "Successfully get data.",
      totalData: findData.rowCount,
      data: findData.rows,
    });
  } else if (role === "Mahasiswa") {
    const findData = await DB.query(
      "SELECT mhs_bimbingan_akademik.*, tb_bimbingan_akademik.* FROM mhs_bimbingan_akademik JOIN tb_bimbingan_akademik ON mhs_bimbingan_akademik.id_bimbingan = tb_bimbingan_akademik.id WHERE mhs_bimbingan_akademik.mhs_id = $1",
      [userLoginId]
    );

    res.status(200).json({
      message: "Successfully get data.",
      totalData: findData.rowCount,
      data: findData.rows[0],
    });
  } else {
    const findData = await DB.query("SELECT * FROM tb_bimbingan_akademik");

    const dosenIds = findData.rows.map((data) => data.dosen_id);

    const findDosen = await DB_TIAS.query(
      "SELECT user_id, nama_lengkap FROM tb_data_pribadi WHERE user_id = ANY($1)",
      [dosenIds]
    );

    const dosenMap = {};
    findDosen.rows.forEach((dosen) => {
      dosenMap[dosen.user_id] = dosen.nama_lengkap;
    });

    const mergedData = findData.rows.map((data) => ({
      ...data,
      nama_lengkap: dosenMap[data.dosen_id],
    }));

    res.status(200).json({
      message: "Successfully get data.",
      totalData: findData.rowCount,
      data: mergedData,
    });
  }
});

exports.detailDataBimbingan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bimbingan_akademik WHERE id = $1",
    [id]
  );

  if (findData.rows.length === 0) {
    res.status(404).json({
      message: "Bimbingan data not found.",
      data: {},
    });
    return;
  }

  const bimbinganData = findData.rows[0];

  const mhsBimbingan = await DB.query(
    "SELECT * FROM mhs_bimbingan_akademik WHERE id_bimbingan = $1",
    [id]
  );

  const mhsIds = mhsBimbingan.rows.map((data) => data.mhs_id);

  const findMhs = await DB_TIAS.query(
    "SELECT tb_users.npm, tb_users.user_id, tb_data_pribadi.user_id, tb_data_pribadi.nama_lengkap FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.user_id = ANY($1)",
    [mhsIds]
  );

  const mhsMap = {};
  findMhs.rows.forEach((mhs) => {
    mhsMap[mhs.user_id] = mhs;
  });

  const mergedData = mhsBimbingan.rows.map((data) => ({
    ...data,
    nama_lengkap: mhsMap[data.mhs_id].nama_lengkap,
    npm: mhsMap[data.mhs_id].npm,
    dok_frs: data.dok_frs,
  }));

  res.status(200).json({
    message: "Bimbingan data retrieved successfully.",
    data: {
      dataBimbingan: bimbinganData,
      mhsBimbingan: mergedData,
    },
  });
});

exports.deleteDataBimbingan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bimbingan_akademik WHERE id = $1",
    [id]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  await DB.query("DELETE FROM tb_bimbingan_akademik WHERE id = $1", [id]);
  await DB.query("DELETE FROM mhs_bimbingan_akademik WHERE id_bimbingan = $1", [
    id,
  ]);

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.deleteMhsBimbingan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB.query(
    "SELECT * FROM mhs_bimbingan_akademik WHERE id = $1",
    [id]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  await DB.query("DELETE FROM mhs_bimbingan_akademik WHERE id = $1", [id]);

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.updateForAdmin = asyncHandler(async (req, res) => {
  const idToUpdate = req.params.id;
  const dataToUpdate = req.body;

  if (!idToUpdate) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  try {
    const bimbinganAkademik = {
      dosen_id: dataToUpdate.dosen_id,
      tahun_akademik: dataToUpdate.tahun_akademik,
    };

    const updateQuery =
      "UPDATE tb_bimbingan_akademik SET dosen_id = $1, tahun_akademik = $2 WHERE id = $3 RETURNING *";
    const updateValues = [
      bimbinganAkademik.dosen_id,
      bimbinganAkademik.tahun_akademik,
      idToUpdate,
    ];
    await DB.query(updateQuery, updateValues);

    // Menguraikan string mhs_bimbingan menjadi objek JavaScript
    const mhsBimbingan = JSON.parse(dataToUpdate.mhs_bimbingan);

    if (mhsBimbingan && Array.isArray(mhsBimbingan)) {
      for (const opt of mhsBimbingan) {
        if (opt.hasOwnProperty("id")) {
          // Memeriksa keberadaan properti 'id'
          await DB.query(
            "UPDATE mhs_bimbingan_akademik SET mhs_id = $1 WHERE id = $2",
            [opt.mhs_id, opt.id]
          );
        } else {
          await DB.query(
            "INSERT INTO mhs_bimbingan_akademik(id_bimbingan, mhs_id) VALUES ($1, $2) RETURNING id",
            [idToUpdate, opt.mhs_id]
          );
        }
      }
    }

    res.status(200).json({
      message: "Successfully updated data.",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Failed to update data.",
    });
  }
});

exports.updateForDosen = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  if (!id) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  try {
    const updateValues = [];
    const updateQueryParts = [];

    if (data.p1 !== undefined && data.p1 !== null && data.p1 !== "") {
      updateValues.push(data.p1);
      updateQueryParts.push("p1 = $" + updateValues.length);
    }
    if (data.p2 !== undefined && data.p2 !== null && data.p2 !== "") {
      updateValues.push(data.p2);
      updateQueryParts.push("p2 = $" + updateValues.length);
    }
    if (data.p3 !== undefined && data.p3 !== null && data.p3 !== "") {
      updateValues.push(data.p3);
      updateQueryParts.push("p3 = $" + updateValues.length);
    }
    if (data.p4 !== undefined && data.p4 !== null && data.p4 !== "") {
      updateValues.push(data.p4);
      updateQueryParts.push("p4 = $" + updateValues.length);
    }
    if (data.catatan !== undefined && data.catatan !== null) {
      updateValues.push(data.catatan);
      updateQueryParts.push("catatan = $" + updateValues.length);
    }

    const setQuery = updateQueryParts.join(", ");

    if (updateValues.length > 0) {
      updateValues.push(id);
      await DB.query(
        `UPDATE tb_bimbingan_akademik SET ${setQuery} WHERE id = $${updateValues.length}`,
        updateValues
      );
    }

    res.status(200).json({
      message: "Successfully updated data.",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Failed to update data.",
    });
  }
});

exports.updateForMhs = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    res.status(400);
    throw new Error("Please fill in one file.");
  }

  const findData = await DB.query(
    "SELECT * FROM mhs_bimbingan_akademik WHERE id = $1",
    [id]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  if (findData.rows[0].dok_frs != "index.pdf") {
    await fs.remove(
      path.join(`public/dokumen-frs/${findData.rows[0].dok_frs}`)
    );
  }

  await DB.query(
    `UPDATE mhs_bimbingan_akademik SET dok_frs = $1 WHERE id = $2`,
    [file.filename, id]
  );

  res.status(201).json({
    message: "Successfully update data.",
  });
});
