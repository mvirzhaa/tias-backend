const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const { response } = require("../../lib/response");
const TAProgres = require("../../models/TugasAkhir/TaProgres");
const { getPagination } = require("../../lib/pagination-parser");
const { Op, where } = require("sequelize");
const { CastObject } = require("../../lib/general");
const SiakLecturer = require("../../models/Siak/Lecturer");
const User = require("../../models/User");
const DataPribadi = require("../../models/DataPribadi");

exports.getProgesTaForDosen = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;
  const { dataTable, orderField, orderValue, page, perPage, search } =
    req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(perPage, 10) || 10;

  const offset = (pageNumber - 1) * itemsPerPage;

  let query = `SELECT
  ta_pengajuan_sk.*,
  last_progres.count,
  last_progres.last_tgl,
  last_progres.pembahasan,
  last_progres.bab,
  last_progres.deskripsi,
  last_progres.id as progres_id,
  ta_pendaftaran_kolokium.kolo_pembimbing_1,
  ta_pendaftaran_kolokium.id AS kolo_id,
  ta_pendaftaran_kolokium.kolo_pembimbing_2,
  ta_pendaftaran_kolokium.kolo_pembimbing_3,
  ta_pendaftaran_kolokium.pengajuan_sk_id,
  ta_pendaftaran_kolokium.evaluator_1,
  ta_pendaftaran_kolokium.evaluator_2,
  ta_pendaftaran_sidang.sidang_pembimbing_1,
  ta_pendaftaran_sidang.id AS sidang_id,
  ta_pendaftaran_sidang.sidang_pembimbing_2,
  ta_pendaftaran_sidang.sidang_pembimbing_3,
  ta_pendaftaran_sidang.pengajuan_sk_id AS sidang_sk_id,
  ta_pendaftaran_sidang.penguji_1,
  ta_pendaftaran_sidang.penguji_2,
  tb_data_pribadi.nama_lengkap,
  tb_users.npm,
  CONCAT(
      CASE WHEN ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' THEN 'SK Pembimbing 1 | ' ELSE '' END,
      CASE WHEN ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' THEN 'SK Pembimbing 2 | ' ELSE '' END,
      CASE WHEN ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' THEN 'SK Pembimbing 3 | ' ELSE '' END,
      CASE WHEN ta_pengajuan_sk.kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' THEN 'Evaluator 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' THEN 'Evaluator 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' THEN 'Penguji 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.penguji_2 = '${userLoginId}' THEN 'Penguji 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' THEN 'Pembimbing Kolokium 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' THEN 'Pembimbing Kolokium 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' THEN 'Pembimbing Kolokium 3 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' THEN 'Pembimbing Sidang 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' THEN 'Pembimbing Sidang 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' THEN 'Pembimbing Sidang 3 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END
  ) AS peran
FROM
  ta_pengajuan_sk
JOIN
  tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id
JOIN
  tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id
JOIN
  ta_pendaftaran_kolokium ON ta_pengajuan_sk.id = ta_pendaftaran_kolokium.pengajuan_sk_id
JOIN
  ta_pendaftaran_sidang ON ta_pengajuan_sk.id = ta_pendaftaran_sidang.pengajuan_sk_id
LEFT JOIN
  (
    SELECT 
      *
    FROM 
      ta_progres 
    WHERE 
      (pengajuan_sk_id, created_at) IN (
        SELECT 
          pengajuan_sk_id, MAX(created_at) 
        FROM 
          ta_progres 
        GROUP BY 
          pengajuan_sk_id
      )
  ) AS last_progres ON ta_pengajuan_sk.id = last_progres.pengajuan_sk_id
WHERE
 ( ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' OR
  ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' OR
  ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' OR
  ta_pengajuan_sk.kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' OR
  ta_pendaftaran_sidang.penguji_2 = '${userLoginId}') AND ta_pengajuan_sk.deleted_at IS NULL
`;

  if (search) {
    query += ` AND LOWER(tb_data_pribadi.nama_lengkap) LIKE '%${search.toLowerCase()}%'`;
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

  query += ` LIMIT ${itemsPerPage} OFFSET ${offset}`;

  const result = await DB.query(query);

  let responseData = [];
  let dataWithStatusLate = [];
  let totalRecords = 0; // Define totalRecords here

  if (result.rows.length > 0) {
    responseData = result.rows;

    let totalRecordsQuery = `
    SELECT COUNT(*) AS total
    FROM
      ta_pengajuan_sk
    JOIN
      tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id
    JOIN
      tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id
    JOIN
      ta_pendaftaran_kolokium ON ta_pengajuan_sk.id = ta_pendaftaran_kolokium.pengajuan_sk_id
    JOIN
      ta_pendaftaran_sidang ON ta_pengajuan_sk.id = ta_pendaftaran_sidang.pengajuan_sk_id
    LEFT JOIN
      ta_progres ON ta_pengajuan_sk.id = ta_progres.pengajuan_sk_id
    WHERE
      ( ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' OR
      ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' OR
      ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' OR
      ta_pengajuan_sk.kepala_lab = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' OR
      ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' OR
      ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' OR
      ta_pendaftaran_sidang.penguji_2 = '${userLoginId}') AND ta_pengajuan_sk.deleted_at IS NULL
  `;

    if (search) {
      totalRecordsQuery += ` AND LOWER(tb_data_pribadi.nama_lengkap) LIKE '%${search.toLowerCase()}%'`;
    }

    const totalRecordsResult = await DB.query(totalRecordsQuery);
    totalRecords = totalRecordsResult.rows[0].total;

    dataWithStatusLate = responseData.map((row) => {
      const { last_tgl, status_kelulusan } = row;

      let late_progres = "abu-abu";

      if (last_tgl) {
        const lastDate = new Date(last_tgl);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (status_kelulusan == 0) {
          if (diffDays > 30) {
            late_progres = "merah";
          } else if (diffDays > 14) {
            late_progres = "kuning";
          } else {
            late_progres = "hijau";
          }
        }
      }

      return {
        ...row,
        late_progres,
      };
    });
  }

  if (dataTable === "true") {
    responseData = {
      message: "success",
      draw: 1,
      recordsTotal: totalRecords,
      recordsFiltered: totalRecords,
      data: dataWithStatusLate,
    };
  } else {
    responseData = {
      message: "success",
      data: dataWithStatusLate,
    };
  }

  res.status(200).json(responseData);
});

