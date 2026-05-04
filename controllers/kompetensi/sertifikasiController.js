const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate, dateToUnix } = require("../../utils");

exports.createDataSerti = asyncHandler(async (req, res) => {
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
      !data.jenis_serti ||
      !data.kategori_id ||
      !data.nama_serti ||
      !data.bidang_studi ||
      !data.tgl_serti ||
      !data.penyelenggara
    ) {
      fs.unlink(file.file_serti[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Pleas fill in all the required fields.");
    }

    const cekKategoriId = await DB.query(
      "SELECT * FROM kategori_sertifikasi WHERE id = $1",
      [data.kategori_id]
    );

    if (!cekKategoriId.rows.length) {
      fs.unlink(file.file_serti[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Kategori Id Not Found.");
    }

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const keys = ["user_id", ...Object.keys(data), "file", "created_at"];
    const values = [
      userLoginId,
      ...Object.values(data),
      file.file_serti[0].filename,
      convert,
    ];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    // save data
    const saveData = await DB.query(
      `INSERT INTO tb_sertifikasi(${keys.join(
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

exports.getDataSerti = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const dataQuery = req.query;
  const role = req.user.role;

  if (
    dataQuery.nomor_sk ||
    dataQuery.nama_serti ||
    dataQuery.jenis_serti ||
    dataQuery.bidang_studi ||
    dataQuery.tgl_serti ||
    dataQuery.status
  ) {
    const nomor_sk = dataQuery.nomor_sk || null;
    const nama_serti = dataQuery.nama_serti || null;
    const jenis_serti = dataQuery.jenis_serti || null;
    const bidang_studi = dataQuery.bidang_studi || null;
    const tgl_serti = dataQuery.tgl_serti || null;
    const status = dataQuery.status || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_sertifikasi($1, $2, $3, $4, $5, $6, $7)`,
      [
        nomor_sk,
        nama_serti,
        jenis_serti,
        bidang_studi,
        tgl_serti,
        userLoginId,
        status,
      ]
    );

    res.status(201).json({
      data: findData.rows,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const sortByName = dataQuery.sortByName;
    const sorting = dataQuery.sorting;

    let query = `SELECT tb_sertifikasi.*, kategori_sertifikasi.nama_kategori, kategori_sertifikasi.point FROM tb_sertifikasi JOIN kategori_sertifikasi ON tb_sertifikasi.kategori_id=kategori_sertifikasi.id WHERE tb_sertifikasi.user_id = $1 and is_deleted = $2`;

    if (sortByName && sorting) {
      query += ` ORDER BY ${sortByName} ${sorting === "desc" ? "DESC" : "ASC"}`;
    }

    query += ` LIMIT $3 OFFSET $4`;

    const dataSerti = await DB.query(query, [
      userLoginId,
      false,
      limit,
      offset,
    ]);

    const jumlahData = await DB.query(
      "SELECT COUNT(*) FROM tb_sertifikasi WHERE user_id = $1  and is_deleted = $2",
      [userLoginId, false]
    );

    const jumlahDataAcc = await DB.query(
      "SELECT COUNT(*) FROM tb_sertifikasi WHERE user_id = $1 and status = $2  and is_deleted = $3",
      [userLoginId, 1, false]
    );

    res.status(201).json({
      data: dataSerti.rows,
      totalData: jumlahData.rows[0].count,
      totalDataAcc: jumlahDataAcc.rows[0].count,
    });
  }
});

exports.detailDataSerti = asyncHandler(async (req, res) => {
  const { certifId } = req.params;

  const query = `SELECT tb_sertifikasi.*, kategori_sertifikasi.nama_kategori, kategori_sertifikasi.point FROM tb_sertifikasi JOIN kategori_sertifikasi ON tb_sertifikasi.kategori_id=kategori_sertifikasi.id WHERE tb_sertifikasi.sertifikat_id = '${certifId}'`;

  const findData = await DB.query(query);

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
  });
});

exports.editDataSerti = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const { certifId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_sertifikasi WHERE sertifikat_id = $1",
    [certifId]
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

    if (Object.keys(file).length === 0) {
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      if (findData.rows[0].status == 2) {
        const entries = Object.entries({
          ...data,
          status: 0,
          updated_at: convert,
        });
        const setQuery = entries
          .map(([key, _], index) => `${key} = $${index + 1}`)
          .join(", ");

        const saveData = await DB.query(
          `UPDATE tb_sertifikasi SET ${setQuery} WHERE sertifikat_id = '${findData.rows[0].sertifikat_id}' `,
          entries.map(([_, value]) => value)
        );

        res.status(201).json({
          message: "Successfully update data.",
          data: saveData.rows[0],
        });
      } else {
        const entries = Object.entries({ ...data, updated_at: convert });
        const setQuery = entries
          .map(([key, _], index) => `${key} = $${index + 1}`)
          .join(", ");

        const saveData = await DB.query(
          `UPDATE tb_sertifikasi SET ${setQuery} WHERE sertifikat_id = '${findData.rows[0].sertifikat_id}' `,
          entries.map(([_, value]) => value)
        );

        res.status(201).json({
          message: "Successfully update data.",
          data: saveData.rows[0],
        });
      }
    } else {
      await fs.remove(
        path.join(`public/file-sertifikasi/${findData.rows[0].file}`)
      );
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      if (findData.rows[0].status == 2) {
        const entries = Object.entries({
          ...data,
          file: file.file_serti[0].filename,
          status: 0,
          updated_at: convert,
        });
        const setQuery = entries
          .map(([key, _], index) => `${key} = $${index + 1}`)
          .join(", ");

        const saveData = await DB.query(
          `UPDATE tb_sertifikasi SET ${setQuery} WHERE sertifikat_id = '${findData.rows[0].sertifikat_id}' `,
          entries.map(([_, value]) => value)
        );

        res.status(201).json({
          message: "Successfully update data.",
          data: saveData.rows[0],
        });
      } else {
        const entries = Object.entries({
          ...data,
          file: file.file_serti[0].filename,
          updated_at: convert,
        });
        const setQuery = entries
          .map(([key, _], index) => `${key} = $${index + 1}`)
          .join(", ");

        const saveData = await DB.query(
          `UPDATE tb_sertifikasi SET ${setQuery} WHERE sertifikat_id = '${findData.rows[0].sertifikat_id}' `,
          entries.map(([_, value]) => value)
        );

        res.status(201).json({
          message: "Successfully update data.",
          data: saveData.rows[0],
        });
      }
    }
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.deleteDataSerti = asyncHandler(async (req, res) => {
  const { certifId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_sertifikasi WHERE sertifikat_id = $1",
    [certifId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const deleteSerti = await DB.query(
    "UPDATE tb_sertifikasi SET is_deleted = $1, deleted_at = $2 WHERE sertifikat_id = $3 returning *",
    [true, convert, findData.rows[0].sertifikat_id]
  );

  if (deleteSerti.rows[0].status == 2 || deleteSerti.rows[0].status == 0) {
    res.status(200).json({ message: "Data deleted successfully." });
  } else {
    const data = await DB.query(
      "SELECT tb_sertifikasi.*, kategori_sertifikasi.nama_kategori, kategori_sertifikasi.point FROM tb_sertifikasi NATURAL JOIN kategori_sertifikasi WHERE id = $1",
      [deleteSerti.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = findData.rows[0].user_id;

    await DB.query(
      `UPDATE tb_data_pribadi SET point_kompetensi = point_kompetensi - ${point} WHERE user_id = '${userId}'`
    );

    res.status(200).json({ message: "Data deleted successfully." });
  }
});

exports.approveStatusSerti = asyncHandler(async (req, res) => {
  const { certifId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_sertifikasi WHERE sertifikat_id = $1",
    [certifId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const updateStatus = await DB.query(
      `UPDATE tb_sertifikasi SET status = $1, updated_at = $2 WHERE sertifikat_id = $3 returning *`,
      [1, convert, certifId]
    );

    const data = await DB.query(
      "SELECT tb_sertifikasi.*, kategori_sertifikasi.nama_kategori, kategori_sertifikasi.point FROM tb_sertifikasi NATURAL JOIN kategori_sertifikasi WHERE id = $1",
      [updateStatus.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = findData.rows[0].user_id;

    await DB.query(
      "UPDATE tb_data_pribadi SET point_kompetensi = point_kompetensi + $1 WHERE user_id = $2",
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

exports.rejectStatusSerti = asyncHandler(async (req, res) => {
  const { certifId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_sertifikasi WHERE sertifikat_id = $1",
    [certifId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_sertifikasi SET status = $1, updated_at = $2 WHERE sertifikat_id = $3 returning *`,
      [2, convert, certifId]
    );

    res.status(201).json({
      message: "Data has been rejected.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.filterDataSertifikasi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  const nomor_sk = data.nomor_sk || null;
  const nama_serti = data.nama_serti || null;
  const jenis_serti = data.jenis_serti || null;
  const bidang_studi = data.bidang_studi || null;
  const tgl_serti = data.tgl_serti || null;

  const findData = await DB.query(
    `SELECT * FROM filter_data_sertifikasi($1, $2, $3, $4, $5, $6)`,
    [nomor_sk, nama_serti, jenis_serti, bidang_studi, tgl_serti, userLoginId]
  );

  res.status(201).json({
    data: findData.rows,
  });
});
