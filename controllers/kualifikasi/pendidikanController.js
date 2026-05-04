const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

exports.addPendidikan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userLoginId,
  ]);

  if (user.rows.length) {
    const file = req.files;
    const data = req.body;

    if (Object.keys(file).length === 0) {
      res.status(400);
      throw new Error("Please fill in one file.");
    }

    if (
      !data.asal ||
      !data.jenjang_studi ||
      !data.tahun_masuk ||
      !data.tahun_lulus ||
      !data.nomor_induk
    ) {
      fs.unlink(file.file_pend[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Pleas fill in all the required fields.");
    }

    const existsJenjangStudi = await DB.query(
      `SELECT * FROM tb_pend_formal WHERE CAST(user_id AS TEXT) LIKE '%${userLoginId}%' AND jenjang_studi LIKE '%${data.jenjang_studi}%'`
    );

    if (existsJenjangStudi.rows.length) {
      fs.unlink(file.file_pend[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Jenjang Studi already exists.");
    }

    const existsNomorInduk = await DB.query(
      "SELECT * FROM tb_pend_formal WHERE nomor_induk = $1",
      [data.nomor_induk]
    );

    if (existsNomorInduk.rows.length) {
      fs.unlink(file.file_pend[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Nomor Induk already exists.");
    }

    const existsNomorIjazah = await DB.query(
      "SELECT * FROM tb_pend_formal WHERE no_ijazah = $1",
      [data.no_ijazah]
    );

    if (existsNomorIjazah.rows.length) {
      fs.unlink(file.file_pend[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Nomor Ijazah already exists.");
    }

    const existsNoSKPenyetaraan = await DB.query(
      "SELECT * FROM tb_pend_formal WHERE no_sk_penyetaraan = $1",
      [data.no_sk_penyetaraan]
    );

    if (existsNoSKPenyetaraan.rows.length) {
      fs.unlink(file.file_pend[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Nomor SK Penyetaraan already exists.");
    }

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const newData = {};
    for (const key in data) {
      if (data[key] !== "") {
        newData[key] = data[key];
      }
    }

    const keys = ["user_id", ...Object.keys(newData), "file", "created_at"];
    const values = [
      userLoginId,
      ...Object.values(newData),
      file.file_pend[0].filename,
      convert,
    ];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    // save data
    const saveData = await DB.query(
      `INSERT INTO tb_pend_formal(${keys.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) returning *`,
      values
    );

    if (saveData.rows) {
      res.status(200).json({
        message: "Successfull created data.",
        data: saveData.rows[0],
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

exports.getDataPendidikan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const dataQuery = req.query;

  if (
    dataQuery.jenjang_studi ||
    dataQuery.asal ||
    dataQuery.tahun_lulus ||
    dataQuery.status
  ) {
    const jenjang_studi = dataQuery.jenjang_studi || null;
    const asal = dataQuery.asal || null;
    const tahun_lulus = dataQuery.tahun_lulus || null;
    const status = dataQuery.status || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pend_formal($1, $2, $3, $4, $5)`,
      [jenjang_studi, asal, tahun_lulus, userLoginId, status]
    );

    res.status(201).json({
      data: findData.rows,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const sortByName = dataQuery.sortByName;
    const sorting = dataQuery.sorting;

    const offset = (page - 1) * limit;

    let query = `SELECT * FROM tb_pend_formal WHERE user_id = $1  and is_deleted = $2 `;
    if (sortByName && sorting) {
      query += ` ORDER BY ${sortByName} ${sorting === "asc" ? "DESC" : "ASC"}`;
    }
    query += ` LIMIT $3 OFFSET $4`;
    const dataPend = await DB.query(query, [userLoginId, false, limit, offset]);

    const jumlahData = await DB.query(
      "SELECT COUNT(*) FROM tb_pend_formal WHERE user_id = $1  and is_deleted = $2",
      [userLoginId, false]
    );

    res.status(201).json({
      data: dataPend.rows,
      totalData: jumlahData.rows[0].count,
    });
  }
});

exports.detailDataPendidikan = asyncHandler(async (req, res) => {
  const { pendId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_pend_formal WHERE pend_id = $1",
    [pendId]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
  });
});

exports.editDataPendidikan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const { pendId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_pend_formal WHERE pend_id = $1",
    [pendId]
  );

  if (findData.rows[0].status == 1) {
    res.status(400);
    throw new Error("Your data already approved.");
  }

  if (findData.rows.length) {
    const file = req.files;
    const data = req.body;

    if (data.status) {
      res.status(400);
      throw new Error("Access Danied.");
    }

    if (data.tgl_sk_penyetaraan == "") {
      data.tgl_sk_penyetaraan = null;
    }

    if (Object.keys(file).length === 0) {
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const statusValue =
        findData.rows[0].status === 2 ? 0 : findData.rows[0].status;

      const entries = Object.entries({
        ...data,
        status: statusValue,
        updated_at: convert,
      });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const saveData = await DB.query(
        `UPDATE tb_pend_formal SET ${setQuery} WHERE pend_id = '${findData.rows[0].pend_id}' `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    } else {
      await fs.remove(
        path.join(`public/file-pendFormal/${findData.rows[0].file}`)
      );
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const statusValue =
        findData.rows[0].status === 2 ? 0 : findData.rows[0].status;

      const entries = Object.entries({
        ...data,
        file: file.file_pend[0].filename,
        status: statusValue,
        updated_at: convert,
      });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const saveData = await DB.query(
        `UPDATE tb_pend_formal SET ${setQuery} WHERE pend_id = '${findData.rows[0].pend_id}' `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    }
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.deleteDataPendidikan = asyncHandler(async (req, res) => {
  const { pendId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_pend_formal WHERE pend_id = $1",
    [pendId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  await DB.query(
    "UPDATE tb_pend_formal SET is_deleted = $1, deleted_at = $2 WHERE pend_id = $3",
    [true, convert, findData.rows[0].pend_id]
  );

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.approveStatusPendidikan = asyncHandler(async (req, res) => {
  const { pendId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_pend_formal WHERE pend_id = $1",
    [pendId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_pend_formal SET status = $1, updated_at = $2 WHERE pend_id = $3`,
      [1, convert, pendId]
    );

    res.status(201).json({
      message: "Data has been received.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.rejectStatusPendidikan = asyncHandler(async (req, res) => {
  const { pendId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_pend_formal WHERE pend_id = $1",
    [pendId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_pend_formal SET status = $1, updated_at = $2 WHERE pend_id = $3`,
      [2, convert, pendId]
    );

    res.status(201).json({
      message: "Data has been rejected.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.filterDataPendidikan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  const jenjang_studi = data.jenjang_studi || null;
  const asal = data.asal || null;
  const tahun_lulus = data.tahun_lulus || null;

  const findData = await DB.query(
    `SELECT * FROM filter_data_pend_formal($1, $2, $3, $4)`,
    [jenjang_studi, asal, tahun_lulus, userLoginId]
  );

  res.status(201).json({
    data: findData.rows,
  });
});