exports.getProgesTaForMhs = asyncHandler(async (req, res) => {
  const userLoginId = req.user.user_id;

  const query = `
  SELECT 
  sk.id AS sk_id, 
  sk.*, 
  last_progres.count,
  last_progres.last_tgl,
  last_progres.pembahasan,
  last_progres.bab,
  last_progres.deskripsi,
  last_progres.id AS progres_id
FROM 
  ta_pengajuan_sk AS sk
LEFT JOIN (
  SELECT 
      tp.* 
  FROM 
      ta_progres AS tp
  INNER JOIN (
      SELECT 
          pengajuan_sk_id, 
          MAX(created_at) AS max_created_at
      FROM 
          ta_progres
      GROUP BY 
          pengajuan_sk_id
  ) AS latest_progres 
  ON tp.pengajuan_sk_id = latest_progres.pengajuan_sk_id 
  AND tp.created_at = latest_progres.max_created_at
) AS last_progres 
ON sk.id = last_progres.pengajuan_sk_id
WHERE 
  sk.mhs_id = $1
  AND sk.deleted_at IS NULL;
  `;

  try {
    const result = await DB.query(query, [userLoginId]);

    const dataWithStatusLate = result.rows.map((row) => {
      const { last_tgl, status_kelulusan } = row;

      let late_progres = "abu-abu";

      if (last_tgl) {
        const lastDate = new Date(last_tgl);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (status_kelulusan == 0) {
          if (diffDays > 30) {
            late_progres = "merah";
          } else if (diffDays > 14) {
            late_progres = "kuning";
          } else {
            late_progres = "hijau";
          }
        }
      }

      return {
        ...row,
        late_progres,
      };
    });

    res.status(200).json({
      message: "success",
      data: dataWithStatusLate,
      totalData: result.rowCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "error",
      error: error.message,
    });
  }
});

