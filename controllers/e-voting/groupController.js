const DB_TIAS = require("../../database");
const asyncHandler = require("express-async-handler");
const { unixTimestamp, convertDate } = require("../../utils");

exports.getGroupVoting = asyncHandler(async (req, res) => {
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

  let query = "SELECT * FROM tb_group";
  let whereClause = "";

  if (filter && filterValue) {
    if (Array.isArray(filter) && Array.isArray(filterValue)) {
      for (let i = 0; i < filter.length; i++) {
        if (i === 0) {
          whereClause += ` WHERE ${filter[i]} = '${filterValue[i]}'`;
        } else {
          whereClause += ` AND ${filter[i]} = '${filterValue[i]}'`;
        }
      }
    } else {
      res
        .status(400)
        .json({ message: "Filter and filterValue must be arrays." });
      return;
    }
  }

  if (search) {
    if (whereClause) {
      whereClause += ` AND LOWER(nama_group) LIKE '%${search.toLowerCase()}%'`;
    } else {
      whereClause += ` WHERE LOWER(nama_group) LIKE '%${search.toLowerCase()}%'`;
    }
  }

  query += whereClause;

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

  try {
    const result = await DB_TIAS.query(query);

    let responseData = result.rows;

    const totalRecordsQuery = "SELECT COUNT(*) AS total FROM tb_group";
    const totalRecordsResult = await DB_TIAS.query(totalRecordsQuery);
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

exports.getAllGroup = asyncHandler(async (req, res) => {
  const data = await DB_TIAS.query("SELECT * FROM tb_group");
  res.status(200).json({
    message: "Successfully get data",
    data: data.rows,
  });
});

exports.createGroup = asyncHandler(async (req, res) => {
  const newData = req.body;

  if (!newData.nama_group) {
    return res.status(400).json({
      message: "Please fill in all the required fields.",
    });
  }

  const findNewData = await DB_TIAS.query(
    "SELECT * FROM tb_group WHERE nama_group = $1",
    [newData.nama_group]
  );

  if (findNewData.rows.length) {
    return res.status(400).json({
      message: "Name of group already exists.",
    });
  }

  const saveData = await DB_TIAS.query(
    "INSERT INTO tb_group(nama_group) VALUES($1)",
    [newData.nama_group]
  );

  res.status(200).json({
    message: "Successfully created data",
    data: saveData.rows[0],
  });
});

exports.deleteGroup = asyncHandler(async (req, res) => {
  const idToDelete = req.params.id;

  if (!idToDelete) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  const deleteQuery = await DB_TIAS.query(
    "DELETE FROM tb_group WHERE id = $1",
    [idToDelete]
  );

  if (deleteQuery.rowCount === 0) {
    res.status(404);
    throw new Error("Data not found for the given ID.");
  }

  res.status(200).json({
    message: "Successfully deleted data.",
  });
});

exports.detailGroup = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const findData = await DB_TIAS.query("SELECT * FROM tb_group WHERE id = $1", [
    id,
  ]);

  if (!findData.rows.length) {
    return res.status(400).json({
      message: "Not Found",
    });
  }

  res.status(200).json({
    message: "Successfully get data",
    data: findData.rows[0],
  });
});

exports.editGroup = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const findData = await DB_TIAS.query("SELECT * FROM tb_group WHERE id = $1", [
    id,
  ]);

  if (!findData.rows.length) {
    return res.status(400).json({
      message: "Not Found",
    });
  }

  const { nama_group } = req.body;

  const updatedData = await DB_TIAS.query(
    "UPDATE tb_group SET nama_group = $1 WHERE id = $2 RETURNING *",
    [nama_group, id]
  );

  res.status(200).json({
    message: "Group updated successfully",
    data: updatedData.rows[0],
  });
});

exports.detailToCreateUserGroup = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const findData = await DB_TIAS.query("SELECT * FROM tb_group WHERE id = $1", [
    id,
  ]);

  if (!findData.rows.length) {
    return res.status(400).json({
      message: "Not Found",
    });
  }

  const findUserGroup = await DB_TIAS.query(
    "SELECT DISTINCT ON (user_id) * FROM tb_group_user WHERE $1 = ANY(id_group)",
    [id]
  );

  const userIds = findUserGroup.rows.map((data) => data.user_id);

  const findUserFromTias = await DB_TIAS.query(
    "SELECT tb_users.user_id, tb_users.role, tb_users.npm, tb_data_pribadi.nip, tb_data_pribadi.nama_lengkap FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.user_id = ANY($1)",
    [userIds]
  );

  const userMap = {};
  findUserFromTias.rows.forEach((user) => {
    userMap[user.user_id] = user;
  });

  const mergedData = findUserGroup.rows.map((user) => ({
    id: user.id,
    user_id: user.user_id,
    code: userMap[user.user_id]?.npm || userMap[user.user_id]?.nip,
    id_group: user.id_group,
    nama_lengkap: userMap[user.user_id]?.nama_lengkap || null,
    role: userMap[user.user_id]?.role || null,
  }));

  res.status(200).json({
    message: "Successfully get data",
    data: {
      data_group: findData.rows[0],
      users: mergedData,
    },
  });
});

