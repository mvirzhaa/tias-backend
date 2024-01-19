const asyncHandler = require("express-async-handler");
const DB = require("../../database");

exports.getAchivements = asyncHandler(async (req, res) => {
  const getData = await DB.query('SELECT * FROM achievements');

  res.status(200).json({
    message: "Successfull get Data",
    data: getData.rows,
  });
});

exports.addAchievement = asyncHandler(async (req, res) => {
  const newData = req.body;

  const insertData = await DB.query(
    'INSERT INTO achievements(name, gamify, points) VALUES ($1, $2, $3) RETURNING *',
    [newData.name, newData.gamify, newData.points]
  );

  if (insertData.rows.length) {
    res.status(201).json({
      message: "Successfully added new achievement.",
      data: insertData.rows[0],
    });
  } else {
    res.status(400).json({
      message: "Failed to add new achievement.",
    });
  }
});

exports.editAchievement = asyncHandler(async (req, res) => {
  const achievementId = req.params.id;
  const newData = req.body;

  const getOldData = await DB.query('SELECT * FROM achievements WHERE id = $1', [achievementId]);

  if (getOldData.rows.length === 0) {
    return res.status(404).json({
      message: "Achievement not found.",
    });
  }

  const oldData = getOldData.rows[0];

  const mergedData = {
    name: newData.name || oldData.name,
    gamify: newData.gamify || oldData.gamify,
    points: newData.points || oldData.points,
  };

  const updateData = await DB.query('UPDATE achievements SET name = $1, gamify = $2, points = $3 WHERE id = $4 RETURNING *',
    [mergedData.name, mergedData.gamify, mergedData.points, achievementId]);

  if (updateData.rows.length) {
    res.status(200).json({
      message: "Successfully updated achievement.",
      data: updateData.rows[0],
    });
  } else {
    res.status(404).json({
      message: "Achievement not found.",
    });
  }
});

exports.deleteAchievement = asyncHandler(async (req, res) => {
  const achievementId = req.params.id;

  const deleteData = await DB.query('DELETE FROM achievements WHERE id = $1 RETURNING *', [achievementId]);

  if (deleteData.rows.length) {
    res.status(200).json({
      message: "Successfully deleted achievement.",
      data: deleteData.rows[0],
    });
  } else {
    res.status(404).json({
      message: "Achievement not found.",
    });
  }
});

exports.getAchievementDetail = asyncHandler(async (req, res) => {
  const achievementId = req.params.id;

  const getData = await DB.query('SELECT * FROM achievements WHERE id = $1', [achievementId]);

  if (getData.rows.length) {
    res.status(200).json({
      message: "Successfully get achievement detail.",
      data: getData.rows[0],
    });
  } else {
    res.status(404).json({
      message: "Achievement not found.",
    });
  }
});

exports.getAchivementsByUserLoginId = asyncHandler(async (req, res) => {
  try {
    const userLoginId = req.user.user_id;

    const totalPointsResult = await DB.query(
      "SELECT point_pendidikan + point_pengabdian + point_penelitian + point_kompetensi + point_penunjang + point_rekomendasi AS total_points FROM tb_data_pribadi WHERE user_id = $1",
      [userLoginId]
    );

    const totalPoints = totalPointsResult.rows[0].total_points;

    const findData = await DB.query(
      'SELECT tb_users.npm, tb_users.user_id, tb_data_pribadi.nama_lengkap, $2 AS total_points, achievements.*, user_achievements.status FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id JOIN user_achievements ON tb_users.user_id = user_achievements.user_id JOIN achievements ON user_achievements.achievement_id = achievements.id WHERE tb_users.user_id = $1',
      [userLoginId, totalPoints]
    );

    const userData = {
      user_id: findData.rows[0].user_id,
      npm: findData.rows[0].npm,
      nama_lengkap: findData.rows[0].nama_lengkap,
      total_points: findData.rows[0].total_points,
      achievements: findData.rows.map(row => ({
        id: row.id, 
        name: row.name,
        status: row.status,
        points: row.points,
      })),
    };

    res.status(200).json({
      message: "Successfully get Data",
      data: userData,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

exports.getAchivementsByUserId = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    const getTotalPoint = await DB.query(
      "SELECT point_pendidikan + point_pengabdian + point_penelitian + point_kompetensi + point_penunjang + point_rekomendasi AS total_points FROM tb_data_pribadi WHERE user_id = $1",
      [userId]
    );

    if (getTotalPoint.rows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const total_points = getTotalPoint.rows[0].total_points;

    await DB.query(
      "UPDATE tb_data_pribadi SET total_point = $1 WHERE user_id = $2",
      [total_points, userId]
    );

    const findData = await DB.query(
      'SELECT tb_users.npm, tb_users.user_id, tb_data_pribadi.nama_lengkap, tb_data_pribadi.total_point, achievements.*, user_achievements.status FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id JOIN user_achievements ON tb_users.user_id = user_achievements.user_id JOIN achievements ON user_achievements.achievement_id = achievements.id WHERE tb_users.user_id = $1',
      [userId]
    );

    const userData = {
      user_id: findData.rows[0].user_id,
      npm: findData.rows[0].npm,
      nama_lengkap: findData.rows[0].nama_lengkap,
      total_point: findData.rows[0].total_point,
      achievements: findData.rows.map(row => ({
        id: row.id, 
        name: row.name,
        status: row.status,
        points: row.points,
      })),
    };

    res.status(200).json({
      message: "Successfully get Data",
      data: userData,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

exports.updateUserAchievementStatus = asyncHandler(async (req, res) => {
  const { user_id, achievement_id, status } = req.body;

  const updateStatusQuery = "UPDATE user_achievements SET status = $1 WHERE user_id = $2 AND achievement_id = $3 RETURNING *";

  const updateStatusData = await DB.query(updateStatusQuery, [status, user_id, achievement_id]);

  if (updateStatusData.rows.length) {
    res.status(200).json({
      message: "Successfully updated user achievement status by admin.",
      data: updateStatusData.rows[0],
    });
  } else {
    res.status(404).json({
      message: "User achievement not found.",
    });
  }
});
