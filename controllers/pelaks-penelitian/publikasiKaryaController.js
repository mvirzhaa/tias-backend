const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

// ====================  PUBLIKASI KARYA ==========================
exports.addDataPublikasi = asyncHandler(async (req, res) => {
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
      !data.judul_artikel ||
      !data.jenis ||
      !data.nama_jurnal ||
      !data.penulis ||
      !data.nama_dok ||
      !data.keterangan_dok
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
    // ==============PUBLIKASI KARYA===================
    const dataPublikasi = {
      kategori_id: data.kategori_id,
      judul_artikel: data.judul_artikel,
      jenis: data.jenis,
      kategori_capain: data.kategori_capain,
      nama_jurnal: data.nama_jurnal,
      tautan_jurnal: data.tautan_jurnal,
      tgl_terbit: data.tgl_terbit,
      penerbit: data.penerbit,
      tautan_eksternal: data.tautan_eksternal,
      keterangan: data.keterangan,
    };

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const keys = ["user_id", ...Object.keys(dataPublikasi), "created_at"];
    const values = [userLoginId, ...Object.values(dataPublikasi), convert];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    const saveDataPublikasi = await DB.query(
      `INSERT INTO tb_publikasi_karya(${keys.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) returning *`,
      values
    );

    // ==============END PUBLIKASI KARYA===================

    const publikasi_id = saveDataPublikasi.rows[0].publikasi_id;

    // ==============PENULIS===================
    JSON.parse(data.penulis).forEach(async (penulis) => {
      const dataPenulis = {
        user_id: penulis.user_id,
        urutan: penulis.urutan,
        afiliasi: penulis.afiliasi,
        peran: penulis.peran,
        correspond: penulis.correspond,
      };

      const keysDataPenulis = ["publikasi_id", ...Object.keys(dataPenulis)];
      const valuesDataPenulis = [publikasi_id, ...Object.values(dataPenulis)];
      const placeholdersDataPenulis = keysDataPenulis.map(
        (key, index) => `$${index + 1}`
      );

      await DB.query(
        `INSERT INTO penulis_publikasi(${keysDataPenulis.join(
          ", "
        )}) VALUES (${placeholdersDataPenulis.join(", ")}) returning *`,
        valuesDataPenulis
      );
    });
    // ==============END PENULIS===================

    // ==============DOKUMEN PUBLIKASI===================
    const dokumenPublikasi = {
      nama_dok: data.nama_dok,
      keterangan_dok: data.keterangan_dok,
      tautan_dok: data.tautan_dok,
      file: file.filename,
    };

    const keysDokumen = [
      "publikasi_id",
      ...Object.keys(dokumenPublikasi),
      "created_at",
    ];
    const valuesDokumen = [
      publikasi_id,
      ...Object.values(dokumenPublikasi),
      convert,
    ];
    const placeholdersDokumen = keysDokumen.map(
      (key, index) => `$${index + 1}`
    );

    // save data dokumen penelitian
    await DB.query(
      `INSERT INTO dokumen_publikasi(${keysDokumen.join(
        ", "
      )}) VALUES (${placeholdersDokumen.join(", ")}) returning *`,
      valuesDokumen
    );

    // ==============END DOKUMEN PENELITIAN===================

    if (saveDataPublikasi.rows) {
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

exports.getDataPublikasi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const dataQuery = req.query;

  if (
    dataQuery.judul_artikel ||
    dataQuery.jenis ||
    dataQuery.tgl_terbit ||
    dataQuery.status
  ) {
    const judul_artikel = dataQuery.judul_artikel || null;
    const jenis = dataQuery.jenis || null;
    const tgl_terbit = dataQuery.tgl_terbit || null;
    const status = dataQuery.status || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_publikasi($1, $2, $3, $4, $5)`,
      [judul_artikel, jenis, tgl_terbit, userLoginId, status]
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

    let query = `SELECT tb_publikasi_karya.*, kategori_publikasi.nama_kategori, kategori_publikasi.tingkatan, kategori_publikasi.point FROM tb_publikasi_karya JOIN kategori_publikasi ON tb_publikasi_karya.kategori_id=kategori_publikasi.id WHERE tb_publikasi_karya.user_id = $1 and is_deleted = $2`;

    if (sortByName && sorting) {
      query += ` ORDER BY ${sortByName} ${sorting === "desc" ? "DESC" : "ASC"}`;
    }
    query += ` LIMIT $3 OFFSET $4`;
    const dataPublikasi = await DB.query(query, [
      userLoginId,
      false,
      limit,
      offset,
    ]);

    const jumlahData = await DB.query(
      "SELECT COUNT(*) FROM tb_publikasi_karya WHERE user_id = $1  and is_deleted = $2",
      [userLoginId, false]
    );

    const jumlahDataAcc = await DB.query(
      "SELECT COUNT(*) FROM tb_publikasi_karya WHERE user_id = $1 and status = $2  and is_deleted = $3",
      [userLoginId, 1, false]
    );

    res.status(201).json({
      data: dataPublikasi.rows,
      totalData: jumlahData.rows[0].count,
      totalDataAcc: jumlahDataAcc.rows[0].count,
    });
  }
});

exports.detailDataPublikasi = asyncHandler(async (req, res) => {
  const { publikasiId } = req.params;

  const findDataPublikasi = await DB.query(
    "SELECT tb_publikasi_karya.*, kategori_publikasi.* FROM tb_publikasi_karya JOIN kategori_publikasi ON kategori_publikasi.id = tb_publikasi_karya.kategori_id WHERE publikasi_id = $1",
    [publikasiId]
  );

  const penulis = await DB.query(
    "SELECT penulis_publikasi.*, tb_users.user_id, tb_users.role, tb_data_pribadi.nama_lengkap FROM penulis_publikasi JOIN tb_users ON tb_users.user_id = penulis_publikasi.user_id JOIN tb_data_pribadi ON tb_data_pribadi.user_id = tb_users.user_id WHERE penulis_publikasi.publikasi_id = $1",
    [publikasiId]
  );

  const findDataDokumen = await DB.query(
    "SELECT * FROM dokumen_publikasi WHERE publikasi_id = $1",
    [publikasiId]
  );

  res.status(201).json({
    data: {
      dataPublikasi: findDataPublikasi.rows,
      dataPenulis: penulis.rows,
      dataDokumen: findDataDokumen.rows,
    },
  });
});

exports.editDataPublikasi = asyncHandler(async (req, res) => {
  const { publikasiId } = req.params;
  const data = req.body;
  const file = req.file;

  if (data.status) {
    res.status(400);
    throw new Error("Access Danied.");
  }

  const findDataPublikasi = await DB.query(
    "SELECT * FROM tb_publikasi_karya WHERE publikasi_id = $1",
    [publikasiId]
  );

  if (findDataPublikasi.rows[0].status == 1) {
    res.status(400);
    throw new Error("Your data already approved.");
  }

  if (findDataPublikasi.rows.length) {
    // PENELITIAN
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
      findDataPublikasi.rows[0].status === 2
        ? 0
        : findDataPublikasi.rows[0].status;

    const dataPublikasi = {
      kategori_id: data.kategori_id,
      judul_artikel: data.judul_artikel,
      jenis: data.jenis,
      kategori_capain: data.kategori_capain,
      nama_jurnal: data.nama_jurnal,
      tautan_jurnal: data.tautan_jurnal,
      tgl_terbit: data.tgl_terbit,
      penerbit: data.penerbit,
      tautan_eksternal: data.tautan_eksternal,
      keterangan: data.keterangan,
      status: statusValue,
    };

    const filteredObject = filterData(dataPublikasi);

    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);

    const entries = Object.entries({ ...filteredObject, updated_at: convert });
    const setQuery = entries
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(", ");

    await DB.query(
      `UPDATE tb_publikasi_karya SET ${setQuery} WHERE publikasi_id = '${findDataPublikasi.rows[0].publikasi_id}' `,
      entries.map(([_, value]) => value)
    );
    // END PENELITIAN

    // PENULIS PUBLIKASI
    if (data.penulis) {
      await DB.query("DELETE FROM penulis_publikasi WHERE publikasi_id = $1", [
        publikasiId,
      ]);

      JSON.parse(data.penulis).forEach(async (penulis) => {
        const dataPenulis = {
          user_id: penulis.user_id,
          urutan: penulis.urutan,
          afiliasi: penulis.afiliasi,
          peran: penulis.peran,
          correspond: penulis.correspond,
        };

        const keysDataPenulis = ["publikasi_id", ...Object.keys(dataPenulis)];
        const valuesDataPenulis = [publikasiId, ...Object.values(dataPenulis)];
        const placeholdersDataPenulis = keysDataPenulis.map(
          (key, index) => `$${index + 1}`
        );

        await DB.query(
          `INSERT INTO penulis_publikasi(${keysDataPenulis.join(
            ", "
          )}) VALUES (${placeholdersDataPenulis.join(", ")}) returning *`,
          valuesDataPenulis
        );
      });
    }
    // END PENULIS PUBLIKASI

    // Add Dokumen
    if (data.nama_dok || data.keterangan_dok || data.tautan_dok || file) {
      if (!file) {
        res.status(400);
        throw new Error("Please fill in one file.");
      }

      if (!data.nama_dok || !data.keterangan_dok) {
        fs.unlink(file.path, (err) => {
          if (err) {
            console.log(err);
          }
          return;
        });
        res.status(400);
        throw new Error("Pleas fill in all the required dokumen fields.");
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
        keterangan_dok: data.keterangan_dok,
        tautan_dok: data.tautan_dok,
      };

      const filteredObject = filterData(dokumen);

      const created_at = unixTimestamp;
      const convert = convertDate(created_at);

      const keys = [
        "publikasi_id",
        ...Object.keys(filteredObject),
        "file",
        "created_at",
      ];
      const values = [
        publikasiId,
        ...Object.values(filteredObject),
        file.filename,
        convert,
      ];
      const placeholders = keys.map((key, index) => `$${index + 1}`);

      // save data
      await DB.query(
        `INSERT INTO dokumen_publikasi(${keys.join(
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

exports.deleteDataPublikasi = asyncHandler(async (req, res) => {
  const { publikasiId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_publikasi_karya WHERE publikasi_id = $1",
    [publikasiId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const deletePublikasi = await DB.query(
    "UPDATE tb_publikasi_karya SET is_deleted = $1, deleted_at = $2 WHERE publikasi_id = $3 returning *",
    [true, convert, publikasiId]
  );

  if (
    deletePublikasi.rows[0].status == 0 ||
    deletePublikasi.rows[0].status == 2
  ) {
    res.status(200).json({ message: "Data deleted successfully." });
  } else {
    const data = await DB.query(
      "SELECT tb_publikasi_karya.*, kategori_publikasi.nama_kategori, kategori_publikasi.tingkatan, kategori_publikasi.point FROM tb_publikasi_karya NATURAL JOIN kategori_publikasi WHERE id = $1",
      [deletePublikasi.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = data.rows[0].user_id;

    await DB.query(
      `UPDATE tb_data_pribadi SET point_penelitian = point_penelitian - ${point} WHERE user_id = '${userId}'`
    );
    res.status(200).json({ message: "Data deleted successfully." });
  }
});

exports.approveStatusPublikasi = asyncHandler(async (req, res) => {
  const { publikasiId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_publikasi_karya WHERE publikasi_id = $1",
    [publikasiId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const updateStatus = await DB.query(
      `UPDATE tb_publikasi_karya SET status = $1, updated_at = $2 WHERE publikasi_id = $3 returning *`,
      [1, convert, publikasiId]
    );

    const data = await DB.query(
      "SELECT tb_publikasi_karya.*, kategori_publikasi.nama_kategori, kategori_publikasi.tingkatan, kategori_publikasi.point FROM tb_publikasi_karya NATURAL JOIN kategori_publikasi WHERE id = $1",
      [updateStatus.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = findData.rows[0].user_id;

    await DB.query(
      `UPDATE tb_data_pribadi SET point_penelitian = point_penelitian + ${point} WHERE user_id = '${userId}'`
    );

    res.status(201).json({
      message: "Data has been received.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.rejectStatusPublikasi = asyncHandler(async (req, res) => {
  const { publikasiId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_publikasi_karya WHERE publikasi_id = $1",
    [publikasiId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_publikasi_karya SET status = $1, updated_at = $2 WHERE publikasi_id = $3 returning *`,
      [2, convert, publikasiId]
    );

    res.status(201).json({
      message: "Data has been rejected.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.filterDataPublikasi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  const judul_artikel = data.judul_artikel || null;
  const jenis = data.jenis || null;
  const tgl_terbit_start = data.tgl_terbit_start || null;
  const tgl_terbit_end = data.tgl_terbit_end || null;

  const findData = await DB.query(
    `SELECT * FROM filter_data_publikasi($1, $2, $3, $4, $5)`,
    [judul_artikel, jenis, tgl_terbit_start, tgl_terbit_end, userLoginId]
  );

  res.status(201).json({
    data: findData.rows,
  });
});
// ====================  END PUBLIKASI KARYA ==========================
exports.addDokumenPublikasi = asyncHandler(async (req, res) => {
  const data = req.body;
  const file = req.file;

  if (!file) {
    res.status(400);
    throw new Error("Please fill in one file.");
  }

  const findDataPublikasi = await DB.query(
    "SELECT * FROM tb_publikasi_karya WHERE publikasi_id = $1",
    [data.publikasi_id]
  );

  if (!findDataPublikasi.rows.length) {
    fs.unlink(file.path, (err) => {
      if (err) {
        console.log(err);
      }
      return;
    });
    res.status(404);
    throw new Error("Data Publikasi not found.");
  }

  if (!data.nama_dok || !data.keterangan_dok) {
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
    `INSERT INTO dokumen_publikasi(${keys.join(
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

exports.detailDokumenPublikasi = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;

  const findDataDokumen = await DB.query(
    "SELECT * FROM dokumen_publikasi WHERE dokumen_id = $1",
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

exports.deleteDokumenPublikasi = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM dokumen_publikasi WHERE dokumen_id = $1",
    [dokumenId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  await fs.remove(
    path.join(`public/dokumen-publikasi-karya/${findData.rows[0].file}`)
  );
  await DB.query("DELETE FROM dokumen_publikasi WHERE dokumen_id = $1", [
    findData.rows[0].dokumen_id,
  ]);

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.editDokumenPublikasi = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;
  const file = req.file;
  const data = req.body;

  const findData = await DB.query(
    "SELECT * FROM dokumen_publikasi WHERE dokumen_id = $1",
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
        `UPDATE dokumen_publikasi SET ${setQuery} WHERE dokumen_id = '${findData.rows[0].dokumen_id}' `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    } else {
      await fs.remove(
        path.join(`public/dokumen-publikasi-karya/${findData.rows[0].file}`)
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
        `UPDATE dokumen_publikasi SET ${setQuery} WHERE dokumen_id = '${findData.rows[0].dokumen_id}' `,
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
