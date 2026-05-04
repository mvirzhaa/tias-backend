const asyncHandler = require("express-async-handler");
const DB_TIAS = require("../../database");
const { unixTimestamp, convertDate } = require("../../utils");
const path = require("path");
const fs = require("fs-extra");
const { getDataImportBk } = require("../../helper/general");
const User = require("../../models/User");
const BimbinganAkademik = require("../../models/BimbinganAkademik/BimbinganAkademik");
const { Op } = require("sequelize");
const MhsBk = require("../../models/BimbinganAkademik/MhsBk");
const SemesterBk = require("../../models/BimbinganAkademik/SemesterBk");
const { response } = require("../../lib/response");
const { getPagination } = require("../../lib/pagination-parser");
const DataPribadi = require("../../models/DataPribadi");

// ====================  BIMBINGAN MAHASISWA ==========================
exports.addDataBimbinganAkademik = asyncHandler(async (req, res) => {
  const data = req.body;
  if (!data.tahun_angkatan || !data.dosen_id || !data.mhs_bimbingan) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }
  const mhsIds = JSON.parse(data.mhs_bimbingan).map((mhs) => mhs.user_id);
  const existingMhsIds = await DB_TIAS.query(
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

  const saveData = await DB_TIAS.query(
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

      await DB_TIAS.query(
        `INSERT INTO mhs_bk(${keysData.join(
          ", "
        )}) VALUES (${placeholdersData.join(", ")}) returning *`,
        valuesData
      );

      // Buat entri semester_bk 1-8 untuk setiap mahasiswa
      for (let i = 1; i <= 8; i++) {
        await DB_TIAS.query(
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

exports.importDataBimbingan = asyncHandler(async (req, res) => {
  let { file } = req.body;
  const dataExcel = await getDataImportBk(file[0].filepath);

  const npms = dataExcel.map((data) => data.npm);
  const nidns = dataExcel.map((data) => data.nidn.trim());
  const uniqueNidns = [...new Set(nidns)];

  const nidnsList = uniqueNidns.map((nidn) => `'${nidn}'`).join(",");

  const result = await DB_TIAS.query(`
    SELECT 
      tb_users.nidn, 
      tb_users.user_id, 
      tb_data_pribadi.dp_id, 
      tb_data_pribadi.dp_id,
      tb_data_pribadi.nama_lengkap,
      tb_data_pribadi.nip 
    FROM tb_users 
    JOIN tb_data_pribadi ON tb_data_pribadi.user_id = tb_users.user_id
    WHERE tb_users.nidn IN (${nidnsList}) 
    OR tb_data_pribadi.nip IN (${nidnsList});
  `);

  const dosens = result.rows;

  const students = await User.findAll({
    where: {
      npm: {
        [Op.in]: npms,
      },
    },
  });

  const dosenIdMap = dosens.reduce((acc, dosen) => {
    acc[dosen.nidn] = dosen.user_id;
    return acc;
  }, {});

  const studentIdMap = students.reduce((acc, student) => {
    acc[student.npm] = student.user_id;
    return acc;
  }, {});

  const uniqueDataMap = new Map();

  dataExcel.forEach((data) => {
    const dosenId = dosenIdMap[data.nidn];
    const key = `${dosenId}-${data.angkatan}`;

    if (dosenId && !uniqueDataMap.has(key)) {
      uniqueDataMap.set(key, {
        dosen_id: dosenId,
        tahun_angkatan: data.angkatan,
      });
    }
  });

  const dataBk = Array.from(uniqueDataMap.values());

  const existingBks = await BimbinganAkademik.findAll({
    where: {
      [Op.or]: dataBk.map(({ dosen_id, tahun_angkatan }) => ({
        dosen_id,
        tahun_angkatan,
      })),
    },
  });

  const existingBkMap = existingBks.reduce((acc, bk) => {
    const key = `${bk.dosen_id}-${bk.tahun_angkatan}`;
    acc[key] = bk.id;
    return acc;
  }, {});

  const newBkData = dataBk.filter(
    (bk) => !existingBkMap[`${bk.dosen_id}-${bk.tahun_angkatan}`]
  );

  let insertedBk = [];

  if (newBkData.length > 0) {
    insertedBk = await BimbinganAkademik.bulkCreate(newBkData, {
      returning: true,
    });

    insertedBk.forEach((bk) => {
      const key = `${bk.dosen_id}-${bk.tahun_angkatan}`;
      existingBkMap[key] = bk.id;
    });
  }

  const mhsDataToCreate = dataExcel
    .map((data) => {
      const key = `${dosenIdMap[data.nidn]}-${data.angkatan}`;
      const bk_id = existingBkMap[key];
      const mhs_id = studentIdMap[data.npm];
      const kelas = data.kelas;
      const semester = data.semester;

      return {
        bk_id,
        mhs_id,
        kelas,
        semester,
      };
    })
    .filter((data) => data.bk_id && data.mhs_id && data.kelas && data.semester);

  const existingMhsBk = await MhsBk.findAll({
    where: {
      [Op.or]: mhsDataToCreate.map(({ bk_id, mhs_id }) => ({
        bk_id,
        mhs_id,
      })),
    },
  });

  const existingMhsBkMap = existingMhsBk.reduce((acc, mhsBk) => {
    const key = `${mhsBk.bk_id}-${mhsBk.mhs_id}`;
    acc[key] = true;
    return acc;
  }, {});

  const newMhsBkData = mhsDataToCreate.filter(
    ({ bk_id, mhs_id }) => !existingMhsBkMap[`${bk_id}-${mhs_id}`]
  );

  await MhsBk.bulkCreate(newMhsBkData);

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const semesterBks = newMhsBkData.flatMap(({ mhs_id }) =>
    semesters.map((semester) => ({
      id_mhs: mhs_id,
      semester,
      dok_frs: "index.pdf",
    }))
  );

  const existingSemesterBk = await SemesterBk.findAll({
    where: {
      [Op.or]: semesterBks.map(({ id_mhs, semester }) => ({
        id_mhs,
        semester,
      })),
    },
  });

  const existingSemesterBkMap = existingSemesterBk.reduce((acc, sbk) => {
    const key = `${sbk.id_mhs}-${sbk.semester}`;
    acc[key] = true;
    return acc;
  }, {});

  const newSemesterBkData = semesterBks.filter(
    ({ id_mhs, semester }) => !existingSemesterBkMap[`${id_mhs}-${semester}`]
  );

  await SemesterBk.bulkCreate(newSemesterBkData);

  res.status(200).json({
    message: "Data successfully processed.",
    data: {
      bimbinganAkademik: insertedBk,
      mhsBk: newMhsBkData,
      semesterBk: newSemesterBkData,
    },
  });
});

exports.getDataBimbingan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const role = req.user.role;

  if (role === "Dosen") {
    const findData = await DB_TIAS.query(
      "SELECT * FROM tb_bk WHERE dosen_id = $1",
      [userLoginId]
    );

    const mergedData = findData.rows.map((data) => ({
      ...data,
      mahasiswa: [],
    }));

    const bkIds = findData.rows.map((data) => data.id);

    const findMhsBk = await DB_TIAS.query(
      "SELECT * FROM mhs_bk WHERE bk_id = ANY($1)",
      [bkIds]
    );

    await Promise.all(
      findMhsBk.rows.map(async (mhs) => {
        try {
          const index = mergedData.findIndex((data) => data.id === mhs.bk_id);

          const findMhs = await DB_TIAS.query(
            "SELECT user_id, nama_lengkap FROM tb_data_pribadi WHERE user_id = $1",
            [mhs.mhs_id]
          );

          if (findMhs.rows.length > 0) {
            const nama_lengkap_mhs = findMhs.rows[0].nama_lengkap;

            if (index !== -1) {
              mergedData[index].mahasiswa.push({
                id: mhs.id,
                bk_id: mhs.bk_id,
                mhs_id: mhs.mhs_id,
                nama_lengkap: nama_lengkap_mhs,
              });
            }
          }
        } catch (error) {
          console.error("Error occurred while fetching student data:", error);
        }
      })
    );

    res.status(200).json({
      message: "Successfully get data.",
      totalData: findData.rowCount,
      data: mergedData,
    });
  } else if (role === "Mahasiswa") {
    const findData = await DB_TIAS.query(
      "SELECT mhs_bk.*, tb_bk.* FROM mhs_bk JOIN tb_bk ON mhs_bk.bk_id = tb_bk.id WHERE mhs_bk.mhs_id = $1",
      [userLoginId]
    );

    const mhsIds = findData.rows[0].mhs_id;

    const findDataSemester = await DB_TIAS.query(
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
    const findData = await DB_TIAS.query("SELECT * FROM tb_bk");

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
      mahasiswa: [],
    }));

    const bkIds = findData.rows.map((data) => data.id);

    const findMhsBk = await DB_TIAS.query(
      "SELECT * FROM mhs_bk WHERE bk_id = ANY($1)",
      [bkIds]
    );

    await Promise.all(
      findMhsBk.rows.map(async (mhs) => {
        try {
          const index = mergedData.findIndex((data) => data.id === mhs.bk_id);

          const findMhs = await DB_TIAS.query(
            "SELECT user_id, nama_lengkap FROM tb_data_pribadi WHERE user_id = $1",
            [mhs.mhs_id]
          );

          if (findMhs.rows.length > 0) {
            const nama_lengkap_mhs = findMhs.rows[0].nama_lengkap;

            if (index !== -1) {
              mergedData[index].mahasiswa.push({
                id: mhs.id,
                bk_id: mhs.bk_id,
                mhs_id: mhs.mhs_id,
                nama_lengkap: nama_lengkap_mhs,
              });
            }
          }
        } catch (error) {
          console.error("Error occurred while fetching student data:", error);
        }
      })
    );

    res.status(200).json({
      message: "Successfully get data.",
      totalData: findData.rowCount,
      data: mergedData,
    });
  }
});

exports.getDataBimbinganForAdmin = asyncHandler(async (req, res) => {
  try {
    let { limit, page, order, orderBy, search, filter, filterValue } =
      req.query;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    page = page ? parseInt(page) : 1;
    order = order ? order : "id";
    orderBy = orderBy ? orderBy : "DESC";
    const pagelimit = getPagination(limit, page);

    let whereCondition = {};

    if (filter && filterValue) {
      const filters = Array.isArray(filter) ? filter : [filter];
      const filterValues = Array.isArray(filterValue)
        ? filterValue
        : [filterValue];

      filters.forEach((f, index) => {
        if (f && filterValues[index] !== undefined) {
          whereCondition[f] = filterValues[index];
        }
      });
    }

    let condition = {
      [Op.and]: whereCondition,
    };

    if (search) {
      condition = {
        ...condition,
        [Op.or]: {
          tahun_angkatan: {
            [Op.like]: `%${search}%`,
          },
        },
      };
    }

    const data = await BimbinganAkademik.findAndCountAll({
      distinct: true,
      where: condition,
      order: [[order, orderBy]],
      limit: pagelimit.limit,
      offset: pagelimit.offset,
      include: [
        {
          model: DataPribadi,
          as: "personal_data",
        },
      ],
    });

    return response(res, true, "success", {
      limit,
      page,
      total: data.count,
      total_page: Math.ceil(parseInt(data.count) / limit),
      rows: data.rows,
    });
  } catch (error) {
    return response(res, false, error.message, error);
  }
});

exports.detailDataBimbingan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB_TIAS.query("SELECT * FROM tb_bk WHERE id = $1", [
    id,
  ]);

  if (findData.rows.length === 0) {
    res.status(404).json({
      message: "Bimbingan data not found.",
      data: {},
    });
    return;
  }

  const bimbinganData = findData.rows[0];

  const mhsBimbingan = await DB_TIAS.query(
    "SELECT * FROM mhs_bk WHERE bk_id = $1",
    [id]
  );

  const mhsIds = mhsBimbingan.rows.map((data) => data.mhs_id);

  const semesterData = await Promise.all(
    mhsIds.map(async (mhsId) => {
      const semesters = await DB_TIAS.query(
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

  const findData = await DB_TIAS.query("SELECT * FROM tb_bk WHERE id = $1", [
    id,
  ]);

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  await DB_TIAS.query("DELETE FROM tb_bk WHERE id = $1", [id]);

  const mhsBimbingan = await DB_TIAS.query(
    "SELECT * FROM mhs_bk WHERE bk_id = $1",
    [id]
  );
  const idMhsList = mhsBimbingan.rows.map((mhs) => mhs.mhs_id);

  const deleteSemester = await DB_TIAS.query(
    "DELETE FROM semester_bk WHERE id_mhs = ANY($1) RETURNING *",
    [idMhsList]
  );

  for (const row of deleteSemester.rows) {
    const dokFrs = row.dok_frs;
    if (dokFrs !== "index.pdf") {
      await fs.remove(path.join(`public/dokumen-frs/${dokFrs}`));
    }
  }

  await DB_TIAS.query("DELETE FROM mhs_bk WHERE bk_id = $1", [id]);

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.deleteMhsBimbingan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB_TIAS.query("SELECT * FROM mhs_bk WHERE id = $1", [
    id,
  ]);

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const deleteMhs = await DB_TIAS.query(
    "DELETE FROM mhs_bk WHERE id = $1 RETURNING *",
    [id]
  );

  const mhsIds = deleteMhs.rows[0].mhs_id;

  await DB_TIAS.query("DELETE FROM semester_bk WHERE id_mhs = $1 RETURNING *", [
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
    await DB_TIAS.query(updateQuery, updateValues);

    // Menguraikan string mhs_bimbingan menjadi objek JavaScript
    const mhsBimbingan = JSON.parse(dataToUpdate.mhs_bimbingan);

    if (mhsBimbingan && Array.isArray(mhsBimbingan)) {
      for (const opt of mhsBimbingan) {
        if (opt.mhs_id) {
          if (opt.hasOwnProperty("id")) {
            // Memeriksa keberadaan properti 'id'
            await DB_TIAS.query("UPDATE mhs_bk SET mhs_id = $1 WHERE id = $2", [
              opt.mhs_id,
              opt.id,
            ]);
          } else {
            await DB_TIAS.query(
              "INSERT INTO mhs_bk(bk_id, mhs_id) VALUES ($1, $2) RETURNING id",
              [idToUpdate, opt.mhs_id]
            );

            for (let i = 1; i <= 8; i++) {
              await DB_TIAS.query(
                "INSERT INTO semester_bk(id_mhs, semester, dok_frs) VALUES($1, $2, $3) returning *",
                [opt.mhs_id, i, "index.pdf"]
              );
            }
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
      await DB_TIAS.query(
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

  const findData = await DB_TIAS.query(
    "SELECT * FROM semester_bk WHERE id = $1",
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

  const updateDok = await DB_TIAS.query(
    `UPDATE semester_bk SET dok_frs = $1 WHERE id = $2 returning *`,
    [file.filename, id]
  );

  res.status(201).json({
    message: "Successfully update data.",
    data: updateDok.rows[0],
  });
});

exports.formatImport = asyncHandler(async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      "../../public/format_import/format_import.xlsx"
    );

    console.log(filePath);

    res.download(filePath, "format_import.xlsx", (err) => {
      if (err) {
        console.error("Error in downloading file:", err);
        res.status(500).send("Error downloading file");
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
});
