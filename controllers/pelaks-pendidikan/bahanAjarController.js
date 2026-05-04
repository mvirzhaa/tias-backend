const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

exports.addBahanAjar = asyncHandler(async (req, res) => {
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

    const existsNomorSK = await DB.query(
      "SELECT * FROM tb_bahan_ajar_dosen WHERE no_sk_penugasan = $1",
      [data.no_sk_penugasan]
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

    if (
      !data.jenis_bahan_ajar ||
      !data.judul_bahan_ajar ||
      !data.penulis ||
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
    // ==============BAHAN AJAR===================
    const dataBahanAjar = {
      jenis_bahan_ajar: data.jenis_bahan_ajar,
      judul_bahan_ajar: data.judul_bahan_ajar,
      tgl_terbit: data.tgl_terbit,
      penerbit: data.penerbit,
      no_sk_penugasan: data.no_sk_penugasan,
      tgl_sk_penugasan: data.tgl_sk_penugasan,
    };

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const keys = ["user_id", ...Object.keys(dataBahanAjar), "created_at"];
    const values = [userLoginId, ...Object.values(dataBahanAjar), convert];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    const saveDataBahanAjar = await DB.query(
      `INSERT INTO tb_bahan_ajar_dosen(${keys.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) returning *`,
      values
    );

    // ==============END BAHAN AJAR===================

    const bahanAjarId = saveDataBahanAjar.rows[0].bahan_ajar_id;

    // ==============PENULIS===================
    JSON.parse(data.penulis).forEach(async (penulis) => {
      const dataPenulis = {
        user_id: penulis.user_id,
        urutan: penulis.urutan,
        afiliasi: penulis.afiliasi,
        peran: penulis.peran,
      };

      const keysDataPenulis = ["bahan_ajar_id", ...Object.keys(dataPenulis)];
      const valuesDataPenulis = [bahanAjarId, ...Object.values(dataPenulis)];
      const placeholdersDataPenulis = keysDataPenulis.map(
        (key, index) => `$${index + 1}`
      );

      await DB.query(
        `INSERT INTO penulis_bahan_ajar(${keysDataPenulis.join(
          ", "
        )}) VALUES (${placeholdersDataPenulis.join(", ")}) returning *`,
        valuesDataPenulis
      );
    });
    // ==============END PENULIS===================

    // ==============DOKUMEN BAHAN AJAR===================
    const dataDokumen = {
      nama_dok: data.nama_dok,
      keterangan: data.keterangan,
      tautan_dok: data.tautan_dok,
      file: file.filename,
    };

    const keysDokumen = [
      "bahan_ajar_id",
      ...Object.keys(dataDokumen),
      "created_at",
    ];
    const valuesDokumen = [bahanAjarId, ...Object.values(dataDokumen), convert];
    const placeholdersDokumen = keysDokumen.map(
      (key, index) => `$${index + 1}`
    );

    // save data dokumen
    await DB.query(
      `INSERT INTO dokumen_bahan_ajar(${keysDokumen.join(
        ", "
      )}) VALUES (${placeholdersDokumen.join(", ")}) returning *`,
      valuesDokumen
    );

    // ==============END DOKUMEN BAHAN AJAR===================

    if (saveDataBahanAjar.rows) {
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

exports.getDataBahanAjar = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const dataBahanAjar = await DB.query(
    "SELECT * FROM tb_bahan_ajar_dosen WHERE user_id = $1",
    [userLoginId]
  );

  const jumlahData = await DB.query(
    "SELECT COUNT(*) FROM tb_bahan_ajar_dosen WHERE user_id = $1",
    [userLoginId]
  );

  res.status(201).json({
    data: dataBahanAjar.rows,
    totalData: jumlahData.rows[0].count,
  });
});

exports.detailDataBahanAjar = asyncHandler(async (req, res) => {
  const { bahanAjarId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bahan_ajar_dosen WHERE bahan_ajar_id = $1",
    [bahanAjarId]
  );

  const anggotaPenelitian = await DB.query(
    "SELECT penulis_bahan_ajar.*, tb_users.user_id, tb_users.role, tb_data_pribadi.nama_lengkap FROM penulis_bahan_ajar JOIN tb_users ON tb_users.user_id = penulis_bahan_ajar.user_id JOIN tb_data_pribadi ON tb_data_pribadi.user_id = tb_users.user_id WHERE penulis_bahan_ajar.bahan_ajar_id = $1",
    [bahanAjarId]
  );

  const findDataDokumen = await DB.query(
    "SELECT * FROM dokumen_bahan_ajar WHERE bahan_ajar_id = $1",
    [bahanAjarId]
  );

  res.status(201).json({
    data: {
      data: findData.rows,
      penulis: anggotaPenelitian.rows,
      dataDokumen: findDataDokumen.rows,
    },
  });
});

exports.editDataBahanAjar = asyncHandler(async (req, res) => {
  const { bahanAjarId } = req.params;
  const data = req.body;
  const file = req.file;

  if (data.status) {
    res.status(400);
    throw new Error("Access Danied.");
  }

  const findData = await DB.query(
    "SELECT * FROM tb_bahan_ajar_dosen WHERE bahan_ajar_id = $1",
    [bahanAjarId]
  );

  if (findData.rows[0].status == 1) {
    res.status(400);
    throw new Error("Your data already approved.");
  }

  if (findData.rows.length) {
    // BAHAN AJAR DOSEN
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
      findData.rows[0].status === 2 ? 0 : findData.rows[0].status;

    const dataBahanAjar = {
      jenis_bahan_ajar: data.jenis_bahan_ajar,
      judul_bahan_ajar: data.judul_bahan_ajar,
      tgl_terbit: data.tgl_terbit,
      penerbit: data.penerbit,
      no_sk_penugasan: data.no_sk_penugasan,
      tgl_sk_penugasan: data.tgl_sk_penugasan,
      status: statusValue,
    };

    const filteredObject = filterData(dataBahanAjar);

    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);

    const entries = Object.entries({ ...filteredObject, updated_at: convert });
    const setQuery = entries
      .map(([key, _], index) => `${key} = $${index + 1}`)
      .join(", ");

    await DB.query(
      `UPDATE tb_bahan_ajar_dosen SET ${setQuery} WHERE bahan_ajar_id = '${findData.rows[0].bahan_ajar_id}' `,
      entries.map(([_, value]) => value)
    );
    // END BAHAN AJAR DOSEN

    // PENULIS BAHAN AJAR
    if (data.penulis) {
      await DB.query(
        "DELETE FROM penulis_bahan_ajar WHERE bahan_ajar_id = $1",
        [bahanAjarId]
      );

      JSON.parse(data.penulis).forEach(async (penulis) => {
        const dataPenulis = {
          user_id: penulis.user_id,
          urutan: penulis.urutan,
          afiliasi: penulis.afiliasi,
          peran: penulis.peran,
        };

        const keysDataPenulis = ["bahan_ajar_id", ...Object.keys(dataPenulis)];
        const valuesDataPenulis = [bahanAjarId, ...Object.values(dataPenulis)];
        const placeholdersDataPenulis = keysDataPenulis.map(
          (key, index) => `$${index + 1}`
        );

        await DB.query(
          `INSERT INTO penulis_bahan_ajar(${keysDataPenulis.join(
            ", "
          )}) VALUES (${placeholdersDataPenulis.join(", ")}) returning *`,
          valuesDataPenulis
        );
      });
    }
    // END PENULIS BAHAN AJAR

    // Add Dokumen
    if (data.nama_dok || data.keterangan || data.tautan_dok || file) {
      if (!file) {
        res.status(400);
        throw new Error("Please fill in one file.");
      }

      if (!data.nama_dok || !data.keterangan) {
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
        keterangan: data.keterangan,
        tautan_dok: data.tautan_dok,
      };

      const filteredObject = filterData(dokumen);

      const created_at = unixTimestamp;
      const convert = convertDate(created_at);

      const keys = [
        "bahan_ajar_id",
        ...Object.keys(filteredObject),
        "file",
        "created_at",
      ];
      const values = [
        bahanAjarId,
        ...Object.values(filteredObject),
        file.filename,
        convert,
      ];
      const placeholders = keys.map((key, index) => `$${index + 1}`);

      // save data
      await DB.query(
        `INSERT INTO dokumen_bahan_ajar(${keys.join(
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

exports.deleteDataBahanAjar = asyncHandler(async (req, res) => {
  const { bahanAjarId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bahan_ajar_dosen WHERE bahan_ajar_id = $1",
    [bahanAjarId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const findDokumen = await DB.query(
    "SELECT * FROM dokumen_bahan_ajar WHERE bahan_ajar_id = $1",
    [bahanAjarId]
  );

  const dataDokumen = findDokumen.rows;
  dataDokumen.forEach(async (dok) => {
    await fs.remove(path.join(`public/dokumen-bahanAjar/${dok.file}`));
  });

  await DB.query("DELETE FROM penulis_bahan_ajar WHERE bahan_ajar_id = $1", [
    bahanAjarId,
  ]);
  await DB.query("DELETE FROM dokumen_bahan_ajar WHERE bahan_ajar_id = $1", [
    bahanAjarId,
  ]);
  await DB.query("DELETE FROM tb_bahan_ajar_dosen WHERE bahan_ajar_id = $1", [
    bahanAjarId,
  ]);

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.approveStatusBahanAjar = asyncHandler(async (req, res) => {
  const { bahanAjarId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bahan_ajar_dosen WHERE bahan_ajar_id = $1",
    [bahanAjarId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_bahan_ajar_dosen SET status = $1, updated_at = $2 WHERE bahan_ajar_id = $3`,
      [1, convert, bahanAjarId]
    );

    res.status(201).json({
      message: "Data has been received.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.rejectStatusBahanAjar = asyncHandler(async (req, res) => {
  const { bahanAjarId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_bahan_ajar_dosen WHERE bahan_ajar_id = $1",
    [bahanAjarId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_bahan_ajar_dosen SET status = $1, updated_at = $2 WHERE bahan_ajar_id = $3`,
      [2, convert, bahanAjarId]
    );

    res.status(201).json({
      message: "Data has been rejected.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

// ===================== DOKUMEN Bahan Ajar Dosen =====================
exports.addDokumenBahanAjar = asyncHandler(async (req, res) => {
  const data = req.body;
  const file = req.file;

  if (!file) {
    res.status(400);
    throw new Error("Please fill in one file.");
  }

  const findDataBahanAjar = await DB.query(
    "SELECT * FROM tb_bahan_ajar_dosen WHERE bahan_ajar_id = $1",
    [data.bahan_ajar_id]
  );
  if (!findDataBahanAjar.rows.length) {
    fs.unlink(file.path, (err) => {
      if (err) {
        console.log(err);
      }
      return;
    });
    res.status(404);
    throw new Error("Data bahan ajar not found.");
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
    `INSERT INTO dokumen_bahan_ajar(${keys.join(
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

exports.detailDokumenbahanAjar = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;

  const findDataDokumen = await DB.query(
    "SELECT * FROM dokumen_bahan_ajar WHERE dokumen_id = $1",
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

exports.deleteDokumenBahanAjar = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM dokumen_bahan_ajar WHERE dokumen_id = $1",
    [dokumenId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  await fs.remove(
    path.join(`public/dokumen-bahanAjar/${findData.rows[0].file}`)
  );
  await DB.query("DELETE FROM dokumen_bahan_ajar WHERE dokumen_id = $1", [
    findData.rows[0].dokumen_id,
  ]);

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.editDokumenBahanAjar = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;
  const file = req.file;
  const data = req.body;

  const findData = await DB.query(
    "SELECT * FROM dokumen_bahan_ajar WHERE dokumen_id = $1",
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
        `UPDATE dokumen_bahan_ajar SET ${setQuery} WHERE dokumen_id = '${findData.rows[0].dokumen_id}' `,
        entries.map(([_, value]) => value)
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    } else {
      await fs.remove(
        path.join(`public/dokumen-bahanAjar/${findData.rows[0].file}`)
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
        `UPDATE dokumen_bahan_ajar SET ${setQuery} WHERE dokumen_id = '${findData.rows[0].dokumen_id}' `,
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
// ===================== END DOKUMEN PENELITIAN ===================
