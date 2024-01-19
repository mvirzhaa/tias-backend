exports.getDataPenelitian = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
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
      `SELECT * FROM filter_data_penelitian($1, $2, $3, $4)`,
      [judul_kegiatan, tahun_pelaksanaan, lama_kegiatan, userLoginId]
    );

    res.status(201).json({
      data: findData.rows,
    });
  } else {
    const page = dataQuery.page || 1;
    const limit = dataQuery.limit || 10;

    const offset = (page - 1) * limit;


    const dataPenelitian = await DB.query(
      `SELECT
        p.*,
        ap.user_id AS anggota_user_id,
        ap.peran,
        ap.status AS anggota_status
      FROM
        tb_penelitian p
      LEFT JOIN
        anggota_penelitian ap ON p.penelitian_id = ap.penelitian_id
      WHERE
        (p.user_id = $1 AND ap.user_id IS NULL) -- Data penelitian milik pengguna tanpa anggota
        OR (ap.user_id = $1 AND p.is_deleted = $2) -- Data penelitian diikuti sebagai anggota
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