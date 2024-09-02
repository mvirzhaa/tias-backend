const DB = require("../../database");
const asyncHandler = require("express-async-handler");
const GroupVoting = require("../../models/master/group/GroupVoting");
const GroupUsers = require("../../models/master/group/GroupUsers");
const Question = require("../../models/Evoting/Qestion");
const { getPagination } = require("../../lib/pagination-parser");
const { Op } = require("sequelize");
const Group = require("../../models/master/group/Group");
const { response } = require("../../lib/response");

exports.getActiveQuestion = asyncHandler(async (req, res) => {
  const { user_id, role } = req.user;

  const findGroupUser = await GroupUsers.findAll({
    where: {
      user_id: user_id,
    },
  });

  const groupIds = findGroupUser.map((data) => data.id_group);

  const groupVoting = await GroupVoting.findAll({
    where: {
      id_group: {
        [Op.in]: groupIds,
      },
    },
  });

  const votingIds = groupVoting.map((data) => data.id_voting);

  const data = await Question.findAll({
    where: {
      [Op.or]: [
        {
          group: false,
          status_pertanyaan: 1,
        },
        {
          group: true,
          status_pertanyaan: 1,
          id: {
            [Op.in]: votingIds,
          },
        },
      ],
    },
  });
  // const query =
  //   "SELECT * FROM tb_voting_pertanyaan WHERE status_pertanyaan = $1";

  // const result = await DB.query(query, [1]);

  res.status(200).json({
    message: "success",
    data: data,
  });
});

