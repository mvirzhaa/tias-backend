const asyncHandler = require("express-async-handler");
const DB = require("../../db-bimbingan-akademik");
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
      mhs_id: mhs.mhs_id,
    };

    const keysData = ["bimbingan_akademik_id", ...Object.keys(mhsBimbingan)];
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
      "SELECT * FROM tb_bimbingan_mhs WHERE is_deleted = $1",
      [userLoginId, false]
    );

    const bkId = findData.rows[0].id;

    const findMhs = await DB.query(
      "SELECT * FROM mhs_bimbingan_akademik WHERE id = $1",
      bkId
    );

    res.status(200).json({
      message: "Successfully get data.",
      data: findData.rows.map((iterate) => ({
        ...iterate,
        mhs_bimbingan: findMhs.rows,
      })),
    });
  } else if (role === "Mahasiswa") {
    const findData = await DB.query(
      "SELECT * FROM tb_bimbingan_mhs WHERE mhs_id = $1",
      [userLoginId]
    );

    if (findData.rows.length === 0) {
      res.status(404).json({
        message: "Data not found for the current user.",
        data: [],
      });
      return;
    }

    const bimbinganAkademikId = findData.rows[0].id;

    const findMhsBimbingan = await DB.query(
      "SELECT * FROM mhs_bimbingan_akademik WHERE bimbingan_akademik_id = $1",
      [bimbinganAkademikId]
    );

    res.status(200).json({
      message: "Successfully get data.",
      data: {
        bimbingan_mhs: findData.rows[0],
        mhs_bimbingan: findMhsBimbingan.rows,
      },
    });
  }
});

exports.detailDataBimbingan = asyncHandler(async (req, res) => {
  const { bimbinganId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bimbingan_mhs WHERE id = $1",
    [bimbinganId]
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
    "SELECT * FROM mhs_bimbingan_akademik WHERE bimbingan_akademik_id = $1",
    [bimbinganId]
  );

  res.status(200).json({
    message: "Bimbingan data retrieved successfully.",
    data: {
      dataBimbingan: bimbinganData,
      mhsBimbingan: mhsBimbingan.rows,
    },
  });
});

exports.editDataBimbingan = asyncHandler(async (req, res) => {
  const { bimbinganId } = req.params;
  const data = req.body;

  const findDataBimbingan = await DB.query(
    "SELECT * FROM tb_bimbingan_mhs WHERE id = $1",
    [bimbinganId]
  );

  if (findDataBimbingan.rows.length) {
    if (data.mhs_bimbingan) {
      await DB.query(
        "DELETE FROM mhs_bimbingan_akademik WHERE bimbingan_akademik_id = $1",
        [bimbinganId]
      );

      JSON.parse(data.mhs_bimbingan).forEach(async (mhs) => {
        const mhsBimbingan = {
          user_id: mhs.user_id,
          dok_frs: mhs.dok_frs,
          catatan: mhs.catatan,
          p1: mhs.p1,
          p2: mhs.p2,
          p3: mhs.p3,
          p4: mhs.p4,
        };

        const keysData = [
          "bimbingan_akademik_id",
          ...Object.keys(mhsBimbingan),
        ];
        const valuesData = [bimbinganId, ...Object.values(mhsBimbingan)];
        const placeholdersData = keysData.map((key, index) => `$${index + 1}`);

        await DB.query(
          `INSERT INTO mhs_bimbingan_akademik(${keysData.join(
            ", "
          )}) VALUES (${placeholdersData.join(", ")}) returning *`,
          valuesData
        );
      });
    }

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
    "SELECT * FROM tb_bimbingan_mhs WHERE id = $1",
    [bimbinganId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  await DB.query(
    "UPDATE tb_bimbingan_mhs SET is_deleted = $1, deleted_at = $2 WHERE id = $3",
    [true, convert, bimbinganId]
  );

  res.status(200).json({ message: "Data deleted successfully." });
});
