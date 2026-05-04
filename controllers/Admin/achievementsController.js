const asyncHandler = require("express-async-handler");
const DB = require("../../database");
const path = require("path");
const fs = require("fs-extra");

exports.getAchivements = asyncHandler(async (req, res) => {
  const getData = await DB.query('SELECT * FROM achievements ORDER BY start_point DESC');

  res.status(200).json({
    message: "Successfully get Data",
    data: getData.rows,
  });
});

exports.addAchievement = asyncHandler(async (req, res) => {
  const newData = req.body;

  const file = req.file;

  if(!file){
    res.status(400);
    throw new Error("Please fill in one file.")
  }

  if(!newData.name || !newData.gamify || !newData.start_point || !newData.points || !newData.kode){
    fs.unlink(file.path, (err) => {
      if (err) {
        console.log(err);
      }
      return;
    });
    res.status(400);
    throw new Error("Pleas fill in all the required fields.");
  }
  

  const insertData = await DB.query(
    'INSERT INTO achievements(name, gamify, start_point, points, image, kode) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [newData.name, newData.gamify, newData.start_point, newData.points, file.filename, kode]
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
  const file = req.files;

  const getOldData = await DB.query('SELECT * FROM achievements WHERE id = $1', [achievementId]);

  if (getOldData.rows.length === 0) {
    return res.status(404).json({
      message: "Achievement not found.",
    });
  }

  const oldData = getOldData.rows[0];

  if (file && file.lencana && file.lencana.length > 0) {
    // Handling lencana upload
    const oldLencanaPath = path.join('public/gamify/lencana', oldData.lencana);
    fs.unlink(oldLencanaPath, (err) => {
      if (err) {
        console.log(err);
      }
    });

    await DB.query('UPDATE achievements SET lencana = $1 WHERE id = $2', [file.lencana[0].filename, achievementId]);
  }

  if (file && file.image && file.image.length > 0) {
    // Handling image upload
    const oldImagePath = path.join('public/gamify', oldData.image);
    fs.unlink(oldImagePath, (err) => {
      if (err) {
        console.log(err);
      }
    });

    await DB.query('UPDATE achievements SET image = $1 WHERE id = $2', [file.image[0].filename, achievementId]);
  }

  const mergedData = {
    name: newData.name || oldData.name,
    gamify: newData.gamify || oldData.gamify,
    points: newData.points || oldData.points,
    start_point: newData.start_point || oldData.start_point,
    kode: newData.kode || oldData.kode,
    sub_judul: newData.sub_judul || oldData.sub_judul,
    deskripsi: newData.deskripsi || oldData.deskripsi,
  };

  const updateData = await DB.query('UPDATE achievements SET name = $1, gamify = $2, points = $3, start_point = $4, kode = $5, sub_judul = $6, deskripsi = $7 WHERE id = $8 RETURNING *',
    [mergedData.name, mergedData.gamify, mergedData.points, mergedData.start_point, mergedData.kode, mergedData.sub_judul, mergedData.deskripsi, achievementId]);

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

  const findData = await DB.query("SELECT * FROM achievements WHERE id = $1", [achievementId]);

  if(findData.rows.length === 0){
    res.status(404);
    throw new Error("data Not Found.");
  }

  const fileToDeleteImage = findData.rows[0].image;
  const fileToDeleteLencana = findData.rows[0].lencana;

  // Hapus file image jika ada
  if (fileToDeleteImage) {
    const imagePath = path.join('public/gamify', fileToDeleteImage);
    fs.unlinkSync(imagePath);
  }

  // Hapus file lencana jika ada
  if (fileToDeleteLencana) {
    const lencanaPath = path.join('public/gamify/lencana', fileToDeleteLencana);
    fs.unlinkSync(lencanaPath);
  }

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

    // const totalPointsResult = await DB.query(
    //   "SELECT point_pendidikan + point_pengabdian + point_penelitian + point_kompetensi + point_penunjang + point_rekomendasi AS total_points FROM tb_data_pribadi WHERE user_id = $1",
    //   [userLoginId]
    // );

    // const totalPoints = totalPointsResult.rows[0].total_points;

    const findData = await DB.query(
      'SELECT tb_users.npm, tb_users.user_id, tb_data_pribadi.*, achievements.*, user_achievements.status FROM tb_users JOIN tb_data_pribadi ON tb_users.user_id = tb_data_pribadi.user_id JOIN user_achievements ON tb_users.user_id = user_achievements.user_id JOIN achievements ON user_achievements.achievement_id = achievements.id WHERE tb_users.user_id = $1 ORDER BY achievements.start_point DESC',
      [userLoginId]
    );

    const userData = {
      user_id: findData.rows[0].user_id,
      npm: findData.rows[0].npm,
      nama_lengkap: findData.rows[0].nama_lengkap,
      total_points: findData.rows[0].total_point,
      achievements: findData.rows.map(row => ({
        id: row.id, 
        name: row.name,
        gamify: row.gamify,
        start_point: row.start_point,
        image: row.image,
        kode: row.kode,
        status: row.status,
        points: row.points,
        deskripsi: row.deskripsi,
        lencana: row.lencana,
        sub_judul: row.sub_judul
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
