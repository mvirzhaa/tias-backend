const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");
const { unixTimestamp, convertDate } = require("../../utils");

exports.createDokumenPribadi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const user = await DB.query("SELECT * FROM tb_users WHERE user_id = $1", [
    userLoginId,
  ]);

  if (user.rows.length) {
    const file = req.files;
    const { nama_dok, jenis_dok } = req.body;

    if (Object.keys(file).length === 0) {
      res.status(400);
      throw new Error("Please fill in one file.");
    }

    if (!nama_dok || !jenis_dok) {
      fs.unlink(file.file_dok_pribadi[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Pleas fill in all the required fields.");
    }

    const existsNameDoc = await DB.query(
      `SELECT * FROM tb_dokumen_pribadi WHERE CAST(user_id AS TEXT) LIKE '%${user.rows[0].user_id}%' AND nama_dok LIKE '%${nama_dok}%'`
    );

    if (existsNameDoc.rows.length) {
      fs.unlink(file.file_dok_pribadi[0].path, (err) => {
        if (err) {
          console.log(err);
        }
        return;
      });
      res.status(400);
      throw new Error("Name of document already exists.");
    }

    const created_at = unixTimestamp;
    const convert = convertDate(created_at);
    const createData = await DB.query(
      "INSERT INTO tb_dokumen_pribadi(user_id, nama_dok, jenis_dok, file, created_at) VALUES($1, $2, $3, $4, $5) returning *",
      [
        user.rows[0].user_id,
        nama_dok,
        jenis_dok,
        file.file_dok_pribadi[0].filename,
        convert,
      ]
    );

    if (createData.rows.length) {
      res.status(200).json({
        message: "Successfull created data.",
        data: createData.rows[0],
      });
    } else {
      res.status(400);
      throw new Error("Invalid data document.");
    }
  } else {
    res.status(404);
    throw new Error("User not found.");
  }
});