exports.getQuestion = asyncHandler(async (req, res) => {
  try {
    const { user_id, role } = req.user;
    let { limit, page, order, orderBy, search, filter, filterValue } =
      req.query;

    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    page = page ? parseInt(page) : 1;
    order = order ? order : "id";
    orderBy = orderBy ? orderBy : "DESC";
    const pagelimit = getPagination(limit, page);

    let whereCondition;

    // Jika peran adalah admin, ambil semua data
    if (role === "Admin") {
      whereCondition = {};
    } else {
      const findGroupUser = await GroupUsers.findAll({
        where: {
          user_id: user_id,
        },
      });

      const groupIds = findGroupUser.map((data) => data.id_group);

      const groupVoting = await GroupVoting.findAll({
        where: {
          id_group: {
            [Op.in]: groupIds,
          },
        },
      });

      const votingIds = groupVoting.map((data) => data.id_voting);

      whereCondition = {
        [Op.or]: [
          {
            group: false,
          },
          {
            group: true,
            id: {
              [Op.in]: votingIds,
            },
          },
        ],
      };
    }

    if (filter && filterValue) {
      const filters = Array.isArray(filter) ? filter : [filter];
      const filterValues = Array.isArray(filterValue)
        ? filterValue
        : [filterValue];

      filters.forEach((f, index) => {
        if (f && filterValues[index] !== undefined) {
          whereCondition[Op.and] = whereCondition[Op.and] || [];
          whereCondition[Op.and].push({ [f]: filterValues[index] });
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
          deskripsi: {
            [Op.like]: `%${search}%`,
          },
        },
      };
    }

    const data = await Question.findAndCountAll({
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

exports.detailQuestion = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!id) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  try {
    const question = await DB.query(
      "SELECT * FROM tb_voting_pertanyaan WHERE id = $1",
      [id]
    );

    const options = await DB.query(
      "SELECT tb_voting_jawaban.*, tb_voting_hasil.* FROM tb_voting_jawaban JOIN tb_voting_hasil ON tb_voting_jawaban.id = tb_voting_hasil.id_jawaban WHERE tb_voting_jawaban.id_pertanyaan = $1 AND tb_voting_jawaban.status_jawaban = $2 ORDER BY tb_voting_hasil.hasil DESC",
      [id, 1]
    );

    const findJmlSuara = await DB.query(
      "SELECT * FROM tb_voting_verifikasi_hasil WHERE id_pertanyaan = $1",
      [id]
    );

    const votingGroup = await GroupVoting.findAll({
      where: {
        id_voting: id,
      },
      include: [
        {
          model: Group,
          required: false,
          attributes: ["id", "nama_group"],
          as: "group",
        },
      ],
    });

    const label = [];
    const data = [];

    options.rows.forEach((option) => {
      label.push(option.jawaban);
      data.push(option.hasil);
    });

    const dataChart = {
      label: label,
      data: data,
    };

    const response = {
      message: "success",
      data: {
        pertanyaan: question.rows[0],
        option: options.rows,
        realCount: dataChart,
        jmlSuara: findJmlSuara.rowCount,
        group: votingGroup,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "error",
      error: error.message,
    });
  }
});

exports.detailForEditQuestion = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!id) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  try {
    const question = await DB.query(
      "SELECT * FROM tb_voting_pertanyaan WHERE id = $1",
      [id]
    );
    const options = await DB.query(
      "SELECT * FROM tb_voting_jawaban WHERE id_pertanyaan = $1",
      [id]
    );

    res.status(200).json({
      message: "success",
      data: {
        dataPertanyaan: question.rows,
        dataOptions: options.rows,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "error",
      error: error.message,
    });
  }
});

exports.createQuestion = asyncHandler(async (req, res) => {
  const newData = req.body;

  if (!newData.deskripsi || !newData.jawaban || newData.jawaban.length === 0) {
    return res.status(400).json({
      message: "Please fill in all the required fields.",
    });
  }

  try {
    const saveData = await DB.query(
      "INSERT INTO tb_voting_pertanyaan(deskripsi) VALUES($1) RETURNING *",
      [newData.deskripsi]
    );

    const pertanyaan_id = saveData.rows[0].id;

    const saveDataJawabanPromises = newData.jawaban.map(async (jawaban) => {
      const saveJawaban = await DB.query(
        "INSERT INTO tb_voting_jawaban(id_pertanyaan, jawaban) VALUES($1, $2) RETURNING *",
        [pertanyaan_id, jawaban]
      );

      const jawabanId = saveJawaban.rows[0].id;

      const saveDataHasil = await DB.query(
        "INSERT INTO tb_voting_hasil(id_jawaban) VALUES ($1) RETURNING *",
        [jawabanId]
      );

      return saveDataHasil.rows[0];
    });
    const saveDataJawabanResults = await Promise.all(saveDataJawabanPromises);

    if (newData.groups?.length) {
      let dataInput = [];
      for (const iterator of newData.groups) {
        if (iterator != "" && iterator != null) {
          dataInput.push({
            id_voting: pertanyaan_id,
            id_group: iterator,
          });
        }
      }
      await GroupVoting.bulkCreate(dataInput);

      await Question.update(
        {
          group: true,
        },
        {
          where: {
            id: pertanyaan_id,
          },
        }
      );
    }

    res.status(200).json({
      message: "Successfully created data.",
      data: saveData.rows[0],
      jawaban: saveDataJawabanResults,
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({
      message: "Failed to create data.",
    });
  }
});

exports.updateQuestion = asyncHandler(async (req, res) => {
  const idToUpdate = req.params.id;
  const dataToUpdate = req.body;

  if (!idToUpdate) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  try {
    const dataAnswer = {
      deskripsi: dataToUpdate.deskripsi,
      status_pertanyaan: dataToUpdate.status_pertanyaan,
    };

    const updateQuery =
      "UPDATE tb_voting_pertanyaan SET deskripsi = $1, status_pertanyaan = $2 WHERE id = $3 RETURNING *";
    const updateValues = [
      dataAnswer.deskripsi,
      dataAnswer.status_pertanyaan,
      idToUpdate,
    ];
    await DB.query(updateQuery, updateValues);

    if (dataToUpdate.dataOptions) {
      for (const opt of dataToUpdate.dataOptions) {
        if (opt.id) {
          await DB.query(
            "UPDATE tb_voting_jawaban SET jawaban = $1, status_jawaban = $2 WHERE id = $3",
            [opt.jawaban, opt.status_jawaban, opt.id]
          );
        } else {
          const insertedJawaban = await DB.query(
            "INSERT INTO tb_voting_jawaban(id_pertanyaan, jawaban, status_jawaban) VALUES ($1, $2, $3) RETURNING id",
            [idToUpdate, opt.jawaban, opt.status_jawaban]
          );
          const newJawabanId = insertedJawaban.rows[0].id;

          await DB.query(
            "INSERT INTO tb_voting_hasil(id_jawaban) VALUES ($1) RETURNING *",
            [newJawabanId]
          );
        }
      }
    }

    res.status(200).json({
      message: "Successfully updated data.",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Failed to update data.",
    });
  }
});

exports.deleteQuestion = asyncHandler(async (req, res) => {
  const idToDelete = req.params.id;

  if (!idToDelete) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  await DB.query("DELETE FROM tb_voting_jawaban WHERE id_pertanyaan = $1", [
    idToDelete,
  ]);

  const deleteQuery =
    "DELETE FROM tb_voting_pertanyaan WHERE id = $1 RETURNING *";
  const deleteResult = await DB.query(deleteQuery, [idToDelete]);

  if (deleteResult.rowCount === 0) {
    res.status(404);
    throw new Error("Data not found for the given ID.");
  }

  res.status(200).json({
    message: "Successfully deleted data.",
  });
});

exports.deleteGroupQuestion = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const check = await GroupVoting.findOne({
      where: {
        id: id,
      },
    });

    if (!check) {
      return response(res, false, "Group not found", null, 404);
    }

    const update = await GroupVoting.update(
      {
        deleted_at: new Date(),
      },
      {
        where: {
          id: check.id,
        },
      }
    );

    return response(res, true, "Group successfully deleted", update, 200);
  } catch (error) {
    return response(res, false, error.message, error, 500);
  }
});
