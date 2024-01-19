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

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_riwayat_pekerjaan", limit, offset, 0);
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
});

exports.getDataRwytPekerjaanReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_riwayat_pekerjaan", limit, offset, 2);
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
});

exports.getDataRwytPekerjaanAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_riwayat_pekerjaan", limit, offset, 1);
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
});

exports.getDataPendFormalProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_pend_formal", limit, offset, 0);
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
});

exports.getDataPendFormalReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_pend_formal", limit, offset, 2);
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
});

exports.getDataPendFormalAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_pend_formal", limit, offset, 1);
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
});
// =====================  END KUALIFIKASI  ====================

// =====================  KOMPETESI  ====================
exports.getDataSertiProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_sertifikasi", limit, offset, 0);

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
});

exports.getDataSertiReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_sertifikasi", limit, offset, 2);

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
});

exports.getDataSertiAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_sertifikasi", limit, offset, 1);

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
});

exports.getDataTesProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

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
});

exports.getDataTesReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

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
});

exports.getDataTesAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

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
});
// =====================  END KOMPETESI  ====================

// =====================  PENUNJANG =======================
exports.getDataAnggotaProfesiProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_anggota_prof", limit, offset, 0);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataAnggotaProfesiReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_anggota_prof", limit, offset, 2);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataAnggotaProfesiAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_anggota_prof", limit, offset, 1);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataPenghargaanProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_penghargaan", limit, offset, 0);

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
});

exports.getDataPenghargaanReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_penghargaan", limit, offset, 2);

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
});

exports.getDataPenghargaanAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_penghargaan", limit, offset, 1);

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
});
// =====================  END PENUNJANG ===================

// =====================  PELAKS-PENGABDIAN ======================
exports.getDataPengabdianProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_pengabdian", limit, offset, 0);

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
});

exports.getDataPengabdianAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_pengabdian", limit, offset, 1);

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
});

exports.getDataPengabdianReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_pengabdian", limit, offset, 2);

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
});

exports.getDataPembicaraProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_pembicara", limit, offset, 0);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataPembicaraAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_pembicara", limit, offset, 1);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataPembicaraReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_pembicara", limit, offset, 2);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});
// =====================  END PELAKS-PENGABDIAN ==================

// ==================== PELAKS-PENELITIAN ========================
exports.getDataPenelitianProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_penelitian", limit, offset, 0);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataPenelitianAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_penelitian", limit, offset, 1);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataPenelitianReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;

  const { data, jumlahData } = await fetchData("tb_penelitian", limit, offset, 2);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataPublikasiProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_publikasi_karya", limit, offset, 0);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataPublikasiAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_publikasi_karya", limit, offset, 1);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataPublikasiReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_publikasi_karya", limit, offset, 2);

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataHkiProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataHkiAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});

exports.getDataHkiReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

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

  // const dataCombine = { ...data.rows, npm: npm };

  // console.log(combinedData);
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
});
// ==================== END PELAKS-PENELITIAN ========================

// =================== PELAKS-PENDIDIKAN ========================
exports.getDataIpProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

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

  // const dataCombine = { ...data.rows, npm: npm };

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
});

exports.getDataIpAprove = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

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

  // const dataCombine = { ...data.rows, npm: npm };

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
});

exports.getDataIpReject = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

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

  // const dataCombine = { ...data.rows, npm: npm };

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
});

// =================== KEPANGKATAN ========================
exports.getDataKepangkatanDosenProses = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_kepangkatan_dosen", limit, offset, 0);

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
  const { data, jumlahData } = await fetchData("tb_kepangkatan_dosen", limit, offset, 1);

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
  const { data, jumlahData } = await fetchData("tb_kepangkatan_dosen", limit, offset, 2);

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
  const { data, jumlahData } = await fetchData("tb_jabatan_dosen", limit, offset, 0);

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
  const { data, jumlahData } = await fetchData("tb_jabatan_dosen", limit, offset, 1);

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
  const { data, jumlahData } = await fetchData("tb_jabatan_dosen", limit, offset, 2);

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
  const { data, jumlahData } = await fetchData("tb_bahan_ajar_dosen", limit, offset, 0);

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
  const { data, jumlahData } = await fetchData("tb_bahan_ajar_dosen", limit, offset, 1);

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
  const { data, jumlahData } = await fetchData("tb_bahan_ajar_dosen", limit, offset, 2);

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
  const { data, jumlahData } = await fetchData("tb_bimbingan_mhs", limit, offset, 0);

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
  const { data, jumlahData } = await fetchData("tb_bimbingan_mhs", limit, offset, 1);

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
  const { data, jumlahData } = await fetchData("tb_bimbingan_mhs", limit, offset, 2);

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
