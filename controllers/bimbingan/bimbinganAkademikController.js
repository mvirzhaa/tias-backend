const asyncHandler = require("express-async-handler");
const DB = require("../../db-bimbingan-akademik");
const DB_TIAS = require("../../database");
const { unixTimestamp, convertDate } = require("../../utils");
const path = require("path");
const fs = require("fs-extra");

// ====================  BIMBINGAN MAHASISWA ==========================
exports.addDataBimbinganAkademik = asyncHandler(async (req, res) => {
  const data = req.body;
  if (!data.tahun_angkatan || !data.dosen_id || !data.mhs_bimbingan) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }
  const mhsIds = JSON.parse(data.mhs_bimbingan).map((mhs) => mhs.user_id);
  const existingMhsIds = await DB.query(
    "SELECT mhs_id FROM mhs_bk WHERE mhs_id = ANY($1)",
    [mhsIds]
  );
  const existingMhsIdSet = new Set(
    existingMhsIds.rows.map((row) => row.mhs_id)
  );

  const isAnyExistingMhs = mhsIds.some((id) => existingMhsIdSet.has(id));
  if (isAnyExistingMhs) {
    res.status(400);
    throw new Error("salah satu mahasiswa sudah didaftarkan.");
  }

  // ==============BIMBINGAN MAHASISWA===================
  const dataBimbingan = {
    tahun_angkatan: data.tahun_angkatan,
    dosen_id: data.dosen_id,
  };

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const keys = [...Object.keys(dataBimbingan), "created_at"];
  const values = [...Object.values(dataBimbingan), convert];
  const placeholders = keys.map((key, index) => `$${index + 1}`);

  const saveData = await DB.query(
    `INSERT INTO tb_bk(${keys.join(", ")}) VALUES (${placeholders.join(
      ", "
    )}) returning *`,
    values
  );

  // ==============END BIMBINGAN MAHASISWA===================

  const bimbinganId = saveData.rows[0].id;

  // ==============MAHASISWA BIMBINGAN===================
  JSON.parse(data.mhs_bimbingan).forEach(async (mhs) => {
    const mhsBimbingan = {
      mhs_id: mhs.user_id,
    };

    // Pastikan mhs_id ada
    if (mhsBimbingan.mhs_id) {
      const keysData = ["bk_id", ...Object.keys(mhsBimbingan)];
      const valuesData = [bimbinganId, ...Object.values(mhsBimbingan)];
      const placeholdersData = keysData.map((key, index) => `$${index + 1}`);

      await DB.query(
        `INSERT INTO mhs_bk(${keysData.join(
          ", "
        )}) VALUES (${placeholdersData.join(", ")}) returning *`,
        valuesData
      );

      // Buat entri semester_bk 1-8 untuk setiap mahasiswa
      for (let i = 1; i <= 8; i++) {
        await DB.query(
          "INSERT INTO semester_bk(id_mhs, semester, dok_frs) VALUES($1, $2, $3) returning *",
          [mhsBimbingan.mhs_id, i, "index.pdf"]
        );
      }
    }
  });

  // ==============END MAHASISWA BIMBINGAN===================

  // Add bimbingan semester
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
    const findData = await DB.query("SELECT * FROM tb_bk WHERE dosen_id = $1", [
      userLoginId,
    ]);

    res.status(200).json({
      message: "Successfully get data.",
      totalData: findData.rowCount,
      data: findData.rows,
    });
  } else if (role === "Mahasiswa") {
    const findData = await DB.query(
      "SELECT mhs_bk.*, tb_bk.* FROM mhs_bk JOIN tb_bk ON mhs_bk.bk_id = tb_bk.id WHERE mhs_bk.mhs_id = $1",
      [userLoginId]
    );

    const mhsIds = findData.rows[0].mhs_id;

    const findDataSemester = await DB.query(
      "SELECT * FROM semester_bk WHERE id_mhs = $1",
      [mhsIds]
    );

    res.status(200).json({
      message: "Successfully get data.",
      totalData: findData.rowCount,
      data: findData.rows[0],
      semesters: findDataSemester.rows,
    });
  } else {
    const findData = await DB.query("SELECT * FROM tb_bk");

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

  const findData = await DB.query("SELECT * FROM tb_bk WHERE id = $1", [id]);

  if (findData.rows.length === 0) {
    res.status(404).json({
      message: "Bimbingan data not found.",
      data: {},
    });
    return;
  }

  const bimbinganData = findData.rows[0];

  const mhsBimbingan = await DB.query("SELECT * FROM mhs_bk WHERE bk_id = $1", [
    id,
  ]);

  const mhsIds = mhsBimbingan.rows.map((data) => data.mhs_id);

  const semesterData = await Promise.all(
    mhsIds.map(async (mhsId) => {
      const semesters = await DB.query(
        "SELECT * FROM semester_bk WHERE id_mhs = $1",
        [mhsId]
      );

      return { mhsId, semesters: semesters.rows };
    })
  );

  const findMhs = await DB_TIAS.query(
    "SELECT tb_users.npm, tb_data_pribadi.nama_lengkap, tb_users.user_id FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.user_id = ANY($1)",
    [mhsIds]
  );

  const mhsMap = {};
  findMhs.rows.forEach((mhs) => {
    mhsMap[mhs.user_id] = mhs;
  });

  const mergedData = mhsBimbingan.rows.map((mhs) => ({
    ...mhs,
    npm: mhsMap[mhs.mhs_id]?.npm || null,
    nama_lengkap: mhsMap[mhs.mhs_id]?.nama_lengkap || null,
    semesters:
      semesterData.find((data) => data.mhsId === mhs.mhs_id)?.semesters || [],
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

  const findData = await DB.query("SELECT * FROM tb_bk WHERE id = $1", [id]);

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  await DB.query("DELETE FROM tb_bk WHERE id = $1", [id]);

  const mhsBimbingan = await DB.query("SELECT * FROM mhs_bk WHERE bk_id = $1", [
    id,
  ]);
  const idMhsList = mhsBimbingan.rows.map((mhs) => mhs.mhs_id);

  await DB.query("DELETE FROM semester_bk WHERE id_mhs = ANY($1)", [idMhsList]);

  await DB.query("DELETE FROM mhs_bk WHERE bk_id = $1", [id]);

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.deleteMhsBimbingan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB.query("SELECT * FROM mhs_bk WHERE id = $1", [id]);

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const deleteMhs = await DB.query(
    "DELETE FROM mhs_bk WHERE id = $1 RETURNING *",
    [id]
  );

  const mhsIds = deleteMhs.rows[0].mhs_id;

  await DB.query("DELETE FROM semester_bk WHERE id_mhs = $1 RETURNING *", [
    mhsIds,
  ]);

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
      tahun_angkatan: dataToUpdate.tahun_angkatan,
    };

    const updateQuery =
      "UPDATE tb_bk SET dosen_id = $1, tahun_angkatan = $2 WHERE id = $3 RETURNING *";
    const updateValues = [
      bimbinganAkademik.dosen_id,
      bimbinganAkademik.tahun_angkatan,
      idToUpdate,
    ];
    await DB.query(updateQuery, updateValues);

    // Menguraikan string mhs_bimbingan menjadi objek JavaScript
    const mhsBimbingan = JSON.parse(dataToUpdate.mhs_bimbingan);

    if (mhsBimbingan && Array.isArray(mhsBimbingan)) {
      for (const opt of mhsBimbingan) {
        if (opt.hasOwnProperty("id")) {
          // Memeriksa keberadaan properti 'id'
          await DB.query("UPDATE mhs_bk SET mhs_id = $1 WHERE id = $2", [
            opt.mhs_id,
            opt.id,
          ]);
        } else {
          await DB.query(
            "INSERT INTO mhs_bk(bk_id, mhs_id) VALUES ($1, $2) RETURNING id",
            [idToUpdate, opt.mhs_id]
          );

          for (let i = 1; i <= 8; i++) {
            await DB.query(
              "INSERT INTO semester_bk(id_mhs, semester, dok_frs) VALUES($1, $2, $3) returning *",
              [opt.mhs_id, i, "index.pdf"]
            );
          }
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
        `UPDATE semester_bk SET ${setQuery} WHERE id = $${updateValues.length}`,
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

  const findData = await DB.query("SELECT * FROM semester_bk WHERE id = $1", [
    id,
  ]);

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  if (findData.rows[0].dok_frs != "index.pdf") {
    await fs.remove(
      path.join(`public/dokumen-frs/${findData.rows[0].dok_frs}`)
    );
  }

  const updateDok = await DB.query(
    `UPDATE semester_bk SET dok_frs = $1 WHERE id = $2 returning *`,
    [file.filename, id]
  );

  res.status(201).json({
    message: "Successfully update data.",
    data: updateDok.rows[0],
  });
});
