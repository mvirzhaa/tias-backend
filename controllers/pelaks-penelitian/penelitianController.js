const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

// ====================  PENELITIAN ==========================
exports.addDataPenelitian = asyncHandler(async (req, res) => {
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
      !data.judul_kegiatan ||
      !data.lokasi_kegiatan ||
      !data.tahun_usulan ||
      !data.tahun_kegiatan ||
      !data.tahun_pelaksanaan ||
      !data.lama_kegiatan ||
      !data.anggota_penelitian ||
      !data.nama_dok ||
      !data.keterangan
    ) {
      if (file && file.path) {
        fs.unlink(file.path, (err) => {
          if (err) console.log(err);
        });
      }
      res.status(400);
      throw new Error("Pleas fill in all the required fields.");
    }

    // Validasi anggota penelitian wajib minimal 1 orang dengan UUID yang valid (internal user_id atau external ext_id)
    const isValidUUID = (id) =>
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());

    let anggotaList = [];
    try {
      anggotaList =
        typeof data.anggota_penelitian === "string"
          ? JSON.parse(data.anggota_penelitian)
          : data.anggota_penelitian;
    } catch (err) {
      anggotaList = [];
    }

    const validAnggota = Array.isArray(anggotaList)
      ? anggotaList.filter((a) => a && (isValidUUID(a.user_id) || isValidUUID(a.ext_id)))
      : [];

    if (validAnggota.length === 0) {
      if (file && file.path) {
        fs.unlink(file.path, (err) => {
          if (err) console.log(err);
        });
      }
      res.status(400);
      throw new Error(
        "Anggota penelitian wajib diisi minimal 1 orang dan harus dipilih dari akun yang valid (tidak boleh kosong)."
      );
    }

    // ==============PENELITIAN===================
    const penelitian = {
      kategori_id: data.kategori_id,
      judul_kegiatan: data.judul_kegiatan,
      kelompok_bidang: data.kelompok_bidang || null,
      kelompok_bidang_id: data.kelompok_bidang_id ? parseInt(data.kelompok_bidang_id) : null,
      skim_id: data.skim_id ? parseInt(data.skim_id) : null,
      tahun_pelaksanaan_ke: data.tahun_pelaksanaan_ke ? parseInt(data.tahun_pelaksanaan_ke) : 1,
      dana_dikti:
        data.dana_dikti !== undefined && data.dana_dikti !== ""
          ? parseFloat(data.dana_dikti)
          : 0,
      dana_perguruan_tinggi:
        data.dana_perguruan_tinggi !== undefined && data.dana_perguruan_tinggi !== ""
          ? parseFloat(data.dana_perguruan_tinggi)
          : 0,
      dana_institusi_lain:
        data.dana_institusi_lain !== undefined && data.dana_institusi_lain !== ""
          ? parseFloat(data.dana_institusi_lain)
          : 0,
      lokasi_kegiatan: data.lokasi_kegiatan,
      tahun_usulan: data.tahun_usulan,
      tahun_kegiatan: data.tahun_kegiatan,
      tahun_pelaksanaan: data.tahun_pelaksanaan,
      lama_kegiatan: data.lama_kegiatan,
      no_sk_penugasan: data.no_sk_penugasan,
      tgl_sk_penugasan: data.tgl_sk_penugasan,
    };

    const existsNoSk = await DB.query(
      "SELECT * FROM tb_penelitian WHERE no_sk_penugasan = $1",
      [penelitian.no_sk_penugasan]
    );

    if (existsNoSk.rows.length) {
      if (file && file.path) {
        fs.unlink(file.path, (err) => {
          if (err) console.log(err);
        });
      }
      res.status(400);
      throw new Error("No SK Already Exists.");
    }

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const keys = ["user_id", ...Object.keys(penelitian), "created_at"];
    const values = [userLoginId, ...Object.values(penelitian), convert];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    try {
      const saveDataPenelitian = await DB.query(
        `INSERT INTO tb_penelitian(${keys.join(
          ", "
        )}) VALUES (${placeholders.join(", ")}) returning *`,
        values
      );

      // ==============END PENELITIAN===================

      const penelitianId = saveDataPenelitian.rows[0].penelitian_id;

      // ==============ANGGOTA PENELITIAN===================
      for (const anggota of validAnggota) {
        const isUser = isValidUUID(anggota.user_id);
        const isExt = isValidUUID(anggota.ext_id);

        const anggotaPenelitian = {
          penelitian_id: penelitianId,
          user_id: isUser ? anggota.user_id : null,
          ext_id: !isUser && isExt ? anggota.ext_id : null,
          peran: anggota.peran || "Anggota",
          status: anggota.status !== undefined ? anggota.status : true,
        };

        const keysDataAnggota = Object.keys(anggotaPenelitian);
        const valuesDataAnggota = Object.values(anggotaPenelitian);
        const placeholdersDataAnggota = keysDataAnggota.map(
          (key, index) => `$${index + 1}`
        );

        await DB.query(
          `INSERT INTO anggota_penelitian(${keysDataAnggota.join(
            ", "
          )}) VALUES (${placeholdersDataAnggota.join(", ")}) returning *`,
          valuesDataAnggota
        );
      }
      // ==============END ANGGOTA PENELITIAN===================

      // ==============DOKUMEN PENELITIAN===================
      const dokumenPenelitian = {
        penelitian_id: penelitianId,
        nama_dok: data.nama_dok || (file ? file.originalname : "Dokumen Penelitian"),
        keterangan: data.keterangan || "-",
        tautan_dok: data.tautan_dok || null,
        file: file ? file.filename : null,
        jenis_dokumen_id: data.jenis_dokumen_id ? parseInt(data.jenis_dokumen_id) : null,
        created_at: convert,
      };

      const keysDokumen = Object.keys(dokumenPenelitian);
      const valuesDokumen = Object.values(dokumenPenelitian);
      const placeholdersDokumen = keysDokumen.map(
        (key, index) => `$${index + 1}`
      );

      await DB.query(
        `INSERT INTO dokumen_penelitian(${keysDokumen.join(
          ", "
        )}) VALUES (${placeholdersDokumen.join(", ")}) returning *`,
        valuesDokumen
      );

      // ==============END DOKUMEN PENELITIAN===================

      res.status(200).json({
        message: "Successfull created data.",
      });
    } catch (dbErr) {
      if (file && file.path) {
        fs.unlink(file.path, (err) => {
          if (err) console.log(err);
        });
      }
      console.error("Error inserting penelitian:", dbErr.message);
      res.status(400).json({
        message: dbErr.message || "Gagal menyimpan data penelitian.",
      });
    }
  } else {
    res.status(404);
    throw new Error("User not found.");
  }
});

