const expressAsyncHandler = require("express-async-handler");
const DB = require("../../database");
const QRCode = require("qrcode-svg");
const { insertValidasiDokumen } = require("../../utils/validasiDigital");
const ValidationDocument = require("../../models/ValidationDocument");
const { CastObject } = require("../../lib/general");
const { response } = require("../../lib/response");
const { getPagination } = require("../../lib/pagination-parser");
const { Op } = require("sequelize");

exports.index = expressAsyncHandler(async (req, res) => {
  try {
    let { limit, page, order, orderBy, search, filter, filterValue } =
      req.query;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    page = page ? parseInt(page) : 1;
    order = order ? order : "id";
    orderBy = orderBy ? orderBy : "DESC";
    const pagelimit = getPagination(limit, page);

    let whereCondition = {};

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
        [Op.or]: [
          {
            nama_kegiatan: {
              [Op.like]: `%${search}%`,
            },
            pelaksana: {
              [Op.like]: `%${search}%`,
            },
            tertuju: {
              [Op.like]: `%${search}%`,
            },
          },
        ],
      };
    }

    const data = await ValidationDocument.findAndCountAll({
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

exports.createValiation = expressAsyncHandler(async (req, res) => {
  const body = req.body;

  if (!body.pelaksana || !body.tertuju || !body.nama_kegiatan) {
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }

  await insertValidasiDokumen(req.body);
  res.status(200).json({
    message: "successfully created data",
  });
});

exports.editValidation = expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const check = await ValidationDocument.findOne({
      where: {
        id,
      },
    });

    if (!check) {
      return response(res, false, "assign Tidak ditemukan ", null);
    }

    const casting = CastObject({
      Model: ValidationDocument,
      body: req.body,
    });
    delete casting.id;

    const update = await ValidationDocument.update(casting, {
      where: {
        id,
      },
    });

    return response(res, true, "success", update);
  } catch (error) {
    return response(res, false, error.message, error);
  }
});

exports.destroy = expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    await ValidationDocument.update(
      {
        deleted_at: Date.now(),
      },
      {
        where: { id },
      }
    );

    return response(res, true, "berhasil");
  } catch (error) {
    return response(res, false, error.message, error);
  }
});

exports.findOne = expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const data = await ValidationDocument.findOne({
      where: {
        id,
      },
    });

    return response(res, true, "Success", data);
  } catch (error) {
    return response(res, true, error.message, error);
  }
});
