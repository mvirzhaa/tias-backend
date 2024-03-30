const expressAsyncHandler = require("express-async-handler");
const DB = require("../../database");
const QRCode = require("qrcode-svg");

exports.getValidasiDokumen = expressAsyncHandler(async (req, res) => {
  const {
    filter,
    filterValue,
    dataTable,
    orderField,
    orderValue,
    page,
    perPage,
  } = req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(perPage, 10) || 10;

  const offset = (pageNumber - 1) * itemsPerPage;

  let query = "SELECT * FROM validasi_dokumen";

  if (filter && filterValue) {
    if (Array.isArray(filter) && Array.isArray(filterValue)) {
      for (let i = 0; i < filter.length; i++) {
        query += ` WHERE ${filter[i]} = '${filterValue[i]}'`;
        if (i !== filter.length - 1) {
          query += " AND";
        }
      }
    } else {
      res
        .status(400)
        .json({ message: "Filter and filterValue must be arrays." });
      return;
    }
  }

  if (orderField && orderValue) {
    query += " ORDER BY ";
    query += `${orderField} ${orderValue}`;
  }

  query += ` LIMIT ${itemsPerPage} OFFSET ${offset}`;

  const result = await DB.query(query);

  // let responseData = result.rows;

  const findName = await DB.query(
    "SELECT user_id, nama_lengkap FROM tb_data_pribadi"
  );

  let responseData = result.rows.map((row) => {
    const dosen = findName.rows.find((item) => item.user_id === row.dosen_id);
    const mahasiswa = findName.rows.find((item) => item.user_id === row.mhs_id);

    return {
      id: row.id,
      dosen_id: row.dosen_id,
      mhs_id: row.mhs_id,
      nama_dosen: dosen ? dosen.nama_lengkap : "",
      nama_mhs: mahasiswa ? mahasiswa.nama_lengkap : "",
      nama_kegiatan: row.nama_kegiatan,
      link_kegiatan: row.link_kegiatan,
      link_validasi: row.link_validasi,
      created_at: row.created_at,
    };
  });

  if (dataTable === "true") {
    res.status(200).json({
      message: "success",
      draw: 1,
      recordsTotal: responseData.length,
      recordsFiltered: responseData.length,
      data: responseData,
    });
  } else {
    res.status(200).json({
      message: "success",
      data: responseData,
    });
  }
});

exports.showQr = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;

  const findData = await DB.query(
    "SELECT * FROM validasi_dokumen WHERE id = $1",
    [id]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data Not Found.");
  }

  const link = findData.rows[0].link_validasi;

  const qr = new QRCode({
    content: link,
    container: "svg-viewbox",
    join: true,
  });

  const svg = qr.svg();

  res.setHeader("Content-Type", "image/svg+xml");

  res.status(200).send(svg);
});
