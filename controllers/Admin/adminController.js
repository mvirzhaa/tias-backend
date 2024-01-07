const asyncHandler = require("express-async-handler");
const DB = require("../../database");

const fetchData = async (tb, limit, offset) => {
  const data = await DB.query(
    `SELECT * FROM ${tb} WHERE status = $1 and is_deleted = $2 LIMIT $3 OFFSET $4`,
    [0, false, limit, offset]
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

  const { data, jumlahData } = await fetchData("tb_riwayat_pekerjaan", limit, offset);
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

  const { data, jumlahData } = await fetchData("tb_pend_formal", limit, offset);
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

  const { data, jumlahData } = await fetchData("tb_sertifikasi", limit, offset);

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

  const { data, jumlahData } = await fetchData("tb_tes", limit, offset);

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
  const { data, jumlahData } = await fetchData("tb_anggota_prof", limit, offset);

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

  const { data, jumlahData } = await fetchData("tb_penghargaan", limit, offset);

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

  const { data, jumlahData } = await fetchData("tb_pengabdian", limit, offset);

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
  const { data, jumlahData } = await fetchData("tb_pembicara", limit, offset);

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

  const { data, jumlahData } = await fetchData("tb_penelitian", limit, offset);

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
  const { data, jumlahData } = await fetchData("tb_publikasi_karya", limit, offset);

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

  const { data, jumlahData } = await fetchData("tb_hki", limit, offset);

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
  const { data, jumlahData } = await fetchData("tb_ip_mhs", limit, offset);

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
exports.getDataKepangkatanDosen = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_kepangkatan_dosen", limit, offset);

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
exports.getDataJafungDosen = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_jabatan_dosen", limit, offset);

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
exports.getDataBahanAjarDosen = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_bahan_ajar_dosen", limit, offset);

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
exports.getDataBimbingan = asyncHandler(async (req, res) => {
  const dataQuery = req.query;

  const page = dataQuery.page || 1;
  const limit = dataQuery.limit || 10;
  
  const offset = (page - 1) * limit;
  const { data, jumlahData } = await fetchData("tb_bimbingan_mhs", limit, offset);

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
