const asyncHandler = require("express-async-handler");
const DB = require("../../database");

const fetchData = async (tb, limit, offset, status) => {
  const data = await DB.query(
    `SELECT * FROM ${tb} WHERE status = $1 and is_deleted = $2 LIMIT $3 OFFSET $4`,
    [status, false, limit, offset]
  );

  const jumlahData = await DB.query(
    `SELECT COUNT(*) FROM ${tb} WHERE status = $1`,
    [0]
  );

  return { data, jumlahData };
};

// =====================  KUALIFIKASI  ====================
exports.getDataRwytPekerjaanProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.jenis_pekerjaan ||
    dataQuery.area_Kerja ||
    dataQuery.mulai_Kerja ||
    dataQuery.selesai_Kerja
  ) {
    const jenis_pekerjaan = dataQuery.jenis_pekerjaan || null;
    const area_kerja = dataQuery.area_kerja || null;
    const mulai_kerja = dataQuery.mulai_kerja || null;
    const selesai_Kerja = dataQuery.selesai_Kerja || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_riwayat_pekerjaan($1, $2, $3, $4, $5, $6)`,
      [jenis_pekerjaan, area_kerja, mulai_kerja, selesai_Kerja, null, 0]
    );

    const dataRwytPekerjaan = findData.rows;
    const combinedData = [];

    for (const rwytPekerjaan of dataRwytPekerjaan) {
      const user_id = rwytPekerjaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        rwytPekerjaan: rwytPekerjaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.rwytPekerjaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_riwayat_pekerjaan",
      limit,
      offset,
      0
    );
    const dataRwytPekerjaan = data.rows;
    const combinedData = [];

    for (const rwytPekerjaan of dataRwytPekerjaan) {
      const user_id = rwytPekerjaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        rwytPekerjaan: rwytPekerjaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.rwytPekerjaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataRwytPekerjaanAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.jenis_pekerjaan ||
    dataQuery.area_Kerja ||
    dataQuery.mulai_Kerja ||
    dataQuery.selesai_Kerja
  ) {
    const jenis_pekerjaan = dataQuery.jenis_pekerjaan || null;
    const area_kerja = dataQuery.area_kerja || null;
    const mulai_kerja = dataQuery.mulai_kerja || null;
    const selesai_Kerja = dataQuery.selesai_Kerja || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_riwayat_pekerjaan($1, $2, $3, $4, $5, $6)`,
      [jenis_pekerjaan, area_kerja, mulai_kerja, selesai_Kerja, null, 1]
    );

    const dataRwytPekerjaan = findData.rows;
    const combinedData = [];

    for (const rwytPekerjaan of dataRwytPekerjaan) {
      const user_id = rwytPekerjaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        rwytPekerjaan: rwytPekerjaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.rwytPekerjaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_riwayat_pekerjaan",
      limit,
      offset,
      1
    );
    const dataRwytPekerjaan = data.rows;
    const combinedData = [];

    for (const rwytPekerjaan of dataRwytPekerjaan) {
      const user_id = rwytPekerjaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        rwytPekerjaan: rwytPekerjaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.rwytPekerjaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataRwytPekerjaanReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.jenis_pekerjaan ||
    dataQuery.area_Kerja ||
    dataQuery.mulai_Kerja ||
    dataQuery.selesai_Kerja
  ) {
    const jenis_pekerjaan = dataQuery.jenis_pekerjaan || null;
    const area_kerja = dataQuery.area_kerja || null;
    const mulai_kerja = dataQuery.mulai_kerja || null;
    const selesai_Kerja = dataQuery.selesai_Kerja || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_riwayat_pekerjaan($1, $2, $3, $4, $5, $6)`,
      [jenis_pekerjaan, area_kerja, mulai_kerja, selesai_Kerja, null, 2]
    );

    const dataRwytPekerjaan = findData.rows;
    const combinedData = [];

    for (const rwytPekerjaan of dataRwytPekerjaan) {
      const user_id = rwytPekerjaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        rwytPekerjaan: rwytPekerjaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.rwytPekerjaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_riwayat_pekerjaan",
      limit,
      offset,
      2
    );
    const dataRwytPekerjaan = data.rows;
    const combinedData = [];

    for (const rwytPekerjaan of dataRwytPekerjaan) {
      const user_id = rwytPekerjaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        rwytPekerjaan: rwytPekerjaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.rwytPekerjaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});

exports.getDataPendFormalProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.jenjang_studi || dataQuery.asal || dataQuery.tahun_lulus) {
    const jenjang_studi = dataQuery.jenjang_studi || null;
    const asal = dataQuery.asal || null;
    const tahun_lulus = dataQuery.tahun_lulus || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pend_formal($1, $2, $3, $4, $5)`,
      [jenjang_studi, asal, tahun_lulus, null, 0]
    );

    const dataPendFormal = findData.rows;
    const combinedData = [];

    for (const pendFormal of dataPendFormal) {
      const user_id = pendFormal.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pendFormal: pendFormal,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pendFormal,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_pend_formal",
      limit,
      offset,
      0
    );
    const dataPendFormal = data.rows;
    const combinedData = [];

    for (const pendFormal of dataPendFormal) {
      const user_id = pendFormal.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pendFormal: pendFormal,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pendFormal,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPendFormalAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.jenjang_studi || dataQuery.asal || dataQuery.tahun_lulus) {
    const jenjang_studi = dataQuery.jenjang_studi || null;
    const asal = dataQuery.asal || null;
    const tahun_lulus = dataQuery.tahun_lulus || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pend_formal($1, $2, $3, $4, $5)`,
      [jenjang_studi, asal, tahun_lulus, null, 1]
    );

    const dataPendFormal = findData.rows;
    const combinedData = [];

    for (const pendFormal of dataPendFormal) {
      const user_id = pendFormal.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pendFormal: pendFormal,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pendFormal,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_pend_formal",
      limit,
      offset,
      1
    );
    const dataPendFormal = data.rows;
    const combinedData = [];

    for (const pendFormal of dataPendFormal) {
      const user_id = pendFormal.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pendFormal: pendFormal,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pendFormal,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPendFormalReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.jenjang_studi || dataQuery.asal || dataQuery.tahun_lulus) {
    const jenjang_studi = dataQuery.jenjang_studi || null;
    const asal = dataQuery.asal || null;
    const tahun_lulus = dataQuery.tahun_lulus || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pend_formal($1, $2, $3, $4, $5)`,
      [jenjang_studi, asal, tahun_lulus, null, 2]
    );

    const dataPendFormal = findData.rows;
    const combinedData = [];

    for (const pendFormal of dataPendFormal) {
      const user_id = pendFormal.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pendFormal: pendFormal,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pendFormal,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_pend_formal",
      limit,
      offset,
      2
    );
    const dataPendFormal = data.rows;
    const combinedData = [];

    for (const pendFormal of dataPendFormal) {
      const user_id = pendFormal.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pendFormal: pendFormal,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pendFormal,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
// =====================  END KUALIFIKASI  ====================

// =====================  KOMPETESI  ====================
exports.getDataSertiProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.nomor_sk ||
    dataQuery.nama_serti ||
    dataQuery.jenis_serti ||
    dataQuery.bidang_studi ||
    dataQuery.tgl_serti
  ) {
    const nomor_sk = dataQuery.nomor_sk || null;
    const nama_serti = dataQuery.nama_serti || null;
    const jenis_serti = dataQuery.jenis_serti || null;
    const bidang_studi = dataQuery.bidang_studi || null;
    const tgl_serti = dataQuery.tgl_serti || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_sertifikasi($1, $2, $3, $4, $5, $6, $7)`,
      [nomor_sk, nama_serti, jenis_serti, bidang_studi, tgl_serti, null, 0]
    );

    const dataSertifikat = findData.rows;
    const combinedData = [];

    for (const sertifikat of dataSertifikat) {
      const user_id = sertifikat.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        sertifikat: sertifikat,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.sertifikat,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_sertifikasi",
      limit,
      offset,
      0
    );

    const dataSertifikat = data.rows;
    const combinedData = [];

    for (const sertifikat of dataSertifikat) {
      const user_id = sertifikat.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        sertifikat: sertifikat,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // const dataCombine = { ...data.rows, npm: npm };

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.sertifikat,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataSertiAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.nomor_sk ||
    dataQuery.nama_serti ||
    dataQuery.jenis_serti ||
    dataQuery.bidang_studi ||
    dataQuery.tgl_serti
  ) {
    const nomor_sk = dataQuery.nomor_sk || null;
    const nama_serti = dataQuery.nama_serti || null;
    const jenis_serti = dataQuery.jenis_serti || null;
    const bidang_studi = dataQuery.bidang_studi || null;
    const tgl_serti = dataQuery.tgl_serti || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_sertifikasi($1, $2, $3, $4, $5, $6, $7)`,
      [nomor_sk, nama_serti, jenis_serti, bidang_studi, tgl_serti, null, 1]
    );

    const dataSertifikat = findData.rows;
    const combinedData = [];

    for (const sertifikat of dataSertifikat) {
      const user_id = sertifikat.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        sertifikat: sertifikat,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.sertifikat,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_sertifikasi",
      limit,
      offset,
      1
    );

    const dataSertifikat = data.rows;
    const combinedData = [];

    for (const sertifikat of dataSertifikat) {
      const user_id = sertifikat.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        sertifikat: sertifikat,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.sertifikat,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataSertiReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.nomor_sk ||
    dataQuery.nama_serti ||
    dataQuery.jenis_serti ||
    dataQuery.bidang_studi ||
    dataQuery.tgl_serti
  ) {
    const nomor_sk = dataQuery.nomor_sk || null;
    const nama_serti = dataQuery.nama_serti || null;
    const jenis_serti = dataQuery.jenis_serti || null;
    const bidang_studi = dataQuery.bidang_studi || null;
    const tgl_serti = dataQuery.tgl_serti || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_sertifikasi($1, $2, $3, $4, $5, $6, $7)`,
      [nomor_sk, nama_serti, jenis_serti, bidang_studi, tgl_serti, null, 2]
    );

    const dataSertifikat = findData.rows;
    const combinedData = [];

    for (const sertifikat of dataSertifikat) {
      const user_id = sertifikat.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        sertifikat: sertifikat,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.sertifikat,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_sertifikasi",
      limit,
      offset,
      2
    );

    const dataSertifikat = data.rows;
    const combinedData = [];

    for (const sertifikat of dataSertifikat) {
      const user_id = sertifikat.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        sertifikat: sertifikat,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.sertifikat,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});

exports.getDataTesProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.nama_tes ||
    dataQuery.penyelenggara ||
    dataQuery.jenis_tes ||
    dataQuery.tgl_tes
  ) {
    const nama_tes = dataQuery.nama_tes || null;
    const jenis_tes = dataQuery.jenis_tes || null;
    const penyelenggara = dataQuery.penyelenggara || null;
    const tgl_tes = dataQuery.tgl_tes || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_tes($1, $2, $3, $4, $5, $6)`,
      [nama_tes, jenis_tes, penyelenggara, tgl_tes, null, 0]
    );

    const dataTes = findData.rows;
    const combinedData = [];

    for (const tes of dataTes) {
      const user_id = tes.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        tes: tes,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.tes,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData("tb_tes", limit, offset, 0);

    const dataTes = data.rows;
    const combinedData = [];

    for (const tes of dataTes) {
      const user_id = tes.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        tes: tes,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.tes,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataTesAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.nama_tes ||
    dataQuery.penyelenggara ||
    dataQuery.jenis_tes ||
    dataQuery.tgl_tes
  ) {
    const nama_tes = dataQuery.nama_tes || null;
    const jenis_tes = dataQuery.jenis_tes || null;
    const penyelenggara = dataQuery.penyelenggara || null;
    const tgl_tes = dataQuery.tgl_tes || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_tes($1, $2, $3, $4, $5, $6)`,
      [nama_tes, jenis_tes, penyelenggara, tgl_tes, null, 1]
    );

    const dataTes = findData.rows;
    const combinedData = [];

    for (const tes of dataTes) {
      const user_id = tes.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        tes: tes,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.tes,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData("tb_tes", limit, offset, 1);

    const dataTes = data.rows;
    const combinedData = [];

    for (const tes of dataTes) {
      const user_id = tes.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        tes: tes,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.tes,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataTesReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.nama_tes ||
    dataQuery.penyelenggara ||
    dataQuery.jenis_tes ||
    dataQuery.tgl_tes
  ) {
    const nama_tes = dataQuery.nama_tes || null;
    const jenis_tes = dataQuery.jenis_tes || null;
    const penyelenggara = dataQuery.penyelenggara || null;
    const tgl_tes = dataQuery.tgl_tes || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_tes($1, $2, $3, $4, $5, $6)`,
      [nama_tes, jenis_tes, penyelenggara, tgl_tes, null, 2]
    );

    const dataTes = findData.rows;
    const combinedData = [];

    for (const tes of dataTes) {
      const user_id = tes.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        tes: tes,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.tes,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData("tb_tes", limit, offset, 2);

    const dataTes = data.rows;
    const combinedData = [];

    for (const tes of dataTes) {
      const user_id = tes.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        tes: tes,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.tes,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
// =====================  END KOMPETESI  ====================

// =====================  PENUNJANG =======================
exports.getDataAnggotaProfesiProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.peran || dataQuery.nama_organisasi) {
    const nama_organisasi = dataQuery.nama_organisasi || null;
    const peran = dataQuery.peran || null;

    const findData = await DB.query(
      `SELECT * FROM filter_anggota_profesi($1, $2, $3, $4)`,
      [nama_organisasi, peran, null, 0]
    );

    const dataAnggotaProfesi = findData.rows;
    const combinedData = [];

    for (const anggotaProfesi of dataAnggotaProfesi) {
      const user_id = anggotaProfesi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        anggotaProfesi: anggotaProfesi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.anggotaProfesi,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData(
      "tb_anggota_prof",
      limit,
      offset,
      0
    );

    const dataAnggotaProfesi = data.rows;
    const combinedData = [];

    for (const anggotaProfesi of dataAnggotaProfesi) {
      const user_id = anggotaProfesi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        anggotaProfesi: anggotaProfesi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.anggotaProfesi,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataAnggotaProfesiAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.peran || dataQuery.nama_organisasi) {
    const nama_organisasi = dataQuery.nama_organisasi || null;
    const peran = dataQuery.peran || null;

    const findData = await DB.query(
      `SELECT * FROM filter_anggota_profesi($1, $2, $3, $4)`,
      [nama_organisasi, peran, null, 1]
    );

    const dataAnggotaProfesi = findData.rows;
    const combinedData = [];

    for (const anggotaProfesi of dataAnggotaProfesi) {
      const user_id = anggotaProfesi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        anggotaProfesi: anggotaProfesi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.anggotaProfesi,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData(
      "tb_anggota_prof",
      limit,
      offset,
      1
    );

    const dataAnggotaProfesi = data.rows;
    const combinedData = [];

    for (const anggotaProfesi of dataAnggotaProfesi) {
      const user_id = anggotaProfesi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        anggotaProfesi: anggotaProfesi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.anggotaProfesi,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataAnggotaProfesiReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.peran || dataQuery.nama_organisasi) {
    const nama_organisasi = dataQuery.nama_organisasi || null;
    const peran = dataQuery.peran || null;

    const findData = await DB.query(
      `SELECT * FROM filter_anggota_profesi($1, $2, $3, $4)`,
      [nama_organisasi, peran, null, 2]
    );

    const dataAnggotaProfesi = findData.rows;
    const combinedData = [];

    for (const anggotaProfesi of dataAnggotaProfesi) {
      const user_id = anggotaProfesi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        anggotaProfesi: anggotaProfesi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.anggotaProfesi,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData(
      "tb_anggota_prof",
      limit,
      offset,
      2
    );

    const dataAnggotaProfesi = data.rows;
    const combinedData = [];

    for (const anggotaProfesi of dataAnggotaProfesi) {
      const user_id = anggotaProfesi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        anggotaProfesi: anggotaProfesi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.anggotaProfesi,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});

exports.getDataPenghargaanProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.nama_peng ||
    dataQuery.jenis_peng ||
    dataQuery.instansi_pemberi ||
    dataQuery.tahun_peng
  ) {
    const nama_peng = dataQuery.nama_peng || null;
    const jenis_peng = dataQuery.jenis_peng || null;
    const instansi_pemberi = dataQuery.instansi_pemberi || null;
    const tahun_peng = dataQuery.tahun_peng || null;

    const findData = await DB.query(
      `SELECT * FROM filter_penghargaan($1, $2, $3, $4, $5, $6)`,
      [nama_peng, jenis_peng, instansi_pemberi, tahun_peng, null, 0]
    );

    const dataPenghargaan = findData.rows;
    const combinedData = [];

    for (const penghargaan of dataPenghargaan) {
      const user_id = penghargaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penghargaan: penghargaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penghargaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_penghargaan",
      limit,
      offset,
      0
    );

    const dataPenghargaan = data.rows;
    const combinedData = [];

    for (const penghargaan of dataPenghargaan) {
      const user_id = penghargaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penghargaan: penghargaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penghargaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPenghargaanAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.nama_peng ||
    dataQuery.jenis_peng ||
    dataQuery.instansi_pemberi ||
    dataQuery.tahun_peng
  ) {
    const nama_peng = dataQuery.nama_peng || null;
    const jenis_peng = dataQuery.jenis_peng || null;
    const instansi_pemberi = dataQuery.instansi_pemberi || null;
    const tahun_peng = dataQuery.tahun_peng || null;

    const findData = await DB.query(
      `SELECT * FROM filter_penghargaan($1, $2, $3, $4, $5, $6)`,
      [nama_peng, jenis_peng, instansi_pemberi, tahun_peng, null, 1]
    );

    const dataPenghargaan = findData.rows;
    const combinedData = [];

    for (const penghargaan of dataPenghargaan) {
      const user_id = penghargaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penghargaan: penghargaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penghargaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_penghargaan",
      limit,
      offset,
      1
    );

    const dataPenghargaan = data.rows;
    const combinedData = [];

    for (const penghargaan of dataPenghargaan) {
      const user_id = penghargaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penghargaan: penghargaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penghargaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPenghargaanReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.nama_peng ||
    dataQuery.jenis_peng ||
    dataQuery.instansi_pemberi ||
    dataQuery.tahun_peng
  ) {
    const nama_peng = dataQuery.nama_peng || null;
    const jenis_peng = dataQuery.jenis_peng || null;
    const instansi_pemberi = dataQuery.instansi_pemberi || null;
    const tahun_peng = dataQuery.tahun_peng || null;

    const findData = await DB.query(
      `SELECT * FROM filter_penghargaan($1, $2, $3, $4, $5, $6)`,
      [nama_peng, jenis_peng, instansi_pemberi, tahun_peng, null, 2]
    );

    const dataPenghargaan = findData.rows;
    const combinedData = [];

    for (const penghargaan of dataPenghargaan) {
      const user_id = penghargaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penghargaan: penghargaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penghargaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_penghargaan",
      limit,
      offset,
      2
    );

    const dataPenghargaan = data.rows;
    const combinedData = [];

    for (const penghargaan of dataPenghargaan) {
      const user_id = penghargaan.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penghargaan: penghargaan,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // const dataCombine = { ...data.rows, npm: npm };

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penghargaan,
        npm: npm,
        nidn: nidn,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
// =====================  END PENUNJANG ===================

// =====================  PELAKS-PENGABDIAN ======================
exports.getDataPengabdianProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.judul_kegiatan || dataQuery.lama_kegiatan) {
    const judul_kegiatan = dataQuery.judul_kegiatan || null;
    const lama_kegiatan = dataQuery.lama_kegiatan || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pengabdian($1, $2, $3, $4)`,
      [judul_kegiatan, lama_kegiatan, null, 0]
    );

    const dataPengabdian = findData.rows;
    const combinedData = [];

    for (const pengabdian of dataPengabdian) {
      const user_id = pengabdian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pengabdian: pengabdian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // const dataCombine = { ...data.rows, npm: npm };

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pengabdian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_pengabdian",
      limit,
      offset,
      0
    );

    const dataPengabdian = data.rows;
    const combinedData = [];

    for (const pengabdian of dataPengabdian) {
      const user_id = pengabdian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pengabdian: pengabdian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // const dataCombine = { ...data.rows, npm: npm };

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pengabdian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPengabdianAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.judul_kegiatan || dataQuery.lama_kegiatan) {
    const judul_kegiatan = dataQuery.judul_kegiatan || null;
    const lama_kegiatan = dataQuery.lama_kegiatan || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pengabdian($1, $2, $3, $4)`,
      [judul_kegiatan, lama_kegiatan, null, 1]
    );

    const dataPengabdian = findData.rows;
    const combinedData = [];

    for (const pengabdian of dataPengabdian) {
      const user_id = pengabdian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pengabdian: pengabdian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // const dataCombine = { ...data.rows, npm: npm };

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pengabdian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_pengabdian",
      limit,
      offset,
      1
    );

    const dataPengabdian = data.rows;
    const combinedData = [];

    for (const pengabdian of dataPengabdian) {
      const user_id = pengabdian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pengabdian: pengabdian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // const dataCombine = { ...data.rows, npm: npm };

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pengabdian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPengabdianReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.judul_kegiatan || dataQuery.lama_kegiatan) {
    const judul_kegiatan = dataQuery.judul_kegiatan || null;
    const lama_kegiatan = dataQuery.lama_kegiatan || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pengabdian($1, $2, $3, $4)`,
      [judul_kegiatan, lama_kegiatan, null, 2]
    );

    const dataPengabdian = findData.rows;
    const combinedData = [];

    for (const pengabdian of dataPengabdian) {
      const user_id = pengabdian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pengabdian: pengabdian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // const dataCombine = { ...data.rows, npm: npm };

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pengabdian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_pengabdian",
      limit,
      offset,
      2
    );

    const dataPengabdian = data.rows;
    const combinedData = [];

    for (const pengabdian of dataPengabdian) {
      const user_id = pengabdian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pengabdian: pengabdian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // const dataCombine = { ...data.rows, npm: npm };

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pengabdian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});

exports.getDataPembicaraProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.judul_makalah ||
    dataQuery.penyelenggara ||
    dataQuery.tgl_pelaksanaan
  ) {
    const judul_makalah = dataQuery.judul_makalah || null;
    const penyelenggara = dataQuery.penyelenggara || null;
    const tgl_pelaksanaan = dataQuery.tgl_pelaksanaan || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pembicara($1, $2, $3, $4, $5)`,
      [judul_makalah, penyelenggara, tgl_pelaksanaan, null, 0]
    );

    const dataPembicara = findData.rows;
    const combinedData = [];

    for (const pembicara of dataPembicara) {
      const user_id = pembicara.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pembicara: pembicara,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pembicara,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData(
      "tb_pembicara",
      limit,
      offset,
      0
    );

    const dataPembicara = data.rows;
    const combinedData = [];

    for (const pembicara of dataPembicara) {
      const user_id = pembicara.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pembicara: pembicara,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pembicara,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPembicaraAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.judul_makalah ||
    dataQuery.penyelenggara ||
    dataQuery.tgl_pelaksanaan
  ) {
    const judul_makalah = dataQuery.judul_makalah || null;
    const penyelenggara = dataQuery.penyelenggara || null;
    const tgl_pelaksanaan = dataQuery.tgl_pelaksanaan || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pembicara($1, $2, $3, $4, $5)`,
      [judul_makalah, penyelenggara, tgl_pelaksanaan, null, 1]
    );

    const dataPembicara = findData.rows;
    const combinedData = [];

    for (const pembicara of dataPembicara) {
      const user_id = pembicara.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pembicara: pembicara,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pembicara,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData(
      "tb_pembicara",
      limit,
      offset,
      1
    );

    const dataPembicara = data.rows;
    const combinedData = [];

    for (const pembicara of dataPembicara) {
      const user_id = pembicara.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pembicara: pembicara,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pembicara,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPembicaraReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.judul_makalah ||
    dataQuery.penyelenggara ||
    dataQuery.tgl_pelaksanaan
  ) {
    const judul_makalah = dataQuery.judul_makalah || null;
    const penyelenggara = dataQuery.penyelenggara || null;
    const tgl_pelaksanaan = dataQuery.tgl_pelaksanaan || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_pembicara($1, $2, $3, $4, $5)`,
      [judul_makalah, penyelenggara, tgl_pelaksanaan, null, 2]
    );

    const dataPembicara = findData.rows;
    const combinedData = [];

    for (const pembicara of dataPembicara) {
      const user_id = pembicara.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pembicara: pembicara,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pembicara,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData(
      "tb_pembicara",
      limit,
      offset,
      2
    );

    const dataPembicara = data.rows;
    const combinedData = [];

    for (const pembicara of dataPembicara) {
      const user_id = pembicara.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        pembicara: pembicara,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.pembicara,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});

// =====================  END PELAKS-PENGABDIAN ==================

// ==================== PELAKS-PENELITIAN ========================
exports.getDataPenelitianProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.judul_kegiatan ||
    dataQuery.tahun_pelaksanaan ||
    dataQuery.lama_kegiatan
  ) {
    const judul_kegiatan = dataQuery.judul_kegiatan || null;
    const tahun_pelaksanaan = dataQuery.tahun_pelaksanaan || null;
    const lama_kegiatan = dataQuery.lama_kegiatan || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_penelitian($1, $2, $3, $4, $5)`,
      [judul_kegiatan, tahun_pelaksanaan, lama_kegiatan, null, 0]
    );
    const dataPenelitina = findData.rows;
    const combinedData = [];

    for (const penelitian of dataPenelitina) {
      const user_id = penelitian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penelitian: penelitian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penelitian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_penelitian",
      limit,
      offset,
      0
    );

    const dataPenelitina = data.rows;
    const combinedData = [];

    for (const penelitian of dataPenelitina) {
      const user_id = penelitian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penelitian: penelitian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penelitian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPenelitianAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.judul_kegiatan ||
    dataQuery.tahun_pelaksanaan ||
    dataQuery.lama_kegiatan
  ) {
    const judul_kegiatan = dataQuery.judul_kegiatan || null;
    const tahun_pelaksanaan = dataQuery.tahun_pelaksanaan || null;
    const lama_kegiatan = dataQuery.lama_kegiatan || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_penelitian($1, $2, $3, $4, $5)`,
      [judul_kegiatan, tahun_pelaksanaan, lama_kegiatan, null, 1]
    );
    const dataPenelitina = findData.rows;
    const combinedData = [];

    for (const penelitian of dataPenelitina) {
      const user_id = penelitian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penelitian: penelitian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penelitian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_penelitian",
      limit,
      offset,
      1
    );

    const dataPenelitina = data.rows;
    const combinedData = [];

    for (const penelitian of dataPenelitina) {
      const user_id = penelitian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penelitian: penelitian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penelitian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPenelitianReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (
    dataQuery.judul_kegiatan ||
    dataQuery.tahun_pelaksanaan ||
    dataQuery.lama_kegiatan
  ) {
    const judul_kegiatan = dataQuery.judul_kegiatan || null;
    const tahun_pelaksanaan = dataQuery.tahun_pelaksanaan || null;
    const lama_kegiatan = dataQuery.lama_kegiatan || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_penelitian($1, $2, $3, $4, $5)`,
      [judul_kegiatan, tahun_pelaksanaan, lama_kegiatan, null, 2]
    );
    const dataPenelitina = findData.rows;
    const combinedData = [];

    for (const penelitian of dataPenelitina) {
      const user_id = penelitian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penelitian: penelitian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penelitian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData(
      "tb_penelitian",
      limit,
      offset,
      2
    );

    const dataPenelitina = data.rows;
    const combinedData = [];

    for (const penelitian of dataPenelitina) {
      const user_id = penelitian.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        penelitian: penelitian,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.penelitian,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});

exports.getDataPublikasiProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.judul_artikel || dataQuery.jenis || dataQuery.tgl_terbit) {
    const judul_artikel = dataQuery.judul_artikel || null;
    const jenis = dataQuery.jenis || null;
    const tgl_terbit = dataQuery.tgl_terbit || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_publikasi($1, $2, $3, $4, $5)`,
      [judul_artikel, jenis, tgl_terbit, null, 0]
    );

    const dataPublikasi = findData.rows;
    const combinedData = [];

    for (const publikasi of dataPublikasi) {
      const user_id = publikasi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        publikasi: publikasi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.publikasi,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData(
      "tb_publikasi_karya",
      limit,
      offset,
      0
    );

    const dataPublikasi = data.rows;
    const combinedData = [];

    for (const publikasi of dataPublikasi) {
      const user_id = publikasi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        publikasi: publikasi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.publikasi,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPublikasiAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.judul_artikel || dataQuery.jenis || dataQuery.tgl_terbit) {
    const judul_artikel = dataQuery.judul_artikel || null;
    const jenis = dataQuery.jenis || null;
    const tgl_terbit = dataQuery.tgl_terbit || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_publikasi($1, $2, $3, $4, $5)`,
      [judul_artikel, jenis, tgl_terbit, null, 1]
    );

    const dataPublikasi = findData.rows;
    const combinedData = [];

    for (const publikasi of dataPublikasi) {
      const user_id = publikasi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        publikasi: publikasi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.publikasi,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData(
      "tb_publikasi_karya",
      limit,
      offset,
      1
    );

    const dataPublikasi = data.rows;
    const combinedData = [];

    for (const publikasi of dataPublikasi) {
      const user_id = publikasi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        publikasi: publikasi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.publikasi,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataPublikasiReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.judul_artikel || dataQuery.jenis || dataQuery.tgl_terbit) {
    const judul_artikel = dataQuery.judul_artikel || null;
    const jenis = dataQuery.jenis || null;
    const tgl_terbit = dataQuery.tgl_terbit || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_publikasi($1, $2, $3, $4, $5)`,
      [judul_artikel, jenis, tgl_terbit, null, 3]
    );

    const dataPublikasi = findData.rows;
    const combinedData = [];

    for (const publikasi of dataPublikasi) {
      const user_id = publikasi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        publikasi: publikasi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.publikasi,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData(
      "tb_publikasi_karya",
      limit,
      offset,
      3
    );

    const dataPublikasi = data.rows;
    const combinedData = [];

    for (const publikasi of dataPublikasi) {
      const user_id = publikasi.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        publikasi: publikasi,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.publikasi,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});

exports.getDataHkiProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.judul_hki || dataQuery.jenis_hki || dataQuery.tgl_terbit_hki) {
    const judul_hki = dataQuery.judul_hki || null;
    const jenis_hki = dataQuery.jenis_hki || null;
    const tgl_terbit_hki = dataQuery.tgl_terbit_hki || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_hki($1, $2, $3, $4, $5)`,
      [judul_hki, jenis_hki, tgl_terbit_hki, null, 0]
    );

    const dataHki = findData.rows;
    const combinedData = [];

    for (const hki of dataHki) {
      const user_id = hki.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        hki: hki,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.hki,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData("tb_hki", limit, offset, 0);

    const dataHki = data.rows;
    const combinedData = [];

    for (const hki of dataHki) {
      const user_id = hki.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        hki: hki,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.hki,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataHkiAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.judul_hki || dataQuery.jenis_hki || dataQuery.tgl_terbit_hki) {
    const judul_hki = dataQuery.judul_hki || null;
    const jenis_hki = dataQuery.jenis_hki || null;
    const tgl_terbit_hki = dataQuery.tgl_terbit_hki || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_hki($1, $2, $3, $4, $5)`,
      [judul_hki, jenis_hki, tgl_terbit_hki, null, 1]
    );

    const dataHki = findData.rows;
    const combinedData = [];

    for (const hki of dataHki) {
      const user_id = hki.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        hki: hki,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.hki,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData("tb_hki", limit, offset, 1);

    const dataHki = data.rows;
    const combinedData = [];

    for (const hki of dataHki) {
      const user_id = hki.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        hki: hki,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.hki,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataHkiReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.judul_hki || dataQuery.jenis_hki || dataQuery.tgl_terbit_hki) {
    const judul_hki = dataQuery.judul_hki || null;
    const jenis_hki = dataQuery.jenis_hki || null;
    const tgl_terbit_hki = dataQuery.tgl_terbit_hki || null;

    const findData = await DB.query(
      `SELECT * FROM filter_data_hki($1, $2, $3, $4, $5)`,
      [judul_hki, jenis_hki, tgl_terbit_hki, null, 2]
    );

    const dataHki = findData.rows;
    const combinedData = [];

    for (const hki of dataHki) {
      const user_id = hki.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        hki: hki,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.hki,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const { data, jumlahData } = await fetchData("tb_hki", limit, offset, 2);

    const dataHki = data.rows;
    const combinedData = [];

    for (const hki of dataHki) {
      const user_id = hki.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        hki: hki,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const nidn = item.user[0].nidn;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.hki,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
        nidn: nidn,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});

// ==================== END PELAKS-PENELITIAN ========================

// =================== PELAKS-PENDIDIKAN ========================
exports.getAllDataIp = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.semester || dataQuery.ip || dataQuery.tahun) {
    const semester = dataQuery.semester || null;
    const ip = dataQuery.ip || null;
    const tahun = dataQuery.tahun || null;

    const data = await DB.query(
      `SELECT * FROM filter_data_ip($1, $2, $3, $4, $5)`,
      [semester, ip, tahun, null, null]
    );

    const dataIp = data.rows;
    const combinedData = [];

    for (const ip of dataIp) {
      const user_id = ip.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        ip: ip,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.ip,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;

    const data = await DB.query(
      `SELECT * FROM tb_ip_mhs WHERE is_deleted = $1 LIMIT $2 OFFSET $3`,
      [false, limit, offset]
    );

    const jumlahData = await DB.query(`SELECT COUNT(*) FROM tb_ip_mhs`);

    const dataIp = data.rows;
    const combinedData = [];

    for (const ip of dataIp) {
      const user_id = ip.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        ip: ip,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.ip,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataIpProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.semester || dataQuery.ip || dataQuery.tahun) {
    const semester = dataQuery.semester || null;
    const ip = dataQuery.ip || null;
    const tahun = dataQuery.tahun || null;

    const data = await DB.query(
      `SELECT * FROM filter_data_ip($1, $2, $3, $4, $5)`,
      [semester, ip, tahun, null, 0]
    );

    const dataIp = data.rows;
    const combinedData = [];

    for (const ip of dataIp) {
      const user_id = ip.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        ip: ip,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.ip,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData("tb_ip_mhs", limit, offset, 0);

    const dataIp = data.rows;
    const combinedData = [];

    for (const ip of dataIp) {
      const user_id = ip.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        ip: ip,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.ip,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataIpAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.semester || dataQuery.ip || dataQuery.tahun) {
    const semester = dataQuery.semester || null;
    const ip = dataQuery.ip || null;
    const tahun = dataQuery.tahun || null;

    const data = await DB.query(
      `SELECT * FROM filter_data_ip($1, $2, $3, $4, $5)`,
      [semester, ip, tahun, null, 1]
    );

    const dataIp = data.rows;
    const combinedData = [];

    for (const ip of dataIp) {
      const user_id = ip.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        ip: ip,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.ip,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData("tb_ip_mhs", limit, offset, 1);

    const dataIp = data.rows;
    const combinedData = [];

    for (const ip of dataIp) {
      const user_id = ip.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        ip: ip,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.ip,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});
exports.getDataIpReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  if (dataQuery.semester || dataQuery.ip || dataQuery.tahun) {
    const semester = dataQuery.semester || null;
    const ip = dataQuery.ip || null;
    const tahun = dataQuery.tahun || null;

    const data = await DB.query(
      `SELECT * FROM filter_data_ip($1, $2, $3, $4, $5)`,
      [semester, ip, tahun, null, 2]
    );

    const dataIp = data.rows;
    const combinedData = [];

    for (const ip of dataIp) {
      const user_id = ip.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        ip: ip,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.ip,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;
    const { data, jumlahData } = await fetchData("tb_ip_mhs", limit, offset, 2);

    const dataIp = data.rows;
    const combinedData = [];

    for (const ip of dataIp) {
      const user_id = ip.user_id;

      const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
        user_id,
      ]);

      const personalData = await DB.query(
        "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
        [user_id]
      );

      combinedData.push({
        ip: ip,
        user: user.rows,
        personalData: personalData.rows,
      });
    }

    // console.log(combinedData);
    const dataGabungan = combinedData.map((item) => {
      const npm = item.user[0].npm;
      const role = item.user[0].role;
      const nama_lengkap = item.personalData[0].nama_lengkap;

      return {
        ...item.ip,
        npm: npm,
        role: role,
        nama_lengkap: nama_lengkap,
      };
    });

    res.status(201).json({
      data: dataGabungan,
      totalData: jumlahData.rows[0].count,
    });
  }
});

// =================== KEPANGKATAN ========================
exports.getDataKepangkatanDosenProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_kepangkatan_dosen",
    limit,
    offset,
    0
  );

  const dataPangkat = data.rows;
  const combinedData = [];

  for (const pangkat of dataPangkat) {
    const user_id = pangkat.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      pangkat: pangkat,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.pangkat,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});

exports.getDataKepangkatanDosenAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_kepangkatan_dosen",
    limit,
    offset,
    1
  );

  const dataPangkat = data.rows;
  const combinedData = [];

  for (const pangkat of dataPangkat) {
    const user_id = pangkat.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      pangkat: pangkat,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.pangkat,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});

exports.getDataKepangkatanDosenReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_kepangkatan_dosen",
    limit,
    offset,
    2
  );

  const dataPangkat = data.rows;
  const combinedData = [];

  for (const pangkat of dataPangkat) {
    const user_id = pangkat.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      pangkat: pangkat,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.pangkat,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});
// =================== END KEPANGKATAN ========================

// =================== JABATAN FUNGSIONAL ========================
exports.getDataJafungDosenProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_jabatan_dosen",
    limit,
    offset,
    0
  );

  const dataJafung = data.rows;
  const combinedData = [];

  for (const jafung of dataJafung) {
    const user_id = jafung.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      jafung: jafung,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.jafung,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});

exports.getDataJafungDosenAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_jabatan_dosen",
    limit,
    offset,
    1
  );

  const dataJafung = data.rows;
  const combinedData = [];

  for (const jafung of dataJafung) {
    const user_id = jafung.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      jafung: jafung,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.jafung,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});

exports.getDataJafungDosenReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_jabatan_dosen",
    limit,
    offset,
    2
  );

  const dataJafung = data.rows;
  const combinedData = [];

  for (const jafung of dataJafung) {
    const user_id = jafung.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      jafung: jafung,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.jafung,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});
// =================== END JABATAN FUNGSIONAL ========================

// =================== BAHAN AJAR DOSEN ========================
exports.getDataBahanAjarDosenProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_bahan_ajar_dosen",
    limit,
    offset,
    0
  );

  const dataBahanAJar = data.rows;
  const combinedData = [];

  for (const bahanAjar of dataBahanAJar) {
    const user_id = bahanAjar.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      bahanAjar: bahanAjar,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.bahanAjar,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});

exports.getDataBahanAjarDosenAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_bahan_ajar_dosen",
    limit,
    offset,
    1
  );

  const dataBahanAJar = data.rows;
  const combinedData = [];

  for (const bahanAjar of dataBahanAJar) {
    const user_id = bahanAjar.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      bahanAjar: bahanAjar,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.bahanAjar,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});

exports.getDataBahanAjarDosenReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_bahan_ajar_dosen",
    limit,
    offset,
    2
  );

  const dataBahanAJar = data.rows;
  const combinedData = [];

  for (const bahanAjar of dataBahanAJar) {
    const user_id = bahanAjar.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      bahanAjar: bahanAjar,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.bahanAjar,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});
// =================== End BAHAN AJAR DOSEN ========================

// =================== BIMBINGAN MAHASISWA ===========================
exports.getDataBimbinganProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_bimbingan_mhs",
    limit,
    offset,
    0
  );

  const dataBimbingan = data.rows;
  const combinedData = [];

  for (const bimbingan of dataBimbingan) {
    const user_id = bimbingan.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      bimbingan: bimbingan,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.bimbingan,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});

exports.getDataBimbinganAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_bimbingan_mhs",
    limit,
    offset,
    1
  );

  const dataBimbingan = data.rows;
  const combinedData = [];

  for (const bimbingan of dataBimbingan) {
    const user_id = bimbingan.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      bimbingan: bimbingan,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.bimbingan,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});

exports.getDataBimbinganReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;

  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData(
    "tb_bimbingan_mhs",
    limit,
    offset,
    2
  );

  const dataBimbingan = data.rows;
  const combinedData = [];

  for (const bimbingan of dataBimbingan) {
    const user_id = bimbingan.user_id;

    const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
      user_id,
    ]);

    const personalData = await DB.query(
      "SELECT * FROM tb_data_pribadi WHERE user_id = $1",
      [user_id]
    );

    combinedData.push({
      bimbingan: bimbingan,
      user: user.rows,
      personalData: personalData.rows,
    });
  }
  const dataGabungan = combinedData.map((item) => {
    const nidn = item.user[0].nidn;
    const role = item.user[0].role;
    const nama_lengkap = item.personalData[0].nama_lengkap;

    return {
      ...item.bimbingan,
      nidn: nidn,
      role: role,
      nama_lengkap: nama_lengkap,
    };
  });

  res.status(201).json({
    data: dataGabungan,
    totalData: jumlahData.rows[0].count,
  });
});
// =================== END BIMBINGAN MAHASISWA ========================