exports.getGroupUsersAgain = asyncHandler(async (req, res) => {
  const { filter, filterValue } = req.query;

  let query = "SELECT * FROM tb_group_user";

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

  const findUsersGroup = await DB_TIAS.query(query);
  const findGroup = await DB_TIAS.query("SELECT * FROM tb_group");

  const result = findUsersGroup.rows.map((user) => {
    const groups = user.id_group.map((groupId) => {
      return findGroup.rows.find((group) => group.id === parseInt(groupId));
    });

    return {
      id: user.id,
      user_id: user.user_id,
      code: user.code,
      group: groups,
    };
  });

  res.json(result);
});

exports.getGroupUsers = asyncHandler(async (req, res) => {
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

  let query = "SELECT * FROM tb_group_user";

  if (filter && filterValue) {
    if (Array.isArray(filter) && Array.isArray(filterValue)) {
      for (let i = 0; i < filter.length; i++) {
        if (filter[i] === "id_group") {
          query = `SELECT DISTINCT ON (id) * FROM tb_group_user WHERE '${filterValue[i]}' = ANY(id_group)`;
        } else {
          query += ` WHERE ${filter[i]} = '${filterValue[i]}'`;
        }
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

  const result = await DB_TIAS.query(query);

  const userIds = result.rows.map((data) => data.user_id);

  const findUserFromTias = await DB_TIAS.query(
    "SELECT tb_users.user_id, tb_users.role, tb_users.npm, tb_data_pribadi.nip, tb_data_pribadi.nama_lengkap FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id WHERE tb_users.user_id = ANY($1)",
    [userIds]
  );

  const userMap = {};
  findUserFromTias.rows.forEach((user) => {
    userMap[user.user_id] = user;
  });

  const mergedData = result.rows.map((user) => ({
    id: user.id,
    user_id: user.user_id,
    code: userMap[user.user_id]?.npm || userMap[user.user_id]?.nip,
    id_group: user.id_group,
    nama_lengkap: userMap[user.user_id]?.nama_lengkap || null,
    role: userMap[user.user_id]?.role || null,
  }));

  let responseData = mergedData;

  const totalRecordsQuery = "SELECT COUNT(*) AS total FROM tb_group";
  const totalRecordsResult = await DB_TIAS.query(totalRecordsQuery);
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
});

exports.userGroupRegister = asyncHandler(async (req, res) => {
  const data = req.body;

  if (!data.id || !data.users) {
    return res
      .status(400)
      .json({ message: "Please fill in all the required fields." });
  }

  let users;
  try {
    users = JSON.parse(data.users);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Invalid JSON format for 'users' data." });
  }

  for (const user of users) {
    if (!user.user_id || !user.code) {
      return res
        .status(400)
        .json({ message: "Input form tidak boleh kosong." });
    }
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const userIds = users
    .map((user) => user.user_id)
    .filter((id) => uuidRegex.test(id));

  const findGroupUsers = await DB_TIAS.query(
    `SELECT DISTINCT ON (id) * FROM tb_group_user WHERE user_id = ANY(ARRAY['${userIds.join(
      "','"
    )}']) AND '${data.id}' = ANY(id_group)`
  );

  if (findGroupUsers.rows.length > 0) {
    return res
      .status(400)
      .json({ message: "Salah satu user sudah didaftarkan." });
  }

  for (const user of users) {
    const dataUser = {
      user_id: user.user_id,
      code: user.code,
    };

    const findData = await DB_TIAS.query(
      "SELECT * FROM tb_group_user WHERE user_id = $1",
      [dataUser.user_id]
    );

    if (findData.rows.length) {
      await DB_TIAS.query(
        "UPDATE tb_group_user SET id_group = array_append(id_group, $1) WHERE user_id = $2",
        [data.id, dataUser.user_id]
      );
    } else {
      const created_at = unixTimestamp;
      const convert = convertDate(created_at);
      const id_group = [data.id];
      await DB_TIAS.query(
        "INSERT INTO tb_group_user(user_id, code, id_group, created_at) VALUES($1, $2, $3, $4) RETURNING *",
        [dataUser.user_id, dataUser.code, id_group, convert]
      );
    }
  }

  res.status(200).json({ message: "Successfully registered to the group." });
});

exports.deleteUserFromGroup = asyncHandler(async (req, res) => {
  const user_id = req.params.user_id;
  const id = req.body.id;

  if (!id) {
    res.status(400);
    throw new Error("ID parameter is missing.");
  }

  const deleteQuery = await DB_TIAS.query(
    "UPDATE tb_group_user SET id_group = array_remove(id_group, $1) WHERE user_id = $2",
    [id, user_id]
  );

  if (deleteQuery.rowCount === 0) {
    res.status(404);
    throw new Error("Data not found for the given user_id.");
  }

  res.status(200).json({
    message: "Successfully removed from group.",
  });
});