exports.getDataPenelitian = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const dataQuery = req.query;

  if (
    dataQuery.judul_kegiatan ||
    dataQuery.tahun_pelaksanaan ||
    dataQuery.lama_kegiatan ||
    dataQuery.status
  ) {
    const judul_kegiatan = dataQuery.judul_kegiatan || null;
    const tahun_pelaksanaan = dataQuery.tahun_pelaksanaan || null;
    const lama_kegiatan = dataQuery.lama_kegiatan || null;
    const status = dataQuery.status || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_penelitian($1, $2, $3, $4, $5)`,
      [judul_kegiatan, tahun_pelaksanaan, lama_kegiatan, userLoginId, status]
    );

    res.status(201).json({
      data: findData.rows,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const dataPenelitian = await DB.query(
      `SELECT tb_penelitian.*, 
              kategori_publikasi.nama_kategori, 
              kategori_publikasi.point, 
              kategori_publikasi.tingkatan,
              kelompok_bidang.nama AS nama_kelompok_bidang,
              skim_kegiatan.nama AS nama_skim_kegiatan
       FROM tb_penelitian 
       LEFT JOIN kategori_publikasi ON tb_penelitian.kategori_id = kategori_publikasi.id 
       LEFT JOIN kelompok_bidang ON kelompok_bidang.id = tb_penelitian.kelompok_bidang_id
       LEFT JOIN skim_kegiatan ON skim_kegiatan.id = tb_penelitian.skim_id
       WHERE user_id = $1 and is_deleted = $2 
       ORDER BY tb_penelitian.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userLoginId, false, limit, offset]
    );

    const jumlahData = await DB.query(
      "SELECT COUNT(*) FROM tb_penelitian WHERE user_id = $1  and is_deleted = $2",
      [userLoginId, false]
    );

    const jumlahDataAcc = await DB.query(
      "SELECT COUNT(*) FROM tb_penelitian WHERE user_id = $1 and status = $2  and is_deleted = $3",
      [userLoginId, 1, false]
    );

    res.status(201).json({
      data: dataPenelitian.rows,
      totalData: jumlahData.rows[0].count,
      totalDataAcc: jumlahDataAcc.rows[0].count,
    });
  }
});

