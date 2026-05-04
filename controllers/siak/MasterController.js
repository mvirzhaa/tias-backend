const { Op } = require("sequelize");
const _ = require("lodash");
const { getPagination } = require("../../lib/pagination-parser");
const { response } = require("../../lib/response");
const SiakLecturer = require("../../models/Siak/Lecturer");
const SiakCourse = require("../../models/Siak/Course");
const SiakCurriculum = require("../../models/Siak/Curriculum");
const SiakClass = require("../../models/Siak/Class");

class MasterController {
  static lecturer = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, filter, filterValue } =
        req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "code";
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
            name: {
              [Op.like]: `%${search}%`,
            },
          },
        };
      }

      const data = await SiakLecturer.findAndCountAll({
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
  };

  static course = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, filter, filterValue } =
        req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "code";
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
            name: {
              [Op.like]: `%${search}%`,
            },
          },
        };
      }

      const data = await SiakCourse.findAndCountAll({
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
      console.log(error);
      return response(res, false, error.message, error);
    }
  };

  static curriculum = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, filter, filterValue } =
        req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "curr_code";
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
            description: {
              [Op.like]: `%${search}%`,
            },
          },
        };
      }

      const data = await SiakCurriculum.findAndCountAll({
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
      console.log(error);
      return response(res, false, error.message, error);
    }
  };

  static class = async (req, res) => {
    try {
      let { limit, page, order, orderBy, search, filter, filterValue } =
        req.query;
      limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
      page = page ? parseInt(page) : 1;
      order = order ? order : "name";
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
            name: {
              [Op.like]: `%${search}%`,
            },
            description: {
              [Op.like]: `%${search}%`,
            },
          },
        };
      }

      const data = await SiakClass.findAndCountAll({
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
      console.log(error);
      return response(res, false, error.message, error);
    }
  };
}

module.exports = MasterController;