exports.getListAdminProgresTa = asyncHandler(async (req, res) => {
  try {
    let { limit, page, order, orderBy, search, filter, filterValue } =
      req.query;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    page = page ? parseInt(page) : 1;
    order = order ? order : "user_id";
    orderBy = orderBy ? orderBy : "DESC";
    const pagelimit = getPagination(limit, page);

    let whereCondition = { role: "Dosen" };

    if (filter && filterValue) {
      const filters = Array.isArray(filter) ? filter : [filter];
      const filterValues = Array.isArray(filterValue)
        ? filterValue
        : [filterValue];

      filters.forEach((f, index) => {
        if (f && filterValues[index] !== undefined) {
          whereCondition[f] = filterValues[index];
        }
      });
    }

    let condition = { [Op.and]: whereCondition };

    if (search) {
      condition = {
        ...condition,
        [Op.or]: [
          {
            "$personal_data.nama_lengkap$": {
              [Op.iLike]: `%${search}%`,
            },
          },
        ],
      };
    }

    const data = await User.findAndCountAll({
      distinct: true,
      include: [
        {
          model: DataPribadi,
          as: "personal_data",
        },
      ],
      where: condition,
      order: [[order, orderBy]],
      limit: pagelimit.limit,
      offset: pagelimit.offset,
    });

    const promises = data.rows.map(async (item) => {
      const findProgres = await DB.query(
        `SELECT
          ta_pengajuan_sk.*, 
          ta_progres.last_tgl
        FROM
          ta_pengajuan_sk
        JOIN
          tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id
        JOIN
          ta_pendaftaran_kolokium ON ta_pengajuan_sk.id = ta_pendaftaran_kolokium.pengajuan_sk_id
        JOIN
          ta_pendaftaran_sidang ON ta_pengajuan_sk.id = ta_pendaftaran_sidang.pengajuan_sk_id
        LEFT JOIN
          ta_progres ON ta_pengajuan_sk.id = ta_progres.pengajuan_sk_id
        WHERE
          (ta_pengajuan_sk.sk_pembimbing_1 = $1 OR
           ta_pengajuan_sk.sk_pembimbing_2 = $1 OR
           ta_pengajuan_sk.sk_pembimbing_3 = $1 OR
           ta_pengajuan_sk.kepala_lab = $1 OR
           ta_pendaftaran_kolokium.kolo_pembimbing_1 = $1 OR
           ta_pendaftaran_kolokium.kolo_pembimbing_2 = $1 OR
           ta_pendaftaran_kolokium.kolo_pembimbing_3 = $1 OR
           ta_pendaftaran_sidang.sidang_pembimbing_1 = $1 OR
           ta_pendaftaran_sidang.sidang_pembimbing_2 = $1 OR
           ta_pendaftaran_sidang.sidang_pembimbing_3 = $1)
          AND ta_pengajuan_sk.deleted_at IS NULL`,
        [item?.user_id]
      );

      const statusCounts = {
        merah: 0,
        kuning: 0,
        hijau: 0,
        abuabu: 0,
      };

      findProgres.rows.forEach((row) => {
        const { last_tgl, status_kelulusan } = row;

        let late_progres = "abuabu";
        if (last_tgl) {
          const lastDate = new Date(last_tgl);
          const currentDate = new Date();
          const diffTime = Math.abs(currentDate - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (status_kelulusan === 0) {
            if (diffDays > 30) {
              late_progres = "merah";
            } else if (diffDays > 14) {
              late_progres = "kuning";
            } else {
              late_progres = "hijau";
            }
          }
        }

        if (late_progres) {
          statusCounts[late_progres]++;
        }
      });

      return {
        user_id: item.user_id,
        nip: item.personal_data.nip,
        name: item.personal_data.nama_lengkap,
        status_counts: statusCounts,
      };
    });

    const dataWithProgresTa = await Promise.all(promises);

    return response(res, true, "success", {
      limit,
      page,
      total: data.count,
      total_page: Math.ceil(data.count / limit),
      rows: dataWithProgresTa,
    });
  } catch (error) {
    console.log(error);
    return response(res, false, error.message, error);
  }
});

exports.getListAdminProgresTaDosen = asyncHandler(async (req, res) => {
  const userLoginId = req.params.userId;
  const { dataTable, orderField, orderValue, page, perPage, search } =
    req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(perPage, 10) || 10;

  const offset = (pageNumber - 1) * itemsPerPage;

  let query = `SELECT
  ta_pengajuan_sk.*,
  last_progres.count,
  last_progres.last_tgl,
  last_progres.pembahasan,
  last_progres.bab,
  last_progres.deskripsi,
  last_progres.id as progres_id,
  ta_pendaftaran_kolokium.kolo_pembimbing_1,
  ta_pendaftaran_kolokium.id AS kolo_id,
  ta_pendaftaran_kolokium.kolo_pembimbing_2,
  ta_pendaftaran_kolokium.kolo_pembimbing_3,
  ta_pendaftaran_kolokium.pengajuan_sk_id,
  ta_pendaftaran_kolokium.evaluator_1,
  ta_pendaftaran_kolokium.evaluator_2,
  ta_pendaftaran_sidang.sidang_pembimbing_1,
  ta_pendaftaran_sidang.id AS sidang_id,
  ta_pendaftaran_sidang.sidang_pembimbing_2,
  ta_pendaftaran_sidang.sidang_pembimbing_3,
  ta_pendaftaran_sidang.pengajuan_sk_id AS sidang_sk_id,
  ta_pendaftaran_sidang.penguji_1,
  ta_pendaftaran_sidang.penguji_2,
  tb_data_pribadi.nama_lengkap,
  tb_users.npm,
  CONCAT(
      CASE WHEN ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' THEN 'SK Pembimbing 1 | ' ELSE '' END,
      CASE WHEN ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' THEN 'SK Pembimbing 2 | ' ELSE '' END,
      CASE WHEN ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' THEN 'SK Pembimbing 3 | ' ELSE '' END,
      CASE WHEN ta_pengajuan_sk.kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' THEN 'Evaluator 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' THEN 'Evaluator 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' THEN 'Penguji 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.penguji_2 = '${userLoginId}' THEN 'Penguji 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' THEN 'Pembimbing Kolokium 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' THEN 'Pembimbing Kolokium 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' THEN 'Pembimbing Kolokium 3 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' THEN 'Pembimbing Sidang 1 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' THEN 'Pembimbing Sidang 2 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' THEN 'Pembimbing Sidang 3 | ' ELSE '' END,
      CASE WHEN ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' THEN 'Kepala Lab | ' ELSE '' END
  ) AS peran
FROM
  ta_pengajuan_sk
JOIN
  tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id
JOIN
  tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id
JOIN
  ta_pendaftaran_kolokium ON ta_pengajuan_sk.id = ta_pendaftaran_kolokium.pengajuan_sk_id
JOIN
  ta_pendaftaran_sidang ON ta_pengajuan_sk.id = ta_pendaftaran_sidang.pengajuan_sk_id
LEFT JOIN
  (
    SELECT 
      *
    FROM 
      ta_progres 
    WHERE 
      (pengajuan_sk_id, created_at) IN (
        SELECT 
          pengajuan_sk_id, MAX(created_at) 
        FROM 
          ta_progres 
        GROUP BY 
          pengajuan_sk_id
      )
  ) AS last_progres ON ta_pengajuan_sk.id = last_progres.pengajuan_sk_id
WHERE
 ( ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' OR
  ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' OR
  ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' OR
  ta_pengajuan_sk.kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' OR
  ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' OR
  ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' OR
  ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' OR
  ta_pendaftaran_sidang.penguji_2 = '${userLoginId}') AND ta_pengajuan_sk.deleted_at IS NULL
`;

  if (search) {
    query += ` AND LOWER(tb_data_pribadi.nama_lengkap) LIKE '%${search.toLowerCase()}%'`;
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

  query += ` LIMIT ${itemsPerPage} OFFSET ${offset}`;

  const result = await DB.query(query);

  let responseData = [];
  let dataWithStatusLate = [];
  let totalRecords = 0; // Define totalRecords here

  if (result.rows.length > 0) {
    responseData = result.rows;

    let totalRecordsQuery = `
    SELECT COUNT(*) AS total
    FROM
      ta_pengajuan_sk
    JOIN
      tb_data_pribadi ON ta_pengajuan_sk.mhs_id = tb_data_pribadi.user_id
    JOIN
      tb_users ON ta_pengajuan_sk.mhs_id = tb_users.user_id
    JOIN
      ta_pendaftaran_kolokium ON ta_pengajuan_sk.id = ta_pendaftaran_kolokium.pengajuan_sk_id
    JOIN
      ta_pendaftaran_sidang ON ta_pengajuan_sk.id = ta_pendaftaran_sidang.pengajuan_sk_id
    LEFT JOIN
      ta_progres ON ta_pengajuan_sk.id = ta_progres.pengajuan_sk_id
    WHERE
      ( ta_pengajuan_sk.sk_pembimbing_1 = '${userLoginId}' OR
      ta_pengajuan_sk.sk_pembimbing_2 = '${userLoginId}' OR
      ta_pengajuan_sk.sk_pembimbing_3 = '${userLoginId}' OR
      ta_pengajuan_sk.kepala_lab = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_pembimbing_1 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_pembimbing_2 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_pembimbing_3 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.kolo_kepala_lab = '${userLoginId}' OR
      ta_pendaftaran_kolokium.evaluator_1 = '${userLoginId}' OR
      ta_pendaftaran_kolokium.evaluator_2 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_pembimbing_1 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_pembimbing_2 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_pembimbing_3 = '${userLoginId}' OR
      ta_pendaftaran_sidang.sidang_kepala_lab = '${userLoginId}' OR
      ta_pendaftaran_sidang.penguji_1 = '${userLoginId}' OR
      ta_pendaftaran_sidang.penguji_2 = '${userLoginId}') AND ta_pengajuan_sk.deleted_at IS NULL
  `;

    if (search) {
      totalRecordsQuery += ` AND LOWER(tb_data_pribadi.nama_lengkap) LIKE '%${search.toLowerCase()}%'`;
    }

    const totalRecordsResult = await DB.query(totalRecordsQuery);
    totalRecords = totalRecordsResult.rows[0].total;

    dataWithStatusLate = responseData.map((row) => {
      const { last_tgl, status_kelulusan } = row;

      let late_progres = "abu-abu";

      if (last_tgl) {
        const lastDate = new Date(last_tgl);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (status_kelulusan == 0) {
          if (diffDays > 30) {
            late_progres = "merah";
          } else if (diffDays > 14) {
            late_progres = "kuning";
          } else {
            late_progres = "hijau";
          }
        }
      }

      return {
        ...row,
        late_progres,
      };
    });
  }

  if (dataTable === "true") {
    responseData = {
      message: "success",
      draw: 1,
      recordsTotal: totalRecords,
      recordsFiltered: totalRecords,
      data: dataWithStatusLate,
    };
  } else {
    responseData = {
      message: "success",
      data: dataWithStatusLate,
    };
  }

  res.status(200).json(responseData);
});

exports.getListProgesTaForDosen = asyncHandler(async (req, res) => {
  try {
    let { limit, page, order, orderBy, search, filter, filterValue } =
      req.query;
    const { id } = req.params;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    page = page ? parseInt(page) : 1;
    order = order ? order : "id";
    orderBy = orderBy ? orderBy : "DESC";
    const pagelimit = getPagination(limit, page);

    let whereCondition = {
      pengajuan_sk_id: id,
    };

    if (filter && filterValue) {
      const filters = Array.isArray(filter) ? filter : [filter];
      const filterValues = Array.isArray(filterValue)
        ? filterValue
        : [filterValue];

      filters.forEach((f, index) => {
        if (f && filterValues[index] !== undefined) {
          whereCondition[f] = filterValues[index];
        }
      });
    }

    let condition = {
      [Op.and]: whereCondition,
    };

    if (search) {
      condition = {
        ...condition,
        [Op.or]: {
          pembahasan: {
            [Op.like]: `%${search}%`,
          },
        },
      };
    }

    const data = await TAProgres.findAndCountAll({
      distinct: true,
      where: condition,
      order: [[order, orderBy]],
      limit: pagelimit.limit,
      offset: pagelimit.offset,
    });

    return response(res, true, "success", {
      limit,
      page,
      total: data.count,
      total_page: Math.ceil(parseInt(data.count) / limit),
      rows: data.rows,
    });
  } catch (error) {
    return response(res, false, error.message, error);
  }
});

exports.detailProgesTaForDosen = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const data = await TAProgres.findOne({
      where: {
        id,
      },
    });

    return response(res, true, "Success", data);
  } catch (error) {
    return response(res, true, error.message, error);
  }
});