exports.detailDataPenelitian = asyncHandler(async (req, res) => {
  const { penelitianId } = req.params;

  const findDataPenelitian = await DB.query(
    `SELECT tb_penelitian.*, 
            kategori_publikasi.nama_kategori,
            kelompok_bidang.nama AS nama_kelompok_bidang,
            skim_kegiatan.nama AS nama_skim_kegiatan
     FROM tb_penelitian 
     LEFT JOIN kategori_publikasi ON kategori_publikasi.id = tb_penelitian.kategori_id 
     LEFT JOIN kelompok_bidang ON kelompok_bidang.id = tb_penelitian.kelompok_bidang_id
     LEFT JOIN skim_kegiatan ON skim_kegiatan.id = tb_penelitian.skim_id
     WHERE penelitian_id = $1`,
    [penelitianId]
  );

  const anggotaPenelitian = await DB.query(
    `SELECT anggota_penelitian.*, 
            tb_users.user_id, 
            tb_users.role, 
            COALESCE(tb_data_pribadi.nama_lengkap, kolab_external.nama) AS nama_lengkap,
            kolab_external.nama AS nama_external,
            kolab_external.negara AS negara_external,
            kolab_external.email AS email_external
     FROM anggota_penelitian 
     LEFT JOIN tb_users ON tb_users.user_id = anggota_penelitian.user_id 
     LEFT JOIN tb_data_pribadi ON tb_data_pribadi.user_id = tb_users.user_id 
     LEFT JOIN kolab_external ON kolab_external.ext_id = anggota_penelitian.ext_id
     WHERE anggota_penelitian.penelitian_id = $1`,
    [penelitianId]
  );

  const findDataDokumen = await DB.query(
    `SELECT dokumen_penelitian.*, 
            jenis_dokumen.nama AS nama_jenis_dokumen
     FROM dokumen_penelitian 
     LEFT JOIN jenis_dokumen ON jenis_dokumen.id = dokumen_penelitian.jenis_dokumen_id
     WHERE penelitian_id = $1`,
    [penelitianId]
  );

  res.status(201).json({
    data: {
      dataPenelitian: findDataPenelitian.rows,
      anggotaPenelitian: anggotaPenelitian.rows,
      dataDokumen: findDataDokumen.rows,
    },
  });
});

