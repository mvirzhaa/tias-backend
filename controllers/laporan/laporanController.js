const { Op, Sequelize, where } = require("sequelize");
const _ = require("lodash");
const { getPagination } = require("../../lib/pagination-parser");
const KategoriLaporan = require("../../models/master/KategoriLaporan");
const { response } = require("../../lib/response");
const { CastObject } = require("../../lib/general");
const Laporan = require("../../models/master/Laporan");
const path = require("path");
const fs = require("fs-extra");
const User = require("../../models/User");
const DataPribadi = require("../../models/DataPribadi");
const {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  endOfDay,
} = require("date-fns");
const { generatePeriods } = require("../../utils/generatePeriode");

class LaporanController {
  static index = async (req, res) => {
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
          [Op.or]: {
            nama: {
              [Op.like]: `%${search}%`,
            },
            deskripsi: {
              [Op.like]: `%${search}%`,
            },
          },
        };
      }

      const data = await Laporan.findAndCountAll({
        distinct: true,
        where: condition,
        order: [[order, orderBy]],
        limit: pagelimit.limit,
        offset: pagelimit.offset,
        include: [
          {
            model: KategoriLaporan,
            as: "kategori_laporan",
            required: false,
          },
          {
            model: User,
            as: "user",
            required: false,
            include: {
              model: DataPribadi,
              as: "personal_data",
              required: false,
            },
          },
        ],
      });

      return response(res, true, "success", {
        limit,
        page,
        total: data.count,
        total_page: Math.ceil(parseInt(data.count) / limit),
        rows: data.rows.map((iterate) => ({
          ...iterate.toJSON(),
          foto: `${process.env.API_URL}/dokumentasi-laporan/${iterate.foto}`,
        })),
      });
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static detail = async (req, res) => {
    try {
      const { id } = req.params;

      const data = await Laporan.findOne({
        where: {
          id,
        },
        include: [
          {
            model: KategoriLaporan,
            as: "kategori_laporan",
            required: false,
          },
        ],
      });

      return response(res, true, "Success", {
        ...data.toJSON(),
        foto: `${process.env.API_URL}/dokumentasi-laporan/${data.foto}`,
      });
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };

  static create = async (req, res) => {
    try {
      const userLoginId = req.user.user_id;

      if (!req.file) {
        return response(res, true, "error", "please fill one file!");
      }

      const casting = CastObject({
        Model: Laporan,
        body: req.body,
      });

      const save = await Laporan.create({
        ...casting,
        foto: req.file.filename,
        user_id: userLoginId,
      });

      return response(res, true, "success", save);
    } catch (error) {
      return response(res, true, error.message, error);
    }
  };

  static update = async (req, res) => {
    try {
      const id = req.params.id;
      const userLoginId = req.user.user_id;
      let filename;

      const laporan = await Laporan.findOne({ where: { id } });

      if (!laporan) {
        return response(res, false, "error", "Data not found!");
      }

      if (req.file) {
        await fs.remove(
          path.join(`public/dokumentasi-laporan/${laporan.foto}`)
        );
        filename = req.file.filename;
      } else {
        filename = laporan.foto;
      }
      const casting = CastObject({
        Model: Laporan,
        body: req.body,
      });

      delete casting.id;

      await Laporan.update(
        {
          ...casting,
          user_id: userLoginId,
          foto: filename,
        },
        { where: { id } }
      );

      const laporanUpdated = await Laporan.findOne({
        where: { id },
      });

      return response(res, true, "success", laporanUpdated);
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static destroy = async (req, res) => {
    try {
      const { id } = req.params;

      const laporan = await Laporan.findOne({ where: { id } });

      if (!laporan) {
        return response(res, false, "error", "Data not found!");
      }

      await Laporan.update(
        {
          deleted_at: new Date(),
        },
        {
          where: {
            id,
          },
        }
      );

      return response(res, true, "berhasil");
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static petaSebaran = async (req, res) => {
    try {
      let { tanggal_mulai, tanggal_akhir } = req.query;
      let whereCondition = {};

      if (tanggal_mulai && tanggal_akhir) {
        whereCondition.created_at = {
          [Op.between]: [
            new Date(tanggal_mulai + "T00:00:00Z"),
            new Date(tanggal_akhir + "T23:59:59Z"),
          ],
        };
      } else if (tanggal_mulai) {
        whereCondition.created_at = {
          [Op.gte]: new Date(tanggal_mulai + "T00:00:00Z"),
        };
      } else if (tanggal_akhir) {
        whereCondition.created_at = {
          [Op.lte]: new Date(tanggal_akhir + "T23:59:59Z"),
        };
      }

      const data = await Laporan.findAll({
        where: whereCondition,
        include: [
          {
            model: KategoriLaporan,
            as: "kategori_laporan",
            required: false,
          },
          {
            model: User,
            as: "user",
            required: false,
            include: {
              model: DataPribadi,
              as: "personal_data",
              required: false,
            },
          },
        ],
      });

      const formattedData = data.map((laporan) => ({
        lat: parseFloat(laporan.lat),
        lng: parseFloat(laporan.long),
        nama_lengkap: laporan.user.personal_data.nama_lengkap,
        npm: laporan.user.npm,
        email: laporan.user.email,
        telp: laporan.user.personal_data.no_hp,
        image: `${process.env.API_URL}/dokumentasi-laporan/${laporan.foto}`,
        profile: laporan.user.personal_data.image,
        deskripsi: laporan.deskripsi,
      }));

      response(res, true, "berhasil", formattedData);
    } catch (error) {
      return response(res, false, error.message, error);
    }
  };

  static dataChart = async (req, res) => {
    try {
      const { periode } = req.query;
      let periodLabel = [];
      let periodType;
      let startDate, endDate;

      const minMaxDates = await Laporan.findAll({
        attributes: [
          [
            Laporan.sequelize.fn("MIN", Laporan.sequelize.col("created_at")),
            "minDate",
          ],
          [
            Laporan.sequelize.fn("MAX", Laporan.sequelize.col("created_at")),
            "maxDate",
          ],
        ],
      });

      if (!minMaxDates.length) {
        return res.status(404).json({
          isSuccess: false,
          statusCode: 404,
          responseMessage: "No data available",
          data: [],
        });
      }

      const { minDate, maxDate } = minMaxDates[0].dataValues;
      const minDateParsed = new Date(minDate);
      const maxDateParsed = new Date(maxDate);

      if (periode) {
        switch (parseInt(periode, 10)) {
          case 1: // Harian
            periodType = "daily";
            startDate = new Date(minDateParsed);
            endDate = endOfYear(maxDateParsed);
            break;
          case 2: // Mingguan
            periodType = "weekly";
            startDate = startOfWeek(minDateParsed);
            endDate = endOfWeek(maxDateParsed);
            break;
          case 3: // Bulanan
            periodType = "monthly";
            startDate = startOfMonth(minDateParsed);
            endDate = endOfMonth(maxDateParsed);
            break;
          case 4: // Tahunan
            periodType = "yearly";
            startDate = startOfYear(minDateParsed);
            endDate = endOfYear(maxDateParsed);
            break;
          default:
            return res.status(400).json({
              isSuccess: false,
              statusCode: 400,
              responseMessage: "Invalid period",
              data: {},
            });
        }

        periodLabel = generatePeriods(startDate, endDate, periodType);

        // Fetch data for each period and calculate counts
        const formattedDataPromises = periodLabel.map(async (period) => {
          let periodStartDate, periodEndDate;

          switch (periodType) {
            case "daily":
              periodStartDate = new Date(period.period);
              periodEndDate = endOfDay(periodStartDate);
              break;
            case "weekly":
              periodStartDate = new Date(period.startDate);
              periodEndDate = new Date(period.endDate);
              break;
            case "monthly":
              const [month, year] = period.period.split("/");
              periodStartDate = new Date(`${year}-${month}-01`);
              periodEndDate = endOfMonth(periodStartDate);
              break;
            case "yearly":
              periodStartDate = new Date(`${period.period}-01-01`);
              periodEndDate = endOfYear(periodStartDate);
              break;
            default:
              periodStartDate = startDate;
              periodEndDate = endDate;
          }

          // Fetch data for the current period
          const data = await Laporan.findAll({
            where: {
              created_at: {
                [Op.between]: [periodStartDate, periodEndDate],
              },
            },
            include: [
              {
                model: KategoriLaporan,
                as: "kategori_laporan",
                required: false,
              },
            ],
          });

          if (data.length === 0) return; // Skip periods with no data

          const counts = data.reduce((acc, laporan) => {
            const category = laporan.kategori_laporan
              ? laporan.kategori_laporan.nama_kategori
              : "Unknown";
            acc[category] = (acc[category] || 0) + 1;
            return acc;
          }, {});

          const categories = Object.entries(counts).map(
            ([category, count]) => ({
              label: category,
              count,
            })
          );

          return {
            period: period.period,
            categories: categories,
          };
        });

        const formattedData = (await Promise.all(formattedDataPromises)).filter(
          (item) => item
        );

        res.json({
          isSuccess: true,
          statusCode: 200,
          responseMessage: "Success",
          data: formattedData,
        });
      } else {
        res.json({
          isSuccess: true,
          statusCode: 200,
          responseMessage: "No period provided",
          data: [],
        });
      }
    } catch (error) {
      res.status(500).json({
        isSuccess: false,
        statusCode: 500,
        responseMessage: error.message,
        data: {},
      });
    }
  };
}

module.exports = LaporanController;
