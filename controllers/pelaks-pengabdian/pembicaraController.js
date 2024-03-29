const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

// ====================  Pembicara ==========================
exports.addDataPembicara = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userLoginId,
  ]);

  if (user.rows.length) {
    const data = req.body;
    const file = req.file;

    if (!file) {
      res.status(400);
      throw new Error("Please fill in one file.");
    }

    if (
      !data.kategori_id ||
      !data.kategori_pembicara ||
      !data.judul_makalah ||
      !data.nama_pertemuan ||
      !data.tingkat_pertemuan ||
      !data.penyelenggara ||
      !data.tgl_pelaksanaan ||
      !data.nama_dok ||
      !data.keterangan
    ) {
      fs.unlink(file.path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Pleas fill in all the required fields.");
    }

    const dataPembicara = {
      kategori_id: data.kategori_id,
      kategori_pembicara: data.kategori_pembicara,
      judul_makalah: data.judul_makalah,
      nama_pertemuan: data.nama_pertemuan,
      tingkat_pertemuan: data.tingkat_pertemuan,
      penyelenggara: data.penyelenggara,
      tgl_pelaksanaan: data.tgl_pelaksanaan,
      bahasa: data.bahasa,
      no_sk_penugasan: data.no_sk_penugasan,
      tgl_sk_penugasan: data.tgl_sk_penugasan,
    };

    const existsNomorSK = await DB.query(
      "SELECT * FROM tb_pembicara WHERE no_sk_penugasan = $1",
      [dataPembicara.no_sk_penugasan]
    );

    if (existsNomorSK.rows.length) {
      fs.unlink(file.path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Nomor SK already exists.");
    }

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const keys = ["user_id", ...Object.keys(dataPembicara), "created_at"];
    const values = [userLoginId, ...Object.values(dataPembicara), convert];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    // save data
    const saveDataPembicara = await DB.query(
      `INSERT INTO tb_pembicara(${keys.join(", ")}) VALUES (${placeholders.join(
        ", "
      )}) returning *`,
      values
    );

    const pembicaraId = saveDataPembicara.rows[0].pembicara_id;

    const dokumen = {
      nama_dok: data.nama_dok,
      keterangan: data.keterangan,
      tautan_dok: data.tautan_dok,
      file: file.filename,
    };

    const keysDokumen = ["pembicara_id", ...Object.keys(dokumen), "created_at"];
    const valuesDokumen = [pembicaraId, ...Object.values(dokumen), convert];
    const placeholdersDokumen = keysDokumen.map(
      (key, index) => `$${index + 1}`
    );

    const saveDataDokumen = await DB.query(
      `INSERT INTO dokumen_pembicara(${keysDokumen.join(
        ", "
      )}) VALUES (${placeholdersDokumen.join(", ")}) returning *`,
      valuesDokumen
    );

    if (saveDataPembicara.rows && saveDataDokumen.rows) {
      res.status(200).json({
        message: "Successfull created data.",
        dataPembicara: saveDataPembicara.rows[0],
        dataDokumen: saveDataDokumen.rows[0],
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

exports.getDataPembicara = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const dataQuery = req.query;

  if (
    dataQuery.judul_makalah ||
    dataQuery.penyelenggara ||
    dataQuery.tgl_pelaksanaan ||
    dataQuery.status
  ) {
    const judul_makalah = dataQuery.judul_makalah || null;
    const penyelenggara = dataQuery.penyelenggara || null;
    const tgl_pelaksanaan = dataQuery.tgl_pelaksanaan || null;
    const status = dataQuery.status || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pembicara($1, $2, $3, $4, $5)`,
      [judul_makalah, penyelenggara, tgl_pelaksanaan, userLoginId, status]
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

    let query = `SELECT tb_pembicara.*, kategori_publikasi.nama_kategori, kategori_publikasi.tingkatan, kategori_publikasi.point FROM tb_pembicara JOIN kategori_publikasi ON tb_pembicara.kategori_id = kategori_publikasi.id WHERE user_id = $1  and is_deleted = $2`;

    if (sortByName && sorting) {
      query += ` ORDER BY ${sortByName} ${sorting === "asc" ? "DESC" : "ASC"}`;
    }
    query += ` LIMIT $3 OFFSET $4`;

    const findData = await DB.query(query, [userLoginId, false, limit, offset]);

    const jumlahData = await DB.query(
      "SELECT COUNT(*) FROM tb_pembicara WHERE user_id = $1  and is_deleted = $2",
      [userLoginId, false]
    );

    const jumlahDataAcc = await DB.query(
      "SELECT COUNT(*) FROM tb_pembicara WHERE user_id = $1 and status = $2  and is_deleted = $3",
      [userLoginId, 1, false]
    );

    res.status(201).json({
      data: findData.rows,
      totalData: jumlahData.rows[0].count,
      totalDataAcc: jumlahDataAcc.rows[0].count,
    });
  }
});

exports.detailDataPembicara = asyncHandler(async (req, res) => {
  const { pembicaraId } = req.params;

  const findDataPembicara = await DB.query(
    "SELECT tb_pembicara.*, kategori_publikasi.* FROM tb_pembicara JOIN kategori_publikasi ON kategori_publikasi.id = tb_pembicara.kategori_id WHERE pembicara_id = $1",
    [pembicaraId]
  );

  if (findDataPembicara.rows.length) {
    const findDataDokumen = await DB.query(
      "SELECT * FROM dokumen_pembicara WHERE pembicara_id = $1",
      [pembicaraId]
    );

    res.status(201).json({
      data: {
        dataPembicara: findDataPembicara.rows,
        dataDokumen: findDataDokumen.rows,
      },
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.deleteDataPembicara = asyncHandler(async (req, res) => {
  const { pembicaraId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_pembicara WHERE pembicara_id = $1",
    [pembicaraId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const deletePembicara = await DB.query(
    "UPDATE tb_pembicara SET is_deleted = $1, deleted_at = $2 WHERE pembicara_id = $3 returning *",
    [true, convert, pembicaraId]
  );

  if (
    deletePembicara.rows[0].status == 0 ||
    deletePembicara.rows[0].status == 2
  ) {
    res.status(200).json({ message: "Data deleted successfully." });
  } else {
    const data = await DB.query(
      "SELECT tb_pembicara.*, kategori_publikasi.nama_kategori, kategori_publikasi.tingkatan, kategori_publikasi.point FROM tb_pembicara NATURAL JOIN kategori_publikasi WHERE id = $1",
      [deletePembicara.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = data.rows[0].user_id;

    await DB.query(
      `UPDATE tb_data_pribadi SET point_pengabdian = point_pengabdian - ${point} WHERE user_id = '${userId}'`
    );
    res.status(200).json({ message: "Data deleted successfully." });
  }
});

exports.editDataPembicara = asyncHandler(async (req, res) => {
  const { pembicaraId } = req.params;
  const data = req.body;
  const file = req.file;

  if (data.status) {
    res.status(400);
    throw new Error("Access Danied.");
  }

  const findDataPembicara = await DB.query(
    "SELECT * FROM tb_pembicara WHERE pembicara_id = $1",
    [pembicaraId]
  );

  if (findDataPembicara.rows[0].status == 1) {
    res.status(400);
    throw new Error("Your data already approved.");
  }

  if (findDataPembicara.rows.length) {
    // PEMBICARA
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
      findDataPembicara.rows[0].status === 2
        ? 0
        : findDataPembicara.rows[0].status;

    const dataPembicara = {
      kategori_id: data.kategori_id,
      kategori_pembicara: data.kategori_pembicara,
      judul_makalah: data.judul_makalah,
      nama_pertemuan: data.nama_pertemuan,
      penyelenggara: data.penyelenggara,
      tingkat_pertemuan: data.tingkat_pertemuan,
      tgl_pelaksanaan: data.tgl_pelaksanaan,
      bahasa: data.bahasa,
      no_sk_penugasan: data.no_sk_penugasan,
      tgl_sk_penugasan: data.tgl_sk_penugasan,
      status: statusValue,
    };

    const filteredObject = filterData(dataPembicara);

    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);

    const entries = Object.entries({ ...filteredObject, updated_at: convert });
    const setQuery = entries
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(", ");

    await DB.query(
      `UPDATE tb_pembicara SET ${setQuery} WHERE pembicara_id = '${findDataPembicara.rows[0].pembicara_id}' `,
      entries.map(([_, value]) => value)
    );
    // END PEMBICARA

    // Add Dokumen
    if (data.nama_dok || data.keterangan || data.tautan_dok || file) {
      if (!file) {
        res.status(400);
        throw new Error("Please fill in one file.");
      }
      function filterData(data) {
        const result = {};

        for (let prop in data) {
          if (data[prop] !== undefined) {
            result[prop] = data[prop];
          }
        }

        return result;
      }

      const dokumen = {
        nama_dok: data.nama_dok,
        keterangan: data.keterangan,
        tautan_dok: data.tautan_dok,
      };

      const filteredObject = filterData(dokumen);

      const created_at = unixTimestamp;
      const convert = convertDate(created_at);

      const keys = [
        "pembicara_id",
        ...Object.keys(filteredObject),
        "file",
        "created_at",
      ];
      const values = [
        pembicaraId,
        ...Object.values(filteredObject),
        file.filename,
        convert,
      ];
      const placeholders = keys.map((key, index) => `$${index + 1}`);

      // save data
      await DB.query(
        `INSERT INTO dokumen_pembicara(${keys.join(
          ", "
        )}) VALUES (${placeholders.join(", ")}) returning *`,
        values
      );
    }

    // END DOCUMENT

    res.status(201).json({
      message: "Successfully update data.",
    });
  } else {
    res.status(404).json({
      message: "Data not found",
    });
  }
});

exports.approveStatusPembicara = asyncHandler(async (req, res) => {
  const { pembicaraId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_pembicara WHERE pembicara_id = $1",
    [pembicaraId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const updateStatus = await DB.query(
      `UPDATE tb_pembicara SET status = $1, updated_at = $2 WHERE pembicara_id = $3 returning *`,
      [1, convert, pembicaraId]
    );

    const data = await DB.query(
      "SELECT tb_pembicara.*, kategori_publikasi.nama_kategori, kategori_publikasi.tingkatan, kategori_publikasi.point FROM tb_pembicara NATURAL JOIN kategori_publikasi WHERE id = $1",
      [updateStatus.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = findData.rows[0].user_id;

    await DB.query(
      `UPDATE tb_data_pribadi SET point_pengabdian = point_pengabdian + ${point} WHERE user_id = '${userId}'`
    );

    res.status(201).json({
      message: "Data has been received.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.rejectStatusPembicara = asyncHandler(async (req, res) => {
  const { pembicaraId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_pembicara WHERE pembicara_id = $1",
    [pembicaraId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_pembicara SET status = $1, updated_at = $2 WHERE pembicara_id = $3`,
      [2, convert, pembicaraId]
    );

    res.status(201).json({
      message: "Data has been rejected",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.filterDataPembicara = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  const judul_makalah = data.judul_makalah || null;
  const penyelenggara = data.penyelenggara || null;
  const tgl_pelaksanaan = data.tgl_pelaksanaan || null;

  const findData = await DB.query(
    `SELECT * FROM filter_data_pembicara($1, $2, $3, $4)`,
    [judul_makalah, penyelenggara, tgl_pelaksanaan, userLoginId]
  );

  res.status(201).json({
    data: findData.rows,
  });
});
// ==================== END  Pembicara ==========================

// ===================== DOKUMEN PEMBICARA =====================
exports.addDokumenPembicara = asyncHandler(async (req, res) => {
  const data = req.body;
  const file = req.file;

  if (!file) {
    res.status(400);
    throw new Error("Please fill in one file.");
  }

  const findDataPembicara = await DB.query(
    "SELECT * FROM tb_pembicara WHERE pembicara_id = $1",
    [data.pembicara_id]
  );
  if (!findDataPembicara.rows.length) {
    fs.unlink(file.path, (err) => {
      if (err) {
        console.log(err);
      }
      return;
    });
    res.status(404);
    throw new Error("Data Pembicara not found.");
  }

  if (!data.nama_dok || !data.keterangan) {
    fs.unlink(file.path, (err) => {
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

  const keys = [...Object.keys(data), "file", "created_at"];
  const values = [...Object.values(data), file.filename, convert];
  const placeholders = keys.map((key, index) => `$${index + 1}`);

  // save data
  const saveData = await DB.query(
    `INSERT INTO dokumen_pembicara(${keys.join(
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
});

exports.detailDokumenPembicara = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;

  const findDataDokumen = await DB.query(
    "SELECT * FROM dokumen_pembicara WHERE dokumen_id = $1",
    [dokumenId]
  );

  if (!findDataDokumen.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findDataDokumen.rows[0],
  });
});

exports.deleteDokumenPembicara = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM dokumen_pembicara WHERE dokumen_id = $1",
    [dokumenId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  await fs.remove(
    path.join(`public/dokumen-pembicara/${findData.rows[0].file}`)
  );
  await DB.query("DELETE FROM dokumen_pembicara WHERE dokumen_id = $1", [
    findData.rows[0].dokumen_id,
  ]);

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.editDokumenPembicara = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;
  const file = req.file;
  const data = req.body;

  const findData = await DB.query(
    "SELECT * FROM dokumen_pembicara WHERE dokumen_id = $1",
    [dokumenId]
  );

  if (findData.rows.length) {
    if (!file) {
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const entries = Object.entries({ ...data, updated_at: convert });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const saveData = await DB.query(
        `UPDATE dokumen_pembicara SET ${setQuery} WHERE dokumen_id = '${findData.rows[0].dokumen_id}' `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    } else {
      await fs.remove(
        path.join(`public/dokumen-pembicara/${findData.rows[0].file}`)
      );
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const entries = Object.entries({
        ...data,
        file: file.filename,
        updated_at: convert,
      });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const saveData = await DB.query(
        `UPDATE dokumen_pembicara SET ${setQuery} WHERE dokumen_id = '${dokumenId}' `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    }
  } else {
    fs.unlink(file.path, (err) => {
      if (err) {
        console.log(err);
      }
      return;
    });

    res.status(404);
    throw new Error("Data not found.");
  }
});
// ===================== END DOKUMEN PEMBICARA ===================