exports.editDataPenelitian = asyncHandler(async (req, res) => {
  const { penelitianId } = req.params;
  const data = req.body;
  const file = req.file;

  if (data.status) {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.log(err);
      });
    }
    res.status(400);
    throw new Error("Access Danied.");
  }

  const findDataPenelitian = await DB.query(
    "SELECT * FROM tb_penelitian WHERE penelitian_id = $1",
    [penelitianId]
  );

  if (!findDataPenelitian.rows.length) {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.log(err);
      });
    }
    res.status(404).json({
      message: "Data not found",
    });
    return;
  }

  if (findDataPenelitian.rows[0].status == 1) {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.log(err);
      });
    }
    res.status(400);
    throw new Error("Your data already approved.");
  }

  // PENELITIAN
  function filterData(obj) {
    const result = {};
    for (let prop in obj) {
      if (obj[prop] !== undefined) {
        result[prop] = obj[prop];
      }
    }
    return result;
  }

  const statusValue =
    findDataPenelitian.rows[0].status === 2
      ? 0
      : findDataPenelitian.rows[0].status;

  const dataPenelitian = {
    kategori_id: data.kategori_id,
    judul_kegiatan: data.judul_kegiatan,
    kelompok_bidang: data.kelompok_bidang,
    kelompok_bidang_id:
      data.kelompok_bidang_id !== undefined
        ? data.kelompok_bidang_id
          ? parseInt(data.kelompok_bidang_id)
          : null
        : undefined,
    skim_id:
      data.skim_id !== undefined
        ? data.skim_id
          ? parseInt(data.skim_id)
          : null
        : undefined,
    tahun_pelaksanaan_ke:
      data.tahun_pelaksanaan_ke !== undefined
        ? data.tahun_pelaksanaan_ke
          ? parseInt(data.tahun_pelaksanaan_ke)
          : 1
        : undefined,
    dana_dikti:
      data.dana_dikti !== undefined && data.dana_dikti !== ""
        ? parseFloat(data.dana_dikti)
        : undefined,
    dana_perguruan_tinggi:
      data.dana_perguruan_tinggi !== undefined && data.dana_perguruan_tinggi !== ""
        ? parseFloat(data.dana_perguruan_tinggi)
        : undefined,
    dana_institusi_lain:
      data.dana_institusi_lain !== undefined && data.dana_institusi_lain !== ""
        ? parseFloat(data.dana_institusi_lain)
        : undefined,
    lokasi_kegiatan: data.lokasi_kegiatan,
    tahun_usulan: data.tahun_usulan,
    tahun_kegiatan: data.tahun_kegiatan,
    tahun_pelaksanaan: data.tahun_pelaksanaan,
    lama_kegiatan: data.lama_kegiatan,
    no_sk_penugasan: data.no_sk_penugasan,
    tgl_sk_penugasan: data.tgl_sk_penugasan,
    status: statusValue,
  };

  const filteredObject = filterData(dataPenelitian);

  const updated_at = unixTimestamp;
  const convert = convertDate(updated_at);

  const entries = Object.entries({ ...filteredObject, updated_at: convert });
  const setQuery = entries
    .map(([key, _], index) => `${key} = $${index + 1}`)
    .join(", ");

  await DB.query(
    `UPDATE tb_penelitian SET ${setQuery} WHERE penelitian_id = $${entries.length + 1}`,
    [...entries.map(([_, value]) => value), findDataPenelitian.rows[0].penelitian_id]
  );
  // END PENELITIAN

  // ANGGOTA PENELITIAN
  if (data.anggota_penelitian) {
    let anggotaList = [];
    try {
      anggotaList =
        typeof data.anggota_penelitian === "string"
          ? JSON.parse(data.anggota_penelitian)
          : data.anggota_penelitian;
    } catch (err) {
      console.warn("Gagal parse anggota_penelitian:", err.message);
      anggotaList = [];
    }

    const isValidUUID = (id) =>
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());

    const validAnggota = Array.isArray(anggotaList)
      ? anggotaList.filter((a) => a && (isValidUUID(a.user_id) || isValidUUID(a.ext_id)))
      : [];

    if (validAnggota.length === 0) {
      if (file && file.path) {
        fs.unlink(file.path, (err) => {
          if (err) console.log(err);
        });
      }
      res.status(400);
      throw new Error(
        "Anggota penelitian wajib diisi minimal 1 orang dan harus dipilih dari akun yang valid (tidak boleh kosong)."
      );
    }

    await DB.query(
      "DELETE FROM anggota_penelitian WHERE penelitian_id = $1",
      [penelitianId]
    );

    for (const anggota of validAnggota) {
      const isUser = isValidUUID(anggota.user_id);
      const isExt = isValidUUID(anggota.ext_id);

      const anggotaPenelitian = {
        penelitian_id: penelitianId,
        user_id: isUser ? anggota.user_id : null,
        ext_id: !isUser && isExt ? anggota.ext_id : null,
        peran: anggota.peran || "Anggota",
        status: anggota.status !== undefined ? anggota.status : true,
      };

      const keysDataAnggota = Object.keys(anggotaPenelitian);
      const valuesDataAnggota = Object.values(anggotaPenelitian);
      const placeholdersDataAnggota = keysDataAnggota.map(
        (key, index) => `$${index + 1}`
      );

      await DB.query(
        `INSERT INTO anggota_penelitian(${keysDataAnggota.join(
          ", "
        )}) VALUES (${placeholdersDataAnggota.join(", ")}) returning *`,
        valuesDataAnggota
      );
    }
  }
  // END ANGGOTA PENELITIAN

  // Add Dokumen
  if (data.nama_dok || data.keterangan || data.tautan_dok || file) {
    if (!file && !data.tautan_dok) {
      res.status(400);
      throw new Error("Please fill in file or link dokumen.");
    }

    if (!data.nama_dok || !data.keterangan) {
      if (file && file.path) {
        fs.unlink(file.path, (err) => {
          if (err) console.log(err);
        });
      }
      res.status(400);
      throw new Error("Please fill in all the required dokumen fields.");
    }

    const dokumen = {
      nama_dok: data.nama_dok,
      keterangan: data.keterangan,
      tautan_dok: data.tautan_dok || null,
      jenis_dokumen_id: data.jenis_dokumen_id ? parseInt(data.jenis_dokumen_id) : undefined,
    };

    const filteredDokumen = filterData(dokumen);

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);

    const keys = [
      "penelitian_id",
      ...Object.keys(filteredDokumen),
      "file",
      "created_at",
    ];
    const values = [
      penelitianId,
      ...Object.values(filteredDokumen),
      file ? file.filename : null,
      convert,
    ];
    const placeholders = keys.map((key, index) => `$${index + 1}`);

    await DB.query(
      `INSERT INTO dokumen_penelitian(${keys.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) returning *`,
      values
    );
  }
  // END DOCUMENT

  res.status(201).json({
    message: "Successfully update data.",
  });
});

