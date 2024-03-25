const expressAsyncHandler = require("express-async-handler");
const DB_VALIDASI = require("../../db-validasi-digital");

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

  const result = await DB_VALIDASI.query(query);

  let responseData = result.rows;

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
