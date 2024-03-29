const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

exports.addRiwayatPekerjaan = asyncHandler(async (req, res) => {
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
      !data.bidang_usaha ||
      !data.jenis_pekerjaan ||
      !data.jabatan ||
      !data.nama_instansi ||
      !data.mulai_kerja ||
      !data.pendapatan
    ) {
      fs.unlink(file.file_rwyt_pekerjaan[0].path, (err) => {
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
      file.file_rwyt_pekerjaan[0].filename,
      convert,
    ];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    // save data
    const saveData = await DB.query(
      `INSERT INTO tb_riwayat_pekerjaan(${keys.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) returning *`,
      values
    );

    if (saveData.rows) {
      const {
        rwyt_pekerjaan_id,
        user_id,
        bidang_usaha,
        jenis_pekerjaan,
        jabatan,
        nama_instansi,
        divisi,
        deskripsi,
        mulai_Kerja,
        selesai_Kerja,
        area_Kerja,
        pendapatan,
        file,
        status,
        created_at,
        updated_at,
        deleted_at,
      } = saveData.rows[0];
      const toInt = parseInt(pendapatan);
      const formatRupiah = toInt.toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
      });
      res.status(200).json({
        message: "Successfull created data.",
        data: {
          rwyt_pekerjaan_id,
          user_id,
          bidang_usaha,
          jenis_pekerjaan,
          jabatan,
          nama_instansi,
          divisi,
          deskripsi,
          mulai_Kerja,
          selesai_Kerja,
          area_Kerja,
          pendapatan: formatRupiah,
          file,
          status,
          created_at,
          updated_at,
          deleted_at,
        },
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

exports.getDataRiwayatPekerjaan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const dataQuery = req.query;

  if (
    dataQuery.jenis_pekerjaan ||
    dataQuery.area_Kerja ||
    dataQuery.mulai_Kerja ||
    dataQuery.selesai_Kerja ||
    dataQuery.status
  ) {
    const jenis_pekerjaan = dataQuery.jenis_pekerjaan || null;
    const area_kerja = dataQuery.area_kerja || null;
    const mulai_kerja = dataQuery.mulai_kerja || null;
    const selesai_Kerja = dataQuery.selesai_Kerja || null;
    const status = dataQuery.status || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_riwayat_pekerjaan($1, $2, $3, $4, $5, $6)`,
      [
        jenis_pekerjaan,
        area_kerja,
        mulai_kerja,
        selesai_Kerja,
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

    const sortByName = dataQuery.sortByName;
    const sorting = dataQuery.sorting;

    const offset = (page - 1) * limit;

    let query = `SELECT * FROM tb_riwayat_pekerjaan WHERE user_id = $1 and is_deleted = $2`;

    if (sortByName && sorting) {
      query += ` ORDER BY ${sortByName} ${sorting === "asc" ? "DESC" : "ASC"}`;
    }
    query += ` LIMIT $3 OFFSET $4`;
    const dataRiwayat = await DB.query(query, [
      userLoginId,
      false,
      limit,
      offset,
    ]);

    const jumlahData = await DB.query(
      "SELECT COUNT(*) FROM tb_riwayat_pekerjaan WHERE user_id = $1 and is_deleted = $2",
      [userLoginId, false]
    );

    res.status(201).json({
      data: dataRiwayat.rows,
      totalData: jumlahData.rows[0].count,
    });
  }
});

exports.detailDataRiwayatPekerjaan = asyncHandler(async (req, res) => {
  const { rwytId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_riwayat_pekerjaan WHERE rwyt_pekerjaan_id = $1",
    [rwytId]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
  });
});

exports.editDataRiwayatPekerjaan = asyncHandler(async (req, res) => {
  const { rwytId } = req.params;

  if (req.body.status) {
    res.status(400);
    throw new Error("Access Danied.");
  }

  const findData = await DB.query(
    "SELECT * FROM tb_riwayat_pekerjaan WHERE rwyt_pekerjaan_id = $1",
    [rwytId]
  );

  if (findData.rows[0].status == 1) {
    res.status(400);
    throw new Error("Your data already approved.");
  }

  if (findData.rows.length) {
    const file = req.files;

    if (Object.keys(file).length === 0) {
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const statusValue =
        findData.rows[0].status === 2 ? 0 : findData.rows[0].status;

      const entries = Object.entries({
        ...req.body,
        status: statusValue,
        updated_at: convert,
      });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const saveData = await DB.query(
        `UPDATE tb_riwayat_pekerjaan SET ${setQuery} WHERE rwyt_pekerjaan_id = '${findData.rows[0].rwyt_pekerjaan_id}' `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    } else {
      await fs.remove(
        path.join(`public/file-riwayatPekerjaan/${findData.rows[0].file}`)
      );
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const statusValue =
        findData.rows[0].status === 2 ? 0 : findData.rows[0].status;

      const entries = Object.entries({
        ...req.body,
        file: file.file_rwyt_pekerjaan[0].filename,
        status: statusValue,
        updated_at: convert,
      });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const saveData = await DB.query(
        `UPDATE tb_riwayat_pekerjaan SET ${setQuery} WHERE rwyt_pekerjaan_id = '${findData.rows[0].rwyt_pekerjaan_id}' `,
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

exports.deleteDataRiwayatPekerjaan = asyncHandler(async (req, res) => {
  const { rwytId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_riwayat_pekerjaan WHERE rwyt_pekerjaan_id = $1",
    [rwytId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  await DB.query(
    "UPDATE tb_riwayat_pekerjaan SET is_deleted = $1, deleted_at = $2 WHERE rwyt_pekerjaan_id = $3",
    [true, convert, findData.rows[0].rwyt_pekerjaan_id]
  );

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.approveStatusRiwayatPekerjaan = asyncHandler(async (req, res) => {
  const { rwytId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_riwayat_pekerjaan WHERE rwyt_pekerjaan_id = $1",
    [rwytId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_riwayat_pekerjaan SET status = $1, updated_at = $2 WHERE rwyt_pekerjaan_id = $3`,
      [1, convert, rwytId]
    );

    res.status(201).json({
      message: "Data has been received.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.rejectStatusRiwayatPekerjaan = asyncHandler(async (req, res) => {
  const { rwytId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_riwayat_pekerjaan WHERE rwyt_pekerjaan_id = $1",
    [rwytId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_riwayat_pekerjaan SET status = $1, updated_at = $2 WHERE rwyt_pekerjaan_id = $3`,
      [2, convert, rwytId]
    );

    res.status(201).json({
      message: "Data has been rejected.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.filterDataRiwayatPekerjaan = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  const jenis_pekerjaan = data.jenis_pekerjaan || null;
  const area_kerja = data.area_kerja || null;
  const mulai_kerja = data.mulai_kerja || null;
  const selesai_Kerja = data.selesai_Kerja || null;

  const findData = await DB.query(
    `SELECT * FROM filter_data_riwayat_pekerjaan($1, $2, $3, $4, $5)`,
    [jenis_pekerjaan, area_kerja, mulai_kerja, selesai_Kerja, userLoginId]
  );

  res.status(201).json({
    data: findData.rows,
  });
});