exports.createProgesTaForDosen = asyncHandler(async (req, res) => {
  try {
    const highestCountData = await TAProgres.findOne({
      where: {
        pengajuan_sk_id: req.body.pengajuan_sk_id,
      },
      order: [["count", "DESC"]],
      attributes: ["count"],
    });

    const casting = CastObject({
      Model: TAProgres,
      body: req.body,
    });

    const save = await TAProgres.create({
      ...casting,
      count: highestCountData ? highestCountData.count + 1 : 1,
    });
    return response(res, true, "success", save);
  } catch (error) {
    return response(res, true, error.message, null);
  }
});

exports.updateProgesTaForDosen = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const check = await TAProgres.findOne({
      where: {
        id,
      },
    });

    if (!check) {
      return response(res, false, "Progres Tidak ditemukan ", null);
    }

    const casting = CastObject({
      Model: TAProgres,
      body: req.body,
    });
    delete casting.id;

    const update = await TAProgres.update(casting, {
      where: {
        id,
      },
    });

    return response(res, true, "success", update);
  } catch (error) {
    return response(res, false, error.message, error);
  }
});

exports.deleteProgesTaForDosen = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    await TAProgres.destroy({
      where: { id },
    });

    return response(res, true, "berhasil");
  } catch (error) {
    return response(res, false, error.message, error);
  }
});
