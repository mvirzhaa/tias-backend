const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

exports.addPenghargaan = asyncHandler(async (req, res) => {
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
      !data.kategori_id ||
      !data.tingkat_peng ||
      !data.jenis_peng ||
      !data.nama_peng ||
      !data.tahun_peng ||
      !data.instansi_pemberi
    ) {
      fs.unlink(file.file_penghargaan[0].path, (err) => {
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
      file.file_penghargaan[0].filename,
      convert,
    ];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    // save data
    const saveData = await DB.query(
      `INSERT INTO tb_penghargaan(${keys.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) returning *`,
      values
    );

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

exports.getPenghargaan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const query = req.query;

  if (
    query.nama_peng ||
    query.jenis_peng ||
    query.instansi_pemberi ||
    query.tahun_peng ||
    query.status
  ) {
    const nama_peng = query.nama_peng || null;
    const jenis_peng = query.jenis_peng || null;
    const instansi_pemberi = query.instansi_pemberi || null;
    const tahun_peng = query.tahun_peng || null;
    const status = query.status || null;

    const findData = await DB.query(
      `SELECT * FROM filter_penghargaan($1, $2, $3, $4, $5, $6)`,
      [nama_peng, jenis_peng, instansi_pemberi, tahun_peng, userLoginId, status]
    );

    res.status(201).json({
      data: findData.rows,
    });
  } else {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const offset = (page - 1) * limit;

    const sortByName = query.sortByName;
    const sorting = query.sorting;

    let queryText = `SELECT tb_penghargaan.*, kategori_prestasi.nama_kategori, kategori_prestasi.juara, kategori_prestasi.point FROM tb_penghargaan JOIN kategori_prestasi ON tb_penghargaan.kategori_id=kategori_prestasi.id WHERE tb_penghargaan.user_id = $1 and is_deleted = $2`;

    if (sortByName && sorting) {
      queryText += ` ORDER BY ${sortByName} ${
        sorting === "asc" ? "DESC" : "ASC"
      }`;
    }
    queryText += ` LIMIT $3 OFFSET $4`;

    const dataPenghargaan = await DB.query(queryText, [
      userLoginId,
      false,
      limit,
      offset,
    ]);

    const jumlahData = await DB.query(
      "SELECT COUNT(*) FROM tb_penghargaan WHERE user_id = $1 and is_deleted = $2",
      [userLoginId, false]
    );

    const jumlahDataAcc = await DB.query(
      "SELECT COUNT(*) FROM tb_penghargaan WHERE user_id = $1 and status = $2  and is_deleted = $3",
      [userLoginId, 1, false]
    );

    res.status(201).json({
      data: dataPenghargaan.rows,
      totalData: jumlahData.rows[0].count,
      totalDataAcc: jumlahDataAcc.rows[0].count,
    });
  }
});

exports.detailPenghargaan = asyncHandler(async (req, res) => {
  const { pengId } = req.params;

  const query = `SELECT tb_penghargaan.*, kategori_prestasi.nama_kategori, kategori_prestasi.juara, kategori_prestasi.point FROM tb_penghargaan JOIN kategori_prestasi ON tb_penghargaan.kategori_id=kategori_prestasi.id WHERE tb_penghargaan.penghargaan_id = '${pengId}'`;

  const findData = await DB.query(query);

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
  });
});

exports.editPenghargaan = asyncHandler(async (req, res) => {
  // const userLoginId = req.user.user_id;
  const { pengId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_penghargaan WHERE penghargaan_id = $1",
    [pengId]
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
        `UPDATE tb_penghargaan SET ${setQuery} WHERE penghargaan_id = '${findData.rows[0].penghargaan_id}' `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    } else {
      await fs.remove(
        path.join(`public/file-penghargaan/${findData.rows[0].file}`)
      );
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);
      const statusValue =
        findData.rows[0].status === 2 ? 0 : findData.rows[0].status;

      const entries = Object.entries({
        ...data,
        file: file.file_penghargaan[0].filename,
        status: statusValue,
        updated_at: convert,
      });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const saveData = await DB.query(
        `UPDATE tb_penghargaan SET ${setQuery} WHERE penghargaan_id = '${findData.rows[0].penghargaan_id}' `,
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

exports.deletePenghargaan = asyncHandler(async (req, res) => {
  const { pengId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_penghargaan WHERE penghargaan_id = $1",
    [pengId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const deleteData = await DB.query(
    "UPDATE tb_penghargaan SET is_deleted = $1, deleted_at = $2 WHERE penghargaan_id = $3 returning *",
    [true, convert, findData.rows[0].penghargaan_id]
  );

  if (deleteData.rows[0].status == 0 || deleteData.rows[0].status == 1) {
    res.status(200).json({ message: "Data deleted successfully." });
  } else {
  }
  {
    const data = await DB.query(
      "SELECT tb_penghargaan.*, kategori_prestasi.nama_kategori, kategori_prestasi.juara, kategori_prestasi.point FROM tb_penghargaan NATURAL JOIN kategori_prestasi WHERE id = $1",
      [deleteData.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = data.rows[0].user_id;

    await DB.query(
      "UPDATE tb_data_pribadi SET point_penunjang = point_penunjang - $1 WHERE user_id = $2",
      [point, userId]
    );
    res.status(200).json({ message: "Data deleted successfully." });
  }
});

exports.approveStatusPenghargaan = asyncHandler(async (req, res) => {
  const { pengId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_penghargaan WHERE penghargaan_id = $1",
    [pengId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const updateStatus = await DB.query(
      `UPDATE tb_penghargaan SET status = $1, updated_at = $2 WHERE penghargaan_id = $3 returning *`,
      [1, convert, pengId]
    );

    const data = await DB.query(
      "SELECT tb_penghargaan.*, kategori_prestasi.nama_kategori, kategori_prestasi.juara, kategori_prestasi.point FROM tb_penghargaan NATURAL JOIN kategori_prestasi WHERE id = $1",
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

exports.rejectStatusPenghargaan = asyncHandler(async (req, res) => {
  const { pengId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_penghargaan WHERE penghargaan_id = $1",
    [pengId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const updateStatus = await DB.query(
      `UPDATE tb_penghargaan SET status = $1, updated_at = $2 WHERE penghargaan_id = $3 returning *`,
      [2, convert, pengId]
    );

    res.status(201).json({
      message: "Data has been rejected.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});