exports.getDokPribadi = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const {
    filter,
    filterValue,
    dataTable,
    orderField,
    orderValue,
    page,
    perPage,
    search,
  } = req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(perPage, 10) || 10;
  const offset = (pageNumber - 1) * itemsPerPage;

  let query = `SELECT * FROM tb_dokumen_pribadi WHERE user_id = $1`;
  const queryParams = [userLoginId];

  if (filter && filterValue) {
    if (
      Array.isArray(filter) &&
      Array.isArray(filterValue) &&
      filter.length === filterValue.length
    ) {
      for (let i = 0; i < filter.length; i++) {
        query += ` AND ${filter[i]} = $${queryParams.length + 1}`;
        queryParams.push(filterValue[i]);
      }
    } else {
      res.status(400).json({
        message: "Filter and filterValue must be arrays of the same length.",
      });
      return;
    }
  }

  if (search) {
    query += ` AND LOWER(nama_dok) LIKE $${queryParams.length + 1}`;
    queryParams.push(`%${search.toLowerCase()}%`);
  }

  if (orderField && orderValue) {
    if (typeof orderField === "string" && typeof orderValue === "string") {
      query += ` ORDER BY ${orderField} ${orderValue}`;
    } else {
      res
        .status(400)
        .json({ message: "orderField and orderValue must be strings." });
      return;
    }
  }

  query += ` LIMIT $${queryParams.length + 1} OFFSET $${
    queryParams.length + 2
  }`;
  queryParams.push(itemsPerPage, offset);

  try {
    const results = await DB.query(query, queryParams);
    let responseData = results.rows;

    // Adjust the totalRecordsQuery to consider the same filters
    let totalRecordsQuery = `SELECT COUNT(*) AS total FROM tb_dokumen_pribadi WHERE user_id = $1`;
    const totalRecordsParams = [userLoginId];

    if (filter && filterValue) {
      for (let i = 0; i < filter.length; i++) {
        totalRecordsQuery += ` AND ${filter[i]} = $${
          totalRecordsParams.length + 1
        }`;
        totalRecordsParams.push(filterValue[i]);
      }
    }

    if (search) {
      totalRecordsQuery += ` AND LOWER(nama_dok) LIKE $${
        totalRecordsParams.length + 1
      }`;
      totalRecordsParams.push(`%${search.toLowerCase()}%`);
    }

    const totalRecordsResult = await DB.query(
      totalRecordsQuery,
      totalRecordsParams
    );
    const totalRecords = totalRecordsResult.rows[0].total;

    if (dataTable === "true") {
      responseData = {
        message: "success",
        draw: 1,
        recordsTotal: totalRecords,
        recordsFiltered: totalRecords,
        data: responseData,
      };
    } else {
      responseData = {
        message: "success",
        data: responseData,
      };
    }

    res.status(200).json(responseData);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

exports.detailDokPribadi = asyncHandler(async (req, res) => {
  const { dokId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_dokumen_pribadi WHERE dokpribadi_id = $1",
    [dokId]
  );

  if (!findData.rows.length) {
    res.status(404);
    throw new Error("Data not found.");
  }

  res.status(201).json({
    data: findData.rows[0],
  });
});

exports.editDataDok = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const { dokId } = req.params;

  const dokumen = await DB.query(
    "SELECT * FROM tb_dokumen_pribadi WHERE dokpribadi_id = $1",
    [dokId]
  );

  if (dokumen.rows.length) {
    const file = req.files;
    const data = req.body;

    const existsNameDoc = await DB.query(
      `SELECT * FROM tb_dokumen_pribadi WHERE CAST(user_id AS TEXT) LIKE '%${userLoginId}%' AND nama_dok LIKE '%${data.nama_dok}%'`
    );

    if (existsNameDoc.rows.length) {
      if (Object.keys(file).length === 0) {
        res.status(400);
        throw new Error("Name of document already exists.");
      } else {
        fs.unlink(file.file_dok_pribadi[0].path, (err) => {
          if (err) {
            console.log(err);
          }
          return;
        });
        res.status(400);
        throw new Error("Name of document already exists.");
      }
    }

    if (Object.keys(file).length === 0) {
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const entries = Object.entries({ ...data, updated_at: convert });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const updateData = await DB.query(
        `UPDATE tb_dokumen_pribadi SET ${setQuery} WHERE dokpribadi_id = '${dokumen.rows[0].dokpribadi_id}' returning *`,
        entries.map(([_, value]) => value)
      );

      res.status(200).json({
        message: "Success Update Data",
        data: updateData.rows[0],
      });
    } else {
      await fs.remove(
        path.join(`public/dokumen-pribadi/${dokumen.rows[0].file}`)
      );
      const updated_at = unixTimestamp;
      const convert = convertDate(updated_at);

      const entries = Object.entries({
        ...data,
        file: file.file_dok_pribadi[0].filename,
        updated_at: convert,
      });
      const setQuery = entries
        .map(([key, _], index) => `${key} = $${index + 1}`)
        .join(", ");

      const updateData = await DB.query(
        `UPDATE tb_dokumen_pribadi SET ${setQuery} WHERE dokpribadi_id = '${dokumen.rows[0].dokpribadi_id}' returning *`,
        entries.map(([_, value]) => value)
      );

      res.status(200).json({
        message: "Success Update Data",
        data: updateData.rows[0],
      });
    }
  } else {
    res.status(404);
    throw new Error("Dokumen not found.");
  }
});

exports.deleteDataDok = asyncHandler(async (req, res) => {
  const { dokId } = req.params;

  const findData = await DB.query(
    "SELECT * FROM tb_dokumen_pribadi WHERE dokpribadi_id = $1",
    [dokId]
  );

  if (!findData.rows.length) {
    res.status(400);
    throw new Error("Data not found.");
  }

  await fs.remove(path.join(`public/dokumen-pribadi/${findData.rows[0].file}`));
  await DB.query("DELETE FROM tb_dokumen_pribadi WHERE dokpribadi_id = $1", [
    dokId,
  ]);

  res.status(200).json({ message: "Data deleted successfully." });
});
