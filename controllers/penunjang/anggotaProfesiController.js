const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

exports.addDataProfesi = asyncHandler(async (req, res) => {
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
      !data.nama_organisasi ||
      !data.peran ||
      !data.mulai_tahun ||
      !data.mulai_bulan ||
      !data.selesai_tahun ||
      !data.selesai_bulan ||
      !data.kategori_id
    ) {
      fs.unlink(file.file_profesi[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Pleas fill in all the required fields.");
    }

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const keys = ["user_id", ...Object.keys(data), "file", "created_at"];
    const values = [
      userLoginId,
      ...Object.values(data),
      file.file_profesi[0].filename,
      convert,
    ];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    // save data
    const saveData = await DB.query(
      `INSERT INTO tb_anggota_prof(${keys.join(
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

exports.getAllDataProfesi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const query = req.query;

  if (query.peran || query.nama_organisasi || query.status) {
    const nama_organisasi = query.nama_organisasi || null;
    const peran = query.peran || null;
    const status = query.status || null;

    const findData = await DB.query(
      `SELECT * FROM filter_anggota_profesi($1, $2, $3, $4)`,
      [nama_organisasi, peran, userLoginId, status]
    );

    res.status(201).json({
      data: findData.rows,
    });
  } else {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const sortByName = query.sortByName;
    const sorting = query.sorting;

    const offset = (page - 1) * limit;

    let queryText =
      "SELECT * FROM tb_anggota_prof WHERE user_id = $1 and is_deleted = $2";

    if (sortByName && sorting) {
      queryText += ` ORDER BY ${sortByName} ${
        sorting === "asc" ? "DESC" : "ASC"
      }`;
    }
    queryText += ` LIMIT $3 OFFSET $4`;

    const dataProf = await DB.query(queryText, [
      userLoginId,
      false,
      limit,
      offset,
    ]);

    const jumlahData = await DB.query(
      "SELECT COUNT(*) FROM tb_anggota_prof WHERE user_id = $1 and is_deleted = $2",
      [userLoginId, false]
    );

    res.status(201).json({
      data: dataProf.rows,
      totalData: jumlahData.rows[0].count,
    });
  }
});

exports.detailDataProfesi = asyncHandler(async (req, res) => {
  const { profId } = req.params;
  const userLoginId = req.user.user_id;

  const findData = await DB.query(
    "SELECT tb_anggota_prof.*, kategori_profesi.* FROM tb_anggota_prof JOIN kategori_profesi ON tb_anggota_prof.kategori_id = kategori_profesi.id WHERE prof_id = $1",
    [profId]
  );

  const jumlahData = await DB.query(
    "SELECT COUNT(*) FROM tb_anggota_prof WHERE user_id = $1 and is_deleted = $2",
    [userLoginId, false]
  );

  const jumlahDataAcc = await DB.query(
    "SELECT COUNT(*) FROM tb_anggota_prof WHERE user_id = $1 and status = $2  and is_deleted = $3",
    [userLoginId, 1, false]
  );

  res.status(201).json({
    data: findData.rows[0],
    totalData: jumlahData.rows[0].count,
    totalDataAcc: jumlahDataAcc.rows[0].count,
  });
});

exports.editDataProfesi = asyncHandler(async (req, res) => {
  const { profId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_anggota_prof WHERE prof_id = $1",
    [profId]
  );

  if (findData.rows[0].status == 1) {
    res.status(400);
    throw new Error("Your certificate already approved.");
  }

  if (findData.rows.length) {
    const file = req.files;
    const data = req.body;

    if (data.status) {
      res.status(400);
      throw new Error("Access Danied.");
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
        `UPDATE tb_anggota_prof SET ${setQuery} WHERE prof_id = '${findData.rows[0].prof_id}' `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    } else {
      await fs.remove(
        path.join(`public/file-profesi/${findData.rows[0].file}`)
      );
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const statusValue =
        findData.rows[0].status === 2 ? 0 : findData.rows[0].status;

      const entries = Object.entries({
        ...data,
        file: file.file_profesi[0].filename,
        status: statusValue,
        updated_at: convert,
      });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const saveData = await DB.query(
        `UPDATE tb_anggota_prof SET ${setQuery} WHERE prof_id = '${findData.rows[0].prof_id}' `,
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

exports.deleteDataProfesi = asyncHandler(async (req, res) => {
  const { profId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_anggota_prof WHERE prof_id = $1",
    [profId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const deleteData = await DB.query(
    "UPDATE tb_anggota_prof SET is_deleted = $1, deleted_at = $2 WHERE prof_id = $3 returning *",
    [true, convert, findData.rows[0].prof_id]
  );

  if (deleteData.rows[0].status == 2 || deleteData.rows[0].status == 0) {
    res.status(200).json({ message: "Data deleted successfully." });
  } else {
    const data = await DB.query(
      "SELECT tb_anggota_prof.*, kategori_profesi.nama_kategori, kategori_profesi.point FROM tb_anggota_prof NATURAL JOIN kategori_profesi WHERE id = $1",
      [deleteData.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = findData.rows[0].user_id;

    await DB.query(
      `UPDATE tb_data_pribadi SET point_penunjang = point_penunjang - ${point} WHERE user_id = '${userId}'`
    );

    res.status(200).json({ message: "Data deleted successfully." });
  }
});

exports.approveStatusProfesi = asyncHandler(async (req, res) => {
  const { profId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_anggota_prof WHERE prof_id = $1",
    [profId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const updateStatus = await DB.query(
      `UPDATE tb_anggota_prof SET status = $1, updated_at = $2 WHERE prof_id = $3 returning *`,
      [1, convert, profId]
    );

    const data = await DB.query(
      "SELECT tb_anggota_prof.*, kategori_profesi.nama_kategori, kategori_profesi.point FROM tb_anggota_prof NATURAL JOIN kategori_profesi WHERE id = $1",
      [updateStatus.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = findData.rows[0].user_id;

    await DB.query(
      "UPDATE tb_data_pribadi SET point_penunjang = point_penunjang + $1 WHERE user_id = $2",
      [point, userId]
    );

    res.status(201).json({
      message: "Data has been received.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.rejectStatusProfesi = asyncHandler(async (req, res) => {
  const { profId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_anggota_prof WHERE prof_id = $1",
    [profId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_anggota_prof SET status = $1, updated_at = $2 WHERE prof_id = $3`,
      [2, convert, profId]
    );

    res.status(201).json({
      message: "Data has been rejected.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.filterDataProfesi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  const nama_organisasi = data.nama_organisasi || null;
  const peran = data.peran || null;

  const findData = await DB.query(
    `SELECT * FROM filter_anggota_profesi($1, $2, $3)`,
    [nama_organisasi, peran, userLoginId]
  );

  res.status(201).json({
    data: findData.rows,
  });
});