exports.deleteDataPenelitian = asyncHandler(async (req, res) => {
  const { penelitianId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_penelitian WHERE penelitian_id = $1",
    [penelitianId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const deletePenelitian = await DB.query(
    "UPDATE tb_penelitian SET is_deleted = $1, deleted_at = $2 WHERE penelitian_id = $3 returning *",
    [true, convert, penelitianId]
  );

  if (
    deletePenelitian.rows[0].status == 0 ||
    deletePenelitian.rows[0].status == 2
  ) {
    res.status(200).json({ message: "Data deleted successfully." });
  } else {
    const data = await DB.query(
      "SELECT tb_penelitian.*, kategori_publikasi.nama_kategori, kategori_publikasi.tingkatan, kategori_publikasi.point FROM tb_penelitian NATURAL JOIN kategori_publikasi WHERE id = $1",
      [deletePenelitian.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = data.rows[0].user_id;

    await DB.query(
      `UPDATE tb_data_pribadi SET point_penelitian = point_penelitian - $1 WHERE user_id = $2`,
      [point, userId]
    );
    res.status(200).json({ message: "Data deleted successfully." });
  }
});

exports.approveStatusPenelitian = asyncHandler(async (req, res) => {
  const { penelitianId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_penelitian WHERE penelitian_id = $1",
    [penelitianId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    const updateStatus = await DB.query(
      `UPDATE tb_penelitian SET status = $1, updated_at = $2 WHERE penelitian_id = $3 returning *`,
      [1, convert, penelitianId]
    );

    const data = await DB.query(
      "SELECT tb_penelitian.*, kategori_publikasi.nama_kategori, kategori_publikasi.tingkatan, kategori_publikasi.point FROM tb_penelitian NATURAL JOIN kategori_publikasi WHERE id = $1",
      [updateStatus.rows[0].kategori_id]
    );

    const point = data.rows[0].point;
    const userId = findData.rows[0].user_id;

    await DB.query(
      "UPDATE tb_data_pribadi SET point_penelitian = point_penelitian + $1 WHERE user_id = $2",
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

exports.rejectedStatusPenelitian = asyncHandler(async (req, res) => {
  const { penelitianId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_penelitian WHERE penelitian_id = $1",
    [penelitianId]
  );

  if (findData.rows.length) {
    const updated_at = unixTimestamp;
    const convert = convertDate(updated_at);
    await DB.query(
      `UPDATE tb_penelitian SET status = $1, updated_at = $2 WHERE penelitian_id = $3`,
      [2, convert, penelitianId]
    );

    res.status(201).json({
      message: "Data has been rejected.",
    });
  } else {
    res.status(404);
    throw new Error("Data not found.");
  }
});

exports.filterDataPenelitian = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const data = req.body;

  const judul_kegiatan = data.judul_kegiatan || null;
  const tahun_pelaksanaan = data.tahun_pelaksanaan || null;
  const lama_kegiatan = data.lama_kegiatan || null;

  const findData = await DB.query(
    `SELECT * FROM filter_data_penelitian($1, $2, $3, $4)`,
    [judul_kegiatan, tahun_pelaksanaan, lama_kegiatan, userLoginId]
  );

  res.status(201).json({
    data: findData.rows,
  });
});
// ===================== END PENELITIAN ==========================

// ===================== DOKUMEN PENELITIAN =====================
exports.addDokumenPenelitian = asyncHandler(async (req, res) => {
  const data = req.body;
  const file = req.file;

  if (!file) {
    res.status(400);
    throw new Error("Please fill in one file.");
  }

  const findDataPenelitian = await DB.query(
    "SELECT * FROM tb_penelitian WHERE penelitian_id = $1",
    [data.penelitian_id]
  );
  if (!findDataPenelitian.rows.length) {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.log(err);
      });
    }
    res.status(404);
    throw new Error("Data penelitian not found.");
  }

  if (!data.nama_dok || !data.keterangan || !data.jenis_dokumen_id) {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.log(err);
      });
    }
    res.status(400);
    throw new Error("Please fill in all the required fields (Jenis Dokumen, Nama Dokumen, Keterangan).");
  }

  const created_at = unixTimestamp;
  const convert = convertDate(created_at);

  const dokumenData = {
    penelitian_id: data.penelitian_id,
    jenis_dokumen_id: data.jenis_dokumen_id ? parseInt(data.jenis_dokumen_id) : null,
    nama_dok: data.nama_dok,
    keterangan: data.keterangan,
    tautan_dok: data.tautan_dok || null,
    file: file.filename,
    created_at: convert,
  };

  const keys = Object.keys(dokumenData);
  const values = Object.values(dokumenData);
  const placeholders = keys.map((key, index) => `$${index + 1}`);

  // save data
  const saveData = await DB.query(
    `INSERT INTO dokumen_penelitian(${keys.join(
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

exports.detailDokumenPenelitian = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;

  const findDataDokumen = await DB.query(
    "SELECT * FROM dokumen_penelitian WHERE dokumen_id = $1",
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

exports.deleteDokumenPenelitian = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM dokumen_penelitian WHERE dokumen_id = $1",
    [dokumenId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  if (findData.rows[0].file) {
    await fs.remove(
      path.join(`public/dokumen-penelitian/${findData.rows[0].file}`)
    );
  }
  await DB.query("DELETE FROM dokumen_penelitian WHERE dokumen_id = $1", [
    findData.rows[0].dokumen_id,
  ]);

  res.status(200).json({ message: "Data deleted successfully." });
});

exports.editDokumenPenelitian = asyncHandler(async (req, res) => {
  const { dokumenId } = req.params;
  const file = req.file;
  const data = req.body;

  const findData = await DB.query(
    "SELECT * FROM dokumen_penelitian WHERE dokumen_id = $1",
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
        `UPDATE dokumen_penelitian SET ${setQuery} WHERE dokumen_id = $${entries.length + 1} returning *`,
        [...entries.map(([_, value]) => value), findData.rows[0].dokumen_id]
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    } else {
      if (findData.rows[0].file) {
        await fs.remove(
          path.join(`public/dokumen-penelitian/${findData.rows[0].file}`)
        );
      }
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
        `UPDATE dokumen_penelitian SET ${setQuery} WHERE dokumen_id = $${entries.length + 1} returning *`,
        [...entries.map(([_, value]) => value), findData.rows[0].dokumen_id]
      );

      res.status(201).json({
        message: "Successfully update data.",
        data: saveData.rows[0],
      });
    }
  } else {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.log(err);
      });
    }
    res.status(404);
    throw new Error("Data not found.");
  }
});
// ===================== END DOKUMEN PENELITIAN ===================

// ===================== MASTER DATA PENELITIAN ===================
exports.getMasterKelompokBidang = asyncHandler(async (req, res) => {
  const result = await DB.query(
    "SELECT id, nama, is_iptek FROM kelompok_bidang ORDER BY id ASC"
  );
  res.status(200).json({
    status: "success",
    data: result.rows,
  });
});

exports.getMasterJenisDokumen = asyncHandler(async (req, res) => {
  const result = await DB.query(
    "SELECT id, nama, keterangan FROM jenis_dokumen ORDER BY id ASC"
  );
  res.status(200).json({
    status: "success",
    data: result.rows,
  });
});

exports.getMasterSkimKegiatan = asyncHandler(async (req, res) => {
  const result = await DB.query(
    "SELECT id, nama, keterangan FROM skim_kegiatan ORDER BY id ASC"
  );
  res.status(200).json({
    status: "success",
    data: result.rows,
  });
});

exports.getMasterKolaboratorExternal = asyncHandler(async (req, res) => {
  const result = await DB.query(
    "SELECT ext_id, nama, negara, jenkel, email, no_hp FROM kolab_external ORDER BY nama ASC"
  );
  res.status(200).json({
    status: "success",
    data: result.rows,
  });
});
// ===================== END MASTER DATA PENELITIAN ================